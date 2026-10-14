// ============================================================================
// --- META-PROGRESSION, SETTINGS, ACHIEVEMENTS & SAVE DATA ---
// ============================================================================
import { sfx, music } from './audio.js';
import {
    BOUNTY_POOL, BESTIARY_DB, ACHIEVEMENTS_DB, LORE_DB, TRIALS_DB, STORY_BEATS, RELIC_POOL,
    HUB_UPGRADES, ALL_CLASSES, MASTERY_KILL_THRESHOLD, BOSS_ACT_LORE, todayKey, hashStr
} from './data.js';

const META_KEY = 'archonDescent_meta';
const SETTINGS_KEY = 'archonDescent_settings';

function metaDefaults() {
    return {
        souls: 0, vitality: 0, power: 0, fortune: 0,
        bestiary: {}, lore: [], runHistory: [], dailyBest: null,
        achievements: {}, stats: {}, titles: [],
        classKills: {}, bestDepthByClass: {}, deathsBy: {}, loadoutPresets: {}, tutorialsSeen: []
    };
}

// Saves have been written by two different builds with different key names.
// Fold the August build's shape into the canonical one so no progress is lost.
function migrateMeta(raw) {
    const meta = Object.assign(metaDefaults(), raw);
    if (Array.isArray(raw.unlockedLore)) {
        meta.lore = [...new Set([...(meta.lore || []), ...raw.unlockedLore])];
        delete meta.unlockedLore;
    }
    if (Array.isArray(raw.unlockedAchievements)) {
        raw.unlockedAchievements.forEach(id => { if (!meta.achievements[id]) meta.achievements[id] = Date.now(); });
        delete meta.unlockedAchievements;
    }
    if (Array.isArray(raw.history)) {
        const converted = raw.history.map(h => ({
            d: Date.parse(h.date) || Date.now(), cls: h.classType, depth: h.level, lvl: h.charLvl,
            kills: h.kills || 0, ms: 0, daily: false, mode: 'normal', killer: h.killer
        }));
        meta.runHistory = [...(meta.runHistory || []), ...converted].slice(0, 30);
        delete meta.history;
    }
    if (raw.greed && !raw.fortune) { meta.fortune = raw.greed; delete meta.greed; }
    if (raw.stats && raw.stats.maxAscensionTier && !(raw.stats.maxAscension >= raw.stats.maxAscensionTier)) {
        meta.stats.maxAscension = raw.stats.maxAscensionTier;
    }
    return meta;
}

