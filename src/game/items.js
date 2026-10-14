import { MERCHANT_BARKS, UNIQUE_ITEMS_DB, WEAPON_TRAITS, RELIC_POOL, CLASS_TALENTS, TALENT_SYNERGIES, RELIC_SYNERGIES, LORE_DB, BASE_TALENTS, TALENT_DEFS } from './data.js';
import { sfx } from './audio.js';

export const itemMethods = {
    // [old] 
    checkLevelUp() {
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
            this.emitHud();
            setTimeout(() => this.openTalentDraft(), 900);
        }
    },

    openTalentDraft() {
        if (!this.player || this.player.hp <= 0 || this.gameOverHandled) return;
        const pool = BASE_TALENTS.slice();
        const classTalent = CLASS_TALENTS[this.player.classType];
        if (classTalent) pool.push(classTalent);

        // A saved loadout preset softly biases (never forces) the draft toward those picks
        const preset = this.meta.loadoutPresets && this.meta.loadoutPresets[this.player.classType];
        const presetIds = preset ? preset.talents : [];
        const weighted = [];
        pool.filter(t => !this.talents.includes(t.id)).forEach(t => {
            const weight = presetIds.includes(t.id) ? 3 : 1;
            for (let i = 0; i < weight; i++) weighted.push(t);
        });
        const shuffled = weighted.sort(() => 0.5 - Math.random());
        const choices = [];
        for (const t of shuffled) {
            if (choices.length >= 3) break;
            if (!choices.includes(t)) choices.push(t);
        }
        if (choices.length === 0) return; // every talent already owned

        this.ui.openModal('talent', {
            lvl: this.player.lvl,
            choices: choices.map(c => {
                const synergyId = TALENT_SYNERGIES[c.id];
                const synergy = synergyId && RELIC_POOL.find(r => r.id === synergyId);
                return {
                    ...c,
                    classTalent: !!(classTalent && classTalent.id === c.id),
                    preset: presetIds.includes(c.id),
                    synergy: synergy ? { name: synergy.name, icon: synergy.icon, owned: this.relics.includes(synergy.id) } : null,
                };
            }),
        });
    },

    pickTalent(id) {
        const t = TALENT_DEFS[id];
        if (!t || this.talents.includes(id)) return;
        this.ui.closeModal('talent');
        this.applyTalent(t);
    },

    // [old] 
    applyTalent(talent) {
        this.talents.push(talent.id);
        if(talent.id === 'vitality') { this.player.maxHp+=30; this.player.hp+=30; }
        else if(talent.id === 'focus') { this.player.maxMp+=30; this.player.mp+=30; }
        else if(talent.id === 'strength') { this.player.baseAtk+=5; }
        this.logMessage(`Acquired Talent: ${talent.name}`, 'log-level');
        this.updateStatsUI();
        this.checkAchievements();
    },

    getShopStock() {
        const items = [
            { id: 'pot_hp', name: 'Health Potion', desc: 'Restores 50 HP.', price: 20, icon: '🍎' },
            { id: 'pot_mp', name: 'Mana Potion', desc: 'Restores 50 MP.', price: 20, icon: '🧪' },
            { id: 'gear', name: 'Mystery Gear', desc: 'A random piece of equipment.', price: 100, icon: '💎' }
        ];
        if (!this.allies.some(a => a.type === 'pet')) {
            items.push({ id: 'pet', name: 'Spirit Wolf', desc: 'A companion that follows you across floors.', price: 150, icon: '🐺' });
        }
        return items;
    },

    openShop() {
        this.emitHud();
        this.ui.openModal('shop', { bark: MERCHANT_BARKS[Math.floor(Math.random() * MERCHANT_BARKS.length)] });
    },

    buyShopItem(id) {
        const it = this.getShopStock().find(x => x.id === id);
        if (!it) return { ok: false, message: 'That item is sold out.' };
        if (this.player.gold < it.price) {
            sfx.playHurt();
            return { ok: false, message: `You need ${it.price - this.player.gold} more gold.` };
        }
        if (id === 'gear' && !this.inventory.includes(null)) return { ok: false, message: 'Your bag is full. Drop something first.' };
        this.player.gold -= it.price;
        if (id === 'pot_hp') this.player.potions.hp++;
        else if (id === 'pot_mp') this.player.potions.mp++;
        else if (id === 'gear') this.addItemToInventory(this.generateProceduralItem());
        else if (id === 'pet') this.recruitPet();
        sfx.playLoot();
        this.logMessage(`Bought ${it.name}.`, 'log-system');
        this.emitHud();
        return { ok: true, message: `Bought ${it.name}.` };
    },

    getAnvilOptions() {
        const nextTier = { common: 'rare', rare: 'epic', epic: 'legendary' };
        let fuse = null;
        for (const t of ['common', 'rare', 'epic']) {
            if (this.inventory.filter(it => it && it.rarity === t).length >= 3) { fuse = { from: t, to: nextTier[t] }; break; }
        }
        const weapon = this.equipped.weapon;
        const enchants = [
            { id: 'fire', name: 'Ember', effect: 'Burn on hit', icon: '🔥', cost: 75 },
            { id: 'frost', name: 'Rime', effect: 'Chill on hit', icon: '❄️', cost: 75 },
            { id: 'poison', name: 'Venom', effect: 'Poison on hit', icon: '☠️', cost: 75 }
        ].map(e => ({ ...e, active: !!(weapon && weapon.enchant === e.id) }));
        return { fuse, enchants, weapon: weapon ? { name: weapon.name, icon: weapon.icon, enchant: weapon.enchant || null } : null };
    },

    openAnvil() {
        this.emitHud();
        this.ui.openModal('anvil', {});
    },

    // [old] 
    craftUpgrade(fromTier, toTier) {
        let removed = 0;
        for (let i = 0; i < this.inventory.length && removed < 3; i++) {
            if (this.inventory[i] && this.inventory[i].rarity === fromTier) { this.inventory[i] = null; removed++; }
        }
        if (removed === 3) {
            const item = this.generateProceduralItem(toTier);
            this.addItemToInventory(item);
            sfx.playLevelUp();
            this.logMessage(`Forged a ${toTier.toUpperCase()} ${item.name}!`, 'log-loot');
            this.updateInventoryUI();
            this.openAnvil();
        }
    },

    // [old] 
    enchantWeapon(type, cost) {
        if (!this.equipped.weapon) return;
        if (this.player.gold >= cost) {
            this.player.gold -= cost;
            this.equipped.weapon.enchant = type;
            sfx.playMagic();
            this.logMessage(`Enchanted ${this.equipped.weapon.name} with ${type}!`, 'log-loot');
            this.updateStatsUI(); this.updateInventoryUI();
            this.openAnvil();
        } else {
            this.logMessage('Not enough gold!', 'log-combat-enemy');
        }
    },

    offerForgeSwap(shrineIndex, x, y) {
        const bonus = 6 + Math.floor(this.level * 0.8);
        const trait = WEAPON_TRAITS[Math.floor(Math.random() * WEAPON_TRAITS.length)];
        const offer = {
            id: `it_${Math.random().toString(36).substr(2, 9)}`,
            name: `Forge-Wrought Blade ${trait.suffixName}`,
            type: 'weapon', rarity: 'epic', statBonus: bonus, icon: '🗡️', weaponTrait: trait.id
        };
        this.pendingForgeOffer = { offer, shrineIndex, x, y };
        this.ui.openModal('forge', {
            offer: { ...offer, traitDesc: trait.desc },
            current: this.equipped.weapon ? { ...this.equipped.weapon } : null,
        });
    },

    // [new] 
    acceptForgeSwap() {
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
        this.ui.closeModal('forge');
        this.updateInventoryUI(); this.updateStatsUI();
    },

    // [new] 
    declineForgeSwap() {
        const pending = this.pendingForgeOffer;
        if (pending) this.shrines.splice(pending.shrineIndex, 1);
        this.pendingForgeOffer = null;
        this.ui.closeModal('forge');
        this.logMessage('You walk away from the forge unchanged.', 'log-system');
    },

    // [old] 
    openChest(chestIdx) {
        const chest = this.chests[chestIdx];
        if (chest.mimic) {
            // The chest was never a chest
            this.chests.splice(chestIdx, 1);
            const hp = 30 + this.level * 6;
            this.enemies.push({ x: chest.x, y: chest.y, visualX: chest.x, visualY: chest.y, name: 'Mimic', hp, maxHp: hp, atk: 8 + this.level * 2, def: this.level, xpReward: 60 + this.level * 8, icon: '😈', color: '#f59e0b', codexKey: 'mimic', ai: 'melee', statuses: [], aware: true, elite: false, affixes: [], hitFlash: 0, knockX: 0, knockY: 0, ghostHp: hp, ghostDelay: 0, dying: false, deathTimer: 0 });
            sfx.playHurt();
            this.triggerCameraShake(10, 220);
            this.spawnShards(chest.x, chest.y, '#b45309');
            this.logMessage('The chest bares its teeth — a MIMIC!', 'log-combat-enemy');
            return;
        }
        chest.opened = true;
        sfx.playLoot();
        this.triggerCameraShake(6, 150);
        this.spawnGoldSparkles(chest.x, chest.y);
        if (chest.guaranteed === 'rare_plus') this.bumpStat('vaultChestsOpened', 1);
        const item = this.generateProceduralItem(chest.guaranteed || null);
        this.logMessage(`Discovered: ${item.name} (${item.rarity.toUpperCase()})!`, 'log-loot');
        const added = this.addItemToInventory(item);
        if (!added) { item.x = chest.x; item.y = chest.y; item.popZ = 0; item.popVz = 4.5; this.itemsOnGround.push(item); }

        // Rarely, a relic is hidden underneath the loot
        if (!chest.guaranteed && Math.random() < 0.07) {
            this.dropRelicAt(chest.x, chest.y);
            this.logMessage('A strange relic was hidden inside!', 'log-loot');
        }

        // 50% chance to also find a potion in chests
        if (Math.random() < 0.5) {
            const pType = Math.random() < 0.5 ? 'hp' : 'mp';
            this.player.potions[pType]++;
            this.logMessage(`Found a ${pType === 'hp' ? 'Health' : 'Mana'} Potion!`, 'log-loot');
            this.updateStatsUI();
        }
    },

    // [old] 
    dropLootAt(x, y) {
        const item = this.generateProceduralItem(); item.x = x; item.y = y; item.popZ = 0; item.popVz = 4 + Math.random() * 1.5;
        this.itemsOnGround.push(item); this.spawnGoldSparkles(x, y);
    },

    // [old] 
    dropGoldAt(x, y, amount) {
        const relicBonus = (this.relics && this.relics.includes('scavenger')) ? 0.3 : 0;
        const finalAmount = Math.floor(amount * (1 + (this.meta ? this.meta.fortune * 0.05 : 0) + relicBonus));
        this.itemsOnGround.push({ isGold: true, amount: finalAmount, x, y, icon: '🪙', name: 'Gold Coins', popZ: 0, popVz: 3.5 + Math.random() });
    },

    dropRelicAt(x, y) {
        const owned = this.relics.concat(this.itemsOnGround.filter(i => i.isRelic).map(i => i.relicId));
        const available = RELIC_POOL.filter(r => !owned.includes(r.id));
        if (available.length === 0) { this.dropGoldAt(x, y, 60 + this.level * 10); return; }
        const r = available[Math.floor(Math.random() * available.length)];
        // Rarely a relic arrives unidentified: you only learn what it is by picking it up
        const hidden = this.level >= 3 && Math.random() < 0.12;
        this.itemsOnGround.push({
            isRelic: true, relicId: r.id, unidentified: hidden,
            name: hidden ? 'Unidentified Relic' : r.name, icon: hidden ? '❓' : r.icon,
            x, y, popZ: 0, popVz: 4.5
        });
    },

    grantRelic(id, wasUnidentified = false) {
        const r = RELIC_POOL.find(rr => rr.id === id);
        if (!r || this.relics.includes(id)) return;
        this.relics.push(id);
        if (id === 'battle_rhythm') {
            this.player.maxSkillCooldown = Math.max(1, this.player.maxSkillCooldown - 1);
            this.player.maxSkillCooldown2 = Math.max(1, this.player.maxSkillCooldown2 - 1);
        }
        sfx.playLevelUp();
        this.spawnLevelUpParticles();
        this.logMessage(`RELIC: ${r.name} — ${r.desc}`, 'log-loot');
        this.showLoreToast(`${wasUnidentified ? '❓→ ' : ''}${r.icon} ${r.name} — ${r.desc}`);

        // Intentional relic pairs announce themselves the first time both are active
        if (!this.seenRelicSynergies) this.seenRelicSynergies = [];
        RELIC_SYNERGIES.forEach(syn => {
            const key = syn.pair.join('+');
            if (syn.pair.every(p => this.relics.includes(p)) && !this.seenRelicSynergies.includes(key)) {
                this.seenRelicSynergies.push(key);
                setTimeout(() => this.showLoreToast(syn.text), 1500);
            }
        });
        if (this.relics.length === 6) this.logMessage('Your relics resonate together — a visible aura surrounds you.', 'log-level');

        this.updateStatsUI();
        this.updateFOV();
        this.drawMinimap();
        this.checkAchievements();
    },

    // [old] 
    pickupItem(lootIdx) {
        const item = this.itemsOnGround[lootIdx];
        if (item.isGold) {
            this.player.gold += item.amount;
            sfx.playLoot();
            this.itemsOnGround.splice(lootIdx, 1);
            this.logMessage(`Picked up ${item.amount} Gold.`, 'log-loot');
            this.updateStatsUI();
            this.checkAchievements();
        } else if (item.isRelic) {
            this.itemsOnGround.splice(lootIdx, 1);
            this.grantRelic(item.relicId, !!item.unidentified);
        } else if (item.isLore) {
            this.itemsOnGround.splice(lootIdx, 1);
            sfx.playLoot();
            if (!this.meta.lore) this.meta.lore = [];
            if (!this.meta.lore.includes(item.loreIdx)) {
                this.meta.lore.push(item.loreIdx);
                this.saveMeta();
            }
            const xpGain = 10 + this.level * 2;
            this.player.xp += xpGain;
            this.logMessage(`Lore Scrap recovered. (+${xpGain} XP)`, 'log-level');
            this.showLoreToast(`📜 ${LORE_DB[item.loreIdx]}`);
            this.checkLevelUp();
            this.updateStatsUI();
        } else if (item.isKey) {
            this.player.keys = (this.player.keys || 0) + 1;
            sfx.playLoot();
            this.itemsOnGround.splice(lootIdx, 1);
            this.logMessage(`Picked up a ${item.name}.`, 'log-loot');
            this.updateStatsUI();
        } else {
            const added = this.addItemToInventory(item);
            if (added) {
                sfx.playLoot();
                this.itemsOnGround.splice(lootIdx, 1);
                this.logMessage(`Picked up: ${item.name}`, 'log-loot');
                if (item.uniqueId) {
                    this.spawnLevelUpParticles();
                    this.showLoreToast(`${item.icon} ${item.name} — "${item.lore}"`);
                }
            }
        }
    },

    // [old] 
    generateProceduralItem(forcedRarity = null) {
        const rarities = [ { id: 'common', w: 0.60 }, { id: 'rare', w: 0.25 }, { id: 'epic', w: 0.12 }, { id: 'legendary', w: 0.03 } ];
        let pool = rarities;
        if (forcedRarity === 'rare_plus') pool = rarities.filter(r => r.id !== 'common');
        else if (forcedRarity && rarities.some(r => r.id === forcedRarity)) pool = [{ id: forcedRarity, w: 1 }];
        const totalW = pool.reduce((s, r) => s + r.w, 0);
        let rRoll = Math.random() * totalW; let rarity = pool[0]; let accWeight = 0;
        for (const r of pool) { accWeight += r.w; if (rRoll <= accWeight) { rarity = r; break; } }

        // Rarely, a legendary roll produces a hand-authored unique instead of a procedural item
        if (rarity.id === 'legendary' && Math.random() < 0.2) {
            const owned = new Set([...this.inventory, ...Object.values(this.equipped)].filter(Boolean).map(it => it.uniqueId).filter(Boolean));
            const available = UNIQUE_ITEMS_DB.filter(u => !owned.has(u.id));
            if (available.length > 0) {
                const u = available[Math.floor(Math.random() * available.length)];
                const bonus = u.statBonus + Math.floor(this.level * 0.5);
                return { id: `unique_${u.id}_${Date.now()}`, uniqueId: u.id, name: u.name, type: u.type, rarity: 'legendary', statBonus: bonus, icon: u.icon, uniqueEffect: u.uniqueEffect, lore: u.lore };
            }
        }

        const types = ['weapon', 'armor', 'shield', 'accessory'];
        const type = types[Math.floor(Math.random() * types.length)];
        const prefixes = { common: ['Worn', 'Plain'], rare: ['Polished', 'Steadfast'], epic: ['Shadowed', 'Eldritch'], legendary: ['Archon\'s', 'Voidbound'] };
        const suffixes = { weapon: ['Blade', 'Axe', 'Staff'], armor: ['Plate', 'Robe'], shield: ['Aegis', 'Ward'], accessory: ['Ring', 'Amulet'] };
        const icons = { weapon: '🗡️', armor: '👕', shield: '🛡️', accessory: '💍' };

        const name = `${prefixes[rarity.id][Math.floor(Math.random() * prefixes[rarity.id].length)]} ${suffixes[type][Math.floor(Math.random() * suffixes[type].length)]}`;
        let mult = rarity.id === 'rare' ? 2 : rarity.id === 'epic' ? 4 : rarity.id === 'legendary' ? 8 : 1;
        const statBonus = Math.floor(Math.random() * 3 + 1) * mult + Math.floor(this.level * 0.5);

        const item = { id: `it_${Math.random().toString(36).substr(2, 9)}`, name, type, rarity: rarity.id, statBonus, icon: icons[type] };
        if (type === 'weapon' && rarity.id !== 'common' && Math.random() < 0.3) {
            const trait = WEAPON_TRAITS[Math.floor(Math.random() * WEAPON_TRAITS.length)];
            item.weaponTrait = trait.id;
            item.name = `${name} ${trait.suffixName}`;
        }
        return item;
    },

    // [old] 
    addItemToInventory(item) {
        for (let i = 0; i < this.inventory.length; i++) {
            if (this.inventory[i] === null) { this.inventory[i] = item; this.updateInventoryUI(); return true; }
        }
        return false;
    },

    // [old] 
    equipItem(index) {
        const item = this.inventory[index]; if (!item) return;
        const type = item.type; const current = this.equipped[type];
        this.equipped[type] = item; this.inventory[index] = current;
        if (type === 'accessory') this.player.fovAccessory = Math.floor(item.statBonus / 2);
        sfx.playLoot(); this.logMessage(`Equipped: ${item.name}`, 'log-system');
        this.updateInventoryUI(); this.updateStatsUI(); this.updateFOV();
    },

    // [old] 
    unequipItem(slotType) {
        const item = this.equipped[slotType]; if (!item) return;
        if (this.addItemToInventory(item)) {
            this.equipped[slotType] = null;
            if (slotType === 'accessory') this.player.fovAccessory = 0;
            sfx.playLoot(); this.updateInventoryUI(); this.updateStatsUI(); this.updateFOV();
        }
    },

    // [old] 
    removeItemFromInventory(index) {
        const item = this.inventory[index]; if (!item) return;
        this.inventory[index] = null;
        sfx.playHit();
        this.logMessage(`Discarded: ${item.name}`, 'log-system');
        this.updateInventoryUI();
    },

    // [new] 
    dropItemFromInventory(index) {
        const item = this.inventory[index];
        if (!item) return;
        this.inventory[index] = null;
        item.x = this.player.x; item.y = this.player.y; item.popZ = 0; item.popVz = 4;
        this.itemsOnGround.push(item);
        sfx.playLoot();
        this.updateInventoryUI();
    },

    // [old] 
    getPlayerAttack() {
        let w = this.equipped.weapon ? this.equipped.weapon.statBonus : 0;
        let buff = this.player.battleCryTurns > 0 ? 4 : 0;
        let mult = (this.relics && this.relics.includes('glass_cannon')) ? 1.3 : 1;
        if (this.activeMutators && this.activeMutators.includes('glass')) mult *= 1.3;
        return Math.round((this.player.baseAtk + w + buff) * mult);
    },

    // [old] 
    getPlayerDefense() {
        let a = this.equipped.armor ? this.equipped.armor.statBonus : 0;
        let s = this.equipped.shield ? this.equipped.shield.statBonus : 0;
        let buff = this.player.battleCryTurns > 0 ? 4 : 0;
        return this.player.baseDef + a + s + buff;
    },
};
