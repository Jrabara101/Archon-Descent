// ============================================================================
// --- COMBAT, AI, SKILLS & ENTITY SYSTEMS ---
// ============================================================================

function attachCombatMethods(proto) {
    proto.generateBossArena = function() {
        this.isBossArena = true;
        const cx = Math.floor(this.mapWidth / 2);
        const cy = Math.floor(this.mapHeight / 2);
        const radius = 16;

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (Math.hypot(x - cx, y - cy) <= radius) this.map[y][x] = 1;
            }
        }

        const pillarCount = 10;
        for (let i = 0; i < pillarCount; i++) {
            const angle = (i / pillarCount) * Math.PI * 2;
            const pr = radius * 0.55;
            const px = Math.round(cx + Math.cos(angle) * pr);
            const py = Math.round(cy + Math.sin(angle) * pr);
            if (px >= 0 && px < this.mapWidth && py >= 0 && py < this.mapHeight && this.map[py][px] === 1) {
                this.placeDestructible(px, py, 'crate');
            }
        }

        const arenaBiome = this.textures.currentBiome;
        for (let i = 0; i < 14; i++) {
            const angle = Math.random() * Math.PI * 2;
            const pr = radius * (0.75 + Math.random() * 0.2);
            const px = Math.round(cx + Math.cos(angle) * pr);
            const py = Math.round(cy + Math.sin(angle) * pr);
            if (px >= 0 && px < this.mapWidth && py >= 0 && py < this.mapHeight && this.map[py][px] === 1) {
                if (arenaBiome === 'forges') this.map[py][px] = 7;
                else if (arenaBiome === 'void') this.map[py][px] = 8;
                else this.placeSpike(px, py);
            }
        }

        this.player.x = cx; this.player.y = cy + radius - 2;
        this.player.visualX = this.player.x; this.player.visualY = this.player.y;

        this.stairs = { x: cx, y: cy - radius + 2 };
        this.map[this.stairs.y][this.stairs.x] = 3;

        const torchCount = 8;
        for (let i = 0; i < torchCount; i++) {
            const angle = (i / torchCount) * Math.PI * 2;
            const tx = Math.round(cx + Math.cos(angle) * (radius + 1));
            const ty = Math.round(cy + Math.sin(angle) * (radius + 1));
            this.spawnTorchAt(tx, ty);
        }

        this.spawnBoss(cx, cy - radius + 5);
    };

    proto.spawnBoss = function(x, y) {
        const b = this.textures.currentBiome;
        let name = 'Bone Colossus', hp = 220, atk = 18, def = 6, xp = 400, icon = '💀', color = '#e2e8f0', codexKey = 'bone_colossus';
        if (b === 'forges') { name = 'Molten Behemoth'; hp = 280; atk = 22; def = 8; xp = 500; icon = '🌋'; color = '#f97316'; codexKey = 'molten_behemoth'; }
        else if (b === 'void') { name = 'Void Archon Prime'; hp = 360; atk = 28; def = 10; xp = 700; icon = '🐲'; color = '#a855f7'; codexKey = 'void_archon_prime'; }

        const depthBonus = Math.floor(this.level / 10);
        hp += depthBonus * 60; atk += depthBonus * 6; xp += depthBonus * 100;

        const ascension = this.ascensionTier || 0;
        if (ascension > 0) {
            hp = Math.floor(hp * (1 + ascension * 0.4));
            atk = Math.floor(atk * (1 + ascension * 0.25));
            xp = Math.floor(xp * (1 + ascension * 0.5));
            name = `Ascendant ${name}`;
        }

        this.enemies.push({ x, y, visualX: x, visualY: y, name, hp, maxHp: hp, atk, def, xpReward: xp, icon, color, codexKey, ai: 'telegraph', statuses: [], aware: true, elite: false, affixes: [], isBoss: true, phase: 1, hitFlash: 0, knockX: 0, knockY: 0, ghostHp: hp, ghostDelay: 0, dying: false, deathTimer: 0 });

        const alreadyBeaten = !!(this.meta.stats && this.meta.stats.bossesDefeated && this.meta.stats.bossesDefeated.includes(codexKey));
        if (this.settings.storyMode && !alreadyBeaten && !this.dailyMode && !this.bossRushMode && !this.endlessMode && !this.trialMode) {
            const act = BOSS_ACT_LORE[codexKey];
            if (act && act.pre) this.showLoreToast(act.pre);
        }
    };

    proto.generateEndlessArena = function() {
        this.isEndlessArena = true;
        const cx = Math.floor(this.mapWidth / 2);
        const cy = Math.floor(this.mapHeight / 2);
        const radius = 16;

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (Math.hypot(x - cx, y - cy) <= radius) this.map[y][x] = 1;
            }
        }

        const pillarCount = 10;
        for (let i = 0; i < pillarCount; i++) {
            const angle = (i / pillarCount) * Math.PI * 2;
            const pr = radius * 0.55;
            const px = Math.round(cx + Math.cos(angle) * pr);
            const py = Math.round(cy + Math.sin(angle) * pr);
            if (px >= 0 && px < this.mapWidth && py >= 0 && py < this.mapHeight && this.map[py][px] === 1) {
                this.placeDestructible(px, py, 'crate');
            }
        }

        this.player.x = cx; this.player.y = cy;
        this.player.visualX = cx; this.player.visualY = cy;
        this.stairs = { x: -1, y: -1 };

        const torchCount = 8;
        for (let i = 0; i < torchCount; i++) {
            const angle = (i / torchCount) * Math.PI * 2;
            const tx = Math.round(cx + Math.cos(angle) * (radius + 1));
            const ty = Math.round(cy + Math.sin(angle) * (radius + 1));
            this.spawnTorchAt(tx, ty);
        }

        this.endlessWave = 0;
        this.spawnNextEndlessWave();
    };

    proto.spawnNextEndlessWave = function() {
        this.endlessWave++;
        const cx = Math.floor(this.mapWidth / 2);
        const cy = Math.floor(this.mapHeight / 2);
        const radius = 16;
        const waveEnemyCount = Math.min(14, 3 + Math.floor(this.endlessWave * 1.4));

        const savedLevel = this.level;
        this.level = 3 + this.endlessWave * 2;
        for (let i = 0; i < waveEnemyCount; i++) {
            for (let tries = 0; tries < 20; tries++) {
                const angle = Math.random() * Math.PI * 2;
                const r = 4 + Math.random() * (radius - 6);
                const ex = Math.round(cx + Math.cos(angle) * r);
                const ey = Math.round(cy + Math.sin(angle) * r);
                if (this.map[ey] && this.map[ey][ex] === 1 && !this.enemies.some(e => e.x === ex && e.y === ey)) {
                    this.spawnEnemy(ex, ey);
                    const spawned = this.enemies[this.enemies.length - 1];
                    if (spawned) spawned.aware = true;
                    break;
                }
            }
        }
        this.level = savedLevel;

        this.logMessage(`Wave ${this.endlessWave} begins! (${waveEnemyCount} enemies)`, 'log-combat-enemy');
        this.triggerCameraShake(6, 200);
        this.dungeonLevel.innerText = `ENDLESS · WAVE ${this.endlessWave} - ${this.textures.currentBiome.toUpperCase()}`;
        this.drawMinimap();

        if (!this.meta.stats) this.meta.stats = {};
        if (!this.meta.stats.bestWave || this.endlessWave > this.meta.stats.bestWave) {
            this.meta.stats.bestWave = this.endlessWave;
            this.saveMeta();
        }
        this.checkAchievements();
    };

    proto.startEndlessBreather = function() {
        this.endlessBreatherTimer = 1800;
        this.logMessage('Wave cleared! A brief respite before the next wave...', 'log-level');
        sfx.playLevelUp();
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.ceil(this.player.maxHp * 0.15));
        this.player.mp = Math.min(this.player.maxMp, this.player.mp + Math.ceil(this.player.maxMp * 0.15));
        this.updateStatsUI();
    };

    proto.spawnTorchAt = function(x, y) {
        if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
            if (this.map[y][x] === 0) this.torches.push({ x, y, flickerPhase: Math.random() * Math.PI * 2 });
        }
    };

    proto.spawnEnemy = function(x, y) {
        const b = this.textures.currentBiome;
        let name = 'Goblin Scout', hp = 20, atk = 6, def = 0, xp = 20, icon = '👹', color = '#fb7185';
        let ai = 'melee', codexKey = 'goblin_scout';
        let roll = Math.random();

        if (b === 'catacombs') {
            if (roll > 0.8) { name = 'Skeleton Archer'; icon = '🏹'; color = '#d1d5db'; hp=15; atk=8; ai='ranged'; codexKey='skeleton_archer'; }
            else if (roll > 0.6) { name = 'Savage Orc'; icon = '👺'; color = '#a7f3d0'; hp=35; atk=10; def=2; xp=45; codexKey='savage_orc'; }
        } else if (b === 'forges') {
            if (roll > 0.7) { name = 'Fire Elemental'; icon = '🔥'; color = '#f97316'; hp=40; atk=12; ai='exploder'; codexKey='fire_elemental'; }
            else { name = 'Lava Orc'; icon = '👺'; color = '#dc2626'; hp=50; atk=15; def=4; xp=60; codexKey='lava_orc'; }
        } else if (b === 'void') {
            if (roll > 0.6) { name = 'Void Summoner'; icon = '👁️'; color = '#9333ea'; hp=60; atk=10; ai='summoner'; xp=100; codexKey='void_summoner'; }
            else { name = 'Void Archon'; icon = '🐉'; color = '#c084fc'; hp=80; atk=20; def=6; xp=150; ai='telegraph'; codexKey='void_archon'; }
        }

        const specialRoll = Math.random();
        if (ai === 'melee' && specialRoll < 0.12) {
            name = 'Iron Guardian'; icon = '🛡️'; color = '#94a3b8';
            hp = Math.floor(hp * 2.2); atk = Math.floor(atk * 0.8); def += 6; ai = 'tank';
            codexKey = 'iron_guardian';
        } else if (ai === 'melee' && specialRoll < 0.20) {
            name = 'Hex Weaver'; icon = '🕸️'; color = '#7c3aed';
            hp = Math.floor(hp * 0.75); atk = Math.floor(atk * 0.5); ai = 'trapper';
            codexKey = 'hex_weaver';
        }

        hp += this.level * 5; atk += this.level * 2; def += this.level; xp += this.level * 5;

        let elite = false, affixes = [];
        const eliteChance = Math.min(0.30, 0.06 + this.level * 0.01);
        if (Math.random() < eliteChance) {
            elite = true;
            const affixCount = Math.random() < 0.25 ? 2 : 1;
            affixes = AFFIX_POOL.slice().sort(() => Math.random() - 0.5).slice(0, affixCount);
            hp = Math.floor(hp * 1.7); atk = Math.floor(atk * 1.35); def += 2; xp = Math.floor(xp * 2.2);
            name = `${AFFIX_NAMES[affixes[0]]} ${name}`;
        }

        this.enemies.push({ x, y, visualX: x, visualY: y, name, hp, maxHp: hp, atk, def, xpReward: xp, icon, color, codexKey, ai, statuses: [], aware: false, elite, affixes, hitFlash: 0, knockX: 0, knockY: 0, ghostHp: hp, ghostDelay: 0, dying: false, deathTimer: 0, wardCharge: affixes.includes('warded') ? 1 : 0, wardCooldown: 0, combatTurns: 0 });
    };

    proto.spawnChest = function(x, y) {
        if (x === this.stairs.x && y === this.stairs.y) return;
        const mimic = this.level >= 2 && Math.random() < 0.12;
        this.chests.push({ x, y, opened: false, mimic });
    };

    proto.spawnChampion = function(x, y) {
        this.spawnEnemy(x, y);
        const champ = this.enemies[this.enemies.length - 1];
        if (!champ) return;
        champ.name = `Champion ${champ.name}`;
        champ.hp = Math.floor(champ.hp * 2.5); champ.maxHp = champ.hp; champ.ghostHp = champ.hp;
        champ.atk = Math.floor(champ.atk * 1.5);
        champ.def += 4;
        champ.xpReward = Math.floor(champ.xpReward * 3);
        champ.elite = true;
        champ.isChampion = true;
        if (!champ.affixes || champ.affixes.length === 0) {
            champ.affixes = AFFIX_POOL.slice().sort(() => Math.random() - 0.5).slice(0, 2);
        }
        champ.wardCharge = champ.affixes.includes('warded') ? 1 : 0;
        champ.wardCooldown = 0;
        champ.telegraphed = false;
    };

    proto.spawnAmbush = function(trigger) {
        trigger.spawned = true;
        let count = 0;
        for (let tries = 0; tries < 20 && count < trigger.count; tries++) {
            const ex = trigger.rx + 1 + Math.floor(Math.random() * (trigger.rw - 2));
            const ey = trigger.ry + 1 + Math.floor(Math.random() * (trigger.rh - 2));
            if (this.map[ey] && this.map[ey][ex] === 1 && !this.enemies.some(e => e.x === ex && e.y === ey) && !(ex === this.player.x && ey === this.player.y)) {
                this.spawnEnemy(ex, ey);
                const spawned = this.enemies[this.enemies.length - 1];
                if (spawned) spawned.aware = true;
                count++;
            }
        }
        if (count > 0) {
            this.triggerCameraShake(10, 200);
            sfx.playHurt();
            this.logMessage('Enemies ambush you!', 'log-combat-enemy');
        }
    };

    proto.startHorde = function(trigger) {
        trigger.spawned = true;
        this.hordeState = { room: trigger, wave: 0, maxWaves: 3, active: true };
        this.logMessage('The chamber seals! Survive the onslaught!', 'log-combat-enemy');
        this.triggerCameraShake(10, 200);
        sfx.playHurt();
        this.spawnHordeWave();
    };

    proto.spawnHordeWave = function() {
        const hs = this.hordeState;
        if (!hs) return;
        hs.wave++;
        const room = hs.room;
        const count = 2 + hs.wave;
        for (let i = 0; i < count; i++) {
            for (let tries = 0; tries < 20; tries++) {
                const ex = room.rx + 1 + Math.floor(Math.random() * (room.rw - 2));
                const ey = room.ry + 1 + Math.floor(Math.random() * (room.rh - 2));
                if (this.map[ey] && this.map[ey][ex] === 1 && !this.enemies.some(e => e.x === ex && e.y === ey) && !(ex === this.player.x && ey === this.player.y)) {
                    this.spawnEnemy(ex, ey);
                    const spawned = this.enemies[this.enemies.length - 1];
                    if (spawned) { spawned.aware = true; spawned.hordeTag = true; }
                    break;
                }
            }
        }
        this.triggerCameraShake(6, 150);
        this.logMessage(`Wave ${hs.wave}/${hs.maxWaves} incoming!`, 'log-combat-enemy');
    };

    proto.finishHorde = function() {
        const hs = this.hordeState;
        if (!hs) return;
        this.hordeState = null;
        const room = hs.room;
        this.spawnChest(room.x, room.y);
        this.dropGoldAt(room.x, room.y, 40 + this.level * 8);
        sfx.playLevelUp();
        this.spawnLevelUpParticles();
        this.logMessage('The onslaught ends. The chamber yields its reward.', 'log-loot');
    };

    proto.placeSecretWalls = function() {
        if (Math.random() > 0.5) return;
        let remaining = 1 + (Math.random() < 0.3 ? 1 : 0);
        for (let tries = 0; tries < 60 && remaining > 0; tries++) {
            const x = 2 + Math.floor(Math.random() * (this.mapWidth - 4));
            const y = 2 + Math.floor(Math.random() * (this.mapHeight - 4));
            if (this.map[y][x] !== 0) continue;
            const neighbors = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
            const floorNeighbors = neighbors.filter(d => this.map[y+d.y] && this.map[y+d.y][x+d.x] === 1).length;
            if (floorNeighbors !== 1) continue;
            this.map[y][x] = 9;
            this.secretWalls.push({ x, y });
            remaining--;
        }
    };

    proto.placeSpike = function(x, y) {
        this.map[y][x] = 5;
        this.trapStates[`${x},${y}`] = { active: Math.random() < 0.5, timer: 2 + Math.floor(Math.random() * 3) };
    };
    proto.placeDestructible = function(x, y, type = 'crate') {
        this.map[y][x] = 4;
        this.destructibles.push({ x, y, hp: 1, type });
    };
    proto.placeLavaPatch = function(x, y) {
        [{x,y},{x:x+1,y},{x:x-1,y},{x,y:y+1}].forEach(c => { if (this.map[c.y] && this.map[c.y][c.x] === 1) this.map[c.y][c.x] = 7; });
    };
    proto.placeWebPatch = function(x, y) {
        [{x,y},{x:x+1,y},{x:x-1,y},{x,y:y+1}].forEach(c => { if (this.map[c.y] && this.map[c.y][c.x] === 1) this.map[c.y][c.x] = 8; });
    };

    proto.updateUnstableFloor = function() {
        if (!this.unstableFloor) return;
        this.unstableTimer--;
        if (this.unstableTimer > 0) return;
        this.unstableTimer = 8 + Math.floor(Math.random() * 6);

        const hazards = [];
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const t = this.map[y][x];
                if (t === 5 || t === 7 || t === 8) hazards.push({ x, y, t });
            }
        }
        if (hazards.length === 0) return;
        const pick = hazards[Math.floor(Math.random() * hazards.length)];
        this.map[pick.y][pick.x] = 1;
        delete this.trapStates[`${pick.x},${pick.y}`];

        for (let tries = 0; tries < 20; tries++) {
            const nx = pick.x + Math.floor(Math.random() * 11) - 5;
            const ny = pick.y + Math.floor(Math.random() * 11) - 5;
            if (this.map[ny] && this.map[ny][nx] === 1 && !(nx === this.player.x && ny === this.player.y) && !this.enemies.some(e => e.x === nx && e.y === ny)) {
                if (pick.t === 5) this.placeSpike(nx, ny);
                else this.map[ny][nx] = pick.t;
                if (this.fog[ny][nx] === 2) this.spawnSparks(nx, ny);
                break;
            }
        }
    };

    proto.randomShrineType = function() {
        const r = Math.random();
        if (r < 0.18) return 'blood';
        if (r < 0.36) return 'purify';
        if (r < 0.47) return 'haste';
        if (r < 0.60) return 'anvil';
        if (r < 0.71) return 'gamble';
        if (r < 0.82) return 'well';
        if (r < 0.92) return 'curse';
        return 'forge';
    };
    proto.spawnShrine = function(x, y) {
        const type = this.randomShrineType();
        const icons = { blood: '🩸', purify: '💠', haste: '⚡', anvil: '⚒️', gamble: '🎲', well: '⛲', curse: '💀', forge: '🔥' };
        this.shrines.push({ x, y, type, icon: icons[type] });
    };

    proto.addVaultChamber = function(rooms) {
        if (rooms.length < 4 || Math.random() > 0.45) return;
        const hostIdx = 1 + Math.floor(Math.random() * (rooms.length - 2));
        const host = rooms[hostIdx];
        const sides = [
            { dx: 1, dy: 0, wallX: host.x + host.w, wallY: host.cy },
            { dx: -1, dy: 0, wallX: host.x - 1, wallY: host.cy },
            { dx: 0, dy: 1, wallX: host.cx, wallY: host.y + host.h },
            { dx: 0, dy: -1, wallX: host.cx, wallY: host.y - 1 }
        ];
        for (const side of sides) {
            const doorX = side.wallX, doorY = side.wallY;
            const vaultX = doorX + side.dx, vaultY = doorY + side.dy;
            if (vaultX < 2 || vaultX >= this.mapWidth - 2 || vaultY < 2 || vaultY >= this.mapHeight - 2) continue;
            if (this.map[doorY][doorX] !== 0) continue;

            let clear = true;
            for (let vy = vaultY - 1; vy <= vaultY + 1 && clear; vy++) {
                for (let vx = vaultX - 1; vx <= vaultX + 1; vx++) {
                    if (!this.map[vy] || this.map[vy][vx] === undefined || this.map[vy][vx] !== 0) { clear = false; break; }
                }
            }
            if (!clear) continue;

            for (let vy = vaultY - 1; vy <= vaultY + 1; vy++) {
                for (let vx = vaultX - 1; vx <= vaultX + 1; vx++) this.map[vy][vx] = 1;
            }
            this.map[doorY][doorX] = 6;
            this.spawnChest(vaultX, vaultY);
            const chest = this.chests[this.chests.length - 1];
            if (chest) { chest.guaranteed = 'rare_plus'; chest.mimic = false; }

            const keyRoom = rooms[Math.floor(Math.random() * hostIdx)] || rooms[0];
            const kx = keyRoom.x + 1 + Math.floor(Math.random() * (keyRoom.w - 2));
            const ky = keyRoom.y + 1 + Math.floor(Math.random() * (keyRoom.h - 2));
            if (this.map[ky][kx] === 1) {
                this.itemsOnGround.push({ isKey: true, name: 'Rusty Key', icon: '🗝️', x: kx, y: ky, popZ: 0, popVz: 4 });
            }
            this.logMessage('You sense a sealed vault nearby...', 'log-system');
            break;
        }
    };

    proto.addMirrorVault = function(rooms) {
        if (rooms.length < 5 || Math.random() > 0.18) return;
        const hostIdx = 1 + Math.floor(Math.random() * (rooms.length - 2));
        const host = rooms[hostIdx];
        const leftDoorX = host.x - 1, doorY = host.cy;
        const rightDoorX = host.x + host.w, rightDoorY = host.cy;
        const leftVaultX = leftDoorX - 1, rightVaultX = rightDoorX + 1;
        if (leftVaultX < 2 || rightVaultX >= this.mapWidth - 2) return;
        if (this.map[doorY][leftDoorX] !== 0 || this.map[rightDoorY][rightDoorX] !== 0) return;

        const clearAround = (cx, cy) => {
            for (let vy = cy - 1; vy <= cy + 1; vy++) {
                for (let vx = cx - 1; vx <= cx + 1; vx++) {
                    if (!this.map[vy] || this.map[vy][vx] === undefined || this.map[vy][vx] !== 0) return false;
                }
            }
            return true;
        };
        if (!clearAround(leftVaultX, doorY) || !clearAround(rightVaultX, rightDoorY)) return;

        for (let vy = doorY - 1; vy <= doorY + 1; vy++) {
            for (let vx = leftVaultX - 1; vx <= leftVaultX + 1; vx++) this.map[vy][vx] = 1;
        }
        for (let vy = rightDoorY - 1; vy <= rightDoorY + 1; vy++) {
            for (let vx = rightVaultX - 1; vx <= rightVaultX + 1; vx++) this.map[vy][vx] = 1;
        }
        this.map[doorY][leftDoorX] = 6;
        this.map[rightDoorY][rightDoorX] = 6;
        this.map[doorY][leftVaultX] = 12;
        this.map[rightDoorY][rightVaultX] = 12;
        this.switchLinks = this.switchLinks || {};
        this.switchLinks[`${leftVaultX},${doorY}`] = { x: rightDoorX, y: rightDoorY };
        this.switchLinks[`${rightVaultX},${rightDoorY}`] = { x: leftDoorX, y: doorY };

        this.spawnChest(leftVaultX, doorY);
        const c1 = this.chests[this.chests.length - 1]; if (c1) { c1.guaranteed = 'rare_plus'; c1.mimic = false; }
        this.spawnChest(rightVaultX, rightDoorY);
        const c2 = this.chests[this.chests.length - 1]; if (c2) { c2.guaranteed = 'rare_plus'; c2.mimic = false; }
        this.logMessage('Twin sealed vaults flank a nearby chamber, each holding the other\'s key...', 'log-system');
    };
}
