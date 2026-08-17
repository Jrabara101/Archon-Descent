// ============================================================================
// --- ITEMS, INVENTORY, TALENTS, SHOP, ANVIL & STATUS LOGIC ---
// ============================================================================

function attachItemMethods(proto) {
    proto.pickupItem = function(index) {
        const item = this.itemsOnGround[index];
        if (item.isGold) {
            this.player.gold += item.amount;
            this.itemsOnGround.splice(index, 1);
            sfx.playLoot();
            this.spawnDamageNumber(this.player.x, this.player.y, `+${item.amount} G`, '#facc15');
            this.logMessage(`Picked up ${item.amount} Gold.`, 'log-loot');
            this.bumpStat('goldCollected', item.amount);
            this.updateStatsUI();
            this.checkAchievements();
            return;
        }
        if (item.isKey) {
            this.player.keys = (this.player.keys || 0) + 1;
            this.itemsOnGround.splice(index, 1);
            sfx.playLoot();
            this.logMessage('Picked up a Rusty Key.', 'log-loot');
            this.updateStatsUI();
            return;
        }
        if (item.isLore) {
            this.itemsOnGround.splice(index, 1);
            sfx.playLoot();
            const scrap = LORE_DB[item.loreIdx] || { title: 'Ancient Scrap', text: 'Indecipherable runes.' };
            if (!this.meta.unlockedLore) this.meta.unlockedLore = [];
            if (!this.meta.unlockedLore.includes(item.loreIdx)) {
                this.meta.unlockedLore.push(item.loreIdx);
                this.saveMeta();
            }
            this.showLoreToast(`📜 ${scrap.title}: "${scrap.text}"`);
            this.logMessage(`Found Lore: ${scrap.title}`, 'log-loot');
            this.checkAchievements();
            return;
        }
        if (item.isRelic) {
            this.grantRelic(item.relicId);
            this.itemsOnGround.splice(index, 1);
            return;
        }

        const added = this.addItemToInventory(item);
        if (added) {
            this.itemsOnGround.splice(index, 1);
            sfx.playLoot();
            this.logMessage(`Picked up ${item.name}.`, 'log-loot');
            this.updateInventoryUI();
            this.checkAchievements();
        } else {
            this.logMessage(`Inventory full!`, 'log-system');
        }
    };

    proto.generateProceduralItem = function(tier = 'normal') {
        const types = ['weapon', 'armor', 'shield', 'accessory'];
        const type = types[Math.floor(Math.random() * types.length)];
        const rarities = ['common', 'rare', 'epic', 'legendary'];
        let rarity = 'common';
        const rRoll = Math.random();

        if (tier === 'rare_plus') {
            rarity = rRoll < 0.6 ? 'rare' : (rRoll < 0.9 ? 'epic' : 'legendary');
        } else if (tier === 'legendary') {
            rarity = 'legendary';
        } else {
            if (rRoll > 0.92) rarity = 'legendary';
            else if (rRoll > 0.70) rarity = 'epic';
            else if (rRoll > 0.40) rarity = 'rare';
        }

        const icons = {
            weapon: ['🗡️', '⚔️', '🪄', '🏹', '🪓', '🔱'],
            armor: ['🥋', '🦺', '🥼'],
            shield: ['🛡️', '🔰'],
            accessory: ['💍', '📿', '🔮']
        };

        const names = {
            weapon: ['Blade', 'Sword', 'Staff', 'Dagger', 'Axe', 'Spear'],
            armor: ['Tunic', 'Vest', 'Robes', 'Plate', 'Chainmail'],
            shield: ['Buckler', 'Shield', 'Guard', 'Aegis'],
            accessory: ['Ring', 'Amulet', 'Talisman', 'Orb', 'Pendant']
        };

        const rarityPrefixes = {
            common: ['Worn', 'Rusty', 'Apprentice', 'Simple'],
            rare: ['Reinforced', 'Tempered', 'Gleaming', 'Sharp'],
            epic: ['Ancient', 'Runed', 'Arcane', 'Shadow'],
            legendary: ['Archon', 'Mythic', 'Celestial', 'Abyssal']
        };

        const prefix = rarityPrefixes[rarity][Math.floor(Math.random() * rarityPrefixes[rarity].length)];
        const baseName = names[type][Math.floor(Math.random() * names[type].length)];
        const iconList = icons[type];
        const icon = iconList[Math.floor(Math.random() * iconList.length)];

        let statMultiplier = 1;
        if (rarity === 'rare') statMultiplier = 2;
        if (rarity === 'epic') statMultiplier = 3.5;
        if (rarity === 'legendary') statMultiplier = 6;

        const baseStat = Math.floor((this.level * 2 + Math.random() * 3) * statMultiplier);
        return {
            id: 'it_' + Math.random().toString(36).substr(2, 9),
            name: `${prefix} ${baseName}`,
            type,
            rarity,
            statBonus: baseStat,
            icon
        };
    };

    proto.addItemToInventory = function(item) {
        const slot = this.inventory.findIndex(i => i === null);
        if (slot !== -1) {
            this.inventory[slot] = item;
            this.updateInventoryUI();
            return true;
        }
        return false;
    };

    proto.equipItem = function(item, fromInventoryIndex) {
        if (!item || !item.type) return;
        const current = this.equipped[item.type];
        this.equipped[item.type] = item;
        this.inventory[fromInventoryIndex] = current;
        sfx.playLoot();
        this.updateStatsUI();
        this.updateInventoryUI();
        this.checkAchievements();
    };

    proto.unequipItem = function(type) {
        const item = this.equipped[type];
        if (!item) return;
        const slot = this.inventory.findIndex(i => i === null);
        if (slot !== -1) {
            this.inventory[slot] = item;
            this.equipped[type] = null;
            sfx.playLoot();
            this.updateStatsUI();
            this.updateInventoryUI();
        } else {
            this.logMessage('Inventory is full!', 'log-system');
        }
    };

    proto.dropItemFromInventory = function(index) {
        const item = this.inventory[index];
        if (!item) return;
        this.inventory[index] = null;
        item.x = this.player.x; item.y = this.player.y; item.popZ = 0; item.popVz = 4;
        this.itemsOnGround.push(item);
        sfx.playLoot();
        this.updateInventoryUI();
    };

    proto.openChest = function(chestIndex) {
        const chest = this.chests[chestIndex];
        chest.opened = true;

        if (chest.mimic) {
            sfx.playHurt();
            this.triggerCameraShake(12, 250);
            this.logMessage('The chest opens its maw — IT IS A MIMIC!', 'log-combat-enemy');
            const hp = 60 + this.level * 8;
            const atk = 14 + this.level * 2;
            const xp = 80 + this.level * 10;
            this.enemies.push({
                x: chest.x, y: chest.y, visualX: chest.x, visualY: chest.y,
                name: 'Chest Mimic', hp, maxHp: hp, atk, def: 2, xpReward: xp,
                icon: '📦', color: '#f59e0b', codexKey: 'mimic', ai: 'melee',
                statuses: [], aware: true, elite: true, affixes: ['vampiric'],
                hitFlash: 0, knockX: 0, knockY: 0, ghostHp: hp, ghostDelay: 0, dying: false, deathTimer: 0
            });
            this.chests.splice(chestIndex, 1);
            return;
        }

        sfx.playLoot();
        this.spawnGoldSparkles(chest.x, chest.y);
        const item = this.generateProceduralItem(chest.guaranteed || 'normal');
        item.x = chest.x; item.y = chest.y; item.popZ = 0; item.popVz = 4.5;
        this.itemsOnGround.push(item);
        this.dropGoldAt(chest.x, chest.y, 15 + this.level * 4);
        if (Math.random() < 0.35) this.dropRelicAt(chest.x, chest.y);
        this.logMessage('Opened a treasure chest!', 'log-loot');
        this.bumpStat('chestsOpened', 1);
        this.checkAchievements();
    };

    proto.applyStatus = function(target, type, turns) {
        if (!target.statuses) target.statuses = [];
        const existing = target.statuses.find(s => s.type === type);
        if (existing) {
            existing.turns = Math.max(existing.turns, turns);
        } else {
            target.statuses.push({ type, turns });
        }
    };

    proto.hasStatus = function(target, type) {
        return !!(target.statuses && target.statuses.some(s => s.type === type));
    };

    proto.processStatuses = function(target) {
        if (!target.statuses) return;
        for (let i = target.statuses.length - 1; i >= 0; i--) {
            const st = target.statuses[i];
            st.turns--;
            if (st.type === 'burn') {
                const dmg = 4 + Math.floor(this.level * 0.5);
                target.hp -= dmg;
                this.spawnDamageNumber(target.x, target.y, `-${dmg}`, '#f97316');
                this.spawnSparks(target.x, target.y);
            } else if (st.type === 'poison') {
                const dmg = 3 + Math.floor(this.level * 0.3);
                target.hp -= dmg;
                this.spawnDamageNumber(target.x, target.y, `-${dmg}`, '#84cc16');
                this.spawnBloodParticles(target.x, target.y, '#84cc16');
            }
            if (st.turns <= 0) target.statuses.splice(i, 1);
        }
    };

    proto.recruitPet = function() {
        if (this.allies.some(a => a.type === 'pet')) return;
        const x = this.player.x, y = this.player.y;
        this.allies.push({ x, y, visualX: x, visualY: y, icon: '🐺', color: '#38bdf8', name: 'Spirit Wolf', type: 'pet', atk: 4 + Math.floor(this.player.lvl * 0.5), hitFlash: 0, knockX: 0, knockY: 0 });
        sfx.playLevelUp();
        this.logMessage('A Spirit Wolf now fights at your side!', 'log-loot');
        this.updateStatsUI();
        this.checkAchievements();
    };

    proto.recruitRescuedAlly = function(x, y) {
        const pick = CAPTIVE_BARKS[Math.floor(Math.random() * CAPTIVE_BARKS.length)];
        this.allies.push({ x, y, visualX: x, visualY: y, icon: '🧑‍🤝‍🧑', color: '#facc15', name: pick.name, type: 'rescued', turnsLeft: 40, atk: 6 + this.level, hitFlash: 0, knockX: 0, knockY: 0 });
        this.logMessage(`${pick.name} joins you for the rest of this floor!`, 'log-loot');

        const act = this.level >= 9 ? 3 : (this.level >= 5 ? 2 : 1);
        const actLine = this.settings.storyMode && pick.id && CAPTIVE_ACT_LINES[pick.id] && CAPTIVE_ACT_LINES[pick.id][act];
        if (actLine) {
            if (!this.meta.stats) this.meta.stats = {};
            if (!this.meta.stats.captiveActLinesSeen) this.meta.stats.captiveActLinesSeen = [];
            const seenKey = `${pick.id}_${act}`;
            if (!this.meta.stats.captiveActLinesSeen.includes(seenKey)) {
                this.meta.stats.captiveActLinesSeen.push(seenKey);
                this.saveMeta();
                this.showLoreToast(`🗣️ ${actLine}`);
                this.updateStatsUI();
                this.checkAchievements();
                return;
            }
        }

        const classBark = pick.id && CAPTIVE_CLASS_BARKS[pick.id] && CAPTIVE_CLASS_BARKS[pick.id][this.player.classType];
        this.showLoreToast(classBark ? `🗣️ ${classBark}` : `🗣️ ${pick.name}: "${pick.bark}"`);
        this.updateStatsUI();
        this.checkAchievements();
    };

    proto.updateAllies = function() {
        if (this.allies.length === 0) return;
        for (let i = this.allies.length - 1; i >= 0; i--) {
            const a = this.allies[i];
            if (a.turnsLeft !== undefined) {
                a.turnsLeft--;
                if (a.turnsLeft <= 0) {
                    this.logMessage(`${a.name} fades away.`, 'log-system');
                    this.allies.splice(i, 1);
                    this.updateStatsUI();
                    continue;
                }
            }
            const target = this.enemies.find(e => !e.dying && Math.abs(e.x - a.x) + Math.abs(e.y - a.y) <= 1);
            if (target) {
                const dmg = this.applyDamageToEnemy(target, a.atk);
                target.hp -= dmg;
                this.triggerHitFlash(target); this.resetGhostDelay(target);
                this.spawnDamageNumber(target.x, target.y, `-${dmg}`, a.color);
                continue;
            }
            const dist = Math.hypot(this.player.x - a.x, this.player.y - a.y);
            if (dist > 1.5) {
                const blockers = this.enemies.filter(e => !e.dying).concat(this.allies.filter(x => x !== a));
                const path = AStar.findPath(this.map, this.mapWidth, this.mapHeight, a, this.player, blockers);
                if (path.length > 0) { a.x = path[0].x; a.y = path[0].y; }
            }
        }
        this.checkEnemyDeaths();
    };

    proto.checkLevelUp = function() {
        if (this.player.xp >= this.player.xpNeeded) {
            this.player.xp -= this.player.xpNeeded;
            this.player.lvl++;
            this.player.xpNeeded = Math.floor(this.player.xpNeeded * 1.5);
            this.player.maxHp += 10; this.player.hp = this.player.maxHp;
            this.player.maxMp += 10; this.player.mp = this.player.maxMp;
            this.player.baseAtk += 2; this.player.baseDef += 1;
            
            sfx.playLevelUp();
            this.spawnLevelUpParticles();
            this.logMessage(`LEVEL UP! You reached Level ${this.player.lvl}!`, 'log-level');

            this.levelUpAnim = { timer: 0, phase: 'zoom' };
            setTimeout(() => this.openTalentDraft(), 900);
        }
    };

    proto.openTalentDraft = function() {
        const pool = [
            { id: 'vampiric', name: 'Vampiric Fangs', desc: 'Lifesteal 15% of dealt damage.', icon: '🦇' },
            { id: 'thorns', name: 'Thorn Carapace', desc: 'Deal 25% of taken damage back.', icon: '🌵' },
            { id: 'vitality', name: 'Titan Vitality', desc: '+30 Max HP', icon: '❤️' },
            { id: 'focus', name: 'Deep Focus', desc: '+30 Max MP', icon: '🔮' },
            { id: 'strength', name: 'Brute Force', desc: '+5 Base ATK', icon: '💪' },
            { id: 'berserker', name: "Berserker's Fury", desc: 'Below 30% HP, 30% chance to strike again.', icon: '⚔️' },
            { id: 'executioner', name: 'Executioner', desc: 'Critical hits heal you for 25% of damage dealt.', icon: '💀' }
        ];
        const classTalent = CLASS_TALENTS[this.player.classType];
        if (classTalent && !this.talents.includes(classTalent.id)) pool.push(classTalent);

        const preset = this.meta.loadoutPresets && this.meta.loadoutPresets[this.player.classType];
        const presetTalentIds = preset ? preset.talents : [];
        const weighted = [];
        pool.filter(t => !this.talents.includes(t.id)).forEach(t => {
            const weight = presetTalentIds.includes(t.id) ? 3 : 1;
            for (let i = 0; i < weight; i++) weighted.push(t);
        });
        const shuffled = weighted.sort(() => 0.5 - Math.random());
        const choices = [];
        for (const t of shuffled) {
            if (choices.length >= 3) break;
            if (!choices.includes(t)) choices.push(t);
        }

        const container = document.getElementById('talent-choices');
        container.innerHTML = '';
        choices.forEach(c => {
            const btn = document.createElement('div');
            btn.className = 'talent-card';
            const synergyRelicId = TALENT_SYNERGIES[c.id];
            const synergyRelic = synergyRelicId && RELIC_POOL.find(r => r.id === synergyRelicId);
            const synergyTag = synergyRelic ? `<div class="talent-desc" style="color:#38bdf8; margin-top:2px;">⚡ Combos with ${synergyRelic.icon} ${synergyRelic.name}</div>` : '';
            btn.innerHTML = `<div class="talent-icon">${c.icon}</div><div class="talent-name">${c.name}</div><div class="talent-desc">${c.desc}</div>${synergyTag}`;
            btn.onclick = () => {
                this.applyTalent(c);
                document.getElementById('talent-overlay').classList.add('hidden');
            };
            container.appendChild(btn);
        });

        document.getElementById('talent-overlay').classList.remove('hidden');
    };

    proto.applyTalent = function(talent) {
        this.talents.push(talent.id);
        if (talent.id === 'vitality') { this.player.maxHp += 30; this.player.hp += 30; }
        else if (talent.id === 'focus') { this.player.maxMp += 30; this.player.mp += 30; }
        else if (talent.id === 'strength') { this.player.baseAtk += 5; }
        this.logMessage(`Acquired Talent: ${talent.name}`, 'log-level');
        this.updateStatsUI();
        this.checkAchievements();
    };

    proto.openShop = function() {
        const items = [
            { id: 'pot_hp', name: 'Health Potion', price: 20, icon: '🍎', effect: () => { this.player.potions.hp++; } },
            { id: 'pot_mp', name: 'Mana Potion', price: 20, icon: '🧪', effect: () => { this.player.potions.mp++; } },
            { id: 'gear', name: 'Mystery Relic', price: 100, icon: '💎', effect: () => { this.addItemToInventory(this.generateProceduralItem()); } }
        ];
        if (!this.allies.some(a => a.type === 'pet')) {
            items.push({ id: 'pet', name: 'Spirit Wolf Companion', price: 150, icon: '🐺', effect: () => { this.recruitPet(); } });
        }
        const container = document.getElementById('shop-items');
        container.innerHTML = '';
        items.forEach(it => {
            const el = document.createElement('div');
            el.className = 'shop-item';
            el.innerHTML = `<div><span>${it.icon}</span> <span style="font-weight:600;">${it.name}</span></div> <div class="price">${it.price}G</div>`;
            el.onclick = () => {
                if (this.player.gold >= it.price) {
                    this.player.gold -= it.price;
                    it.effect();
                    sfx.playLoot();
                    this.updateStatsUI();
                    this.logMessage(`Bought ${it.name}.`, 'log-system');
                    if (it.id === 'pet') this.openShop();
                } else {
                    this.logMessage(`Not enough gold!`, 'log-combat-enemy');
                }
            };
            container.appendChild(el);
        });
        document.getElementById('shop-bark').innerText = MERCHANT_BARKS[Math.floor(Math.random() * MERCHANT_BARKS.length)];
        document.getElementById('shop-overlay').classList.remove('hidden');
    };

    proto.offerForgeSwap = function(shrineIndex, x, y) {
        const bonus = 6 + Math.floor(this.level * 0.8);
        const trait = WEAPON_TRAITS[Math.floor(Math.random() * WEAPON_TRAITS.length)];
        const offer = {
            id: `it_${Math.random().toString(36).substr(2, 9)}`,
            name: `Forge-Wrought Blade ${trait.suffixName}`,
            type: 'weapon', rarity: 'epic', statBonus: bonus, icon: '🗡️', weaponTrait: trait.id
        };
        this.pendingForgeOffer = { offer, shrineIndex, x, y };
        document.getElementById('forge-item-name').innerText = `${offer.icon} ${offer.name} (+${offer.statBonus} ATK)`;
        document.getElementById('forge-item-desc').innerText = trait.desc;
        document.getElementById('forge-overlay').classList.remove('hidden');
    };
    proto.acceptForgeSwap = function() {
        const pending = this.pendingForgeOffer;
        if (!pending) return;
        const old = this.equipped.weapon;
        this.equipped.weapon = pending.offer;
        if (old && !this.addItemToInventory(old)) {
            old.x = pending.x; old.y = pending.y; old.popZ = 0; old.popVz = 4 + Math.random() * 1.5;
            this.itemsOnGround.push(old);
        }
        this.player.forgeDamageBonus = 0.2;
        sfx.playLevelUp();
        this.spawnLevelUpParticles();
        this.logMessage(`Took the ${pending.offer.name}! +20% damage dealt for the rest of this run.`, 'log-loot');
        this.shrines.splice(pending.shrineIndex, 1);
        this.pendingForgeOffer = null;
        document.getElementById('forge-overlay').classList.add('hidden');
        this.updateInventoryUI(); this.updateStatsUI();
    };
    proto.declineForgeSwap = function() {
        const pending = this.pendingForgeOffer;
        if (pending) this.shrines.splice(pending.shrineIndex, 1);
        this.pendingForgeOffer = null;
        document.getElementById('forge-overlay').classList.add('hidden');
        this.logMessage('You walk away from the forge unchanged.', 'log-system');
    };

    proto.openAnvil = function() {
        const container = document.getElementById('anvil-items');
        container.innerHTML = '';

        const tiers = ['common', 'rare', 'epic'];
        const nextTier = { common: 'rare', rare: 'epic', epic: 'legendary' };
        let upgradeTier = null;
        for (const t of tiers) {
            if (this.inventory.filter(it => it && it.rarity === t).length >= 3) { upgradeTier = t; break; }
        }
        const upgradeEl = document.createElement('div');
        upgradeEl.className = 'shop-item';
        if (upgradeTier) {
            upgradeEl.innerHTML = `<div><span>⬆️</span> <span style="font-weight:600;">Fuse 3x ${upgradeTier.toUpperCase()} → 1 ${nextTier[upgradeTier].toUpperCase()}</span></div> <div class="price">FREE</div>`;
            upgradeEl.onclick = () => this.craftUpgrade(upgradeTier, nextTier[upgradeTier]);
        } else {
            upgradeEl.innerHTML = `<div><span>⬆️</span> <span style="font-weight:600; color:var(--text-muted);">Need 3 items of matching rarity to fuse</span></div>`;
            upgradeEl.style.cursor = 'default';
        }
        container.appendChild(upgradeEl);
        document.getElementById('anvil-overlay').classList.remove('hidden');
    };

    proto.craftUpgrade = function(fromRarity, toRarity) {
        let removed = 0;
        for (let i = 0; i < this.inventory.length && removed < 3; i++) {
            if (this.inventory[i] && this.inventory[i].rarity === fromRarity) {
                this.inventory[i] = null;
                removed++;
            }
        }
        const upgraded = this.generateProceduralItem(toRarity);
        this.addItemToInventory(upgraded);
        sfx.playLevelUp();
        this.spawnLevelUpParticles();
        this.logMessage(`Forged 3 ${fromRarity} items into a ${toRarity} ${upgraded.name}!`, 'log-loot');
        this.openAnvil();
        this.updateInventoryUI();
    };
}
