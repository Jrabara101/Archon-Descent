// ============================================================================
// --- RUN LIFECYCLE: MODES, BOSS RUSH, TRIALS, DEATH, AUTOSAVE ---
// ============================================================================
import { sfx, music } from './audio.js';
import {
    ALL_CLASSES, MUTATOR_POOL, TRIALS_DB, todayKey, hashStr
} from './data.js';

const AUTOSAVE_KEY = 'archonDescent_autosave';

export const runMethods = {
    startDailyChallenge() {
        const key = todayKey();
        this.dailyKey = key;
        this.dailySeed = hashStr('archon-' + key);
        const cls = ALL_CLASSES[this.dailySeed % ALL_CLASSES.length];
        this.startGame(cls, true);
    },

    // Shared player setup used by every run mode. Callers set this.level and the
    // mode flags before calling launchRun().
    initNewPlayer(playerClass) {
        this.gameOverHandled = false;
        this.paused = false;
        this.ui.clearLog();

        this.inventory = Array(12).fill(null);
        this.equipped = { weapon: null, armor: null, shield: null, accessory: null };
        this.talents = [];
        this.relics = [];
        this.allies = [];
        this.playerTraps = [];
        this.ambushTriggers = [];
        this.hordeTriggers = []; this.hordeState = null; this.hordeBreatherTimer = 0;
        this.activeBounty = null;
        this.secretWalls = []; this.classLockedWalls = []; this.switchLinks = {}; this.shaftLinks = {};
        this.unstableFloor = false; this.unstableTimer = 0;
        this.activeMutators = [];
        this.phoenixUsed = false; this.luckyCounter = 0; this.momentumReady = false;
        this.seenRelicSynergies = [];
        this.lastAttacker = null;
        this.runStats = { activeMs: 0, kills: 0 };
        this.lastTimerSecs = -1;

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

        if (playerClass === 'warrior') {
            this.player.maxHp = 120; this.player.hp = 120; this.player.baseDef = 3;
            this.equipped.weapon = { id: 'w1', name: 'Broadsword', type: 'weapon', rarity: 'common', statBonus: 4, icon: '🗡️' };
            this.equipped.shield = { id: 's1', name: 'Wooden Shield', type: 'shield', rarity: 'common', statBonus: 3, icon: '🛡️' };
            this.player.maxSkillCooldown2 = 10;
        } else if (playerClass === 'mage') {
            this.player.maxHp = 80; this.player.hp = 80; this.player.maxMp = 100; this.player.mp = 100; this.player.baseAtk = 15;
            this.equipped.weapon = { id: 'w2', name: 'Apprentice Staff', type: 'weapon', rarity: 'common', statBonus: 6, icon: '🪄' };
            this.player.maxSkillCooldown = 3;
            this.player.maxSkillCooldown2 = 6;
        } else if (playerClass === 'rogue') {
            this.player.baseAtk = 12; this.player.baseFov = 8;
            this.equipped.weapon = { id: 'w3', name: 'Twin Daggers', type: 'weapon', rarity: 'common', statBonus: 5, icon: '🔪' };
            this.player.maxSkillCooldown = 4;
            this.player.maxSkillCooldown2 = 7;
        } else if (playerClass === 'paladin') {
            this.player.maxHp = 115; this.player.hp = 115; this.player.baseDef = 4; this.player.baseAtk = 9;
            this.equipped.weapon = { id: 'w4', name: 'Blessed Mace', type: 'weapon', rarity: 'common', statBonus: 5, icon: '🔨' };
            this.equipped.shield = { id: 's2', name: 'Aegis of Dawn', type: 'shield', rarity: 'common', statBonus: 3, icon: '🔰' };
            this.player.maxSkillCooldown = 4;
            this.player.maxSkillCooldown2 = 9;
        } else if (playerClass === 'necromancer') {
            this.player.maxHp = 75; this.player.hp = 75; this.player.maxMp = 110; this.player.mp = 110; this.player.baseAtk = 13;
            this.equipped.weapon = { id: 'w5', name: 'Bone Scepter', type: 'weapon', rarity: 'common', statBonus: 6, icon: '🦴' };
            this.player.maxSkillCooldown = 6;
            this.player.maxSkillCooldown2 = 4;
        } else if (playerClass === 'ranger') {
            this.player.baseAtk = 13; this.player.baseFov = 9;
            this.equipped.weapon = { id: 'w6', name: 'Recurve Bow', type: 'weapon', rarity: 'common', statBonus: 6, icon: '🏹' };
            this.player.maxSkillCooldown = 4;
            this.player.maxSkillCooldown2 = 6;
        }

        // Permanent Archon Hub upgrades
        this.player.maxHp += (this.meta.vitality || 0) * 5; this.player.hp = this.player.maxHp;
        this.player.baseAtk += (this.meta.power || 0);
    },

    launchRun() {
        this.ui.navigate('play');
        // Let the play screen lay out before sizing the canvas to it.
        requestAnimationFrame(() => this.resizeCanvas());
        this.generateLevel();
        sfx.playVictory();
        music.start();
        music.setTarget(0);
    },

    startGame(playerClass, daily = false) {
        this.clearAutosave();
        this.dailyMode = daily;
        this.bossRushMode = false;
        this.endlessMode = false;
        this.trialMode = false; this.trialId = null;
        if (!daily) { this.dailySeed = 0; this.dailyKey = null; }
        // Mutators are excluded from Daily Challenge runs so results stay comparable
        const mutatorsToApply = daily ? [] : this.stagedMutators.slice();
        this.stagedMutators = [];
        this.level = 1;
        this.initNewPlayer(playerClass);
        if (mutatorsToApply.length > 0) {
            this.activeMutators = mutatorsToApply;
            this.applyMutatorEffects();
            this.checkAchievements();
        }
        this.launchRun();
        if (daily) this.logMessage(`DAILY CHALLENGE ${this.dailyKey}: fixed dungeon, fixed class. Descend!`, 'log-level');
        else if (this.activeMutators.length > 0) {
            const names = this.activeMutators.map(id => (MUTATOR_POOL.find(m => m.id === id) || {}).name).join(', ');
            this.logMessage(`Mutators active: ${names}`, 'log-level');
        }
    },

    applyMutatorEffects() {
        if (this.activeMutators.includes('bloodlust')) {
            const loss = Math.ceil(this.player.maxHp * 0.2);
            this.player.maxHp = Math.max(10, this.player.maxHp - loss);
            this.player.hp = this.player.maxHp;
        }
    },

    startBossRush(playerClass) {
        if (!this.isBossRushUnlocked()) return;
        this.clearAutosave();
        this.dailyMode = false; this.dailySeed = 0; this.dailyKey = null;
        this.bossRushMode = true;
        this.endlessMode = false;
        this.trialMode = false; this.trialId = null;
        this.bossRushIndex = 0;
        this.ascensionTier = 0;
        this.level = 10;
        this.initNewPlayer(playerClass);
        this.launchRun();
        this.logMessage('BOSS RUSH: face all three floor guardians in sequence. No exploring, no loot runs — just steel and nerve.', 'log-level');
    },

    startEndless(playerClass) {
        this.clearAutosave();
        this.dailyMode = false; this.dailySeed = 0; this.dailyKey = null;
        this.bossRushMode = false;
        this.endlessMode = true;
        this.trialMode = false; this.trialId = null;
        this.endlessWave = 0;
        this.endlessBreatherTimer = 0;
        this.level = 5;
        this.initNewPlayer(playerClass);
        this.launchRun();
        this.logMessage('ENDLESS MODE: survive as many waves as you can. There is no exit but death.', 'log-level');
    },

    // --- Archon Trials: short, hand-tuned, seed-fixed gauntlets. Cosmetic titles only. ---
    startTrial(trialId) {
        const trial = TRIALS_DB.find(t => t.id === trialId);
        if (!trial) return;
        this.clearAutosave();
        this.dailyMode = false; this.dailySeed = 0; this.dailyKey = null;
        this.bossRushMode = false; this.endlessMode = false;
        this.trialMode = true; this.trialId = trialId; this.trialSeed = trial.seed;
        this.level = trial.level;
        this.initNewPlayer(trial.cls);
        this.activeMutators = trial.mutators.slice();
        this.applyMutatorEffects();
        this.launchRun();
        this.logMessage(`${trial.name}: a fixed gauntlet. Reach the stairs to claim "${trial.title}".`, 'log-level');
    },

    finishTrial() {
        const trial = TRIALS_DB.find(t => t.id === this.trialId);
        this.gameOverHandled = true;
        this.clearAutosave();
        music.stop();
        sfx.playVictory();
        if (!this.meta.titles) this.meta.titles = [];
        let newTitle = false;
        if (trial && !this.meta.titles.includes(trial.title)) {
            this.meta.titles.push(trial.title);
            newTitle = true;
        }
        this.recordRunHistory('trial', 0);
        this.saveMeta();
        this.checkAchievements();
        this.ui.openModal('trialVictory', {
            name: trial ? trial.name : 'Trial',
            title: trial ? trial.title : '',
            newTitle,
            timeMs: this.runStats ? this.runStats.activeMs : 0,
        });
    },

    // --- Boss Rush progression ---
    advanceBossRush() {
        this.bossRushIndex++;
        if (this.bossRushIndex >= this.bossRushOrder.length) {
            this.finishBossRush();
            return;
        }
        // Brief respite between guardians - not a full heal, to keep the gauntlet tense
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.ceil(this.player.maxHp * 0.35));
        this.player.mp = Math.min(this.player.maxMp, this.player.mp + Math.ceil(this.player.maxMp * 0.35));
        this.player.statuses = [];
        this.logMessage('Guardian defeated! Brace yourself for the next...', 'log-level');
        this.generateLevel();
    },

    finishBossRush() {
        if (!this.meta.stats) this.meta.stats = {};
        this.meta.stats.bossRushCleared = true;
        const soulsEarned = Math.floor((60 + (this.player.lvl || 1) * 3) * (1 + (this.ascensionTier || 0) * 0.5));
        this.meta.souls += soulsEarned;
        this.meta.stats.totalSoulsEarned = (this.meta.stats.totalSoulsEarned || 0) + soulsEarned;
        this.recordRunHistory('bossrush', 0);
        this.saveMeta();
        this.checkAchievements();

        this.gameOverHandled = true;
        music.stop();
        sfx.playVictory();
        this.ui.openModal('bossRushVictory', {
            ascension: this.ascensionTier,
            guardians: this.bossRushOrder.length,
            souls: soulsEarned,
            timeMs: this.runStats ? this.runStats.activeMs : 0,
            classType: this.player.classType,
            lvl: this.player.lvl,
        });
    },

    // Keep the same character and re-run the gauntlet against tougher guardians.
    ascendBossRush() {
        this.ascensionTier = (this.ascensionTier || 0) + 1;
        this.ui.closeModal('bossRushVictory');
        this.gameOverHandled = false;
        this.bossRushIndex = 0;
        this.player.hp = this.player.maxHp;
        this.player.mp = this.player.maxMp;
        this.player.statuses = [];
        if (!this.meta.stats) this.meta.stats = {};
        if (!this.meta.stats.maxAscension || this.ascensionTier > this.meta.stats.maxAscension) {
            this.meta.stats.maxAscension = this.ascensionTier;
            this.saveMeta();
        }
        this.checkAchievements();
        this.logMessage(`ASCENSION TIER ${this.ascensionTier}! The guardians return, stronger than before...`, 'log-level');
        music.start();
        this.generateLevel();
    },

    recordRunHistory(mode, depth) {
        if (!this.meta.runHistory) this.meta.runHistory = [];
        this.meta.runHistory.unshift({
            d: Date.now(), cls: this.player.classType, depth, lvl: this.player.lvl,
            kills: this.runStats ? this.runStats.kills : 0, ms: this.runStats ? this.runStats.activeMs : 0,
            daily: !!this.dailyMode, mode, killer: this.lastAttacker || null,
            relics: this.relics.length, gold: this.player.gold
        });
        if (this.meta.runHistory.length > 30) this.meta.runHistory.length = 30;
    },

    handleGameOver() {
        if (this.gameOverHandled) return;
        this.gameOverHandled = true;
        this.clearAutosave();
        music.stop();
        this.paused = false;
        music.duck(false);
        sfx.playDefeat();

        const isEndless = this.endlessMode;
        const scoreDepth = isEndless ? this.endlessWave : this.level;
        const mutatorBonus = 1 + (this.activeMutators ? this.activeMutators.length * 0.15 : 0);
        // Archon Trials are cosmetic-only and never touch the Souls economy
        const soulsEarned = this.trialMode ? 0 : Math.floor((scoreDepth * 3 + (this.player.lvl || 1) * 2 + (this.player.gold || 0) * 0.05) * mutatorBonus);
        this.meta.souls += soulsEarned;
        if (!this.meta.stats) this.meta.stats = {};
        this.meta.stats.totalSoulsEarned = (this.meta.stats.totalSoulsEarned || 0) + soulsEarned;
        if (this.dailyMode) this.meta.stats.dailyCompletions = (this.meta.stats.dailyCompletions || 0) + 1;

        const runMs = this.runStats ? this.runStats.activeMs : 0;
        const kills = this.runStats ? this.runStats.kills : 0;
        const mode = this.trialMode ? 'trial' : (isEndless ? 'endless' : (this.bossRushMode ? 'bossrush' : (this.dailyMode ? 'daily' : 'normal')));
        this.recordRunHistory(mode, scoreDepth);

        // Daily challenge personal best
        let daily = null;
        if (this.dailyMode && this.dailyKey) {
            const prev = (this.meta.dailyBest && this.meta.dailyBest.date === this.dailyKey) ? this.meta.dailyBest : null;
            const isNew = !prev || this.level > prev.depth;
            if (isNew) this.meta.dailyBest = { date: this.dailyKey, depth: this.level, ms: runMs };
            daily = { isNew, depth: isNew ? this.level : prev.depth };
        }

        // Personal-best diff for this class (normal descents only)
        let bestDiff = null;
        if (mode === 'normal') {
            if (!this.meta.bestDepthByClass) this.meta.bestDepthByClass = {};
            const cls = this.player.classType;
            const prevBest = this.meta.bestDepthByClass[cls] || 0;
            bestDiff = { prev: prevBest, delta: this.level - prevBest };
            if (this.level > prevBest) this.meta.bestDepthByClass[cls] = this.level;
        }

        // Death as a story beat: the Descent remembers who keeps killing you
        const killer = this.lastAttacker || 'the Descent itself';
        if (!this.meta.deathsBy) this.meta.deathsBy = {};
        const timesKilled = (this.meta.deathsBy[killer] || 0) + 1;
        this.meta.deathsBy[killer] = timesKilled;

        this.saveMeta();
        this.checkAchievements();

        let headline;
        if (isEndless) headline = `You fell on wave ${this.endlessWave}`;
        else if (this.bossRushMode) headline = `Fell to guardian ${this.bossRushIndex + 1} of ${this.bossRushOrder.length}`;
        else if (this.trialMode) headline = 'The trial claims you';
        else headline = `You reached depth B${this.level.toString().padStart(2, '0')}`;

        this.ui.openModal('death', {
            headline, souls: soulsEarned, timeMs: runMs, kills, killer, timesKilled,
            daily, bestDiff, classType: this.player.classType, lvl: this.player.lvl,
        });
    },

    abandonRun() {
        this.paused = false;
        music.duck(false);
        this.ui.closeAllModals();
        this.player.hp = 0;
        this.lastAttacker = this.lastAttacker || 'your own retreat';
        this.handleGameOver();
    },

    // Leave the run screen. Normal and daily runs keep their autosave so they can be resumed.
    returnToTitle() {
        this.paused = false;
        music.duck(false);
        music.stop();
        if (this.player && this.player.hp > 0 && !this.gameOverHandled) this.saveAutosave();
        this.player = null;
        this.emitHud();
        this.ui.navigate('title');
    },

    togglePause() {
        if (!this.player || this.player.hp <= 0 || this.gameOverHandled) return;
        const open = this.ui.hasModal('pause');
        if (!open && this.ui.isBlocking()) return; // a draft, shop or other modal owns input
        this.paused = !open;
        if (this.paused) {
            this.ui.openModal('pause', {
                depth: this.depthLabel, classType: this.player.classType, lvl: this.player.lvl,
                timeMs: this.runStats ? this.runStats.activeMs : 0,
                canSave: !this.bossRushMode && !this.endlessMode && !this.trialMode,
            });
        } else {
            this.ui.closeModal('pause');
        }
        music.duck(this.paused);
    },

    chooseRoute(type) {
        this.ui.closeModal('route');
        this.routeModifier = type;
        sfx.playVictory();
        this.startLevelTransition(() => {
            this.level++;
            this.generateLevel();
        });
    },

    openEpilogue() {
        this.ui.openModal('epilogue', { classType: this.player ? this.player.classType : null });
    },

    // --- Mid-run autosave/resume: normal/daily descents only ---
    serializeRun() {
        return {
            v: 2,
            level: this.level, player: this.player, inventory: this.inventory, equipped: this.equipped,
            talents: this.talents, relics: this.relics, allies: this.allies, playerTraps: this.playerTraps,
            ambushTriggers: this.ambushTriggers, hordeTriggers: this.hordeTriggers, hordeState: this.hordeState,
            secretWalls: this.secretWalls, classLockedWalls: this.classLockedWalls, switchLinks: this.switchLinks, shaftLinks: this.shaftLinks, currents: this.currents,
            map: this.map, fog: this.fog, tileVariants: this.tileVariants,
            enemies: this.enemies, chests: this.chests, itemsOnGround: this.itemsOnGround, torches: this.torches,
            shrines: this.shrines, destructibles: this.destructibles, captives: this.captives, trapStates: this.trapStates,
            stairs: this.stairs, isBossArena: this.isBossArena, darknessFloor: this.darknessFloor, isGauntlet: this.isGauntlet,
            unstableFloor: this.unstableFloor, unstableTimer: this.unstableTimer, routeModifier: this.routeModifier,
            dailyMode: this.dailyMode, dailyKey: this.dailyKey, dailySeed: this.dailySeed,
            activeMutators: this.activeMutators, activeBounty: this.activeBounty,
            phoenixUsed: this.phoenixUsed, seenRelicSynergies: this.seenRelicSynergies,
            runStats: this.runStats, biome: this.textures.currentBiome, depthLabel: this.depthLabel, savedAt: Date.now()
        };
    },

    saveAutosave() {
        if (!this.player || this.player.hp <= 0 || this.bossRushMode || this.endlessMode || this.trialMode) return;
        try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(this.serializeRun())); } catch (e) {}
    },

    clearAutosave() {
        try { localStorage.removeItem(AUTOSAVE_KEY); } catch (e) {}
        this.ui.metaChanged();
    },

    // Summary for the title screen's Continue button, or null when there is nothing to resume.
    getAutosaveSummary() {
        try {
            const raw = localStorage.getItem(AUTOSAVE_KEY);
            if (!raw) return null;
            const d = JSON.parse(raw);
            if (!d || !d.player) return null;
            return { classType: d.player.classType, lvl: d.player.lvl, level: d.level, daily: !!d.dailyMode, savedAt: d.savedAt };
        } catch (e) { return null; }
    },

    hasAutosave() { return !!this.getAutosaveSummary(); },

    resumeRun() {
        let raw;
        try { raw = localStorage.getItem(AUTOSAVE_KEY); } catch (e) { raw = null; }
        if (!raw) return false;
        let data;
        try { data = JSON.parse(raw); } catch (e) { this.clearAutosave(); return false; }
        if (!data || !data.player || !data.map) { this.clearAutosave(); return false; }

        this.gameOverHandled = false;
        this.paused = false;
        this.ui.clearLog();

        this.level = data.level; this.player = data.player; this.inventory = data.inventory; this.equipped = data.equipped;
        this.player.path = [];
        this.talents = data.talents || []; this.relics = data.relics || []; this.allies = data.allies || [];
        this.playerTraps = data.playerTraps || []; this.ambushTriggers = data.ambushTriggers || [];
        this.hordeTriggers = data.hordeTriggers || []; this.hordeState = data.hordeState || null; this.hordeBreatherTimer = 0;
        this.secretWalls = data.secretWalls || [];
        this.classLockedWalls = data.classLockedWalls || [];
        this.switchLinks = data.switchLinks || {};
        this.shaftLinks = data.shaftLinks || {};
        this.currents = data.currents || {};
        this.map = data.map; this.fog = data.fog; this.tileVariants = data.tileVariants;
        this.mapHeight = this.map.length; this.mapWidth = this.map[0].length;
        this.enemies = data.enemies || []; this.chests = data.chests || []; this.itemsOnGround = data.itemsOnGround || [];
        this.torches = data.torches || []; this.shrines = data.shrines || []; this.destructibles = data.destructibles || [];
        this.captives = data.captives || []; this.trapStates = data.trapStates || {};
        this.telegraphs = [];
        this.stairs = data.stairs; this.isBossArena = !!data.isBossArena; this.isEndlessArena = false;
        this.darknessFloor = !!data.darknessFloor; this.isGauntlet = !!data.isGauntlet;
        this.unstableFloor = !!data.unstableFloor; this.unstableTimer = data.unstableTimer || 0;
        this.routeModifier = data.routeModifier || null;
        this.activeMutators = data.activeMutators || [];
        this.activeBounty = data.activeBounty || null;
        this.dailyMode = !!data.dailyMode; this.dailyKey = data.dailyKey || null; this.dailySeed = data.dailySeed || 0;
        this.bossRushMode = false; this.endlessMode = false; this.trialMode = false; this.ascensionTier = 0; this.endlessWave = 0;
        this.runStats = data.runStats || { activeMs: 0, kills: 0 };
        this.lastTimerSecs = -1;
        this.phoenixUsed = !!data.phoenixUsed; this.luckyCounter = 0; this.momentumReady = false;
        this.seenRelicSynergies = data.seenRelicSynergies || [];

        this.textures.setBiome(data.biome || 'catacombs');
        this.particles = [];
        this.ambientMotes = [];
        for (let i = 0; i < 50; i++) {
            this.ambientMotes.push({ x: Math.random() * this.mapWidth * this.tileSize, y: Math.random() * this.mapHeight * this.tileSize, vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15, phase: Math.random() * Math.PI * 2, size: Math.random() * 2 + 1 });
        }
        this.camX = null; this.camY = null;

        let biomeName = this.textures.currentBiome.toUpperCase();
        if (this.darknessFloor) biomeName += ' · DARK';
        if (this.unstableFloor) biomeName += ' · UNSTABLE';
        this.depthLabel = data.depthLabel || `DEPTH B${this.level.toString().padStart(2, '0')} - ${biomeName}`;

        this.ui.navigate('play');
        requestAnimationFrame(() => this.resizeCanvas());
        this.updateFOV();
        this.emitHud();
        this.drawMinimap();

        sfx.playVictory();
        music.start(); music.setBiome(this.textures.currentBiome); music.setTarget(0);
        this.logMessage('Resumed your expedition.', 'log-system');
        return true;
    },
};
