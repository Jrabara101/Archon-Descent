// ============================================================================
// --- ARCHON'S DESCENT: ENGINE CORE ---
// The engine owns the canvas, the game loop and all game state. It talks to
// React only through the `ui` bridge (see src/bridge/store.js).
// ============================================================================
import { TextureCache, PlayerSpriteCache } from './sprites.js';
import { music } from './audio.js';
import {
    PLAYER_COLORS, MASTERY_COLORS, MASTERY_KILL_THRESHOLD, RELIC_POOL, BOUNTY_POOL,
    TALENT_DEFS, MUTATOR_POOL, TRIALS_DB
} from './data.js';
import { metaMethods } from './meta.js';
import { runMethods } from './run.js';
import { generationMethods } from './generation.js';
import { combatMethods } from './combat.js';
import { skillMethods } from './skills.js';
import { itemMethods } from './items.js';
import { renderMethods } from './render.js';
import { inputMethods } from './input.js';

export class DungeonEngine {
    constructor({ canvas, minimap, fxLayer, ui }) {
        this.ui = ui;
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.minimapCanvas = minimap;
        this.mmCtx = minimap.getContext('2d');
        this.fxLayer = fxLayer;

        this.tileSize = 32;
        this.mapWidth = 60;
        this.mapHeight = 60;

        this.textures = new TextureCache(this.tileSize);
        this.playerSprites = new PlayerSpriteCache(this.tileSize);

        this.level = 1;
        this.player = null;
        this.enemies = [];
        this.chests = [];
        this.itemsOnGround = [];
        this.torches = [];
        this.shrines = [];
        this.destructibles = [];
        this.stairs = null;
        this.isBossArena = false;

        // Tiles: 0 wall, 1 floor, 3 stairs, 4 destructible, 5 spikes, 6 locked door, 7 lava,
        // 8 web, 9 secret wall, 10 class-locked wall, 11 chasm, 12 vault switch, 13/14 ladder
        this.map = [];
        this.fog = [];
        this.tileVariants = [];
        this.telegraphs = [];
        this.captives = [];
        this.trapStates = {};

        this.particles = [];
        this.ambientMotes = [];
        this.cameraShake = { duration: 0, intensity: 0 };
        this.camX = null; this.camY = null;
        this.hitStopTimer = 0;
        this.levelUpAnim = null;
        this.transition = null;
        this.lastFrameTime = 0;
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
        this.switchLinks = {}; this.shaftLinks = {}; this.currents = {};
        this.unstableFloor = false; this.unstableTimer = 0;
        this.trialMode = false; this.trialId = null; this.trialSeed = 0;
        this.meta = this.loadMeta();
        this.settings = this.loadSettings();

        this.paused = false;
        this.runStats = null;
        this.lastTimerSecs = -1;
        this.darknessFloor = false;
        this.dailyMode = false; this.dailySeed = 0; this.dailyKey = null;
        this.phoenixUsed = false; this.luckyCounter = 0; this.momentumReady = false;
        this.bossRushMode = false; this.bossRushIndex = 0; this.bossRushOrder = ['catacombs', 'forges', 'drowned', 'void']; this.ascensionTier = 0;
        this.routeModifier = null;
        this.stagedMutators = []; this.activeMutators = [];
        this.endlessMode = false; this.endlessWave = 0; this.endlessBreatherTimer = 0;
        this.depthLabel = '';

        this.resizeCanvas();
        this._onResize = () => this.resizeCanvas();
        window.addEventListener('resize', this._onResize);

        this.applySettings();
        this.bindInput();
        this.initSkillFXLayer();
        this.loopStarted = true;
        this._raf = requestAnimationFrame(() => this.gameLoop());
    }

    destroy() {
        cancelAnimationFrame(this._raf);
        this._destroyed = true;
        window.removeEventListener('resize', this._onResize);
        this.unbindInput();
        music.stop();
    }

    resizeCanvas() {
        const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : null;
        const w = Math.max(1, Math.round(rect && rect.width ? rect.width : window.innerWidth));
        const h = Math.max(1, Math.round(rect && rect.height ? rect.height : window.innerHeight));
        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx.imageSmoothingEnabled = false;
        this.viewWidth = this.canvas.width / this.tileSize;
        this.viewHeight = this.canvas.height / this.tileSize;
        if (!this.lightCanvas) this.lightCanvas = document.createElement('canvas');
        this.lightCanvas.width = this.canvas.width;
        this.lightCanvas.height = this.canvas.height;
        this.resizeSkillFXLayer();
    }