export const metaMethods = {
    loadMeta() {
        try {
            const raw = localStorage.getItem(META_KEY);
            if (raw) return migrateMeta(JSON.parse(raw));
        } catch (e) {}
        return metaDefaults();
    },

    saveMeta() {
        try { localStorage.setItem(META_KEY, JSON.stringify(this.meta)); } catch (e) {}
        this.ui.metaChanged();
    },

    exportSaveData() {
        const payload = { v: 1, exportedAt: Date.now(), meta: this.meta, settings: this.settings };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `archons-descent-save-${todayKey()}.json`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.ui.toast('Save data exported.');
    },

    // Resolves to a short status message for the Settings page to show.
    importSaveData(file) {
        return new Promise(resolve => {
            if (!file) { resolve({ ok: false, message: 'No file selected.' }); return; }
            const reader = new FileReader();
            reader.onload = () => {
                let payload;
                try { payload = JSON.parse(reader.result); } catch (e) {
                    resolve({ ok: false, message: 'That file is not a valid save. Choose a .json file exported from this game.' });
                    return;
                }
                if (!payload || typeof payload.meta !== 'object') {
                    resolve({ ok: false, message: 'That JSON file is not an Archon\'s Descent save.' });
                    return;
                }
                this.meta = migrateMeta(payload.meta);
                this.saveMeta();
                if (payload.settings && typeof payload.settings === 'object') {
                    this.settings = Object.assign(this.loadSettings(), payload.settings);
                    this.saveSettings();
                    this.applySettings();
                }
                resolve({ ok: true, message: `Save imported: ${this.meta.souls} souls, ${Object.keys(this.meta.achievements || {}).length} achievements.` });
            };
            reader.onerror = () => resolve({ ok: false, message: 'The file could not be read.' });
            reader.readAsText(file);
        });
    },

    loadSettings() {
        const defaults = { sfx: 1, music: 0.4, shake: 1, colorblind: false, uiScale: 1, storyMode: true, showTutorialTips: true, touchControls: 'auto', reduceMotion: false };
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (raw) return Object.assign(defaults, JSON.parse(raw));
        } catch (e) {}
        return defaults;
    },

    saveSettings() {
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch (e) {}
        this.ui.metaChanged();
    },

    applySettings() {
        sfx.volume = this.settings.sfx;
        music.setVolume(this.settings.music);
        const root = document.documentElement;
        root.classList.toggle('colorblind', !!this.settings.colorblind);
        root.classList.toggle('reduce-motion', !!this.settings.reduceMotion);
        root.style.setProperty('--ui-scale', this.settings.uiScale || 1);
    },

    updateSettings(patch) {
        this.settings = { ...this.settings, ...patch };
        this.saveSettings();
        this.applySettings();
        this.emitHud();
    },

    getRarityColor(r) {
        const palette = this.settings && this.settings.colorblind
            ? { common: '#94a3b8', rare: '#38bdf8', epic: '#f472b6', legendary: '#fb923c' }
            : { common: '#94a3b8', rare: '#3b82f6', epic: '#a855f7', legendary: '#eab308' };
        return palette[r] || '#94a3b8';
    },

    updateBountyBadge() { this.emitHud(); },

    resolveBounty() {
        if (!this.activeBounty) return;
        const b = this.activeBounty;
        const def = BOUNTY_POOL.find(x => x.id === b.id);
        let success = !b.failed;
        if (success && b.id === 'slayer' && b.kills < 3) success = false;
        if (success && b.id === 'speed' && b.turns > 40) success = false;
        if (success && def) {
            const gold = 40 + this.level * 6;
            const xp = 15 + this.level * 3;
            this.dropGoldAt(this.player.x, this.player.y, gold);
            this.player.xp += xp;
            this.bumpStat('bountiesCompleted', 1);
            this.logMessage(`Bounty complete: ${def.name}! +${gold} gold, +${xp} XP.`, 'log-loot');
            this.checkLevelUp();
        } else if (def) {
            this.logMessage(`Bounty failed: ${def.name}.`, 'log-system');
        }
        this.activeBounty = null;
    },

    // --- Archon Hub ---
    getHubUpgradeCost(u) { return u.baseCost * ((this.meta[u.id] || 0) + 1); },

    buyHubUpgrade(id) {
        const u = HUB_UPGRADES.find(x => x.id === id);
        if (!u) return false;
        const rank = this.meta[u.id] || 0;
        const cost = this.getHubUpgradeCost(u);
        if (rank >= u.max || this.meta.souls < cost) { sfx.playHurt(); return false; }
        this.meta.souls -= cost;
        this.meta[u.id] = rank + 1;
        this.saveMeta();
        sfx.playLevelUp();
        return true;
    },

    getHubTier() {
        const totalRank = HUB_UPGRADES.reduce((s, u) => s + (this.meta[u.id] || 0), 0);
        return { totalRank, tier: Math.min(3, Math.floor(totalRank / 8)) };
    },

    // --- Mutators & daily ---
    toggleMutator(id) {
        const idx = this.stagedMutators.indexOf(id);
        if (idx === -1) this.stagedMutators.push(id);
        else this.stagedMutators.splice(idx, 1);
        this.ui.metaChanged();
    },

    getDailyInfo() {
        const key = todayKey();
        const cls = ALL_CLASSES[hashStr('archon-' + key) % ALL_CLASSES.length];
        const best = this.meta.dailyBest && this.meta.dailyBest.date === key ? this.meta.dailyBest : null;
        return { key, cls, best };
    },

    isBossRushUnlocked() {
        return !!(this.meta.stats && this.meta.stats.bossesDefeated && this.meta.stats.bossesDefeated.length >= 1);
    },

    // --- Kills, mastery & achievements ---
    recordKill(enemy) {
        if (this.runStats) this.runStats.kills++;
        if (this.activeBounty && this.activeBounty.id === 'slayer') {
            this.activeBounty.kills++;
            this.updateBountyBadge();
        }
        if (!this.meta.stats) this.meta.stats = {};
        this.meta.stats.totalKills = (this.meta.stats.totalKills || 0) + 1;
        if (enemy.codexKey === 'mimic') this.meta.stats.mimicKills = (this.meta.stats.mimicKills || 0) + 1;

        // Class mastery: lifetime kills per class unlock an alternate sprite color
        if (this.player) {
            if (!this.meta.classKills) this.meta.classKills = {};
            const cls = this.player.classType;
            const before = this.meta.classKills[cls] || 0;
            this.meta.classKills[cls] = before + 1;
            if (before + 1 === MASTERY_KILL_THRESHOLD) {
                this.showLoreToast(`👑 ${cls.toUpperCase()} mastered! ${MASTERY_KILL_THRESHOLD} kills unlock a new color for this class.`);
                sfx.playLevelUp();
            }
        }

        if (enemy.codexKey) {
            if (!this.meta.bestiary) this.meta.bestiary = {};
            const first = !this.meta.bestiary[enemy.codexKey];
            this.meta.bestiary[enemy.codexKey] = (this.meta.bestiary[enemy.codexKey] || 0) + 1;
            if (first) {
                const entry = BESTIARY_DB[enemy.codexKey];
                this.logMessage(`📖 Bestiary updated: ${entry ? entry.name : enemy.name}`, 'log-level');
            }
        }
        this.saveMeta();
        this.checkAchievements();
    },

    bumpStat(key, delta = 1) {
        if (!this.meta.stats) this.meta.stats = {};
        this.meta.stats[key] = (this.meta.stats[key] || 0) + delta;
        this.saveMeta();
        this.checkAchievements();
    },

    recordBossKill(codexKey) {
        if (!this.meta.stats) this.meta.stats = {};
        if (!this.meta.stats.bossesDefeated) this.meta.stats.bossesDefeated = [];
        const first = codexKey && !this.meta.stats.bossesDefeated.includes(codexKey);
        if (first) this.meta.stats.bossesDefeated.push(codexKey);
        this.saveMeta();
        this.checkAchievements();

        // Story mode: each guardian's death closes its act; the last one ends the story.
        const storyRun = this.settings.storyMode && !this.dailyMode && !this.bossRushMode && !this.endlessMode && !this.trialMode;
        if (first && storyRun) {
            const act = BOSS_ACT_LORE[codexKey];
            if (codexKey === 'void_archon_prime') {
                setTimeout(() => this.openEpilogue(), 1200);
            } else if (act && act.post) {
                this.showLoreToast(act.post);
            }
        }
    },

    unlockAchievement(id) {
        if (!this.meta.achievements) this.meta.achievements = {};
        if (this.meta.achievements[id]) return;
        const a = ACHIEVEMENTS_DB.find(x => x.id === id);
        if (!a) return;
        this.meta.achievements[id] = Date.now();
        this.saveMeta();
        sfx.playLevelUp();
        this.logMessage(`🏆 Achievement unlocked: ${a.name}`, 'log-level');
        this.showLoreToast(`🏆 ${a.name} — ${a.desc}`);
    },

    checkAchievements() {
        const s = this.meta.stats || {};
        // Boss Rush and Endless repurpose this.level as a difficulty knob, not real depth.
        if (this.player && !this.bossRushMode && !this.endlessMode && !this.trialMode) {
            if (this.level > (s.maxDepthReached || 0)) { s.maxDepthReached = this.level; this.meta.stats = s; }
            if (this.level >= 5) this.unlockAchievement('first_descent');
            if (this.level >= 10) this.unlockAchievement('deep_delver');
            if (this.level >= 20) this.unlockAchievement('into_the_void');
        }
        if ((s.bossesDefeated || []).length >= 1) this.unlockAchievement('archon_slayer');
        if (['bone_colossus', 'molten_behemoth', 'void_archon_prime'].every(k => (s.bossesDefeated || []).includes(k))) this.unlockAchievement('triple_threat');
        if ((s.bossesDefeated || []).includes('tidemother')) this.unlockAchievement('tide_turner');
        if (['bone_colossus', 'molten_behemoth', 'tidemother', 'void_archon_prime'].every(k => (s.bossesDefeated || []).includes(k))) this.unlockAchievement('warden_breaker');
        if (Object.keys(this.meta.bestiary || {}).length >= Object.keys(BESTIARY_DB).length) this.unlockAchievement('bestiary_complete');
        if ((this.meta.lore || []).length >= LORE_DB.length) this.unlockAchievement('lore_keeper');
        if (this.relics && this.relics.length >= 5) this.unlockAchievement('relic_hoarder');
        if (this.talents && this.talents.length >= 5) this.unlockAchievement('talented');
        if (this.player && this.player.gold >= 500) this.unlockAchievement('rich_archon');
        if ((s.totalSoulsEarned || 0) >= 100) this.unlockAchievement('soul_collector');
        if ((s.totalKills || 0) >= 100) this.unlockAchievement('century_club');
        if ((s.mimicKills || 0) >= 1) this.unlockAchievement('mimic_hunter');
        if ((s.vaultChestsOpened || 0) >= 1) this.unlockAchievement('vault_breaker');
        if ((s.gambleJackpots || 0) >= 1) this.unlockAchievement('high_roller');
        if ((s.phoenixSaves || 0) >= 1) this.unlockAchievement('phoenix_reborn');
        if ((s.dailyCompletions || 0) >= 3) this.unlockAchievement('daily_devotee');
        if (s.speedDepth5Ms !== undefined && s.speedDepth5Ms < 180000) this.unlockAchievement('speed_descent');
        if (s.bossRushCleared) this.unlockAchievement('boss_rush_champion');
        if ((s.bestWave || 0) >= 10) this.unlockAchievement('wave_survivor');
        if (this.allies && this.allies.length >= 2) this.unlockAchievement('not_alone');
        if ((s.maxAscension || 0) >= 3) this.unlockAchievement('ascendant');
        if (this.activeMutators && this.activeMutators.length >= 3) this.unlockAchievement('masochist');
        if ((this.meta.titles || []).length >= TRIALS_DB.length) this.unlockAchievement('trial_master');
    },

    // Progress for the Codex achievement list (unlocked ones show their date instead).
    getAchievementStatus() {
        const unlocked = this.meta.achievements || {};
        return ACHIEVEMENTS_DB.map(a => ({ ...a, unlockedAt: unlocked[a.id] || null }));
    },

    showTutorialTip(key, msg) {
        if (!this.settings || !this.settings.showTutorialTips) return;
        if (!this.meta.tutorialsSeen) this.meta.tutorialsSeen = [];
        if (this.meta.tutorialsSeen.includes(key)) return;
        this.meta.tutorialsSeen.push(key);
        this.saveMeta();
        this.showLoreToast(`💡 Tip: ${msg}`);
    },

    checkStoryBeat() {
        if (!this.settings.storyMode || this.dailyMode || this.bossRushMode || this.endlessMode || this.trialMode) return;
        const beat = STORY_BEATS.find(b => b.depth === this.level);
        if (!beat) return;
        if (!this.meta.stats) this.meta.stats = {};
        if (!this.meta.stats.storyBeatsSeen) this.meta.stats.storyBeatsSeen = [];
        if (this.meta.stats.storyBeatsSeen.includes(this.level)) return;
        this.meta.stats.storyBeatsSeen.push(this.level);
        this.saveMeta();
        this.showLoreToast(beat.text);
    },

    formatTime(ms) {
        const s = Math.floor((ms || 0) / 1000);
        return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    },

    // Loadout preset: softly biases future talent drafts for this class toward this run's picks.
    saveLoadoutPreset() {
        if (!this.player) return;
        if (!this.meta.loadoutPresets) this.meta.loadoutPresets = {};
        this.meta.loadoutPresets[this.player.classType] = { talents: this.talents.slice(), relics: this.relics.slice(), savedAt: Date.now() };
        this.saveMeta();
        this.ui.toast(`⭐ Build preset saved for ${this.player.classType}. Future talent drafts will lean toward these picks.`);
    },

    // Renders a shareable run summary to an off-screen canvas and downloads it as a PNG.
    exportBuildCard() {
        if (!this.player) return;
        const c = document.createElement('canvas');
        c.width = 800; c.height = 450;
        const ctx = c.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, 0, 450);
        grad.addColorStop(0, '#131a2c'); grad.addColorStop(1, '#090d16');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, 800, 450);
        const classColor = this.getPlayerRenderColor();
        ctx.strokeStyle = classColor; ctx.lineWidth = 4; ctx.strokeRect(10, 10, 780, 430);

        ctx.fillStyle = '#f8fafc'; ctx.font = '700 32px "Chakra Petch", Arial, sans-serif';
        ctx.fillText("ARCHON'S DESCENT", 40, 58);

        ctx.fillStyle = classColor; ctx.font = '700 24px "Chakra Petch", Arial, sans-serif';
        const title = this.meta.activeTitle ? ` "${this.meta.activeTitle}"` : '';
        ctx.fillText(`${this.player.classType.toUpperCase()}${title} — Level ${this.player.lvl}`, 40, 98);

        ctx.fillStyle = '#cbd5e1'; ctx.font = '17px "Chakra Petch", Arial, sans-serif';
        let y = 138;
        const depthLine = this.endlessMode ? `Wave reached: ${this.endlessWave}`
            : this.bossRushMode ? `Boss Rush${this.ascensionTier > 0 ? ` (Ascension ${this.ascensionTier})` : ''}`
            : `Depth reached: B${String(this.level).padStart(2, '0')}`;
        [depthLine,
         `Time: ${this.formatTime(this.runStats ? this.runStats.activeMs : 0)}`,
         `Kills: ${this.runStats ? this.runStats.kills : 0}`,
         `Gold: ${this.player.gold}`
        ].forEach(line => { ctx.fillText(line, 40, y); y += 26; });

        y += 14;
        ctx.fillStyle = '#eab308'; ctx.font = '700 17px "Chakra Petch", Arial, sans-serif';
        ctx.fillText('Equipped gear', 40, y); y += 24;
        ctx.fillStyle = '#cbd5e1'; ctx.font = '15px "Chakra Petch", Arial, sans-serif';
        ['weapon', 'armor', 'shield', 'accessory'].forEach(slot => {
            const it = this.equipped[slot];
            ctx.fillText(`${slot}: ${it ? `${it.name} (${it.rarity})` : '—'}`, 40, y);
            y += 21;
        });

        ctx.fillStyle = '#a855f7'; ctx.font = '700 17px "Chakra Petch", Arial, sans-serif';
        ctx.fillText(`Relics (${this.relics.length})`, 430, 138);
        ctx.fillStyle = '#cbd5e1'; ctx.font = '15px "Chakra Petch", Arial, sans-serif';
        let ry = 164;
        if (this.relics.length === 0) {
            ctx.fillText('None found this run.', 430, ry);
        } else {
            this.relics.slice(0, 11).forEach(id => {
                const r = RELIC_POOL.find(x => x.id === id);
                if (r) { ctx.fillText(`${r.icon} ${r.name}`, 430, ry); ry += 21; }
            });
        }

        ctx.fillStyle = '#64748b'; ctx.font = '13px "Chakra Petch", Arial, sans-serif';
        ctx.fillText(new Date().toLocaleDateString(), 40, 425);

        const link = document.createElement('a');
        link.download = `archons-descent-${this.player.classType}-${Date.now()}.png`;
        link.href = c.toDataURL('image/png');
        link.click();
    },
};
