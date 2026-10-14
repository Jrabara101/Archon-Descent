import { sfx } from './audio.js';

export const skillMethods = {
    // [new] 
    useSkill() {
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
                    this.fxImpact(tx, ty, '#facc15');
                    hit = true;
                }
            });
            if (hit) {
                sfx.playHit(); this.triggerCameraShake(10, 200);
                this.fxNova(this.player.x, this.player.y, '#facc15', 2.2, 560);
                this.pulseSkillIcon('ability-1');
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
                    this.fxCastCircle(this.player.x, this.player.y, '#f97316', 620);
                    this.pulseSkillIcon('ability-1');
                    this.particles.push({ x: this.player.visualX * this.tileSize, y: this.player.visualY * this.tileSize, tx: target.x * this.tileSize, ty: target.y * this.tileSize, life: 1, decay: 0.1, type: 'projectile', color: '#f97316', trailTimer: 0, cb: () => {
                        const fireballDmg = this.applyDamageToEnemy(target, this.player.baseAtk * 2);
                        target.hp -= fireballDmg;
                        this.applyStatus(target, 'burn', 3);
                        this.triggerHitFlash(target); this.triggerKnockback(target, this.player.x, this.player.y); this.resetGhostDelay(target);
                        this.spawnBloodParticles(target.x, target.y, '#f97316');
                        this.spawnSparks(target.x, target.y);
                        this.spawnDamageNumber(target.x, target.y, `-${fireballDmg}`, '#f97316');
                        this.fxNova(target.x, target.y, '#f97316', 2, 520);
                        this.fxImpact(target.x, target.y, '#fbbf24');
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
                const fromX = this.player.x, fromY = this.player.y;
                this.player.x = choice.x; this.player.y = choice.y;
                sfx.playMagic();
                this.fxNova(fromX, fromY, '#34d399', 1.4, 460);
                this.fxBeam(fromX, fromY, choice.x, choice.y, '#34d399', 360);
                this.fxNova(choice.x, choice.y, '#34d399', 1.4, 460);
                this.pulseSkillIcon('ability-1');
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
                    this.fxSlash(this.player.x, this.player.y, tx, ty, '#facc15');
                    this.fxImpact(tx, ty, '#fde68a');
                    this.fxUplift(this.player.x, this.player.y, '#34d399', 5, 700);
                    this.spawnDamageNumber(tx, ty, `-${dmg}`, '#facc15');
                    this.spawnDamageNumber(this.player.x, this.player.y, `+${heal}`, '#34d399');
                    this.logMessage(`Holy Strike smites ${enemy.name}!`, 'log-combat-player');
                    hit = true;
                }
            });
            if (hit) {
                sfx.playHit(); this.triggerCameraShake(6, 150);
                this.pulseSkillIcon('ability-1');
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
                    this.fxCastCircle(this.player.x, this.player.y, '#a78bfa', 700);
                    this.fxUplift(spot.x, spot.y, '#a78bfa', 9, 820);
                    this.pulseSkillIcon('ability-1');
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
                        this.fxImpact(hitEnemy.x, hitEnemy.y, '#14b8a6');
                        hitAny = true;
                    }
                }
                this.spawnAttackSwipe(this.player.x, this.player.y, target.x, target.y);
                this.fxBeam(this.player.x, this.player.y, tx, ty, '#14b8a6', 400);
                this.pulseSkillIcon('ability-1');
                if (hitAny) { this.triggerCameraShake(5, 120); this.logMessage('Piercing Shot rips through your foes!', 'log-combat-player'); }
                this.checkEnemyDeaths();
                this.postTurnSystems();
            }
        }
    },

    // [new] 
    useSkill2() {
        if (this.player.skillCooldown2 > 0 || this.transition || this.paused || this.isMenuOverlayOpen()) return;

        if (this.player.classType === 'warrior') {
            this.player.battleCryTurns = 8;
            this.player.skillCooldown2 = this.player.maxSkillCooldown2;
            sfx.playLevelUp();
            this.spawnLevelUpParticles();
            this.fxNova(this.player.x, this.player.y, '#ef4444', 2.6, 700);
            setTimeout(() => this.fxNova(this.player.x, this.player.y, '#fca5a5', 3.2, 700), 140);
            this.fxUplift(this.player.x, this.player.y, '#ef4444', 8, 780);
            this.pulseSkillIcon('ability-2');
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
                        this.fxImpact(enemy.x, enemy.y, '#bfdbfe', 340);
                    }
                });
                this.spawnBloodParticles(this.player.x, this.player.y, '#60a5fa');
                this.fxCastCircle(this.player.x, this.player.y, '#60a5fa', 520);
                this.fxNova(this.player.x, this.player.y, '#60a5fa', 1.8, 600);
                this.pulseSkillIcon('ability-2');
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
                    this.fxSlash(this.player.x, this.player.y, enemy.x, enemy.y, '#84cc16');
                    this.fxUplift(enemy.x, enemy.y, '#84cc16', 5, 900);
                    this.pulseSkillIcon('ability-2');
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
                this.fxCastCircle(this.player.x, this.player.y, '#facc15', 820);
                this.fxUplift(this.player.x, this.player.y, '#34d399', 12, 900);
                this.pulseSkillIcon('ability-2');
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
                    this.fxCastCircle(this.player.x, this.player.y, '#7c3aed', 620);
                    this.pulseSkillIcon('ability-2');
                    this.particles.push({ x: this.player.visualX * this.tileSize, y: this.player.visualY * this.tileSize, tx: target.x * this.tileSize, ty: target.y * this.tileSize, life: 1, decay: 0.1, type: 'projectile', color: '#7c3aed', trailTimer: 0, cb: () => {
                        const dmg = this.applyDamageToEnemy(target, this.getPlayerAttack() + 10);
                        target.hp -= dmg;
                        const heal = Math.floor(dmg * 0.4);
                        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
                        this.triggerHitFlash(target); this.triggerKnockback(target, this.player.x, this.player.y); this.resetGhostDelay(target);
                        this.spawnBloodParticles(target.x, target.y, '#7c3aed');
                        this.spawnDamageNumber(target.x, target.y, `-${dmg}`, '#7c3aed');
                        this.spawnDamageNumber(this.player.x, this.player.y, `+${heal}`, '#34d399');
                        // Siphon reads target -> caster, the opposite of the bolt.
                        this.fxBeam(target.x, target.y, this.player.x, this.player.y, '#7c3aed', 520);
                        this.fxUplift(this.player.x, this.player.y, '#34d399', 6, 700);
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
                this.fxNova(this.player.x, this.player.y, '#a16207', 1.2, 480);
                this.fxImpact(this.player.x, this.player.y, '#a16207', 420);
                this.pulseSkillIcon('ability-2');
                this.logMessage('You lay a snare trap.', 'log-combat-player');
                this.postTurnSystems();
            }
        }
    },

    // [new] 
    useUltimate() {
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
            this.fxImpact(this.player.x, this.player.y, '#facc15', 520);
            [0, 130, 260].forEach((d, i) => setTimeout(
                () => this.fxNova(this.player.x, this.player.y, i % 2 ? '#fde68a' : '#ef4444', 2.4 + i * 0.9, 720), d));
            this.pulseSkillIcon('ability-ult');
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
                this.fxSkyfall(cx, cy, '#f97316', 560);
                // Scattered secondary strikes around the epicentre.
                [[-1,-1],[1,-1],[-1,1],[1,1],[2,0],[-2,0]].forEach(([ox, oy], i) =>
                    setTimeout(() => this.fxSkyfall(cx + ox, cy + oy, '#fb923c', 460), 120 + i * 90));
                this.pulseSkillIcon('ability-ult');
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
                    const markFromX = this.player.x, markFromY = this.player.y;
                    this.player.x = spot.x; this.player.y = spot.y;
                    this.fxBeam(markFromX, markFromY, spot.x, spot.y, '#34d399', 320);
                    this.player.ultimateCooldown = this.player.maxUltimateCooldown;
                    const dmg = this.applyDamageToEnemy(target, (this.getPlayerAttack() + 15) * 3);
                    target.hp -= dmg;
                    this.triggerHitFlash(target); this.resetGhostDelay(target);
                    sfx.playMagic(); this.triggerCameraShake(14, 250); this.hitStopTimer = 100;
                    this.fxSlash(spot.x, spot.y, target.x, target.y, '#fb7185', 380);
                    this.fxImpact(target.x, target.y, '#fb7185', 520);
                    this.fxNova(target.x, target.y, '#fb7185', 2, 620);
                    this.pulseSkillIcon('ability-ult');
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
                        this.fxSkyfall(tx, ty, '#facc15', 480);
                        hitCount++;
                    }
                }
            }
            sfx.playLevelUp(); this.triggerCameraShake(12, 250); this.spawnLevelUpParticles();
            this.fxSkyfall(this.player.x, this.player.y, '#fde68a', 620);
            this.fxCastCircle(this.player.x, this.player.y, '#facc15', 900);
            this.fxUplift(this.player.x, this.player.y, '#34d399', 14, 900);
            this.pulseSkillIcon('ability-ult');
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
                    setTimeout(() => { this.fxNova(sx, sy, '#a78bfa', 1.2, 520); this.fxUplift(sx, sy, '#a78bfa', 8, 820); }, count * 110);
                    count++;
                }
            }
            sfx.playMagic(); this.triggerCameraShake(10, 200); this.spawnLevelUpParticles();
            this.fxCastCircle(this.player.x, this.player.y, '#a78bfa', 1000);
            this.pulseSkillIcon('ability-ult');
            this.logMessage(`ARMY OF THE DEAD! ${count} skeletons rise!`, 'log-combat-player');
            this.checkAchievements();
            this.postTurnSystems();
        } else if (this.player.classType === 'ranger') {
            const range = this.getFovRadius();
            const targets = this.enemies.filter(e => !e.dying && this.fog[e.y] && this.fog[e.y][e.x] === 2 && Math.hypot(e.x - this.player.x, e.y - this.player.y) <= range);
            if (targets.length > 0) {
                this.player.ultimateCooldown = this.player.maxUltimateCooldown;
                targets.forEach((t, i) => {
                    const dmg = this.applyDamageToEnemy(t, Math.floor(this.getPlayerAttack() * 1.4));
                    t.hp -= dmg;
                    this.triggerHitFlash(t); this.resetGhostDelay(t);
                    this.spawnDamageNumber(t.x, t.y, `-${dmg}`, '#14b8a6');
                    setTimeout(() => this.fxSkyfall(t.x, t.y, '#14b8a6', 440), i * 70);
                });
                sfx.playHit(); this.triggerCameraShake(12, 250); this.hitStopTimer = 80;
                this.pulseSkillIcon('ability-ult');
                this.logMessage(`RAIN OF ARROWS! ${targets.length} enemies struck!`, 'log-combat-player');
                this.checkEnemyDeaths();
                this.postTurnSystems();
            }
        }
    },

    // The SVG layer is rendered by React directly above the canvas (see GameStage).
    initSkillFXLayer() {
        const layer = this.fxLayer;
        if (!layer) return;
        layer.innerHTML = `
            <defs>
                <radialGradient id="fx-glow-grad">
                    <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
                    <stop offset="45%" stop-color="#fff" stop-opacity="0.45"/>
                    <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
                </radialGradient>
                <mask id="fx-glow-mask" maskContentUnits="objectBoundingBox">
                    <circle cx="0.5" cy="0.5" r="0.5" fill="url(#fx-glow-grad)"/>
                </mask>
            </defs>`;
        this.fxWorld = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        layer.appendChild(this.fxWorld);
        this.resizeSkillFXLayer();
    },

    resizeSkillFXLayer() {
        if (!this.fxLayer || !this.canvas) return;
        const w = this.canvas.width, h = this.canvas.height;
        this.fxLayer.setAttribute('width', w);
        this.fxLayer.setAttribute('height', h);
        this.fxLayer.setAttribute('viewBox', `0 0 ${w} ${h}`);
    },

    // [new] 
    syncSkillFXCamera(ox, oy) {
        if (this.fxWorld) this.fxWorld.setAttribute('transform', `translate(${ox} ${oy})`);
    },

    // [new] 
    addWorldFX(markup, lifeMs) {
        if (!this.fxWorld) return null;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'fx-node');
        g.innerHTML = markup;
        this.fxWorld.appendChild(g);
        setTimeout(() => { if (g.parentNode) g.parentNode.removeChild(g); }, lifeMs);
        return g;
    },

    // [new] 
    tileCenter(x, y) {
        return { cx: (x + 0.5) * this.tileSize, cy: (y + 0.5) * this.tileSize };
    },

    // [new] 
    fxNova(x, y, color, radiusTiles = 3, ms = 620) {
        const { cx, cy } = this.tileCenter(x, y);
        const r = radiusTiles * this.tileSize;
        this.addWorldFX(`
            <circle class="fx-nova-ring" cx="${cx}" cy="${cy}" r="${r}"
                    stroke="${color}" style="--fx-ms:${ms}ms"/>
            <circle class="fx-nova-glow" cx="${cx}" cy="${cy}" r="${r}"
                    fill="${color}" mask="url(#fx-glow-mask)" style="--fx-ms:${ms}ms"/>`, ms + 60);
    },

    // [new] 
    fxCastCircle(x, y, color, ms = 900) {
        const { cx, cy } = this.tileCenter(x, y);
        const r = this.tileSize * 1.15;
        this.addWorldFX(`
            <g class="fx-cast-circle" style="--fx-ms:${ms}ms"
               transform="translate(${cx} ${cy})">
                <circle r="${r}" stroke="${color}" class="fx-cast-outer"/>
                <circle r="${r * 0.66}" stroke="${color}" class="fx-cast-inner"/>
                <path class="fx-cast-runes" stroke="${color}"
                      d="M${-r} 0h${r * 0.3}M${r * 0.7} 0h${r * 0.3}M0 ${-r}v${r * 0.3}M0 ${r * 0.7}v${r * 0.3}"/>
            </g>`, ms + 60);
    },

    // [new] 
    fxBeam(fromX, fromY, toX, toY, color, ms = 420) {
        const a = this.tileCenter(fromX, fromY);
        const b = this.tileCenter(toX, toY);
        this.addWorldFX(`
            <line class="fx-beam-glow" x1="${a.cx}" y1="${a.cy}" x2="${b.cx}" y2="${b.cy}"
                  stroke="${color}" style="--fx-ms:${ms}ms"/>
            <line class="fx-beam-core" x1="${a.cx}" y1="${a.cy}" x2="${b.cx}" y2="${b.cy}"
                  stroke="${color}" style="--fx-ms:${ms}ms"/>`, ms + 60);
    },

    // [new] 
    fxSlash(fromX, fromY, toX, toY, color, ms = 340) {
        const a = this.tileCenter(fromX, fromY);
        const b = this.tileCenter(toX, toY);
        const angle = Math.atan2(b.cy - a.cy, b.cx - a.cx) * 180 / Math.PI;
        const r = this.tileSize * 0.9;
        this.addWorldFX(`
            <g class="fx-slash" style="--fx-ms:${ms}ms"
               transform="translate(${b.cx} ${b.cy}) rotate(${angle})">
                <path stroke="${color}" d="M${-r * 0.2} ${-r} A ${r} ${r} 0 0 1 ${-r * 0.2} ${r}"/>
            </g>`, ms + 60);
    },

    // [new] 
    fxImpact(x, y, color, ms = 380) {
        const { cx, cy } = this.tileCenter(x, y);
        const r = this.tileSize * 0.75;
        let spokes = '';
        for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2;
            spokes += `<line x1="${Math.cos(ang) * r * 0.3}" y1="${Math.sin(ang) * r * 0.3}"
                             x2="${Math.cos(ang) * r}" y2="${Math.sin(ang) * r}" stroke="${color}"/>`;
        }
        this.addWorldFX(`
            <g class="fx-impact" style="--fx-ms:${ms}ms" transform="translate(${cx} ${cy})">
                ${spokes}
            </g>`, ms + 60);
    },

    // [new] 
    fxUplift(x, y, color, count = 7, ms = 780) {
        const { cx, cy } = this.tileCenter(x, y);
        let motes = '';
        for (let i = 0; i < count; i++) {
            const dx = (Math.random() - 0.5) * this.tileSize * 1.4;
            const delay = Math.random() * 220;
            const rise = this.tileSize * (1.2 + Math.random() * 0.8);
            motes += `<circle class="fx-mote" cx="${cx + dx}" cy="${cy + this.tileSize * 0.4}"
                              r="${2 + Math.random() * 2.5}" fill="${color}"
                              style="--fx-ms:${ms}ms; --fx-delay:${delay}ms; --fx-rise:${rise}px"/>`;
        }
        this.addWorldFX(motes, ms + 300);
    },

    // [new] 
    fxSkyfall(x, y, color, ms = 520) {
        const { cx, cy } = this.tileCenter(x, y);
        const w = this.tileSize * 0.55;
        const h = this.tileSize * 6;
        this.addWorldFX(`
            <g class="fx-skyfall" style="--fx-ms:${ms}ms">
                <rect x="${cx - w / 2}" y="${cy - h}" width="${w}" height="${h}"
                      fill="${color}" class="fx-skyfall-beam"/>
            </g>`, ms + 60);
        setTimeout(() => this.fxNova(x, y, color, 1.6, 420), ms * 0.55);
    },
};