    gameLoop() {
        if (this._destroyed) return;
        const now = performance.now();
        if (!this.lastFrameTime) this.lastFrameTime = now;
        const dt = Math.min(100, now - this.lastFrameTime);
        this.lastFrameTime = now;
        const next = () => { this._raf = requestAnimationFrame(() => this.gameLoop()); };

        music.update(dt);
        if (this.player) this.pollGamepad(now);

        // Run timer: frozen while paused, in a menu, or after death
        if (this.runStats && this.player && this.player.hp > 0 && !this.paused && !this.gameOverHandled && !this.ui.isBlocking()) {
            this.runStats.activeMs += dt;
            const secs = Math.floor(this.runStats.activeMs / 1000);
            if (secs !== this.lastTimerSecs) {
                this.lastTimerSecs = secs;
                this.emitHud();
            }
        }

        if (this.paused || !this.player) {
            this.render();
            next();
            return;
        }

        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= dt;
            this.render();
            next();
            return;
        }

        if (this.player.path.length > 0 && !this.transition && !this.ui.isBlocking()) {
            if (!this.lastPathStepTime) this.lastPathStepTime = 0;
            const t = Date.now();
            if (t - this.lastPathStepTime > 130) {
                const nextStep = this.player.path.shift();
                const collidesEnemy = this.enemies.some(e => e.x === nextStep.x && e.y === nextStep.y && !e.dying);
                if (collidesEnemy) this.player.path = [];
                this.processAction(nextStep.x, nextStep.y);
                this.lastPathStepTime = t;
            }
        }

