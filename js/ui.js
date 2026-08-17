// ============================================================================
// --- UI, CODEX, ACHIEVEMENTS, SAVE SYSTEM & OVERLAYS ---
// ============================================================================

function attachUIOverlayMethods(proto) {
    proto.updateStatsUI = function() {
        if (!this.player) return;
        this.hpText.innerText = `${Math.max(0, this.player.hp)} / ${this.player.maxHp}`;
        this.hpBar.style.width = `${Math.max(0, Math.min(100, (this.player.hp / this.player.maxHp) * 100))}%`;
        this.mpText.innerText = `${Math.max(0, this.player.mp)} / ${this.player.maxMp}`;
        this.mpBar.style.width = `${Math.max(0, Math.min(100, (this.player.mp / this.player.maxMp) * 100))}%`;
        this.xpText.innerText = `${this.player.xp} / ${this.player.xpNeeded}`;
        this.xpBar.style.width = `${Math.max(0, Math.min(100, (this.player.xp / this.player.xpNeeded) * 100))}%`;

        this.charLvl.innerText = this.player.lvl;
        this.charAtk.innerText = this.getPlayerAttack();
        this.charDef.innerText = this.getPlayerDefense();
        this.goldDisplay.innerText = this.player.gold;

        const keyBadge = document.getElementById('key-badge');
        if (keyBadge) {
            if (this.player.keys > 0) {
                keyBadge.classList.remove('hidden');
                keyBadge.innerText = `🗝️ x${this.player.keys}`;
            } else {
                keyBadge.classList.add('hidden');
            }
        }

        const cd1 = document.getElementById('cd-1');
        cd1.innerText = this.player.skillCooldown > 0 ? this.player.skillCooldown : '';
        const cd2 = document.getElementById('cd-2');
        cd2.innerText = this.player.skillCooldown2 > 0 ? this.player.skillCooldown2 : '';
        const cdUlt = document.getElementById('cd-ult');
        if (this.player.lvl < 10) {
            cdUlt.innerText = 'LV10';
            cdUlt.style.fontSize = '0.65rem';
        } else {
            cdUlt.innerText = this.player.ultimateCooldown > 0 ? this.player.ultimateCooldown : '';
            cdUlt.style.fontSize = '0.9rem';
        }

        const p1 = document.getElementById('pot-hp-count');
        const p2 = document.getElementById('pot-mp-count');
        if (p1) p1.innerText = this.player.potions.hp;
        if (p2) p2.innerText = this.player.potions.mp;

        const relicContainer = document.getElementById('active-relics');
        if (relicContainer) {
            relicContainer.innerHTML = '';
            this.relics.forEach(rid => {
                const r = RELIC_POOL.find(item => item.id === rid);
                if (r) {
                    const tag = document.createElement('div');
                    tag.className = 'status-tag';
                    tag.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                    tag.style.color = '#38bdf8';
                    tag.innerText = `${r.icon} ${r.name}`;
                    relicContainer.appendChild(tag);
                }
            });
            this.talents.forEach(tid => {
                const tag = document.createElement('div');
                tag.className = 'status-tag';
                tag.style.borderColor = 'rgba(167, 139, 250, 0.4)';
                tag.style.color = '#a78bfa';
                tag.innerText = `⚡ ${tid.toUpperCase()}`;
                relicContainer.appendChild(tag);
            });
        }
    };

    proto.updateInventoryUI = function() {
        if (!this.player) return;
        ['weapon', 'armor', 'shield', 'accessory'].forEach(type => {
            const slot = document.getElementById(`slot-${type}`);
            slot.innerHTML = '';
            const item = this.equipped[type];
            if (item) {
                const el = document.createElement('div');
                el.className = `item-icon ${item.rarity}`;
                el.innerText = item.icon;
                el.title = `${item.name} (+${item.statBonus} ${type === 'weapon' ? 'ATK' : (type === 'armor' || type === 'shield' ? 'DEF' : 'STAT')})`;
                el.onclick = () => this.unequipItem(type);
                slot.appendChild(el);
            }
        });

        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = '';
        this.inventory.forEach((item, idx) => {
            const cell = document.createElement('div');
            cell.className = 'item-slot';
            if (item) {
                const el = document.createElement('div');
                el.className = `item-icon ${item.rarity}`;
                el.innerText = item.icon;
                el.title = `${item.name} (+${item.statBonus})`;
                el.onclick = () => this.equipItem(item, idx);
                cell.appendChild(el);
            }
            grid.appendChild(cell);
        });
    };

    proto.getPlayerAttack = function() {
        let atk = this.player.baseAtk;
        if (this.equipped.weapon) atk += this.equipped.weapon.statBonus;
        if (this.equipped.accessory) atk += Math.floor(this.equipped.accessory.statBonus * 0.5);
        if (this.player.battleCryTurns > 0) atk += 5;
        return atk;
    };

    proto.getPlayerDefense = function() {
        let def = this.player.baseDef;
        if (this.equipped.armor) def += this.equipped.armor.statBonus;
        if (this.equipped.shield) def += this.equipped.shield.statBonus;
        if (this.equipped.accessory) def += Math.floor(this.equipped.accessory.statBonus * 0.5);
        if (this.player.battleCryTurns > 0) def += 4;
        return def;
    };

    proto.updateBountyBadge = function() {
        const badge = document.getElementById('bounty-badge');
        if (!badge) return;
        if (!this.activeBounty) { badge.classList.add('hidden'); return; }
        const bInfo = BOUNTY_POOL.find(b => b.id === this.activeBounty.id);
        if (!bInfo) { badge.classList.add('hidden'); return; }
        badge.classList.remove('hidden');
        if (this.activeBounty.failed) {
            badge.innerText = `🎯 ${bInfo.name}: FAILED`;
            badge.style.color = '#fb7185';
            badge.style.borderColor = 'rgba(251, 113, 133, 0.4)';
        } else {
            badge.innerText = `🎯 ${bInfo.name}: ACTIVE`;
            badge.style.color = '#38bdf8';
            badge.style.borderColor = 'rgba(56, 189, 248, 0.4)';
        }
    };

    proto.resolveBounty = function() {
        if (!this.activeBounty || this.activeBounty.failed) {
            this.activeBounty = null;
            return;
        }
        const b = this.activeBounty;
        let success = false;
        if (b.id === 'speed' && b.turns <= 40) success = true;
        else if (b.id === 'no_potion') success = true;
        else if (b.id === 'slayer') success = true;

        if (success) {
            this.dropGoldAt(this.player.x, this.player.y, 40 + this.level * 6);
            if (Math.random() < 0.5) this.dropRelicAt(this.player.x, this.player.y);
            sfx.playVictory();
            this.logMessage('Bounty Completed! Bonus rewards claimed.', 'log-loot');
            this.bumpStat('bountiesCompleted', 1);
            this.checkAchievements();
        }
        this.activeBounty = null;
    };

    proto.logMessage = function(text, cssClass = '') {
        const entry = document.createElement('div');
        entry.className = `log-entry ${cssClass}`;
        entry.innerText = text;
        this.combatLog.appendChild(entry);
        this.combatLog.scrollTop = this.combatLog.scrollHeight;
    };

    proto.showLoreToast = function(text) {
        const toast = document.getElementById('lore-toast');
        if (!toast) return;
        toast.innerText = text;
        toast.classList.remove('hidden');
        toast.style.animation = 'none';
        void toast.offsetWidth;
        toast.style.animation = 'toastFade 3.5s forwards';
        setTimeout(() => toast.classList.add('hidden'), 3600);
    };

    proto.showTutorialTip = function(key, msg) {
        if (!this.settings || !this.settings.showTutorialTips) return;
        if (!this.meta.tutorialsSeen) this.meta.tutorialsSeen = [];
        if (this.meta.tutorialsSeen.includes(key)) return;
        this.meta.tutorialsSeen.push(key);
        this.saveMeta();
        this.showLoreToast(`💡 Tip: ${msg}`);
    };

    proto.checkStoryBeat = function() {
        if (!this.settings.storyMode || this.dailyMode || this.bossRushMode || this.endlessMode || this.trialMode) return;
        const beat = STORY_BEATS[this.level];
        if (beat) {
            if (!this.meta.stats) this.meta.stats = {};
            if (!this.meta.stats.storyBeatsSeen) this.meta.stats.storyBeatsSeen = [];
            if (!this.meta.stats.storyBeatsSeen.includes(this.level)) {
                this.meta.stats.storyBeatsSeen.push(this.level);
                this.saveMeta();
                this.showLoreToast(`📖 ${beat}`);
            }
        }
    };

    proto.handleGameOver = function() {
        if (this.gameOverHandled) return;
        if (!this.phoenixUsed && this.relics && this.relics.includes('phoenix_feather')) {
            this.phoenixUsed = true;
            this.player.hp = 1;
            this.bumpStat('phoenixSaves', 1);
            sfx.playLevelUp();
            this.triggerCameraShake(14, 300);
            this.logMessage('The Phoenix Feather ignites! You are pulled back from death.', 'log-level');
            this.showLoreToast('🪶 The Phoenix Feather saves you from death!');
            this.updateStatsUI();
            this.checkAchievements();
            return;
        }
        this.gameOverHandled = true;
        this.clearAutosave();
        music.stop();
        sfx.playDefeat();

        this.recordRunEnd();
        if (this.dailyMode) this.bumpStat('dailyCompletions', 1);

        const soulsEarned = Math.floor(this.player.xp / 10) + (this.level * 2);
        this.meta.souls = (this.meta.souls || 0) + soulsEarned;
        this.saveMeta();

        document.getElementById('death-stats').innerText = `Depth Reached: B${this.level} · Level: ${this.player.lvl} · Gold: ${this.player.gold}`;
        const soulsEl = document.getElementById('death-souls');
        if (soulsEl) soulsEl.innerText = `+${soulsEarned} Archon Souls`;
        const extraEl = document.getElementById('death-extra');
        if (extraEl) extraEl.innerText = `Killed by ${this.lastAttacker || 'Dungeon Hazard'}`;
        document.getElementById('death-overlay').classList.remove('hidden');
        this.checkAchievements();
    };

    proto.recordKill = function(enemy) {
        if (!this.meta.bestiary) this.meta.bestiary = {};
        const key = enemy.codexKey || 'goblin_scout';
        this.meta.bestiary[key] = (this.meta.bestiary[key] || 0) + 1;
        if (this.runStats) this.runStats.kills++;
        if (!this.meta.stats) this.meta.stats = {};
        this.meta.stats.totalKills = (this.meta.stats.totalKills || 0) + 1;
        this.saveMeta();
    };

    proto.recordBossKill = function(boss) {
        if (!this.meta.stats) this.meta.stats = {};
        if (!this.meta.stats.bossesDefeated) this.meta.stats.bossesDefeated = [];
        const key = boss.codexKey || 'boss';
        if (!this.meta.stats.bossesDefeated.includes(key)) {
            this.meta.stats.bossesDefeated.push(key);
            this.saveMeta();
        }
    };

    proto.bumpStat = function(key, amt = 1) {
        if (!this.meta.stats) this.meta.stats = {};
        this.meta.stats[key] = (this.meta.stats[key] || 0) + amt;
        this.saveMeta();
    };

    proto.recordRunEnd = function() {
        if (!this.meta.history) this.meta.history = [];
        const run = {
            date: new Date().toLocaleDateString(),
            classType: this.player.classType,
            level: this.level,
            charLvl: this.player.lvl,
            gold: this.player.gold,
            kills: (this.runStats && this.runStats.kills) || 0,
            killer: this.lastAttacker || 'Dungeon Hazard'
        };
        this.meta.history.unshift(run);
        if (this.meta.history.length > 20) this.meta.history.pop();
        this.saveMeta();
    };

    proto.saveMeta = function() {
        try { localStorage.setItem('archonDescent_meta', JSON.stringify(this.meta)); } catch (e) {}
    };

    proto.loadMeta = function() {
        try {
            const raw = localStorage.getItem('archonDescent_meta');
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return { vitality: 0, power: 0, greed: 0, souls: 0, bestiary: {}, history: [], unlockedLore: [], titles: [], stats: {} };
    };

    proto.openMenuScreen = function(id, focusId = null) {
        document.querySelectorAll('.screen-overlay').forEach(el => el.classList.add('hidden'));
        const target = document.getElementById(id);
        if (target) target.classList.remove('hidden');
    };

    proto.isMenuOverlayOpen = function() {
        const menus = ['start-overlay', 'quiz-overlay', 'class-select-overlay', 'shop-overlay', 'anvil-overlay', 'forge-overlay', 'talent-overlay', 'route-choice-overlay', 'hub-overlay', 'bestiary-overlay', 'lore-overlay', 'history-overlay', 'achievements-overlay', 'settings-overlay', 'death-overlay', 'bossrush-victory-overlay', 'trial-victory-overlay', 'trials-select-overlay', 'whatsnew-overlay', 'mutator-select-overlay', 'epilogue-overlay'];
        return menus.some(id => {
            const el = document.getElementById(id);
            return el && !el.classList.contains('hidden') && id !== 'start-overlay';
        });
    };

    proto.openQuiz = function() {
        this.quizStep = 0;
        this.quizScores = { warrior: 0, mage: 0, rogue: 0, paladin: 0, necromancer: 0, ranger: 0 };
        this.openMenuScreen('quiz-overlay');
        document.getElementById('quiz-result').style.display = 'none';
        document.getElementById('quiz-answers').style.display = 'flex';
        this.renderQuizQuestion();
    };

    proto.renderQuizQuestion = function() {
        const q = CLASS_QUIZ[this.quizStep];
        if (!q) {
            this.finishQuiz();
            return;
        }
        document.getElementById('quiz-question').innerText = `Question ${this.quizStep + 1} of ${CLASS_QUIZ.length}: ${q.q}`;
        const container = document.getElementById('quiz-answers');
        container.innerHTML = '';
        q.answers.forEach(a => {
            const btn = document.createElement('button');
            btn.className = 'glowing-btn small-menu-btn';
            btn.style.textAlign = 'left';
            btn.style.padding = '10px 14px';
            btn.innerText = a.text;
            btn.onclick = () => {
                Object.entries(a.scores).forEach(([cls, pts]) => {
                    this.quizScores[cls] = (this.quizScores[cls] || 0) + pts;
                });
                this.quizStep++;
                this.renderQuizQuestion();
            };
            container.appendChild(btn);
        });
    };

    proto.finishQuiz = function() {
        let bestCls = 'warrior', maxPts = -1;
        Object.entries(this.quizScores).forEach(([cls, pts]) => {
            if (pts > maxPts) { maxPts = pts; bestCls = cls; }
        });
        this.quizRecommendedClass = bestCls;
        document.getElementById('quiz-question').innerText = 'Recommendation Ready!';
        document.getElementById('quiz-answers').style.display = 'none';
        const resBox = document.getElementById('quiz-result');
        resBox.style.display = 'flex';
        document.getElementById('quiz-result-text').innerText = `We recommend: ${bestCls.toUpperCase()}!`;
    };

    proto.serializeRun = function() {
        return {
            v: 1,
            level: this.level, player: this.player, inventory: this.inventory, equipped: this.equipped,
            talents: this.talents, relics: this.relics, allies: this.allies, playerTraps: this.playerTraps,
            ambushTriggers: this.ambushTriggers, hordeTriggers: this.hordeTriggers, hordeState: this.hordeState,
            secretWalls: this.secretWalls, classLockedWalls: this.classLockedWalls, switchLinks: this.switchLinks, shaftLinks: this.shaftLinks,
            map: this.map, fog: this.fog, tileVariants: this.tileVariants,
            enemies: this.enemies, chests: this.chests, itemsOnGround: this.itemsOnGround, torches: this.torches,
            shrines: this.shrines, destructibles: this.destructibles, captives: this.captives, trapStates: this.trapStates,
            stairs: this.stairs, isBossArena: this.isBossArena, darknessFloor: this.darknessFloor, isGauntlet: this.isGauntlet,
            unstableFloor: this.unstableFloor, unstableTimer: this.unstableTimer, routeModifier: this.routeModifier,
            dailyMode: this.dailyMode, dailyKey: this.dailyKey, dailySeed: this.dailySeed,
            activeMutators: this.activeMutators,
            runStats: this.runStats, biome: this.textures.currentBiome, savedAt: Date.now()
        };
    };

    proto.saveAutosave = function() {
        if (!this.player || this.player.hp <= 0 || this.bossRushMode || this.endlessMode || this.trialMode) return;
        try { localStorage.setItem('archonDescent_autosave', JSON.stringify(this.serializeRun())); } catch (e) {}
    };

    proto.clearAutosave = function() {
        try { localStorage.removeItem('archonDescent_autosave'); } catch (e) {}
        const btn = document.getElementById('resume-run-btn');
        if (btn) btn.classList.add('hidden');
    };

    proto.hasAutosave = function() {
        try { return !!localStorage.getItem('archonDescent_autosave'); } catch (e) { return false; }
    };

    proto.resumeRun = function() {
        let raw;
        try { raw = localStorage.getItem('archonDescent_autosave'); } catch (e) { raw = null; }
        if (!raw) return;
        let data;
        try { data = JSON.parse(raw); } catch (e) { this.clearAutosave(); return; }

        document.getElementById('start-overlay').classList.add('hidden');
        this.gameOverHandled = false;
        this.pendingMode = null;

        this.level = data.level; this.player = data.player; this.inventory = data.inventory; this.equipped = data.equipped;
        this.talents = data.talents || []; this.relics = data.relics || []; this.allies = data.allies || [];
        this.playerTraps = data.playerTraps || []; this.ambushTriggers = data.ambushTriggers || [];
        this.hordeTriggers = data.hordeTriggers || []; this.hordeState = data.hordeState || null; this.hordeBreatherTimer = 0;
        this.secretWalls = data.secretWalls || [];
        this.classLockedWalls = data.classLockedWalls || [];
        this.switchLinks = data.switchLinks || {};
        this.shaftLinks = data.shaftLinks || {};
        this.map = data.map; this.fog = data.fog; this.tileVariants = data.tileVariants;
        this.enemies = data.enemies || []; this.chests = data.chests || []; this.itemsOnGround = data.itemsOnGround || [];
        this.torches = data.torches || []; this.shrines = data.shrines || []; this.destructibles = data.destructibles || [];
        this.captives = data.captives || []; this.trapStates = data.trapStates || {};
        this.stairs = data.stairs; this.isBossArena = !!data.isBossArena; this.darknessFloor = !!data.darknessFloor;
        this.isGauntlet = !!data.isGauntlet; this.unstableFloor = !!data.unstableFloor; this.unstableTimer = data.unstableTimer || 0;
        this.routeModifier = data.routeModifier || null; this.dailyMode = !!data.dailyMode;
        this.dailyKey = data.dailyKey || null; this.dailySeed = data.dailySeed || 0;
        this.activeMutators = data.activeMutators || [];
        this.runStats = data.runStats || { activeMs: 0, kills: 0 };
        this.textures.setBiome(data.biome || 'catacombs');
        music.setBiome(this.textures.currentBiome);

        this.updateFOV();
        this.updateStatsUI();
        this.updateInventoryUI();
        this.drawMinimap();
        music.start();
        if (!this.loopStarted) { this.loopStarted = true; this.gameLoop(); }
        this.logMessage('Resumed expedition from autosave.', 'log-level');
    };
}
