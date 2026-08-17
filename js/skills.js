// ============================================================================
// --- PLAYER ACTIONS, SKILLS, FOV & ENEMY AI SYSTEMS ---
// ============================================================================

function attachSkillMethods(proto) {
    proto.getFovRadius = function() {
        if (this.darknessFloor) return 3;
        let r = (this.player.baseFov || 6) + (this.player.fovAccessory || 0);
        if (this.talents.includes('eagle_eye')) r += 2;
        if (this.relics.includes('lantern')) r += 2;
        return r;
    };

    proto.updateFOV = function() {
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this.fog[y][x] === 2) this.fog[y][x] = 1;
            }
        }
        const px = this.player.x; const py = this.player.y;
        this.fog[py][px] = 2;
        const radius = this.getFovRadius();
        const rays = 144;
        for (let i = 0; i < rays; i++) {
            const dx = Math.cos((i / rays) * Math.PI * 2);
            const dy = Math.sin((i / rays) * Math.PI * 2);
            let rx = px + 0.5, ry = py + 0.5;
            for (let step = 0; step < radius; step += 0.25) {
                const tx = Math.floor(rx), ty = Math.floor(ry);
                if (tx < 0 || tx >= this.mapWidth || ty < 0 || ty >= this.mapHeight) break;
                this.fog[ty][tx] = 2;
                if (this.map[ty][tx] === 0 || this.map[ty][tx] === 4 || this.map[ty][tx] === 9 || this.map[ty][tx] === 10) break;
                rx += dx * 0.25; ry += dy * 0.25;
            }
        }
        this.checkChampionTelegraph();
    };

    proto.checkChampionTelegraph = function() {
        const champ = this.enemies.find(e => e.isChampion && !e.telegraphed && !e.dying && this.fog[e.y] && this.fog[e.y][e.x] === 2);
        if (champ) {
            champ.telegraphed = true;
            const names = (champ.affixes || []).map(a => AFFIX_NAMES[a] || a).join(' + ');
            this.showLoreToast(`⚠️ Champion ahead: ${names}`);
            return;
        }
        const elite = this.enemies.find(e => e.elite && !e.dying && this.fog[e.y] && this.fog[e.y][e.x] === 2);
        if (elite) this.showTutorialTip('elite', 'Elites (named enemies) hit much harder and carry a special affix — worth extra caution or a quick retreat.');
    };

    proto.executeTurn = function(dx, dy) {
        if (!this.player) return;
        if (this.player.path.length > 0) this.player.path = [];
        this.processAction(this.player.x + dx, this.player.y + dy);
    };

    proto.useSkill = function() {
        if (this.player.skillCooldown > 0 || this.transition || this.paused || this.isMenuOverlayOpen()) return;

        if (this.player.classType === 'warrior') {
            let hit = false;
            const neighbors = [ {x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0} ];
            neighbors.forEach(n => {
                const tx = this.player.x + n.x; const ty = this.player.y + n.y;
                let enemy = this.enemies.find(e => e.x === tx && e.y === ty && !e.dying);
                if (enemy) {
                    this.applyStatus(enemy, 'stun', 2);
                    enemy.hp -= this.applyDamageToEnemy(enemy, this.getPlayerAttack());
                    this.triggerHitFlash(enemy); this.triggerKnockback(enemy, this.player.x, this.player.y); this.resetGhostDelay(enemy);
                    this.spawnDamageNumber(tx, ty, 'SLAM!', '#facc15');
                    hit = true;
                }
            });
            if (hit) {
                sfx.playHit(); this.triggerCameraShake(10, 200);
                this.logMessage(`You used Shield Slam!`, 'log-combat-player');
                this.player.skillCooldown = this.player.maxSkillCooldown;
                this.checkEnemyDeaths();
                this.postTurnSystems();
            }
        } else if (this.player.classType === 'mage') {
            if (this.player.mp >= 20) {
                let target = null, minDist = 999;
                this.enemies.forEach(e => {
                    if (e.dying) return;
                    const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
                    if (dist < 7 && this.fog[e.y][e.x] === 2 && dist < minDist) { target = e; minDist = dist; }
                });
                if (target) {
                    this.player.mp -= 20;
                    this.player.skillCooldown = this.player.maxSkillCooldown;
                    sfx.playMagic();
                    this.spawnCastWindup(this.player);
                    this.particles.push({ x: this.player.visualX * this.tileSize, y: this.player.visualY * this.tileSize, tx: target.x * this.tileSize, ty: target.y * this.tileSize, life: 1, decay: 0.1, type: 'projectile', color: '#f97316', trailTimer: 0, cb: () => {
                        const fireballDmg = this.applyDamageToEnemy(target, this.player.baseAtk * 2);
                        target.hp -= fireballDmg;
                        this.applyStatus(target, 'burn', 3);
                        this.triggerHitFlash(target); this.triggerKnockback(target, this.player.x, this.player.y); this.resetGhostDelay(target);
                        this.spawnBloodParticles(target.x, target.y, '#f97316');
                        this.spawnSparks(target.x, target.y);
                        this.spawnDamageNumber(target.x, target.y, `-${fireballDmg}`, '#f97316');
                        this.logMessage(`Fireball hits ${target.name}!`, 'log-combat-magic');
                        if (target.hp <= 0) { this.hitStopTimer = 70; this.triggerCameraShake(10, 150); }
                        this.checkEnemyDeaths();
                    }});
                    this.postTurnSystems();
                }
            }
        } else if (this.player.classType === 'rogue') {
            let options = [];
            for (let y = this.player.y - 3; y <= this.player.y + 3; y++) {
                for (let x = this.player.x - 3; x <= this.player.x + 3; x++) {
                    if (this.map[y] && this.map[y][x] === 1 && !this.enemies.some(e => e.x === x && e.y === y)) options.push({x, y});
                }
            }
            if (options.length > 0) {
                const choice = options[Math.floor(Math.random() * options.length)];
                this.player.x = choice.x; this.player.y = choice.y;
                sfx.playMagic();
                this.player.skillCooldown = this.player.maxSkillCooldown;
                this.logMessage(`Shadowstep!`, 'log-combat-player');
                this.postTurnSystems();
            }
        } else if (this.player.classType === 'paladin') {
            let hit = false;
            const neighbors = [ {x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0} ];
            neighbors.forEach(n => {
                if (hit) return;
                const tx = this.player.x + n.x; const ty = this.player.y + n.y;
                const enemy = this.enemies.find(e => e.x === tx && e.y === ty && !e.dying);
                if (enemy) {
                    const dmg = this.applyDamageToEnemy(enemy, this.getPlayerAttack() + 6);
                    enemy.hp -= dmg;
                    const heal = Math.floor(dmg * 0.3);
                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
                    this.triggerHitFlash(enemy); this.triggerKnockback(enemy, this.player.x, this.player.y); this.resetGhostDelay(enemy);
                    this.spawnAttackSwipe(this.player.x, this.player.y, tx, ty);
                    this.spawnDamageNumber(tx, ty, `-${dmg}`, '#facc15');
                    this.spawnDamageNumber(this.player.x, this.player.y, `+${heal}`, '#34d399');
                    this.logMessage(`Holy Strike smites ${enemy.name}!`, 'log-combat-player');
                    hit = true;
                }
            });
            if (hit) {
                sfx.playHit(); this.triggerCameraShake(6, 150);
                this.player.skillCooldown = this.player.maxSkillCooldown;
                this.checkEnemyDeaths();
                this.postTurnSystems();
            }
        } else if (this.player.classType === 'necromancer') {
            if (this.player.mp >= 25) {
                let spot = null;
                for (let tries = 0; tries < 12; tries++) {
                    const dx = Math.floor(Math.random() * 3) - 1, dy = Math.floor(Math.random() * 3) - 1;
                    const sx = this.player.x + dx, sy = this.player.y + dy;
                    if (this.map[sy] && this.map[sy][sx] === 1 && !this.enemies.some(e => e.x === sx && e.y === sy)) { spot = { x: sx, y: sy }; break; }
                }
                if (spot) {
                    this.player.mp -= 25;
                    this.player.skillCooldown = this.player.maxSkillCooldown;
                    this.allies = this.allies.filter(a => a.type !== 'summon');
                    this.allies.push({ x: spot.x, y: spot.y, visualX: spot.x, visualY: spot.y, icon: '💀', color: '#a78bfa', name: 'Raised Skeleton', type: 'summon', turnsLeft: 60, atk: 6 + this.player.lvl, hitFlash: 0, knockX: 0, knockY: 0 });
                    sfx.playMagic();
                    this.spawnLevelUpParticles();
                    this.logMessage('You raise a skeleton to fight at your side!', 'log-combat-player');
                    this.checkAchievements();
                    this.postTurnSystems();
                }
            }
        } else if (this.player.classType === 'ranger') {
            let target = null, minDist = 999;
            const range = this.getFovRadius();
            this.enemies.forEach(e => {
                if (e.dying) return;
                const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
                if (dist < range && this.fog[e.y][e.x] === 2 && dist < minDist) { target = e; minDist = dist; }
            });
            if (target) {
                this.player.skillCooldown = this.player.maxSkillCooldown;
                sfx.playHit();
                const dx = Math.sign(target.x - this.player.x), dy = Math.sign(target.y - this.player.y);
                let tx = this.player.x, ty = this.player.y, hitAny = false;
                for (let step = 0; step < range; step++) {
                    tx += dx; ty += dy;
                    if (tx < 0 || tx >= this.mapWidth || ty < 0 || ty >= this.mapHeight || this.map[ty][tx] === 0 || this.map[ty][tx] === 9 || this.map[ty][tx] === 10) break;
                    const hitEnemy = this.enemies.find(e => !e.dying && e.x === tx && e.y === ty);
                    if (hitEnemy) {
                        const dmg = this.applyDamageToEnemy(hitEnemy, this.getPlayerAttack() + 6);
                        hitEnemy.hp -= dmg;
                        this.triggerHitFlash(hitEnemy); this.resetGhostDelay(hitEnemy);
                        this.spawnDamageNumber(hitEnemy.x, hitEnemy.y, `-${dmg}`, '#14b8a6');
                        hitAny = true;
                    }
                }
                this.spawnAttackSwipe(this.player.x, this.player.y, target.x, target.y);
                if (hitAny) { this.triggerCameraShake(5, 120); this.logMessage('Piercing Shot rips through your foes!', 'log-combat-player'); }
                this.checkEnemyDeaths();
                this.postTurnSystems();
            }
        }
    };

    proto.useSkill2 = function() {
        if (this.player.skillCooldown2 > 0 || this.transition || this.paused || this.isMenuOverlayOpen()) return;

        if (this.player.classType === 'warrior') {
            this.player.battleCryTurns = 8;
            this.player.skillCooldown2 = this.player.maxSkillCooldown2;
            sfx.playLevelUp();
            this.spawnLevelUpParticles();
            this.logMessage('Battle Cry! Attack and Defense bolstered.', 'log-combat-player');
            this.postTurnSystems();
        } else if (this.player.classType === 'mage') {
            if (this.player.mp >= 15) {
                this.player.mp -= 15;
                const neighbors = [ {x:0,y:1}, {x:0,y:-1}, {x:1,y:0}, {x:-1,y:0}, {x:1,y:1}, {x:-1,y:1}, {x:1,y:-1}, {x:-1,y:-1} ];
                neighbors.forEach(n => {
                    const enemy = this.enemies.find(e => e.x === this.player.x + n.x && e.y === this.player.y + n.y && !e.dying);
                    if (enemy) {
                        const dmg = this.applyDamageToEnemy(enemy, Math.floor(this.player.baseAtk * 0.8));
                        enemy.hp -= dmg;
                        this.applyStatus(enemy, 'chill', 4);
                        this.triggerHitFlash(enemy); this.resetGhostDelay(enemy);
                        this.spawnDamageNumber(enemy.x, enemy.y, `-${dmg}`, '#60a5fa');
                    }
                });
                this.spawnBloodParticles(this.player.x, this.player.y, '#60a5fa');
                this.player.skillCooldown2 = this.player.maxSkillCooldown2;
                sfx.playMagic();
                this.logMessage('Frost Nova!', 'log-combat-magic');
                this.checkEnemyDeaths();
                this.postTurnSystems();
            }
        } else if (this.player.classType === 'rogue') {
            const neighbors = [ {x:0,y:1}, {x:0,y:-1}, {x:1,y:0}, {x:-1,y:0} ];
            let hit = false;
            neighbors.forEach(n => {
                if (hit) return;
                const enemy = this.enemies.find(e => e.x === this.player.x + n.x && e.y === this.player.y + n.y && !e.dying);
                if (enemy) {
                    const dmg = this.applyDamageToEnemy(enemy, this.getPlayerAttack() + 5);
                    enemy.hp -= dmg;
                    this.applyStatus(enemy, 'poison', 5);
                    this.triggerHitFlash(enemy); this.triggerKnockback(enemy, this.player.x, this.player.y); this.resetGhostDelay(enemy);
                    this.spawnDamageNumber(enemy.x, enemy.y, `-${dmg}`, '#84cc16');
                    this.logMessage(`Poison Blade strikes ${enemy.name}!`, 'log-combat-player');
                    hit = true;
                }
            });
            if (hit) {
                sfx.playHit();
                this.player.skillCooldown2 = this.player.maxSkillCooldown2;
                this.checkEnemyDeaths();
                this.postTurnSystems();
            }
        } else if (this.player.classType === 'paladin') {
            if (this.player.mp >= 20) {
                this.player.mp -= 20;
                const layHeal = this.talents.includes('sacred_vigor') ? 53 : 35;
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + layHeal);
                this.player.statuses = [];
                this.player.skillCooldown2 = this.player.maxSkillCooldown2;
                sfx.playLevelUp();
                this.spawnLevelUpParticles();
                this.spawnDamageNumber(this.player.x, this.player.y, `+${layHeal}`, '#34d399');
                this.logMessage('Lay on Hands! Wounds close, curses lift.', 'log-level');
                this.postTurnSystems();
            }
        } else if (this.player.classType === 'necromancer') {
            if (this.player.mp >= 20) {
                let target = null, minDist = 999;
                this.enemies.forEach(e => {
                    if (e.dying) return;
                    const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
                    if (dist < 7 && this.fog[e.y][e.x] === 2 && dist < minDist) { target = e; minDist = dist; }
                });
                if (target) {
                    this.player.mp -= 20;
                    this.player.skillCooldown2 = this.player.maxSkillCooldown2;
                    sfx.playMagic();
                    this.spawnCastWindup(this.player);
                    this.particles.push({ x: this.player.visualX * this.tileSize, y: this.player.visualY * this.tileSize, tx: target.x * this.tileSize, ty: target.y * this.tileSize, life: 1, decay: 0.1, type: 'projectile', color: '#7c3aed', trailTimer: 0, cb: () => {
                        const dmg = this.applyDamageToEnemy(target, this.getPlayerAttack() + 10);
                        target.hp -= dmg;
                        const heal = Math.floor(dmg * 0.4);
                        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
                        this.triggerHitFlash(target); this.triggerKnockback(target, this.player.x, this.player.y); this.resetGhostDelay(target);
                        this.spawnBloodParticles(target.x, target.y, '#7c3aed');
                        this.spawnDamageNumber(target.x, target.y, `-${dmg}`, '#7c3aed');
                        this.spawnDamageNumber(this.player.x, this.player.y, `+${heal}`, '#34d399');
                        this.logMessage(`Drain Life siphons ${target.name}!`, 'log-combat-magic');
                        if (target.hp <= 0) { this.hitStopTimer = 70; this.triggerCameraShake(10, 150); }
                        this.checkEnemyDeaths();
                    }});
                    this.postTurnSystems();
                }
            }
        } else if (this.player.classType === 'ranger') {
            if (this.map[this.player.y][this.player.x] === 1) {
                this.playerTraps.push({ x: this.player.x, y: this.player.y, dmg: this.getPlayerAttack() + 8 });
                this.player.skillCooldown2 = this.player.maxSkillCooldown2;
                sfx.playHit();
                this.spawnShards(this.player.x, this.player.y, '#78350f');
                this.logMessage('You lay a snare trap.', 'log-combat-player');
                this.postTurnSystems();
            }
        }
    };

    proto.useUltimate = function() {
        if (this.player.lvl < 10 || this.player.ultimateCooldown > 0 || this.transition || this.paused || this.isMenuOverlayOpen()) return;

        if (this.player.classType === 'warrior') {
            let hitCount = 0;
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    if (Math.abs(dx) + Math.abs(dy) > 2) continue;
                    const tx = this.player.x + dx, ty = this.player.y + dy;
                    const enemy = this.enemies.find(e => e.x === tx && e.y === ty && !e.dying);
                    if (enemy) {
                        const dmg = this.applyDamageToEnemy(enemy, this.getPlayerAttack() * 2);
                        enemy.hp -= dmg;
                        this.applyStatus(enemy, 'stun', 2);
                        this.triggerHitFlash(enemy); this.triggerKnockback(enemy, this.player.x, this.player.y); this.resetGhostDelay(enemy);
                        this.spawnDamageNumber(tx, ty, `-${dmg}`, '#facc15');
                        hitCount++;
                    }
                }
            }
            this.player.ultimateCooldown = this.player.maxUltimateCooldown;
            this.player.battleCryTurns = Math.max(this.player.battleCryTurns, 6);
            sfx.playHit(); this.triggerCameraShake(16, 300); this.hitStopTimer = 100;
            this.spawnLevelUpParticles();
            this.logMessage(`TITAN'S WRATH! ${hitCount} enemies crushed!`, 'log-combat-player');
            this.checkEnemyDeaths();
            this.postTurnSystems();
        } else if (this.player.classType === 'mage') {
            if (this.player.mp < 35) { this.logMessage('Not enough mana!', 'log-system'); return; }
            let target = null, minDist = 999;
            this.enemies.forEach(e => { if (e.dying) return; const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y); if (dist < 8 && this.fog[e.y][e.x] === 2 && dist < minDist) { target = e; minDist = dist; } });
            if (target) {
                this.player.mp -= 35;
                this.player.ultimateCooldown = this.player.maxUltimateCooldown;
                sfx.playMagic(); this.triggerCameraShake(16, 300); this.hitStopTimer = 100;
                const cx = target.x, cy = target.y;
                let hitCount = 0;
                this.enemies.forEach(e => {
                    if (e.dying || Math.hypot(e.x - cx, e.y - cy) > 2) return;
                    const dmg = this.applyDamageToEnemy(e, Math.floor(this.getPlayerAttack() * 2.5));
                    e.hp -= dmg;
                    this.applyStatus(e, 'burn', 4);
                    this.triggerHitFlash(e); this.resetGhostDelay(e);
                    this.spawnDamageNumber(e.x, e.y, `-${dmg}`, '#f97316');
                    hitCount++;
                });
                this.spawnDeathBurst({ x: cx, y: cy, color: '#f97316' });
                this.logMessage(`METEOR STORM! ${hitCount} enemies burning!`, 'log-combat-magic');
                this.checkEnemyDeaths();
                this.postTurnSystems();
            }
        } else if (this.player.classType === 'rogue') {
            let target = null, minHp = Infinity;
            this.enemies.forEach(e => { if (e.dying) return; const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y); if (dist < 10 && this.fog[e.y][e.x] === 2 && e.hp < minHp) { target = e; minHp = e.hp; } });
            if (target) {
                const spots = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}].map(d => ({ x: target.x + d.x, y: target.y + d.y })).filter(s => this.map[s.y] && this.map[s.y][s.x] === 1 && !this.enemies.some(e => e.x === s.x && e.y === s.y));
                if (spots.length > 0) {
                    const spot = spots[Math.floor(Math.random() * spots.length)];
                    this.player.x = spot.x; this.player.y = spot.y;
                    this.player.ultimateCooldown = this.player.maxUltimateCooldown;
                    const dmg = this.applyDamageToEnemy(target, (this.getPlayerAttack() + 15) * 3);
                    target.hp -= dmg;
                    this.triggerHitFlash(target); this.resetGhostDelay(target);
                    sfx.playMagic(); this.triggerCameraShake(14, 250); this.hitStopTimer = 100;
                    this.spawnDamageNumber(target.x, target.y, 'DEATH MARK!', '#facc15');
                    this.spawnDamageNumber(target.x, target.y, `-${dmg}`, '#fb7185');
                    this.logMessage(`Death Mark obliterates ${target.name}!`, 'log-combat-player');
                    this.checkEnemyDeaths();
                    this.postTurnSystems();
                }
            }
        } else if (this.player.classType === 'paladin') {
            if (this.player.mp < 30) { this.logMessage('Not enough mana!', 'log-system'); return; }
            this.player.mp -= 30;
            this.player.ultimateCooldown = this.player.maxUltimateCooldown;
            const healPct = this.talents.includes('sacred_vigor') ? 0.75 : 0.5;
            const heal = Math.ceil(this.player.maxHp * healPct);
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
            this.player.statuses = [];
            this.spawnDamageNumber(this.player.x, this.player.y, `+${heal}`, '#34d399');
            let hitCount = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const tx = this.player.x + dx, ty = this.player.y + dy;
                    const enemy = this.enemies.find(e => e.x === tx && e.y === ty && !e.dying);
                    if (enemy) {
                        const dmg = this.applyDamageToEnemy(enemy, Math.floor(this.getPlayerAttack() * 1.8));
                        enemy.hp -= dmg;
                        this.triggerHitFlash(enemy); this.resetGhostDelay(enemy);
                        this.spawnDamageNumber(tx, ty, `-${dmg}`, '#facc15');
                        hitCount++;
                    }
                }
            }
            sfx.playLevelUp(); this.triggerCameraShake(12, 250); this.spawnLevelUpParticles();
            this.logMessage(`DIVINE JUDGMENT! Healed and smote ${hitCount} foes!`, 'log-level');
            this.checkEnemyDeaths();
            this.postTurnSystems();
        } else if (this.player.classType === 'necromancer') {
            if (this.player.mp < 40) { this.logMessage('Not enough mana!', 'log-system'); return; }
            this.player.mp -= 40;
            this.player.ultimateCooldown = this.player.maxUltimateCooldown;
            this.allies = this.allies.filter(a => a.type !== 'summon');
            let count = 0;
            for (let tries = 0; tries < 30 && count < 3; tries++) {
                const dx = Math.floor(Math.random() * 5) - 2, dy = Math.floor(Math.random() * 5) - 2;
                const sx = this.player.x + dx, sy = this.player.y + dy;
                if (this.map[sy] && this.map[sy][sx] === 1 && !this.enemies.some(e => e.x === sx && e.y === sy) && !this.allies.some(a => a.x === sx && a.y === sy)) {
                    this.allies.push({ x: sx, y: sy, visualX: sx, visualY: sy, icon: '💀', color: '#a78bfa', name: 'Raised Skeleton', type: 'summon', turnsLeft: 60, atk: 6 + this.player.lvl, hitFlash: 0, knockX: 0, knockY: 0 });
                    count++;
                }
            }
            sfx.playMagic(); this.triggerCameraShake(10, 200); this.spawnLevelUpParticles();
            this.logMessage(`ARMY OF THE DEAD! ${count} skeletons rise!`, 'log-combat-player');
            this.checkAchievements();
            this.postTurnSystems();
        } else if (this.player.classType === 'ranger') {
            const range = this.getFovRadius();
            const targets = this.enemies.filter(e => !e.dying && this.fog[e.y] && this.fog[e.y][e.x] === 2 && Math.hypot(e.x - this.player.x, e.y - this.player.y) <= range);
            if (targets.length > 0) {
                this.player.ultimateCooldown = this.player.maxUltimateCooldown;
                targets.forEach(t => {
                    const dmg = this.applyDamageToEnemy(t, Math.floor(this.getPlayerAttack() * 1.4));
                    t.hp -= dmg;
                    this.triggerHitFlash(t); this.resetGhostDelay(t);
                    this.spawnDamageNumber(t.x, t.y, `-${dmg}`, '#14b8a6');
                });
                sfx.playHit(); this.triggerCameraShake(12, 250); this.hitStopTimer = 80;
                this.logMessage(`RAIN OF ARROWS! ${targets.length} enemies struck!`, 'log-combat-player');
                this.checkEnemyDeaths();
                this.postTurnSystems();
            }
        }
    };
}
