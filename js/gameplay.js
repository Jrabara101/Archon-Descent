// ============================================================================
// --- DUNGEON CRAWLER GAMEPLAY & GENERATION LOGIC ---
// ============================================================================

// Dungeon generation, spawning, combat, and turn systems
function attachGameplayMethods(proto) {
    proto.initNewPlayer = function(playerClass) {
        document.getElementById('start-overlay').classList.add('hidden');
        this.gameOverHandled = false;

        this.inventory = Array(12).fill(null);
        this.equipped = { weapon: null, armor: null, shield: null, accessory: null };
        this.talents = [];
        this.relics = [];
        this.allies = [];
        this.playerTraps = [];
        this.ambushTriggers = [];
        this.hordeTriggers = []; this.hordeState = null; this.hordeBreatherTimer = 0;
        this.activeBounty = null;
        this.secretWalls = [];
        this.classLockedWalls = [];
        this.switchLinks = {};
        this.unstableFloor = false; this.unstableTimer = 0;
        this.activeMutators = [];
        this.phoenixUsed = false; this.luckyCounter = 0; this.momentumReady = false;
        this.runStats = { activeMs: 0, kills: 0 };
        this.lastTimerSecs = -1;
        if (this.runTimerEl) this.runTimerEl.innerText = '⏱ 00:00';

        this.player = {
            x: 0, y: 0, visualX: 0, visualY: 0, facing: 'down',
            hp: 100, maxHp: 100,
            mp: 50, maxMp: 50,
            gold: 0,
            xp: 0, xpNeeded: 100, lvl: 1,
            baseAtk: 10, baseDef: 0,
            baseFov: 6, fovAccessory: 0, path: [], classType: playerClass,
            skillCooldown: 0, maxSkillCooldown: 5,
            skillCooldown2: 0, maxSkillCooldown2: 8,
            ultimateCooldown: 0, maxUltimateCooldown: 20,
            battleCryTurns: 0, hasteTurns: 0,
            statuses: [],
            potions: { hp: 1, mp: 1 },
            keys: 0,
            hitFlash: 0, knockX: 0, knockY: 0, ghostHp: 100, ghostDelay: 0
        };

        this.charClassTitle.innerText = playerClass.toUpperCase();

        const ultIcon = document.getElementById('ability-ult').querySelector('.icon');
        if (playerClass === 'warrior') {
            this.player.maxHp = 120; this.player.hp = 120; this.player.baseDef = 3;
            this.equipped.weapon = { id: 'w1', name: 'Broadsword', type: 'weapon', rarity: 'common', statBonus: 4, icon: '🗡️' };
            this.equipped.shield = { id: 's1', name: 'Wooden Shield', type: 'shield', rarity: 'common', statBonus: 3, icon: '🛡️' };
            document.getElementById('ability-1').querySelector('.icon').innerText = '🛡️';
            document.getElementById('ability-2').querySelector('.icon').innerText = '📯';
            ultIcon.innerText = '👊';
            this.player.maxSkillCooldown2 = 10;
        } else if (playerClass === 'mage') {
            this.player.maxHp = 80; this.player.hp = 80; this.player.maxMp = 100; this.player.mp = 100; this.player.baseAtk = 15;
            this.equipped.weapon = { id: 'w2', name: 'Apprentice Staff', type: 'weapon', rarity: 'common', statBonus: 6, icon: '🪄' };
            document.getElementById('ability-1').querySelector('.icon').innerText = '🔥';
            document.getElementById('ability-2').querySelector('.icon').innerText = '❄️';
            ultIcon.innerText = '☄️';
            this.player.maxSkillCooldown = 3;
            this.player.maxSkillCooldown2 = 6;
        } else if (playerClass === 'rogue') {
            this.player.baseAtk = 12; this.player.baseFov = 8;
            this.equipped.weapon = { id: 'w3', name: 'Twin Daggers', type: 'weapon', rarity: 'common', statBonus: 5, icon: '🔪' };
            document.getElementById('ability-1').querySelector('.icon').innerText = '💨';
            document.getElementById('ability-2').querySelector('.icon').innerText = '🗡️';
            ultIcon.innerText = '☠️';
            this.player.maxSkillCooldown = 4;
            this.player.maxSkillCooldown2 = 7;
        } else if (playerClass === 'paladin') {
            this.player.maxHp = 115; this.player.hp = 115; this.player.baseDef = 4; this.player.baseAtk = 9;
            this.equipped.weapon = { id: 'w4', name: 'Blessed Mace', type: 'weapon', rarity: 'common', statBonus: 5, icon: '🔨' };
            this.equipped.shield = { id: 's2', name: 'Aegis of Dawn', type: 'shield', rarity: 'common', statBonus: 3, icon: '🔰' };
            document.getElementById('ability-1').querySelector('.icon').innerText = '✨';
            document.getElementById('ability-2').querySelector('.icon').innerText = '🙏';
            ultIcon.innerText = '⚖️';
            this.player.maxSkillCooldown = 4;
            this.player.maxSkillCooldown2 = 9;
        } else if (playerClass === 'necromancer') {
            this.player.maxHp = 75; this.player.hp = 75; this.player.maxMp = 110; this.player.mp = 110; this.player.baseAtk = 13;
            this.equipped.weapon = { id: 'w5', name: 'Bone Scepter', type: 'weapon', rarity: 'common', statBonus: 6, icon: '🦴' };
            document.getElementById('ability-1').querySelector('.icon').innerText = '💀';
            document.getElementById('ability-2').querySelector('.icon').innerText = '🩸';
            ultIcon.innerText = '⚰️';
            this.player.maxSkillCooldown = 6;
            this.player.maxSkillCooldown2 = 4;
        } else if (playerClass === 'ranger') {
            this.player.baseAtk = 13; this.player.baseFov = 9;
            this.equipped.weapon = { id: 'w6', name: 'Recurve Bow', type: 'weapon', rarity: 'common', statBonus: 6, icon: '🏹' };
            document.getElementById('ability-1').querySelector('.icon').innerText = '🎯';
            document.getElementById('ability-2').querySelector('.icon').innerText = '🪤';
            ultIcon.innerText = '🌧️';
            this.player.maxSkillCooldown = 4;
            this.player.maxSkillCooldown2 = 6;
        }

        this.player.maxHp += (this.meta.vitality || 0) * 5; this.player.hp = this.player.maxHp;
        this.player.baseAtk += (this.meta.power || 0);
    };

    proto.generateLevel = function() {
        const origRandom = Math.random;
        if (this.dailyMode) {
            Math.random = mulberry32((this.dailySeed ^ Math.imul(this.level, 2654435761)) >>> 0);
        } else if (this.trialMode) {
            Math.random = mulberry32(this.trialSeed >>> 0);
        }
        try {
            this.generateLevelInner();
        } finally {
            Math.random = origRandom;
        }
    };

    proto.generateLevelInner = function() {
        this.enemies = []; this.chests = []; this.itemsOnGround = []; this.torches = [];
        this.shrines = []; this.destructibles = []; this.particles = []; this.telegraphs = [];
        this.captives = []; this.trapStates = {}; this.playerTraps = [];
        this.ambushTriggers = []; this.secretWalls = []; this.classLockedWalls = []; this.switchLinks = {};
        this.shaftLinks = {}; this.shaftChamber = null;
        this.hordeTriggers = []; this.hordeState = null; this.hordeBreatherTimer = 0;
        this.activeBounty = null;
        this.allies = (this.allies || []).filter(a => a.type === 'pet');
        this.player.path = [];
        this.camX = null; this.camY = null;

        this.ambientMotes = [];
        for (let i = 0; i < 50; i++) {
            this.ambientMotes.push({ x: Math.random() * this.mapWidth * this.tileSize, y: Math.random() * this.mapHeight * this.tileSize, vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15, phase: Math.random() * Math.PI * 2, size: Math.random() * 2 + 1 });
        }

        this.map = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(0));
        this.fog = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(0));
        this.tileVariants = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(0).map(() => Math.floor(Math.random() * 100)));
        this.isBossArena = false;
        this.isEndlessArena = false;
        this.darknessFloor = false;
        this.unstableFloor = false;
        this.isGauntlet = false;

        if (this.bossRushMode) {
            const biome = this.bossRushOrder[this.bossRushIndex];
            this.textures.setBiome(biome);
            music.setBiome(biome);
            this.level = 10 * (this.bossRushIndex + 1);
            this.generateBossArena();
        } else if (this.endlessMode) {
            const biomes = ['catacombs', 'forges', 'void'];
            const biome = biomes[Math.min(2, Math.floor(this.endlessWave / 5))];
            this.textures.setBiome(biome);
            music.setBiome(biome);
            this.generateEndlessArena();
        } else if (this.trialMode) {
            const trial = TRIALS_DB.find(t => t.id === this.trialId);
            const biome = (trial && trial.biome) || 'catacombs';
            this.textures.setBiome(biome);
            music.setBiome(biome);
            this.generateDungeon();
        } else {
            if (this.level >= 9) this.textures.setBiome('void');
            else if (this.level >= 5) this.textures.setBiome('forges');
            else this.textures.setBiome('catacombs');
            music.setBiome(this.textures.currentBiome);

            const isBossFloor = (this.level % 10 === 0);
            const isCamp = !isBossFloor && (this.level % 4 === 0);

            const nightmareMutator = this.activeMutators && this.activeMutators.includes('nightmare');
            this.darknessFloor = !isBossFloor && !isCamp && (nightmareMutator || (this.level >= 3 && Math.random() < 0.15));

            this.unstableFloor = !isBossFloor && !isCamp && !this.darknessFloor && this.level >= 4 && Math.random() < 0.15;
            this.unstableTimer = 8 + Math.floor(Math.random() * 6);

            this.isGauntlet = false;
            if (isBossFloor) {
                this.generateBossArena();
            } else if (isCamp) {
                this.generateCamp();
            } else if (this.level >= 4 && Math.random() < 0.1) {
                this.generateGauntlet();
            } else if (this.level > 1 && Math.random() < 0.3) {
                this.generateCaverns();
            } else {
                this.generateDungeon();
            }

            if (!isBossFloor && !isCamp && Math.random() < 0.30) this.spawnLoreScrap();

            if (!isBossFloor && !isCamp && Math.random() < 0.4) {
                const b = BOUNTY_POOL[Math.floor(Math.random() * BOUNTY_POOL.length)];
                this.activeBounty = { id: b.id, turns: 0, kills: 0, failed: false };
            }
        }
        this.updateBountyBadge();

        this.allies.forEach(a => {
            if (a.type === 'pet') { a.x = this.player.x; a.y = this.player.y; a.visualX = a.x; a.visualY = a.y; }
        });

        this.updateFOV();
        this.updateStatsUI();
        this.updateInventoryUI();
        this.drawMinimap();

        let biomeName = this.textures.currentBiome.toUpperCase();
        if (this.darknessFloor) biomeName += ' · DARK';
        if (this.unstableFloor) biomeName += ' · UNSTABLE';
        if (this.isGauntlet) biomeName += ' · GAUNTLET';

        if (this.bossRushMode) {
            const ascendLabel = this.ascensionTier > 0 ? ` [Ascension ${this.ascensionTier}]` : '';
            this.dungeonLevel.innerText = `BOSS RUSH ${this.bossRushIndex + 1}/3${ascendLabel} - ${biomeName}`;
            this.logMessage(`Guardian ${this.bossRushIndex + 1} of 3 awaits...`, 'log-combat-enemy');
        } else if (this.endlessMode) {
            this.dungeonLevel.innerText = `ENDLESS · WAVE ${this.endlessWave} - ${biomeName}`;
        } else if (this.trialMode) {
            const trial = TRIALS_DB.find(t => t.id === this.trialId);
            this.dungeonLevel.innerText = `${trial ? trial.name.toUpperCase() : 'TRIAL'} - ${biomeName}`;
            this.logMessage('Find the stairs to complete the trial.', 'log-system');
        } else {
            this.dungeonLevel.innerText = `DEPTH B${this.level.toString().padStart(2, '0')} - ${biomeName}`;
            this.logMessage(`Descended to B${this.level}.`, 'log-system');
            if (this.darknessFloor) this.logMessage('An oppressive darkness smothers this floor. Your light barely reaches.', 'log-system');
            if (this.unstableFloor) this.logMessage('The ground here feels wrong — hazards shift without warning.', 'log-system');
            if (this.isGauntlet) this.logMessage('A straight, narrow gauntlet. No detours — just what\'s ahead.', 'log-combat-enemy');
            if (this.isBossArena) this.logMessage(`A powerful guardian blocks the way forward!`, 'log-combat-enemy');
            this.checkStoryBeat();

            if (this.level === 5 && this.runStats) {
                const t = this.runStats.activeMs;
                if (!this.meta.stats) this.meta.stats = {};
                if (this.meta.stats.speedDepth5Ms === undefined || t < this.meta.stats.speedDepth5Ms) {
                    this.meta.stats.speedDepth5Ms = t;
                    this.saveMeta();
                }
            }
        }
        this.checkAchievements();
    };

    proto.advanceBossRush = function() {
        this.bossRushIndex++;
        if (this.bossRushIndex >= this.bossRushOrder.length) {
            this.bumpStat('bossRushCleared', 1);
            if (this.ascensionTier > (this.meta.stats.maxAscensionTier || 0)) {
                this.meta.stats.maxAscensionTier = this.ascensionTier;
                this.saveMeta();
            }
            const soulsEarned = 50 + this.ascensionTier * 25;
            this.meta.souls = (this.meta.souls || 0) + soulsEarned;
            this.saveMeta();
            music.stop();
            sfx.playVictory();
            const soulsEl = document.getElementById('bossrush-victory-souls');
            if (soulsEl) soulsEl.innerText = `+${soulsEarned} Archon Souls`;
            const extraEl = document.getElementById('bossrush-victory-extra');
            if (extraEl) extraEl.innerText = `Ascension Tier ${this.ascensionTier} · ${this.player.classType.toUpperCase()}`;
            this.openMenuScreen('bossrush-victory-overlay');
            this.checkAchievements();
            return;
        }
        this.generateLevel();
    };

    proto.ascendBossRush = function() {
        this.ascensionTier++;
        this.bossRushIndex = 0;
        document.getElementById('bossrush-victory-overlay').classList.add('hidden');
        this.launchRun();
    };

    proto.finishTrial = function() {
        const trial = TRIALS_DB.find(t => t.id === this.trialId);
        if (!trial) { this.openMenuScreen('start-overlay'); return; }
        if (!this.meta.titles) this.meta.titles = [];
        if (!this.meta.titles.includes(trial.title)) {
            this.meta.titles.push(trial.title);
        }
        this.bumpStat('trialsCompleted', 1);
        const soulsEarned = 40;
        this.meta.souls = (this.meta.souls || 0) + soulsEarned;
        this.saveMeta();
        music.stop();
        sfx.playVictory();
        const subEl = document.getElementById('trial-victory-subtitle');
        if (subEl) subEl.innerText = `${trial.name} complete.`;
        const titleEl = document.getElementById('trial-victory-title');
        if (titleEl) titleEl.innerText = `Title Earned: "${trial.title}"`;
        this.openMenuScreen('trial-victory-overlay');
        this.checkAchievements();
    };

    proto.spawnLoreScrap = function() {
        for (let tries = 0; tries < 60; tries++) {
            const x = 1 + Math.floor(Math.random() * (this.mapWidth - 2));
            const y = 1 + Math.floor(Math.random() * (this.mapHeight - 2));
            if (this.map[y][x] !== 1) continue;
            if (Math.hypot(x - this.player.x, y - this.player.y) < 8) continue;
            if (this.itemsOnGround.some(i => i.x === x && i.y === y)) continue;
            const idx = Math.floor(Math.random() * LORE_DB.length);
            this.itemsOnGround.push({ isLore: true, loreIdx: idx, name: 'Lore Scrap', icon: '📜', x, y, popZ: 0, popVz: 0 });
            return;
        }
    };

    proto.generateCamp = function() {
        const cx = Math.floor(this.mapWidth / 2);
        const cy = Math.floor(this.mapHeight / 2);
        for (let y = cy - 4; y <= cy + 4; y++) {
            for (let x = cx - 4; x <= cx + 4; x++) {
                this.map[y][x] = 1;
            }
        }
        this.player.x = cx; this.player.y = cy + 2;
        this.player.visualX = cx; this.player.visualY = cy + 2;
        this.stairs = { x: cx, y: cy - 2 };
        this.map[this.stairs.y][this.stairs.x] = 3;
        this.shrines.push({ x: cx, y: cy, type: 'merchant', icon: '⛺' });
        this.spawnTorchAt(cx - 2, cy - 2); this.spawnTorchAt(cx + 2, cy - 2);
    };

    proto.generateGauntlet = function() {
        this.isGauntlet = true;
        const roomCount = 5 + Math.floor(Math.random() * 2);
        const horizontal = Math.random() < 0.5;
        const rooms = [];
        let cursor = 2;
        for (let i = 0; i < roomCount; i++) {
            const w = horizontal ? (5 + Math.floor(Math.random() * 3)) : (this.mapWidth - 6);
            const h = horizontal ? (this.mapHeight - 6) : (5 + Math.floor(Math.random() * 3));
            const x = horizontal ? cursor : 3;
            const y = horizontal ? 3 : cursor;
            for (let rx = x; rx < x + w && rx < this.mapWidth - 1; rx++) {
                for (let ry = y; ry < y + h && ry < this.mapHeight - 1; ry++) this.map[ry][rx] = 1;
            }
            const room = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) };
            rooms.push(room);
            cursor += (horizontal ? w : h) + 2;
        }

        this.player.x = rooms[0].cx; this.player.y = rooms[0].cy;
        this.player.visualX = rooms[0].cx; this.player.visualY = rooms[0].cy;
        const lastRoom = rooms[rooms.length - 1];
        this.stairs = { x: lastRoom.cx, y: lastRoom.cy };
        this.map[this.stairs.y][this.stairs.x] = 3;

        rooms.forEach((r, idx) => {
            this.spawnTorchAt(r.x, r.y - 1);
            if (idx === 0 || idx === rooms.length - 1) return;
            const eCount = 1 + Math.floor(idx * 0.8) + (this.level > 6 ? 1 : 0);
            for (let i = 0; i < eCount; i++) {
                const ex = r.x + 1 + Math.floor(Math.random() * Math.max(1, r.w - 2));
                const ey = r.y + 1 + Math.floor(Math.random() * Math.max(1, r.h - 2));
                if (this.map[ey] && this.map[ey][ex] === 1) this.spawnEnemy(ex, ey);
            }
            if (Math.random() < 0.4) this.spawnChest(r.cx, r.cy);
        });
    };

    proto.generateDungeon = function() {
        const routeMod = this.routeModifier;
        this.routeModifier = null;
        const roomAttempts = routeMod === 'shortcut' ? 10 : 18;

        const rooms = [];
        for (let i = 0; i < roomAttempts; i++) {
            let w = Math.floor(Math.random() * 7) + 5;
            let h = Math.floor(Math.random() * 7) + 5;
            let x = Math.floor(Math.random() * (this.mapWidth - w - 2)) + 1;
            let y = Math.floor(Math.random() * (this.mapHeight - h - 2)) + 1;
            let overlap = rooms.some(r => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y);
            if (overlap) continue;

            for (let rx = x; rx < x + w; rx++) {
                for (let ry = y; ry < y + h; ry++) this.map[ry][rx] = 1;
            }
            const currentRoom = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) };
            if (rooms.length > 0) {
                const prev = rooms[rooms.length - 1];
                this.carveCorridor(prev.cx, prev.cy, currentRoom.cx, currentRoom.cy);
            }
            rooms.push(currentRoom);
        }

        this.player.x = rooms[0].cx; this.player.y = rooms[0].cy;
        this.player.visualX = rooms[0].cx; this.player.visualY = rooms[0].cy;
        const lastRoom = rooms[rooms.length - 1];
        this.stairs = { x: lastRoom.cx, y: lastRoom.cy };
        this.map[this.stairs.y][this.stairs.x] = 3;

        let gauntletChampionPlaced = false;
        const gauntletChampionChance = routeMod === 'gauntlet' ? 0.35 : 0.08;
        rooms.forEach((r, idx) => {
            this.spawnTorchAt(r.x, r.y - 1);
            if (idx > 0 && idx !== rooms.length - 1) {
                const roomRoll = Math.random();
                const forceChampion = routeMod === 'gauntlet' && idx === rooms.length - 2 && !gauntletChampionPlaced;
                if (idx > 1 && this.level >= 3 && (roomRoll < gauntletChampionChance || forceChampion)) {
                    gauntletChampionPlaced = true;
                    this.spawnChampion(r.cx, r.cy);
                    if (routeMod === 'gauntlet') this.dropRelicAt(r.cx, r.cy);
                    else this.spawnChest(r.x + 1 + Math.floor(Math.random() * (r.w - 2)), r.y + 1 + Math.floor(Math.random() * (r.h - 2)));
                } else if (idx > 1 && roomRoll < 0.08 + 0.15) {
                    const eCount = Math.max(1, Math.floor(Math.random() * 3) + (this.level > 5 ? 1 : 0));
                    this.ambushTriggers.push({ x: r.cx, y: r.cy, rx: r.x, ry: r.y, rw: r.w, rh: r.h, count: eCount, spawned: false });
                } else if (idx > 1 && this.level >= 4 && this.hordeTriggers.length === 0 && roomRoll < 0.08 + 0.15 + 0.08) {
                    this.hordeTriggers.push({ x: r.cx, y: r.cy, rx: r.x, ry: r.y, rw: r.w, rh: r.h, spawned: false });
                } else {
                    let eCount = Math.floor(Math.random() * 3) + (this.level > 5 ? 1 : 0);
                    if (routeMod === 'vault' || routeMod === 'gauntlet') eCount += 1;
                    else if (routeMod === 'shrine') eCount = Math.max(0, eCount - 1);
                    if (this.activeMutators && this.activeMutators.includes('swarm')) eCount += 2;
                    for (let i = 0; i < eCount; i++) {
                        const ex = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
                        const ey = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
                        if (this.map[ey][ex] === 1) this.spawnEnemy(ex, ey);
                    }
                }
                if (Math.random() < 0.5) {
                    const dx = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
                    const dy = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
                    this.placeDestructible(dx, dy, Math.random() < 0.35 ? 'barrel' : 'crate');
                }
                if (Math.random() < 0.3) {
                    const tx = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
                    const ty = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
                    const biome = this.textures.currentBiome;
                    if (biome === 'forges' && Math.random() < 0.5) this.placeLavaPatch(tx, ty);
                    else if (biome === 'void' && Math.random() < 0.5) this.placeWebPatch(tx, ty);
                    else this.placeSpike(tx, ty);
                }
                if (Math.random() < 0.3) this.spawnChest(r.cx, r.cy);
                if (Math.random() < 0.12 && this.captives.length === 0) {
                    const cx = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
                    const cy = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
                    if (this.map[cy][cx] === 1) this.captives.push({ x: cx, y: cy, icon: '🧑‍🦯', rescued: false });
                }
            }
        });

        if (rooms.length > 2) {
            const shrineCount = routeMod === 'shrine' ? 2 : 1;
            const usedRooms = new Set();
            for (let i = 0; i < shrineCount; i++) {
                const sr = rooms[Math.floor(Math.random() * (rooms.length - 2)) + 1];
                if (usedRooms.has(sr)) continue;
                usedRooms.add(sr);
                this.spawnShrine(sr.cx, sr.cy);
            }
        }

        if (routeMod === 'vault' && rooms.length > 2) {
            const vr = rooms[Math.floor(Math.random() * (rooms.length - 2)) + 1];
            this.spawnChest(vr.x + 1 + Math.floor(Math.random() * (vr.w - 2)), vr.y + 1 + Math.floor(Math.random() * (vr.h - 2)));
        }

        if (Math.random() < 0.25) this.addMirrorVault(rooms);
        else this.addVaultChamber(rooms);
        this.placeSecretWalls();
        this.placeClassLockedWall();
        this.placeChasm(rooms);
        this.addVerticalShaft(rooms);
    };

    proto.addVerticalShaft = function(rooms) {
        if (this.level < 3 || rooms.length < 4 || Math.random() > 0.16) return;
        const hostIdx = 1 + Math.floor(Math.random() * (rooms.length - 2));
        const host = rooms[hostIdx];
        const ladderX = host.x + 1 + Math.floor(Math.random() * (host.w - 2));
        const ladderY = host.y + 1 + Math.floor(Math.random() * (host.h - 2));
        if (this.map[ladderY][ladderX] !== 1) return;

        const chamberW = 7, chamberH = 7;
        let chamber = null;
        for (let tries = 0; tries < 40 && !chamber; tries++) {
            const cx = 3 + Math.floor(Math.random() * (this.mapWidth - chamberW - 6));
            const cy = 3 + Math.floor(Math.random() * (this.mapHeight - chamberH - 6));
            const farEnough = rooms.every(r => cx + chamberW < r.x - 3 || cx > r.x + r.w + 3 || cy + chamberH < r.y - 3 || cy > r.y + r.h + 3);
            if (!farEnough) continue;
            let clear = true;
            for (let y = cy - 1; y <= cy + chamberH && clear; y++) {
                for (let x = cx - 1; x <= cx + chamberW; x++) {
                    if (!this.map[y] || this.map[y][x] === undefined || this.map[y][x] !== 0) { clear = false; break; }
                }
            }
            if (clear) chamber = { x: cx, y: cy, w: chamberW, h: chamberH };
        }
        if (!chamber) return;

        for (let y = chamber.y; y < chamber.y + chamber.h; y++) {
            for (let x = chamber.x; x < chamber.x + chamber.w; x++) this.map[y][x] = 1;
        }
        const upX = chamber.x + Math.floor(chamber.w / 2), upY = chamber.y + Math.floor(chamber.h / 2);
        this.map[ladderY][ladderX] = 13;
        this.map[upY][upX] = 14;
        this.shaftLinks = this.shaftLinks || {};
        this.shaftLinks[`${ladderX},${ladderY}`] = { x: upX, y: upY };
        this.shaftLinks[`${upX},${upY}`] = { x: ladderX, y: ladderY };
        this.shaftChamber = chamber;

        this.spawnTorchAt(chamber.x, chamber.y - 1);
        if (Math.random() < 0.6) this.spawnEnemy(chamber.x + 1, chamber.y + 1);
        this.spawnChest(chamber.x + chamber.w - 2, chamber.y + chamber.h - 2);
    };

    proto.placeClassLockedWall = function() {
        if (!this.player || Math.random() > 0.35) return;
        for (let tries = 0; tries < 60; tries++) {
            const x = 2 + Math.floor(Math.random() * (this.mapWidth - 4));
            const y = 2 + Math.floor(Math.random() * (this.mapHeight - 4));
            if (this.map[y][x] !== 0) continue;
            const neighbors = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
            const floorNeighbors = neighbors.filter(d => this.map[y+d.y] && this.map[y+d.y][x+d.x] === 1).length;
            if (floorNeighbors !== 1) continue;
            this.map[y][x] = 10;
            this.classLockedWalls.push({ x, y });
            return;
        }
    };

    proto.placeChasm = function(rooms) {
        if (this.level < 3 || rooms.length < 4 || Math.random() > 0.22) return;
        const r = rooms[1 + Math.floor(Math.random() * (rooms.length - 2))];
        if (!r || (r.x === rooms[0].x && r.y === rooms[0].y)) return;
        const cx = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
        const cy = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
        if (this.map[cy] && this.map[cy][cx] === 1 && !(cx === this.player.x && cy === this.player.y)) {
            this.map[cy][cx] = 11;
        }
    };

    proto.hasClearPath = function(start, end) {
        const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
        const visited = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(false));
        const stack = [start];
        visited[start.y][start.x] = true;
        while (stack.length > 0) {
            const c = stack.pop();
            if (c.x === end.x && c.y === end.y) return true;
            for (const d of dirs) {
                const nx = c.x + d.x, ny = c.y + d.y;
                if (nx >= 0 && nx < this.mapWidth && ny >= 0 && ny < this.mapHeight && !visited[ny][nx] && this.map[ny][nx] !== 0 && this.map[ny][nx] !== 4) {
                    visited[ny][nx] = true;
                    stack.push({x: nx, y: ny});
                }
            }
        }
        return false;
    };

    proto.carveCorridor = function(x1, y1, x2, y2) {
        let startX = Math.min(x1, x2), endX = Math.max(x1, x2);
        for (let x = startX; x <= endX; x++) this.map[y1][x] = 1;
        let startY = Math.min(y1, y2), endY = Math.max(y1, y2);
        for (let y = startY; y <= endY; y++) this.map[y][x2] = 1;
    };

    proto.generateCaverns = function() {
        const margin = 2;
        let grid = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(0));
        for (let y = margin; y < this.mapHeight - margin; y++) {
            for (let x = margin; x < this.mapWidth - margin; x++) {
                grid[y][x] = Math.random() < 0.45 ? 1 : 0;
            }
        }

        const countWallNeighbors = (g, x, y) => {
            let count = 0;
            for (let ny = y - 1; ny <= y + 1; ny++) {
                for (let nx = x - 1; nx <= x + 1; nx++) {
                    if (nx === x && ny === y) continue;
                    if (nx < 0 || nx >= this.mapWidth || ny < 0 || ny >= this.mapHeight || g[ny][nx] === 0) count++;
                }
            }
            return count;
        };

        for (let iter = 0; iter < 5; iter++) {
            const next = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(0));
            for (let y = 0; y < this.mapHeight; y++) {
                for (let x = 0; x < this.mapWidth; x++) {
                    const walls = countWallNeighbors(grid, x, y);
                    if (walls > 4) next[y][x] = 0;
                    else if (walls < 4) next[y][x] = 1;
                    else next[y][x] = grid[y][x];
                }
            }
            grid = next;
        }

        const visited = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(false));
        const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
        let bestRegion = [];
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (grid[y][x] === 1 && !visited[y][x]) {
                    const region = [];
                    const stack = [{x, y}];
                    visited[y][x] = true;
                    while (stack.length > 0) {
                        const c = stack.pop();
                        region.push(c);
                        for (const d of dirs) {
                            const nx = c.x + d.x, ny = c.y + d.y;
                            if (nx >= 0 && nx < this.mapWidth && ny >= 0 && ny < this.mapHeight && grid[ny][nx] === 1 && !visited[ny][nx]) {
                                visited[ny][nx] = true;
                                stack.push({x: nx, y: ny});
                            }
                        }
                    }
                    if (region.length > bestRegion.length) bestRegion = region;
                }
            }
        }

        if (bestRegion.length < 40) {
            this.generateDungeon();
            return;
        }

        this.map = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(0));
        bestRegion.forEach(c => this.map[c.y][c.x] = 1);

        const spawn = bestRegion[0];
        this.player.x = spawn.x; this.player.y = spawn.y;
        this.player.visualX = spawn.x; this.player.visualY = spawn.y;

        const dist = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(-1));
        const queue = [spawn];
        dist[spawn.y][spawn.x] = 0;
        let farthest = spawn;
        let qi = 0;
        while (qi < queue.length) {
            const c = queue[qi++];
            if (dist[c.y][c.x] > dist[farthest.y][farthest.x]) farthest = c;
            for (const d of dirs) {
                const nx = c.x + d.x, ny = c.y + d.y;
                if (nx >= 0 && nx < this.mapWidth && ny >= 0 && ny < this.mapHeight && this.map[ny][nx] === 1 && dist[ny][nx] === -1) {
                    dist[ny][nx] = dist[c.y][c.x] + 1;
                    queue.push({x: nx, y: ny});
                }
            }
        }
        this.stairs = { x: farthest.x, y: farthest.y };
        this.map[this.stairs.y][this.stairs.x] = 3;

        const spawnable = bestRegion.filter(c => Math.hypot(c.x - spawn.x, c.y - spawn.y) > 6 && !(c.x === this.stairs.x && c.y === this.stairs.y));
        const shuffled = spawnable.slice().sort(() => Math.random() - 0.5);

        const enemyCount = Math.min(20, Math.floor(shuffled.length / 30)) + (this.level > 5 ? 3 : 0);
        const crateCount = Math.min(14, Math.floor(shuffled.length / 60));
        const trapCount = Math.min(10, Math.floor(shuffled.length / 80));
        const chestCount = Math.min(6, Math.floor(shuffled.length / 150));
        const torchCount = Math.min(12, Math.floor(shuffled.length / 90));

        let idx = 0;
        for (let i = 0; i < enemyCount && idx < shuffled.length; i++, idx++) {
            const c = shuffled[idx];
            if (this.map[c.y][c.x] === 1) this.spawnEnemy(c.x, c.y);
        }
        const dirs4 = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
        const openFloorNeighbors = (x, y) => dirs4.filter(d => this.map[y+d.y] && this.map[y+d.y][x+d.x] === 1).length;
        for (let i = 0; i < crateCount && idx < shuffled.length; i++, idx++) {
            const c = shuffled[idx];
            if (this.map[c.y][c.x] === 1 && openFloorNeighbors(c.x, c.y) >= 3) { this.placeDestructible(c.x, c.y, Math.random() < 0.3 ? 'barrel' : 'crate'); }
        }
        if (this.destructibles.length > 0 && !this.hasClearPath(spawn, this.stairs)) {
            this.destructibles.forEach(d => { this.map[d.y][d.x] = 1; });
            this.destructibles = [];
        }
        const cavernBiome = this.textures.currentBiome;
        for (let i = 0; i < trapCount && idx < shuffled.length; i++, idx++) {
            const c = shuffled[idx];
            if (this.map[c.y][c.x] === 1) {
                if (cavernBiome === 'forges' && Math.random() < 0.4) this.placeLavaPatch(c.x, c.y);
                else if (cavernBiome === 'void' && Math.random() < 0.4) this.placeWebPatch(c.x, c.y);
                else this.placeSpike(c.x, c.y);
            }
        }
        for (let i = 0; i < chestCount && idx < shuffled.length; i++, idx++) {
            const c = shuffled[idx];
            if (this.map[c.y][c.x] === 1) this.spawnChest(c.x, c.y);
        }
        for (let i = 0; i < torchCount && idx < shuffled.length; i++, idx++) {
            const c = shuffled[idx];
            this.spawnTorchAt(c.x - 1, c.y - 1);
        }

        if (shuffled.length > 20) {
            const sc = shuffled[shuffled.length - 1];
            if (this.map[sc.y][sc.x] === 1) this.spawnShrine(sc.x, sc.y);
        }

        if (shuffled.length > 30) {
            const cc = shuffled[shuffled.length - 2];
            if (this.map[cc.y][cc.x] === 1) this.captives.push({x: cc.x, y: cc.y, icon: '🧑‍🦯', rescued: false});
        }
    };
}