        this.player.visualX += (this.player.x - this.player.visualX) * 0.22;
        this.player.visualY += (this.player.y - this.player.visualY) * 0.22;
        this.updateEntityAnim(this.player);

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e.dying) {
                e.deathTimer -= dt / 350;
                if (e.deathTimer <= 0) { this.enemies.splice(i, 1); continue; }
            } else {
                e.visualX += (e.x - e.visualX) * 0.18; e.visualY += (e.y - e.visualY) * 0.18;
                this.updateEntityAnim(e);
                if (this.hasStatus(e, 'burn') && Math.random() < 0.12) {
                    this.particles.push({ x: e.visualX * this.tileSize + 16 + (Math.random() - 0.5) * 8, y: e.visualY * this.tileSize + 10, vx: (Math.random() - 0.5) * 0.4, vy: -0.6 - Math.random() * 0.4, life: 0.8, decay: 0.05, color: '#f97316', size: 2, type: 'dust' });
                }
            }
        }

        this.allies.forEach(a => {
            a.visualX += (a.x - a.visualX) * 0.18; a.visualY += (a.y - a.visualY) * 0.18;
            this.updateEntityAnim(a);
        });

        // Endless Mode: once a wave's dying enemies finish animating, breathe, then spawn the next
        if (this.endlessMode && this.player.hp > 0 && this.enemies.length === 0 && this.endlessBreatherTimer <= 0 && !this.transition) {
            this.startEndlessBreather();
        }
        if (this.endlessBreatherTimer > 0 && this.player.hp > 0) {
            this.endlessBreatherTimer -= dt;
            if (this.endlessBreatherTimer <= 0) {
                this.endlessBreatherTimer = 0;
                this.spawnNextEndlessWave();
            }
        }

        // Horde Room: once a wave's tagged enemies are gone, start the next wave or pay out
        if (this.hordeState && this.hordeState.active && this.player.hp > 0 && !this.enemies.some(e => e.hordeTag) && this.hordeBreatherTimer <= 0 && !this.transition) {
            if (this.hordeState.wave >= this.hordeState.maxWaves) this.finishHorde();
            else this.hordeBreatherTimer = 1200;
        }
        if (this.hordeBreatherTimer > 0 && this.player.hp > 0) {
            this.hordeBreatherTimer -= dt;
            if (this.hordeBreatherTimer <= 0) {
                this.hordeBreatherTimer = 0;
                this.spawnHordeWave();
            }
        }

        this.itemsOnGround.forEach(it => {
            if (it.popVz !== undefined && (it.popZ > 0 || it.popVz !== 0)) {
                it.popVz -= 0.35; it.popZ += it.popVz;
                if (it.popZ <= 0) { it.popZ = 0; it.popVz = 0; }
            }
            if (!it.isGold && (it.rarity === 'epic' || it.rarity === 'legendary') && Math.random() < 0.025) {
                this.particles.push({ x: (it.x + 0.5) * this.tileSize + (Math.random() - 0.5) * 10, y: (it.y + 0.5) * this.tileSize - (it.popZ || 0), vx: 0, vy: -0.3, life: 1, decay: 0.05, color: it.rarity === 'legendary' ? '#facc15' : '#c084fc', size: 2, type: 'sparkle' });
            }
        });

        this.ambientMotes.forEach(m => {
            m.x += m.vx; m.y += m.vy;
            const mw = this.mapWidth * this.tileSize, mh = this.mapHeight * this.tileSize;
            if (m.x < 0) m.x = mw; if (m.x > mw) m.x = 0;
            if (m.y < 0) m.y = mh; if (m.y > mh) m.y = 0;
        });

        if (this.transition) {
            const t = this.transition;
            t.progress += 0.06;
            if (t.phase === 'out' && t.progress >= 1) {
                t.progress = 1;
                if (t.onMidpoint) { const cb = t.onMidpoint; t.onMidpoint = null; cb(); }
                t.phase = 'in'; t.progress = 0;
            } else if (t.phase === 'in' && t.progress >= 1) {
                this.transition = null;
            }
        }

        if (this.levelUpAnim) {
            const a = this.levelUpAnim;
            a.timer += dt;
            if (a.phase === 'zoom' && a.timer > 500) { a.phase = 'shatter'; a.timer = 0; this.spawnLevelUpShatter(); }
            else if (a.phase === 'shatter' && a.timer > 500) { this.levelUpAnim = null; }
        }

        this.updateParticles();
        this.render();
        next();
    }

    // --- UI bridge -----------------------------------------------------------

    logMessage(text, className = '') { this.ui.log(text, className); }
    showLoreToast(text) { this.ui.toast(text); }
    isMenuOverlayOpen() { return this.ui.isBlocking(); }
    pulseSkillIcon(slotId) { this.ui.pulse(slotId); }

    // Every legacy "refresh the DOM" call now just publishes one HUD snapshot.
    updateStatsUI() { this.emitHud(); }
    updateInventoryUI() { this.emitHud(); }

    getPlayerRenderColor() {
        if (!this.player) return '#38bdf8';
        const cls = this.player.classType;
        const kills = (this.meta.classKills && this.meta.classKills[cls]) || 0;
        if (kills >= MASTERY_KILL_THRESHOLD && MASTERY_COLORS[cls]) return MASTERY_COLORS[cls];
        return PLAYER_COLORS[cls] || '#38bdf8';
    }

    getCritChance() {
        let crit = 5 + this.player.lvl;
        if (this.talents.includes('piercing_focus')) crit += 10;
        return Math.min(60, crit);
    }

    emitHud() {
        const p = this.player;
        if (!p) { this.ui.hud(null); return; }
        const rank = p.lvl >= 10 ? 'Archon' : p.lvl >= 7 ? 'Champion' : p.lvl >= 4 ? 'Veteran' : 'Initiate';
        let bounty = null;
        if (this.activeBounty) {
            const def = BOUNTY_POOL.find(b => b.id === this.activeBounty.id);
            if (def) {
                const b = this.activeBounty;
                const progress = b.id === 'slayer' ? `${Math.min(b.kills, 3)}/3` : b.id === 'speed' ? `${b.turns}/40` : '';
                bounty = { name: def.name, desc: def.desc, progress, failed: !!b.failed };
            }
        }
        this.ui.hud({
            classType: p.classType,
            color: this.getPlayerRenderColor(),
            lvl: p.lvl, rank,
            hp: Math.max(0, Math.round(p.hp)), maxHp: p.maxHp,
            mp: Math.max(0, Math.round(p.mp)), maxMp: p.maxMp,
            xp: p.xp, xpNeeded: p.xpNeeded,
            atk: this.getPlayerAttack(), def: this.getPlayerDefense(),
            crit: this.getCritChance(),
            gold: p.gold, keys: p.keys || 0, haste: p.hasteTurns || 0,
            battleCry: p.battleCryTurns || 0,
            potions: { ...p.potions },
            cooldowns: {
                'ability-1': { cd: p.skillCooldown, max: p.maxSkillCooldown, locked: false },
                'ability-2': { cd: p.skillCooldown2, max: p.maxSkillCooldown2, locked: false },
                'ability-ult': { cd: p.ultimateCooldown, max: p.maxUltimateCooldown, locked: p.lvl < 10 },
            },
            statuses: (p.statuses || []).map(s => ({ type: s.type, turns: s.turns })),
            talents: this.talents.map(id => TALENT_DEFS[id] || { id, name: id, icon: '⚡', desc: '' }),
            relics: this.relics.map(id => RELIC_POOL.find(r => r.id === id)).filter(Boolean),
            allies: this.allies.map(a => ({ name: a.name, icon: a.icon, turnsLeft: a.turnsLeft })),
            inventory: this.inventory.map(it => it ? { ...it } : null),
            equipped: { ...this.equipped },
            depthLabel: this.depthLabel,
            bounty,
            timeMs: this.runStats ? this.runStats.activeMs : 0,
            mutators: (this.activeMutators || []).map(id => MUTATOR_POOL.find(m => m.id === id)).filter(Boolean),
            trial: this.trialMode ? (TRIALS_DB.find(t => t.id === this.trialId) || null) : null,
            mode: this.trialMode ? 'trial' : this.endlessMode ? 'endless' : this.bossRushMode ? 'bossrush' : this.dailyMode ? 'daily' : 'normal',
        });
    }
}

Object.assign(
    DungeonEngine.prototype,
    metaMethods, runMethods, generationMethods, combatMethods,
    skillMethods, itemMethods, renderMethods, inputMethods
);
