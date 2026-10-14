import { TRIALS_DB, BOUNTY_POOL, AFFIX_POOL, AFFIX_NAMES, BOSS_ACT_LORE, LORE_DB, mulberry32, BIOME_INFO, BIOME_ORDER, GUARDIAN_INTERVAL, biomeForDepth } from './data.js';
import { sfx, music } from './audio.js';
import { AStar } from './astar.js';

export const generationMethods = {
    // [old] 
    generateLevel() {
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
    },

    // [new] 
    generateLevelInner() {
        this.mapWidth = 60; this.mapHeight = 60;
        this.enemies = []; this.chests = []; this.itemsOnGround = []; this.torches = [];
        this.shrines = []; this.destructibles = []; this.particles = []; this.telegraphs = [];
        this.captives = []; this.trapStates = {}; this.playerTraps = [];
        this.ambushTriggers = []; this.secretWalls = []; this.classLockedWalls = []; this.switchLinks = {};
        this.shaftLinks = {}; this.shaftChamber = null; this.currents = {};
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
            this.level = GUARDIAN_INTERVAL * (this.bossRushIndex + 2);
            this.generateBossArena();
        } else if (this.endlessMode) {
            const biome = BIOME_ORDER[Math.min(BIOME_ORDER.length - 1, Math.floor(this.endlessWave / 5))];
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
            this.textures.setBiome(biomeForDepth(this.level));
            music.setBiome(this.textures.currentBiome);

            const isBossFloor = (this.level % GUARDIAN_INTERVAL === 0);
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

        let biomeName = (BIOME_INFO[this.textures.currentBiome] || { name: this.textures.currentBiome }).name.toUpperCase();
        if (this.darknessFloor) biomeName += ' · DARK';
        if (this.unstableFloor) biomeName += ' · UNSTABLE';
        if (this.isGauntlet) biomeName += ' · GAUNTLET';

        if (this.bossRushMode) {
            const ascendLabel = this.ascensionTier > 0 ? ` [Ascension ${this.ascensionTier}]` : '';
            this.depthLabel = `BOSS RUSH ${this.bossRushIndex + 1}/${this.bossRushOrder.length}${ascendLabel} - ${biomeName}`;
            this.logMessage(`Guardian ${this.bossRushIndex + 1} of ${this.bossRushOrder.length} awaits...`, 'log-combat-enemy');
        } else if (this.endlessMode) {
            this.depthLabel = `ENDLESS · WAVE ${this.endlessWave} - ${biomeName}`;
        } else if (this.trialMode) {
            const trial = TRIALS_DB.find(t => t.id === this.trialId);
            this.depthLabel = `${trial ? trial.name.toUpperCase() : 'TRIAL'} - ${biomeName}`;
            this.logMessage('Find the stairs to complete the trial.', 'log-system');
        } else {
            this.depthLabel = `DEPTH B${this.level.toString().padStart(2, '0')} - ${biomeName}`;
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
        this.emitHud();
    },

    // [old] 
    spawnLoreScrap() {
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
    },

    // [old] 
    generateCamp() {
        // Small room
        const cx = Math.floor(this.mapWidth / 2);
        const cy = Math.floor(this.mapHeight / 2);
        for(let y=cy-4; y<=cy+4; y++) {
            for(let x=cx-4; x<=cx+4; x++) {
                this.map[y][x] = 1;
            }
        }
        this.player.x = cx; this.player.y = cy + 2;
        this.player.visualX = cx; this.player.visualY = cy + 2;
        this.stairs = {x: cx, y: cy - 2};
        this.map[this.stairs.y][this.stairs.x] = 3;
        
        // Spawn merchant (Altar/Shrine representation)
        this.shrines.push({x: cx, y: cy, type: 'merchant', icon: '⛺'});
        this.spawnTorchAt(cx-2, cy-2); this.spawnTorchAt(cx+2, cy-2);
    },

    // [new] 
    generateDungeon() {
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
                    else if (biome === 'drowned' && Math.random() < 0.7) this.placeCurrent(tx, ty);
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
    },

    // [new] 
    generateGauntlet() {
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
    },

    // [new] 
    addVerticalShaft(rooms) {
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
    },

    // [new] 
    placeClassLockedWall() {
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
    },

    // [new] 
    placeChasm(rooms) {
        if (this.level < 3 || rooms.length < 4 || Math.random() > 0.22) return;
        const r = rooms[1 + Math.floor(Math.random() * (rooms.length - 2))];
        if (!r || (r.x === rooms[0].x && r.y === rooms[0].y)) return;
        const cx = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
        const cy = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
        if (this.map[cy] && this.map[cy][cx] === 1 && !(cx === this.player.x && cy === this.player.y)) {
            this.map[cy][cx] = 11;
        }
    },

    // [new] 
    addMirrorVault(rooms) {
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
    },

    // [old] 
    hasClearPath(start, end) {
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
    },

    // [old] 
    carveCorridor(x1, y1, x2, y2) {
        let startX = Math.min(x1, x2), endX = Math.max(x1, x2);
        for (let x = startX; x <= endX; x++) this.map[y1][x] = 1;
        let startY = Math.min(y1, y2), endY = Math.max(y1, y2);
        for (let y = startY; y <= endY; y++) this.map[y][x2] = 1;
    },

    // [old] 
    generateCaverns() {
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

        // Smooth the noise into organic caverns over several passes
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

        // Flood-fill (4-directional, matching AStar) to find the largest connected cavern
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

        // Safety net: if the noise collapsed into a tiny cavern, fall back to the room generator
        if (bestRegion.length < 40) {
            this.generateDungeon();
            return;
        }

        this.map = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(0));
        bestRegion.forEach(c => this.map[c.y][c.x] = 1);

        const spawn = bestRegion[0];
        this.player.x = spawn.x; this.player.y = spawn.y;
        this.player.visualX = spawn.x; this.player.visualY = spawn.y;

        // BFS from spawn to find the farthest reachable tile for the stairs
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

        // Populate the cavern, keeping a clear ring around the player's spawn
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
            // Only block open cavern cells, never a single-tile corridor pinch, so A* can always route to the stairs
            if (this.map[c.y][c.x] === 1 && openFloorNeighbors(c.x, c.y) >= 3) { this.placeDestructible(c.x, c.y, Math.random() < 0.3 ? 'barrel' : 'crate'); }
        }
        // Safety net: crates placed independently can still gang up and seal a passage. Verify the
        // stairs stay reachable (same walkability rules as AStar) and undo the crates if they don't.
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
                else if (cavernBiome === 'drowned' && Math.random() < 0.6) this.placeCurrent(c.x, c.y);
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

        // A single shrine, tucked away from the entrance
        if (shuffled.length > 20) {
            const sc = shuffled[shuffled.length - 1];
            if (this.map[sc.y][sc.x] === 1) this.spawnShrine(sc.x, sc.y);
        }

        // A captive, further tucked away
        if (shuffled.length > 30) {
            const cc = shuffled[shuffled.length - 2];
            if (this.map[cc.y][cc.x] === 1) this.captives.push({x: cc.x, y: cc.y, icon: '🧑‍🦯', rescued: false});
        }
    },

    // [old] 
    generateBossArena() {
        this.isBossArena = true;
        const cx = Math.floor(this.mapWidth / 2);
        const cy = Math.floor(this.mapHeight / 2);
        const radius = 16;

        // Carve a circular arena
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (Math.hypot(x - cx, y - cy) <= radius) this.map[y][x] = 1;
            }
        }

        // Pillar cover ring (destructible)
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

        // Hazard patches scattered near the outer ring - themed to the current biome
        const arenaBiome = this.textures.currentBiome;
        for (let i = 0; i < 14; i++) {
            const angle = Math.random() * Math.PI * 2;
            const pr = radius * (0.75 + Math.random() * 0.2);
            const px = Math.round(cx + Math.cos(angle) * pr);
            const py = Math.round(cy + Math.sin(angle) * pr);
            if (px >= 0 && px < this.mapWidth && py >= 0 && py < this.mapHeight && this.map[py][px] === 1) {
                if (arenaBiome === 'forges') this.map[py][px] = 7;
                else if (arenaBiome === 'void') this.map[py][px] = 8;
                else if (arenaBiome === 'drowned') this.placeCurrent(px, py, 2);
                else this.placeSpike(px, py);
            }
        }

        // Player enters from the south; the exit and its guardian lie to the north
        this.player.x = cx; this.player.y = cy + radius - 2;
        this.player.visualX = this.player.x; this.player.visualY = this.player.y;

        this.stairs = { x: cx, y: cy - radius + 2 };
        this.map[this.stairs.y][this.stairs.x] = 3;

        // Ring of torches around the arena
        const torchCount = 8;
        for (let i = 0; i < torchCount; i++) {
            const angle = (i / torchCount) * Math.PI * 2;
            const tx = Math.round(cx + Math.cos(angle) * (radius + 1));
            const ty = Math.round(cy + Math.sin(angle) * (radius + 1));
            this.spawnTorchAt(tx, ty);
        }

        // No standard enemies or chests here - just the boss guarding the exit
        this.spawnBoss(cx, cy - radius + 5);
    },

    // [new] 
    spawnBoss(x, y) {
        const b = this.textures.currentBiome;
        let name = 'Bone Colossus', hp = 220, atk = 18, def = 6, xp = 400, icon = '💀', color = '#e2e8f0', codexKey = 'bone_colossus';
        if (b === 'forges') { name = 'Molten Behemoth'; hp = 280; atk = 22; def = 8; xp = 500; icon = '🌋'; color = '#f97316'; codexKey = 'molten_behemoth'; }
        else if (b === 'drowned') { name = 'Tidemother'; hp = 320; atk = 25; def = 9; xp = 600; icon = '🐙'; color = '#2dd4bf'; codexKey = 'tidemother'; }
        else if (b === 'void') { name = 'Void Archon Prime'; hp = 360; atk = 28; def = 10; xp = 700; icon = '🐲'; color = '#a855f7'; codexKey = 'void_archon_prime'; }

        // The first guardian now waits at B05, before most characters have their footing
        if (this.level < 10 && !this.bossRushMode) {
            hp = Math.floor(hp * 0.7); atk = Math.floor(atk * 0.75); xp = Math.floor(xp * 0.6);
        }
        // Guardians met far below their own biome hit harder
        const depthBonus = Math.max(0, Math.floor((this.level - 20) / 5));
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
    },

    // [old] 
    generateEndlessArena() {
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

        // No stairs in Endless - the only way out is death or abandoning the run
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
    },

    // [old] 
    spawnNextEndlessWave() {
        this.endlessWave++;
        const cx = Math.floor(this.mapWidth / 2);
        const cy = Math.floor(this.mapHeight / 2);
        const radius = 16;
        const waveEnemyCount = Math.min(14, 3 + Math.floor(this.endlessWave * 1.4));

        // Borrow spawnEnemy()'s existing depth-based scaling by temporarily raising this.level
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
                    if (spawned) spawned.aware = true; // engage immediately in the arena
                    break;
                }
            }
        }
        this.level = savedLevel;

        this.logMessage(`Wave ${this.endlessWave} begins! (${waveEnemyCount} enemies)`, 'log-combat-enemy');
        this.triggerCameraShake(6, 200);
        this.depthLabel = `ENDLESS · WAVE ${this.endlessWave} - ${(BIOME_INFO[this.textures.currentBiome] || { name: '' }).name.toUpperCase()}`;
        this.drawMinimap();
        this.emitHud();

        if (!this.meta.stats) this.meta.stats = {};
        if (!this.meta.stats.bestWave || this.endlessWave > this.meta.stats.bestWave) {
            this.meta.stats.bestWave = this.endlessWave;
            this.saveMeta();
        }
        this.checkAchievements();
    },

    // [old] 
    startEndlessBreather() {
        this.endlessBreatherTimer = 1800;
        this.logMessage('Wave cleared! A brief respite before the next wave...', 'log-level');
        sfx.playLevelUp();
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.ceil(this.player.maxHp * 0.15));
        this.player.mp = Math.min(this.player.maxMp, this.player.mp + Math.ceil(this.player.maxMp * 0.15));
        this.updateStatsUI();
    },

    // [old] 
    spawnTorchAt(x, y) {
        if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
            if (this.map[y][x] === 0) this.torches.push({ x, y, flickerPhase: Math.random() * Math.PI * 2 });
        }
    },

    // [new] 
    spawnEnemy(x, y) {
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
        } else if (b === 'drowned') {
            if (roll > 0.78) { name = 'Abyssal Angler'; icon = '🐡'; color = '#14b8a6'; hp=65; atk=17; def=4; xp=120; ai='telegraph'; codexKey='abyssal_angler'; }
            else if (roll > 0.56) { name = 'Siren'; icon = '🧜'; color = '#5eead4'; hp=38; atk=13; xp=85; ai='ranged'; codexKey='siren'; }
            else if (roll > 0.3) { name = 'Tide Leech'; icon = '🪱'; color = '#0d9488'; hp=48; atk=12; def=2; xp=70; codexKey='tide_leech'; }
            else { name = 'Drowned Husk'; icon = '🧟'; color = '#99f6e4'; hp=58; atk=15; def=3; xp=75; codexKey='drowned_husk'; }
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
    },

    // [old] 
    spawnChest(x, y) {
        if (x === this.stairs.x && y === this.stairs.y) return;
        // Some chests are lies with teeth
        const mimic = this.level >= 2 && Math.random() < 0.12;
        this.chests.push({ x, y, opened: false, mimic });
    },

    // [new] 
    spawnChampion(x, y) {
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
    },

    // [old] 
    spawnAmbush(trigger) {
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
    },

    // [old] 
    startHorde(trigger) {
        trigger.spawned = true;
        this.hordeState = { room: trigger, wave: 0, maxWaves: 3, active: true };
        this.logMessage('The chamber seals! Survive the onslaught!', 'log-combat-enemy');
        this.triggerCameraShake(10, 200);
        sfx.playHurt();
        this.spawnHordeWave();
    },

    // [old] 
    spawnHordeWave() {
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
    },

    // [old] 
    finishHorde() {
        const hs = this.hordeState;
        if (!hs) return;
        this.hordeState = null;
        const room = hs.room;
        this.spawnChest(room.x, room.y);
        this.dropGoldAt(room.x, room.y, 40 + this.level * 8);
        sfx.playLevelUp();
        this.spawnLevelUpParticles();
        this.logMessage('The onslaught ends. The chamber yields its reward.', 'log-loot');
    },

    // [old] 
    placeSecretWalls() {
        if (Math.random() > 0.5) return;
        let remaining = 1 + (Math.random() < 0.3 ? 1 : 0);
        for (let tries = 0; tries < 60 && remaining > 0; tries++) {
            const x = 2 + Math.floor(Math.random() * (this.mapWidth - 4));
            const y = 2 + Math.floor(Math.random() * (this.mapHeight - 4));
            if (this.map[y][x] !== 0) continue;
            const neighbors = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
            const floorNeighbors = neighbors.filter(d => this.map[y+d.y] && this.map[y+d.y][x+d.x] === 1).length;
            if (floorNeighbors !== 1) continue; // exactly one open side - reads as a normal dead-end wall
            this.map[y][x] = 9;
            this.secretWalls.push({ x, y });
            remaining--;
        }
    },

    // [old] 
    placeSpike(x, y) {
        this.map[y][x] = 5;
        this.trapStates[`${x},${y}`] = { active: Math.random() < 0.5, timer: 2 + Math.floor(Math.random() * 3) };
    },

    // [old] 
    placeDestructible(x, y, type = 'crate') {
        this.map[y][x] = 4;
        this.destructibles.push({ x, y, hp: 1, type });
    },

    // [old] 
    placeLavaPatch(x, y) {
        [{x,y},{x:x+1,y},{x:x-1,y},{x,y:y+1}].forEach(c => { if (this.map[c.y] && this.map[c.y][c.x] === 1) this.map[c.y][c.x] = 7; });
    },

    // [old] 
    // A short stream of current tiles that drags anything stepping in along its direction
    placeCurrent(x, y, length = 3) {
        const dirs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
        const d = dirs[Math.floor(Math.random() * dirs.length)];
        if (!this.currents) this.currents = {};
        for (let i = 0; i < length; i++) {
            const cx = x + d.dx * i, cy = y + d.dy * i;
            if (!this.map[cy] || this.map[cy][cx] !== 1) break;
            if (this.stairs && cx === this.stairs.x && cy === this.stairs.y) break;
            this.map[cy][cx] = 15;
            this.currents[`${cx},${cy}`] = { dx: d.dx, dy: d.dy };
        }
    },

    placeWebPatch(x, y) {
        [{x,y},{x:x+1,y},{x:x-1,y},{x,y:y+1}].forEach(c => { if (this.map[c.y] && this.map[c.y][c.x] === 1) this.map[c.y][c.x] = 8; });
    },

    // [old] 
    updateUnstableFloor() {
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
    },

    // [new] 
    randomShrineType() {
        const r = Math.random();
        if (r < 0.18) return 'blood';
        if (r < 0.36) return 'purify';
        if (r < 0.47) return 'haste';
        if (r < 0.60) return 'anvil';
        if (r < 0.71) return 'gamble';
        if (r < 0.82) return 'well';
        if (r < 0.92) return 'curse';
        return 'forge';
    },

    // [new] 
    spawnShrine(x, y) {
        const type = this.randomShrineType();
        const icons = { blood: '🩸', purify: '💠', haste: '⚡', anvil: '⚒️', gamble: '🎲', well: '⛲', curse: '💀', forge: '🔥' };
        this.shrines.push({ x, y, type, icon: icons[type] });
    },

    // [old] 
    addVaultChamber(rooms) {
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
            if (this.map[doorY][doorX] !== 0) continue; // must carve into solid rock, not another room

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
            this.map[doorY][doorX] = 6; // Locked Door
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
    },
};
