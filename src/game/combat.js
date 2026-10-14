import { CAPTIVE_BARKS, CAPTIVE_CLASS_BARKS, CAPTIVE_ACT_LINES, CLASS_WALL_VERBS, AFFIX_NAMES, GUARDIAN_INTERVAL } from './data.js';
import { sfx, music } from './audio.js';
import { AStar } from './astar.js';

export const combatMethods = {
    // [old] 
    getIncomingDamageMultiplier() { return this.player.hasteTurns > 0 ? 1.5 : 1; },

    // [old] 
    getFovRadius() {
        let r = this.player.baseFov + (this.player.fovAccessory || 0);
        if (this.relics.includes('hunters_instinct')) r += 2;
        if (this.equipped.armor && this.equipped.armor.uniqueEffect === 'vision') r += 2;
        if (this.darknessFloor) r -= 2;
        return Math.max(3, r);
    },

    // [old] 
    damagePlayer(rawDmg) {
        let dmg = rawDmg * this.getIncomingDamageMultiplier();
        if (this.relics.includes('glass_cannon')) dmg *= 1.15;
        if (this.activeMutators && this.activeMutators.includes('glass')) dmg *= 1.3;
        if (this.relics.includes('stoneheart')) dmg -= 2;
        dmg = Math.max(1, Math.ceil(dmg));
        this.player.hp -= dmg;
        if (this.player.hp <= 0 && this.relics.includes('phoenix_feather') && !this.phoenixUsed) {
            this.phoenixUsed = true;
            this.player.hp = 1;
            this.spawnLevelUpParticles();
            this.spawnDamageNumber(this.player.x, this.player.y, 'REBORN!', '#fb923c');
            this.logMessage('The Phoenix Feather ignites — you refuse to die!', 'log-level');
            this.bumpStat('phoenixSaves', 1);
        }
        if (this.player.hp < 0) this.player.hp = 0;
        return dmg;
    },

    applyDamageToEnemy(enemy, rawDmg) {
        // Warded affix: a shield that swallows one hit, then recharges a few turns later
        if (enemy.wardCharge > 0) {
            enemy.wardCharge = 0;
            enemy.wardCooldown = 5;
            this.spawnDamageNumber(enemy.x, enemy.y, 'WARDED', '#7dd3fc');
            this.fxNova(enemy.x, enemy.y, '#7dd3fc', 0.9, 360);
            return 0;
        }
        let dmg = rawDmg;
        if (enemy.affixes && enemy.affixes.includes('armored')) dmg = dmg * 0.6;
        // Tank enemies guard nearby allies, soaking some of the damage meant for them
        if (enemy.ai !== 'tank' && this.enemies.some(e => e !== enemy && e.ai === 'tank' && !e.dying && e.hp > 0 && Math.abs(e.x - enemy.x) <= 2 && Math.abs(e.y - enemy.y) <= 2)) {
            dmg *= 0.7;
        }
        if (this.player && this.player.forgeDamageBonus) dmg *= 1 + this.player.forgeDamageBonus;
        return Math.max(1, Math.round(dmg));
    },

    // [old] 
    applyStatus(entity, type, turns, opts = {}) {
        if (entity === this.player && type === 'chill' && this.relics && this.relics.includes('frost_walker')) return;
        if (!entity.statuses) entity.statuses = [];
        const existing = entity.statuses.find(s => s.type === type);
        if (existing) { existing.turns = Math.max(existing.turns, turns); Object.assign(existing, opts); }
        else entity.statuses.push({ type, turns, ...opts });
    },

    // [old] 
    hasStatus(entity, type) {
        return !!(entity.statuses && entity.statuses.find(s => s.type === type));
    },

    // [old] 
    processStatuses(entity) {
        if (!entity.statuses) entity.statuses = [];
        let skipTurn = false;
        for (let i = entity.statuses.length - 1; i >= 0; i--) {
            const s = entity.statuses[i];
            if (s.type === 'stun') {
                skipTurn = true;
            } else if (s.type === 'burn' || s.type === 'poison') {
                const dmg = s.type === 'burn' ? (3 + Math.ceil((entity.maxHp || 100) * 0.015)) : Math.ceil((entity.maxHp || 20) * 0.05);
                entity.hp -= dmg;
                this.spawnDamageNumber(entity.x, entity.y, `-${dmg}`, s.type === 'burn' ? '#f97316' : '#84cc16');
                this.resetGhostDelay(entity);
                if (s.type === 'burn' && Math.random() < 0.25) this.spreadBurn(entity);
            }
            s.turns--;
            if (s.turns <= 0) entity.statuses.splice(i, 1);
        }
        return skipTurn;
    },

    // [old] 
    spreadBurn(source) {
        const candidates = [];
        if (source !== this.player && Math.abs(this.player.x - source.x) + Math.abs(this.player.y - source.y) === 1 && !this.hasStatus(this.player, 'burn')) candidates.push(this.player);
        this.enemies.forEach(e => { if (e !== source && !e.dying && Math.abs(e.x - source.x) + Math.abs(e.y - source.y) === 1 && !this.hasStatus(e, 'burn')) candidates.push(e); });
        if (candidates.length > 0) {
            const target = candidates[Math.floor(Math.random() * candidates.length)];
            this.applyStatus(target, 'burn', 3);
            this.logMessage('The flames spread!', 'log-combat-enemy');
        }
    },

    combatRound(enemyIdx, isBonus = false) {
        const enemy = this.enemies[enemyIdx];
        const isSneak = !isBonus && enemy.aware === false; // unaware target: guaranteed critical strike
        let rawDmg = Math.max(1, this.getPlayerAttack() - enemy.def);
        let forcedCrit = false;
        if (this.momentumReady) {
            rawDmg = Math.ceil(rawDmg * 1.5);
            this.momentumReady = false;
            // Loaded Dice + Momentum Engine: the post-kill strike always crits
            if (this.relics.includes('lucky_strikes')) forcedCrit = true;
            this.spawnDamageNumber(enemy.x, enemy.y, 'MOMENTUM!', '#38bdf8');
        }
        let isCrit = false;
        if (isSneak) {
            rawDmg *= this.talents.includes('shadow_step') ? 4.5 : 3;
        } else {
            if (this.relics.includes('lucky_strikes')) {
                this.luckyCounter = (this.luckyCounter || 0) + 1;
                if (this.luckyCounter >= 4) { this.luckyCounter = 0; forcedCrit = true; }
            }
            if (forcedCrit || Math.random() < this.getCritChance() / 100) {
                isCrit = true; rawDmg = Math.ceil(rawDmg * 2);
            }
        }
        let dmg = this.applyDamageToEnemy(enemy, rawDmg);
        const heal = (amount, color) => {
            if (amount <= 0) return;
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + amount);
            this.spawnDamageNumber(this.player.x, this.player.y, `+${amount}`, color);
        };

        if (this.talents.includes('vampiric')) heal(Math.floor(dmg * 0.15), '#34d399');
        if (this.activeMutators && this.activeMutators.includes('bloodlust')) heal(Math.floor(dmg * 0.1), '#fb7185');
        if (this.equipped.weapon && this.equipped.weapon.uniqueEffect === 'lifesteal') heal(Math.floor(dmg * 0.15), '#a855f7');
        if (isCrit && this.talents.includes('executioner')) heal(Math.floor(dmg * 0.25), '#34d399');
        // Cinderheart: every strike sets the target alight
        if (this.equipped.weapon && this.equipped.weapon.uniqueEffect === 'burn_on_hit' && enemy.hp > 0) this.applyStatus(enemy, 'burn', 3);
        // Tidebreaker: every strike chills
        if (this.equipped.weapon && this.equipped.weapon.uniqueEffect === 'chill_on_hit' && enemy.hp > 0) this.applyStatus(enemy, 'chill', 2);
        // Arcane Overload (mage talent): critical hits ignite
        if (isCrit && this.talents.includes('arcane_overload')) this.applyStatus(enemy, 'burn', 3);

        enemy.hp -= dmg;
        enemy.aware = true;
        this.triggerHitFlash(enemy); this.triggerKnockback(enemy, this.player.x, this.player.y); this.resetGhostDelay(enemy);
        this.spawnAttackSwipe(this.player.x, this.player.y, enemy.x, enemy.y);
        sfx.playHit();
        this.triggerCameraShake(isSneak ? 8 : (isCrit ? 6 : 4), isSneak ? 180 : (isCrit ? 140 : 100));
        this.spawnBloodParticles(enemy.x, enemy.y, '#fb7185');

        // Enchanted weapons have a chance to inflict their elemental status
        if (this.equipped.weapon && this.equipped.weapon.enchant && Math.random() < 0.3) {
            const map = { fire: 'burn', frost: 'chill', poison: 'poison' };
            this.applyStatus(enemy, map[this.equipped.weapon.enchant], 3);
        }

        if (dmg > 0) {
            if (isSneak) {
                this.spawnDamageNumber(enemy.x, enemy.y, 'SNEAK ATTACK!', '#facc15');
                this.logMessage(`Sneak Attack! You strike ${enemy.name} for ${dmg}.`, 'log-combat-player');
            } else if (isCrit) {
                this.spawnDamageNumber(enemy.x, enemy.y, 'CRIT!', '#fb923c');
                this.logMessage(`Critical hit! You strike ${enemy.name} for ${dmg}.`, 'log-combat-player');
            } else {
                this.logMessage(`You strike ${enemy.name} for ${dmg}.`, 'log-combat-player');
            }
            this.spawnDamageNumber(enemy.x, enemy.y, `-${dmg}`, '#fb7185');
        } else {
            this.logMessage(`${enemy.name}'s ward absorbs your strike.`, 'log-system');
        }

        // Weapon traits change how basic attacks behave, not just their numbers
        const trait = this.equipped.weapon && this.equipped.weapon.weaponTrait;
        if (!isBonus && trait === 'cleave') {
            this.enemies.forEach(o => {
                if (o === enemy || o.dying || Math.abs(o.x - enemy.x) > 1 || Math.abs(o.y - enemy.y) > 1) return;
                if (Math.abs(o.x - this.player.x) > 1 || Math.abs(o.y - this.player.y) > 1) return;
                const cd = this.applyDamageToEnemy(o, Math.ceil(rawDmg * 0.5));
                o.hp -= cd; o.aware = true;
                this.triggerHitFlash(o); this.resetGhostDelay(o);
                if (cd > 0) this.spawnDamageNumber(o.x, o.y, `-${cd}`, '#fca5a5');
            });
        } else if (!isBonus && trait === 'bounce' && Math.random() < 0.35) {
            const next = this.enemies.find(o => o !== enemy && !o.dying && Math.hypot(o.x - enemy.x, o.y - enemy.y) <= 3 && this.fog[o.y] && this.fog[o.y][o.x] === 2);
            if (next) {
                const bd = this.applyDamageToEnemy(next, Math.ceil(rawDmg * 0.6));
                next.hp -= bd; next.aware = true;
                this.triggerHitFlash(next); this.resetGhostDelay(next);
                this.fxBeam(enemy.x, enemy.y, next.x, next.y, '#fde68a', 300);
                if (bd > 0) this.spawnDamageNumber(next.x, next.y, `-${bd}`, '#fde68a');
                this.logMessage(`Your strike ricochets into ${next.name}!`, 'log-combat-player');
            }
        }

        if (enemy.hp <= 0) { this.hitStopTimer = 70; this.triggerCameraShake(10, 150); }
        this.checkEnemyDeaths();

        // Berserker's Fury talent: below 30% HP, chance to immediately strike again
        if (!isBonus && this.talents.includes('berserker') && this.player.hp > 0 && this.player.hp < this.player.maxHp * 0.3 && enemy.hp > 0 && !enemy.dying && Math.random() < 0.3) {
            this.logMessage(`Berserker's Fury! You strike again!`, 'log-combat-player');
            this.combatRound(enemyIdx, true);
        }
    },

    checkEnemyDeaths() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.hp <= 0 && !enemy.dying) {
                enemy.dying = true;
                enemy.deathTimer = 1.0;
                this.logMessage(`Vanquished ${enemy.name}! (+${enemy.xpReward} XP)`, 'log-level');
                this.player.xp += enemy.xpReward;
                this.recordKill(enemy);

                // On-kill relic and talent effects
                const siphon = this.relics.includes('soul_siphon');
                const sigil = this.relics.includes('vampire_sigil');
                if (siphon && sigil) {
                    // Vampire Sigil + Soul Siphon synergy: every kill fully restores HP and MP
                    this.player.hp = this.player.maxHp;
                    this.player.mp = this.player.maxMp;
                    this.spawnDamageNumber(this.player.x, this.player.y, 'RESTORED', '#34d399');
                } else {
                    if (siphon) this.player.mp = Math.min(this.player.maxMp, this.player.mp + 5);
                    if (sigil) {
                        const heal = Math.ceil(this.player.maxHp * 0.05);
                        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
                        this.spawnDamageNumber(this.player.x, this.player.y, `+${heal}`, '#34d399');
                    }
                }
                if (this.talents.includes('deaths_due')) this.player.mp = Math.min(this.player.maxMp, this.player.mp + 8);
                if (this.equipped.accessory && this.equipped.accessory.uniqueEffect === 'soul_heal') {
                    const heal = Math.ceil(this.player.maxHp * 0.05);
                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
                    this.spawnDamageNumber(this.player.x, this.player.y, `+${heal}`, '#a855f7');
                }
                if (this.relics.includes('momentum')) this.momentumReady = true;

                // Exploders burst on death
                if (enemy.ai === 'exploder') {
                    this.logMessage(`${enemy.name} explodes!`, 'log-combat-enemy');
                    if (Math.abs(this.player.x - enemy.x) <= 1 && Math.abs(this.player.y - enemy.y) <= 1) {
                        this.lastAttacker = enemy.name;
                        const bdmg = this.damagePlayer(15);
                        this.spawnDamageNumber(this.player.x, this.player.y, `-${bdmg}`, '#fb7185');
                        this.triggerHitFlash(this.player); this.resetGhostDelay(this.player); this.triggerCameraShake(10, 200);
                    }
                }
                // Volatile affix: the corpse leaves a hazard behind
                if (enemy.affixes && enemy.affixes.includes('volatile') && this.map[enemy.y] && this.map[enemy.y][enemy.x] === 1) {
                    const biome = this.textures.currentBiome;
                    if (biome === 'forges') this.map[enemy.y][enemy.x] = 7;
                    else if (biome === 'void') this.map[enemy.y][enemy.x] = 8;
                    else this.placeSpike(enemy.x, enemy.y);
                    this.spawnSparks(enemy.x, enemy.y);
                    this.logMessage(`${enemy.name} bursts, scarring the floor.`, 'log-combat-enemy');
                }

                if (enemy.isBoss) {
                    const item = this.generateProceduralItem('legendary');
                    item.x = enemy.x; item.y = enemy.y; item.popZ = 0; item.popVz = 5;
                    this.itemsOnGround.push(item);
                    this.logMessage(`The guardian drops: ${item.name} (LEGENDARY)!`, 'log-loot');
                    this.dropGoldAt(enemy.x, enemy.y, 100 + this.level * 10);
                    this.dropRelicAt(enemy.x, enemy.y);
                    this.recordBossKill(enemy.codexKey);
                } else if (enemy.codexKey === 'mimic') {
                    this.dropLootAt(enemy.x, enemy.y);
                    this.dropGoldAt(enemy.x, enemy.y, 40 + this.level * 6);
                } else {
                    if (Math.random() < 0.4 || enemy.elite) this.dropLootAt(enemy.x, enemy.y);
                    if (Math.random() < 0.6) this.dropGoldAt(enemy.x, enemy.y, Math.floor(Math.random() * 10 + this.level * 3));
                    if (enemy.elite && (enemy.isChampion || Math.random() < 0.15)) {
                        this.dropRelicAt(enemy.x, enemy.y);
                        this.logMessage('The champion was hoarding a relic!', 'log-loot');
                    }
                }
                this.spawnDeathBurst(enemy);
                sfx.playHit();
                this.triggerCameraShake(6, 150);
                this.checkLevelUp();
            }
        }
    },

    // [old] 
    explodeBarrel(x, y) {
        this.logMessage('A barrel explodes!', 'log-combat-enemy');
        sfx.playHurt();
        this.triggerCameraShake(14, 250);
        this.spawnDeathBurst({ x, y, color: '#f97316' });

        if (Math.abs(this.player.x - x) <= 1 && Math.abs(this.player.y - y) <= 1) {
            const dmg = this.damagePlayer(18 + this.level * 1.5);
            this.triggerHitFlash(this.player); this.resetGhostDelay(this.player);
            this.spawnDamageNumber(this.player.x, this.player.y, `-${dmg}`, '#fb7185');
            this.logMessage(`Caught in the blast for ${dmg}!`, 'log-combat-enemy');
        }

        this.enemies.forEach(e => {
            if (e.dying) return;
            if (Math.abs(e.x - x) <= 1 && Math.abs(e.y - y) <= 1) {
                const dmg = this.applyDamageToEnemy(e, 22 + this.level * 1.5);
                e.hp -= dmg;
                this.triggerHitFlash(e); this.resetGhostDelay(e);
                this.spawnDamageNumber(e.x, e.y, `-${dmg}`, '#fb7185');
            }
        });

        // Chain-trigger neighboring barrels
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const tx = x + dx, ty = y + dy;
                if (tx < 0 || tx >= this.mapWidth || ty < 0 || ty >= this.mapHeight) continue;
                if (this.map[ty][tx] === 4) {
                    const idx = this.destructibles.findIndex(d => d.x === tx && d.y === ty && d.type === 'barrel');
                    if (idx !== -1) {
                        this.destructibles.splice(idx, 1);
                        this.map[ty][tx] = 1;
                        this.explodeBarrel(tx, ty);
                    }
                }
            }
        }

        this.checkEnemyDeaths();
        if (this.player.hp <= 0) this.handleGameOver();
    },

    processEnemyAI() {
        this.enemies.forEach(enemy => {
            if (enemy.dying) return;
            const stunned = this.processStatuses(enemy);
            if (enemy.hp <= 0) return;
            if (stunned) { this.logMessage(`${enemy.name} is stunned!`, 'log-system'); return; }

            // Warded affix recharges its shield a few turns after it breaks
            if (enemy.affixes && enemy.affixes.includes('warded') && !enemy.wardCharge) {
                enemy.wardCooldown = (enemy.wardCooldown || 0) - 1;
                if (enemy.wardCooldown <= 0) enemy.wardCharge = 1;
            }

            this.updateEnemyAwareness(enemy);
            if (!enemy.aware) return;

            enemy.combatTurns = (enemy.combatTurns || 0) + 1;
            this.runEnemyAction(enemy);
            const swift = enemy.affixes && enemy.affixes.includes('swift');
            // Frenzied affix: once a fight drags on, it starts acting twice
            const frenzied = enemy.affixes && enemy.affixes.includes('frenzied') && enemy.combatTurns >= 6;
            if (frenzied && enemy.combatTurns === 6) this.logMessage(`${enemy.name} works itself into a frenzy!`, 'log-combat-enemy');
            if ((swift || frenzied) && !enemy.dying && enemy.hp > 0 && this.player.hp > 0) {
                this.runEnemyAction(enemy);
            }
        });
        this.checkEnemyDeaths();
    },

    // [old] 
    updateEnemyAwareness(enemy) {
        if (enemy.aware) return;
        const dist = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
        const detectRadius = enemy.elite ? 5 : 3.5;
        if (dist <= detectRadius && this.fog[enemy.y] && this.fog[enemy.y][enemy.x] === 2) {
            enemy.aware = true;
            this.logMessage(`${enemy.name} notices you!`, 'log-combat-enemy');
        }
    },

    // [old] 
    runEnemyAction(enemy) {
        const dist = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
        if (!(dist <= 8 && this.fog[enemy.y] && this.fog[enemy.y][enemy.x] === 2)) return; // Out of aggro range or hidden

        if (enemy.isBoss && enemy.phase === 1 && enemy.hp <= enemy.maxHp * 0.5) {
            enemy.phase = 2;
            this.logMessage(`${enemy.name} enters a devastating second phase!`, 'log-combat-enemy');
            this.triggerCameraShake(14, 300);
            const tide = enemy.codexKey === 'tidemother';
            const minion = tide
                ? { name: 'Brine Spawn', icon: '🦐', color: '#5eead4', codexKey: 'brine_spawn', hp: 20 + this.level * 3, atk: 7 + this.level }
                : { name: 'Bound Wraith', icon: '👻', color: '#a855f7', codexKey: 'bound_wraith', hp: 30 + this.level * 4, atk: 8 + this.level };
            for (let i = 0; i < (tide ? 3 : 2); i++) {
                const sx = enemy.x + (Math.random() < 0.5 ? 2 : -2) + (i === 2 ? 1 : 0);
                const sy = enemy.y + (Math.random() < 0.5 ? 2 : -2);
                if (sx >= 0 && sx < this.mapWidth && sy >= 0 && sy < this.mapHeight && this.map[sy][sx] === 1 && !this.enemies.some(e => e.x === sx && e.y === sy)) {
                    this.enemies.push({ x: sx, y: sy, visualX: sx, visualY: sy, name: minion.name, hp: minion.hp, maxHp: minion.hp, atk: minion.atk, def: 1, xpReward: 25, icon: minion.icon, color: minion.color, codexKey: minion.codexKey, ai: 'melee', statuses: [], aware: true, elite: false, affixes: [], hitFlash: 0, knockX: 0, knockY: 0, ghostHp: minion.hp, ghostDelay: 0, dying: false, deathTimer: 0 });
                }
            }
            if (tide) {
                // The flood rises: currents spread across the arena floor
                for (let i = 0; i < 6; i++) {
                    const cx = this.player.x + Math.floor(Math.random() * 9) - 4;
                    const cy = this.player.y + Math.floor(Math.random() * 9) - 4;
                    if (!(cx === this.player.x && cy === this.player.y)) this.placeCurrent(cx, cy, 3);
                }
                this.logMessage('The water surges across the arena floor!', 'log-combat-enemy');
            }
            return;
        }

        if (enemy.isBoss && enemy.phase === 2 && (this.ascensionTier || 0) >= 2 && enemy.hp <= enemy.maxHp * 0.25) {
            enemy.phase = 3;
            this.logMessage(`${enemy.name} sheds its restraint — a third phase begins!`, 'log-combat-enemy');
            this.triggerCameraShake(16, 320);
        }

        if (enemy.ai === 'telegraph') {
            if (enemy.isBoss && enemy.phase === 3 && dist <= 7 && Math.random() < 0.4) {
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        if (Math.max(Math.abs(dx), Math.abs(dy)) !== 2) continue;
                        const tx = this.player.x + dx, ty = this.player.y + dy;
                        if (tx < 0 || tx >= this.mapWidth || ty < 0 || ty >= this.mapHeight) continue;
                        if (this.map[ty][tx] === 0 || this.map[ty][tx] === 4) continue;
                        this.telegraphs.push({ x: tx, y: ty, turnsLeft: 1, dmg: enemy.atk * 1.3, spawnTime: Date.now(), thin: true, source: enemy.name });
                    }
                }
                this.logMessage(`${enemy.name} calls down a ring of devastation!`, 'log-combat-enemy');
                return;
            }
            if (enemy.isBoss && enemy.phase >= 2 && dist <= 6 && Math.random() < 0.35) {
                // Charge: telegraph a line of tiles toward the player, then strike along it
                const dx = Math.sign(this.player.x - enemy.x), dy = Math.sign(this.player.y - enemy.y);
                for (let step = 1; step <= 3; step++) {
                    const tx = enemy.x + dx * step, ty = enemy.y + dy * step;
                    if (tx < 0 || tx >= this.mapWidth || ty < 0 || ty >= this.mapHeight || this.map[ty][tx] === 0 || this.map[ty][tx] === 4) break;
                    this.telegraphs.push({x: tx, y: ty, turnsLeft: 1, dmg: enemy.atk * 1.5, spawnTime: Date.now(), thin: true, source: enemy.name});
                }
                this.logMessage(`${enemy.name} charges forward!`, 'log-combat-enemy');
                return;
            }
            if (dist <= 4 && Math.random() < (enemy.phase >= 2 ? 0.4 : 0.3)) { // Chance to cast AoE if near
                this.telegraphs.push({x: this.player.x, y: this.player.y, turnsLeft: 1, dmg: enemy.atk * 2, spawnTime: Date.now(), source: enemy.name});
                this.logMessage(`${enemy.name} begins a massive attack!`, 'log-combat-enemy');
                return;
            }
        }

        if (enemy.ai === 'ranged') {
            if (dist < 2.5) {
                // Kite: the player closed the distance, so back off instead of standing and shooting point-blank
                let best = null, bestDist = dist;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = enemy.x + dx, ny = enemy.y + dy;
                        if (nx < 0 || nx >= this.mapWidth || ny < 0 || ny >= this.mapHeight) continue;
                        if (this.map[ny][nx] !== 1) continue;
                        if (this.enemies.some(e => e !== enemy && !e.dying && e.x === nx && e.y === ny)) continue;
                        const nd = Math.hypot(this.player.x - nx, this.player.y - ny);
                        if (nd > bestDist) { bestDist = nd; best = { x: nx, y: ny }; }
                    }
                }
                if (best) { this.spawnFootstepDust(enemy.x, enemy.y); enemy.x = best.x; enemy.y = best.y; }
                return;
            }
            if (dist === Math.floor(dist) || dist < 4) { // Roughly line of sight
                // Shoot player
                this.particles.push({ x: enemy.visualX * this.tileSize, y: enemy.visualY * this.tileSize, tx: this.player.visualX * this.tileSize, ty: this.player.visualY * this.tileSize, life: 1, decay: 0.1, type: 'projectile', color: '#d1d5db', trailTimer: 0, cb: () => {
                    if (this.gameOverHandled || !this.player) return;
                    this.lastAttacker = enemy.name;
                    const dmg = this.damagePlayer(Math.max(1, enemy.atk - this.getPlayerDefense()));
                    this.triggerHitFlash(this.player); this.triggerKnockback(this.player, enemy.x, enemy.y); this.resetGhostDelay(this.player);
                    this.spawnBloodParticles(this.player.x, this.player.y, '#fb7185');
                    this.spawnSparks(this.player.x, this.player.y);
                    this.spawnDamageNumber(this.player.x, this.player.y, `-${dmg}`, '#fb7185');
                    this.logMessage(`${enemy.name} ${enemy.codexKey === 'siren' ? 'sings at' : 'shoots'} you for ${dmg}!`, 'log-combat-enemy');
                    if (enemy.codexKey === 'siren' && Math.random() < 0.35) this.applyStatus(this.player, 'chill', 2);
                    if (enemy.affixes && enemy.affixes.includes('vampiric')) {
                        const heal = Math.floor(dmg * 0.3);
                        enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
                        this.spawnDamageNumber(enemy.x, enemy.y, `+${heal}`, '#34d399');
                    }
                    if (this.player.hp <= 0) this.handleGameOver();
                }});
                return;
            }
        }

        if (enemy.ai === 'summoner' && Math.random() < 0.2) {
            // Summon minion
            let sx = enemy.x + (Math.random() < 0.5 ? 1 : -1);
            let sy = enemy.y + (Math.random() < 0.5 ? 1 : -1);
            if (this.map[sy] && this.map[sy][sx] === 1 && !this.enemies.some(e=>e.x===sx && e.y===sy)) {
                this.enemies.push({ x: sx, y: sy, visualX: sx, visualY: sy, name: 'Void Spawn', hp: 10, maxHp: 10, atk: 5, def: 0, xpReward: 5, icon: '👾', color: '#a855f7', codexKey: 'void_spawn', ai: 'melee', statuses: [], aware: true, elite: false, affixes: [], hitFlash: 0, knockX: 0, knockY: 0, ghostHp: 10, ghostDelay: 0, dying: false, deathTimer: 0 });
                this.logMessage(`${enemy.name} summons a minion!`, 'log-system');
                return;
            }
        }

        if (enemy.ai === 'trapper' && dist > 2 && dist <= 6 && Math.random() < 0.35) {
            // Weave a hex trap near the player instead of closing in
            const tx = this.player.x + Math.floor(Math.random() * 3) - 1;
            const ty = this.player.y + Math.floor(Math.random() * 3) - 1;
            if (this.map[ty] && this.map[ty][tx] === 1 && !(tx === this.player.x && ty === this.player.y)) {
                this.placeSpike(tx, ty);
                this.logMessage(`${enemy.name} weaves a hex trap!`, 'log-combat-enemy');
                return;
            }
        }

        if (dist <= 1.5) {
            this.lastAttacker = enemy.name;
            const dmg = this.damagePlayer(Math.max(1, enemy.atk - this.getPlayerDefense()));
            if (this.talents.includes('thorns') || (this.equipped.shield && this.equipped.shield.uniqueEffect === 'thorns')) {
                let thornsPct = 0.25;
                // Shield Wall (warrior talent): reflection grows as your HP drops
                if (this.talents.includes('shield_wall')) thornsPct += 0.25 * (1 - this.player.hp / this.player.maxHp);
                let ret = this.applyDamageToEnemy(enemy, Math.floor(dmg * thornsPct));
                enemy.hp -= ret; this.spawnDamageNumber(enemy.x, enemy.y, `-${ret}`, '#facc15');
                this.triggerHitFlash(enemy); this.resetGhostDelay(enemy);
            }
            this.triggerHitFlash(this.player); this.triggerKnockback(this.player, enemy.x, enemy.y); this.resetGhostDelay(this.player);
            this.spawnAttackSwipe(enemy.x, enemy.y, this.player.x, this.player.y);
            sfx.playHurt(); this.triggerCameraShake(8, 200);
            this.spawnBloodParticles(this.player.x, this.player.y, '#fb7185');
            this.spawnDamageNumber(this.player.x, this.player.y, `-${dmg}`, '#fb7185');
            this.logMessage(`${enemy.name} hits you for ${dmg}!`, 'log-combat-enemy');
            if (enemy.codexKey === 'drowned_husk' && Math.random() < 0.3) {
                this.applyStatus(this.player, 'chill', 2);
                this.logMessage('Freezing water seeps into your armor.', 'log-combat-enemy');
            }
            if (enemy.codexKey === 'tide_leech') {
                const drink = Math.floor(dmg * 0.4);
                enemy.hp = Math.min(enemy.maxHp, enemy.hp + drink);
                if (drink > 0) this.spawnDamageNumber(enemy.x, enemy.y, `+${drink}`, '#2dd4bf');
            }
            if (enemy.affixes && enemy.affixes.includes('vampiric')) {
                const heal = Math.floor(dmg * 0.3);
                enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
                this.spawnDamageNumber(enemy.x, enemy.y, `+${heal}`, '#34d399');
            }
        } else {
            if (this.hasStatus(enemy, 'chill') && Math.random() < 0.4) return; // Chilled: sometimes fails to close the distance
            const path = AStar.findPath(this.map, this.mapWidth, this.mapHeight, enemy, this.player, this.enemies.filter(e => !e.dying));
            if (path.length > 0) {
                const next = path[0];
                if (this.player.x !== next.x || this.player.y !== next.y) {
                    this.spawnFootstepDust(enemy.x, enemy.y);
                    enemy.x = next.x; enemy.y = next.y;
                    this.checkPlayerTrapTrigger(enemy);
                }
            }
        }
    },

    // [old] 
    checkPlayerTrapTrigger(enemy) {
        const idx = this.playerTraps.findIndex(t => t.x === enemy.x && t.y === enemy.y);
        if (idx === -1) return;
        const trap = this.playerTraps[idx];
        this.playerTraps.splice(idx, 1);
        const dmg = this.applyDamageToEnemy(enemy, trap.dmg);
        enemy.hp -= dmg;
        this.applyStatus(enemy, 'stun', 2);
        this.triggerHitFlash(enemy); this.resetGhostDelay(enemy);
        this.spawnDamageNumber(enemy.x, enemy.y, `-${dmg}`, '#ca8a04');
        this.spawnShards(enemy.x, enemy.y, '#78350f');
        this.logMessage(`${enemy.name} triggers your snare trap!`, 'log-combat-player');
        sfx.playHit();
        this.checkEnemyDeaths();
    },

    // [old] 
    recruitPet() {
        if (this.allies.some(a => a.type === 'pet')) return;
        const x = this.player.x, y = this.player.y;
        this.allies.push({ x, y, visualX: x, visualY: y, icon: '🐺', color: '#38bdf8', name: 'Spirit Wolf', type: 'pet', atk: 4 + Math.floor(this.player.lvl * 0.5), hitFlash: 0, knockX: 0, knockY: 0 });
        sfx.playLevelUp();
        this.logMessage('A Spirit Wolf now fights at your side!', 'log-loot');
        this.updateStatsUI();
        this.checkAchievements();
    },

    // [new] 
    recruitRescuedAlly(x, y) {
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
    },

    // [old] 
    updateAllies() {
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
    },

    // [new] 
    checkChampionTelegraph() {
        const champ = this.enemies.find(e => e.isChampion && !e.telegraphed && !e.dying && this.fog[e.y] && this.fog[e.y][e.x] === 2);
        if (champ) {
            champ.telegraphed = true;
            const names = (champ.affixes || []).map(a => AFFIX_NAMES[a] || a).join(' + ');
            this.showLoreToast(`⚠️ Champion ahead: ${names}`);
            return;
        }
        const elite = this.enemies.find(e => e.elite && !e.dying && this.fog[e.y] && this.fog[e.y][e.x] === 2);
        if (elite) this.showTutorialTip('elite', 'Elites (named enemies) hit much harder and carry a special affix — worth extra caution or a quick retreat.');
    },

    // [new] 
    updateFOV() {
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this.fog[y][x] === 2) this.fog[y][x] = 1;
            }
        }
        const px = this.player.x; const py = this.player.y;
        this.fog[py][px] = 2;
        const radius = this.getFovRadius();
        const rays = 144;
        for (let i = 0; i < rays; i++) {
            const dx = Math.cos((i / rays) * Math.PI * 2);
            const dy = Math.sin((i / rays) * Math.PI * 2);
            let rx = px + 0.5, ry = py + 0.5;
            for (let step = 0; step < radius; step += 0.25) {
                const tx = Math.floor(rx), ty = Math.floor(ry);
                if (tx < 0 || tx >= this.mapWidth || ty < 0 || ty >= this.mapHeight) break;
                this.fog[ty][tx] = 2;
                if (this.map[ty][tx] === 0 || this.map[ty][tx] === 4 || this.map[ty][tx] === 9 || this.map[ty][tx] === 10) break;
                rx += dx * 0.25; ry += dy * 0.25;
            }
        }
        this.checkChampionTelegraph();
    },

    // [old] 
    executeTurn(dx, dy) {
        if (!this.player) return;
        if (this.player.path.length > 0) this.player.path = [];
        this.processAction(this.player.x + dx, this.player.y + dy);
    },

    // [new] 
    // Drowned Depths currents carry the player up to three tiles downstream, chaining
    // into further current tiles, and stop at walls, enemies and solid objects.
    rideCurrent() {
        let moved = 0;
        for (let guard = 0; guard < 8; guard++) {
            const cur = this.currents && this.currents[`${this.player.x},${this.player.y}`];
            if (!cur) break;
            const nx = this.player.x + cur.dx, ny = this.player.y + cur.dy;
            const t = this.map[ny] && this.map[ny][nx];
            const blocked = t === undefined || t === 0 || t === 4 || t === 6 || t === 9 || t === 10 || t === 3 ||
                this.enemies.some(e => !e.dying && e.x === nx && e.y === ny) ||
                this.shrines.some(sh => sh.x === nx && sh.y === ny) || this.chests.some(c => !c.opened && c.x === nx && c.y === ny);
            if (blocked) break;
            this.player.x = nx; this.player.y = ny;
            moved++;
            if (moved >= 3 && this.map[ny][nx] !== 15) break;
            if (this.map[ny][nx] !== 15) break;
        }
        if (moved > 0) {
            this.player.path = [];
            this.spawnFootstepDust(this.player.x, this.player.y);
            this.logMessage(moved > 1 ? 'The current drags you along!' : 'The current shoves you aside.', 'log-system');
            const loot = this.itemsOnGround.findIndex(i => i.x === this.player.x && i.y === this.player.y);
            if (loot !== -1) this.pickupItem(loot);
        }
    },

    processAction(targetX, targetY) {
        if (targetX < 0 || targetX >= this.mapWidth || targetY < 0 || targetY >= this.mapHeight) return false;

        const stepDx = targetX - this.player.x, stepDy = targetY - this.player.y;
        if (stepDx !== 0 || stepDy !== 0) {
            if (Math.abs(stepDx) > Math.abs(stepDy)) this.player.facing = stepDx > 0 ? 'right' : 'left';
            else this.player.facing = stepDy > 0 ? 'down' : 'up';
        }

        const tile = this.map[targetY][targetX];
        if (tile === 0) return false;
        if (tile === 11 && !this.chasmFalling) {
            this.chasmFalling = true;
            this.logMessage('The floor gives way beneath you!', 'log-system');
            this.triggerCameraShake(10, 250);
            sfx.playHurt();
            this.startLevelTransition(() => {
                this.chasmFalling = false;
                this.level++;
                this.generateLevel();
            });
            return true;
        }
        if (tile === 4) {
            const dIdx = this.destructibles.findIndex(d => d.x === targetX && d.y === targetY);
            const isBarrel = dIdx !== -1 && this.destructibles[dIdx].type === 'barrel';
            if (dIdx !== -1) this.destructibles.splice(dIdx, 1);
            this.map[targetY][targetX] = 1;
            if (isBarrel) {
                this.explodeBarrel(targetX, targetY);
            } else {
                this.spawnShards(targetX, targetY, '#92400e');
                this.spawnBloodParticles(targetX, targetY, '#b45309');
                sfx.playHit();
                this.triggerCameraShake(5, 100);
                if (Math.random() < 0.4) this.dropGoldAt(targetX, targetY, 5 + this.level*2);
            }
            this.postTurnSystems();
            return true;
        }
        if (tile === 6) {
            if (this.player.keys > 0) {
                this.player.keys--;
                this.map[targetY][targetX] = 1;
                sfx.playLoot();
                this.logMessage('Unlocked the vault door.', 'log-loot');
                this.bumpStat('vaultsOpened', 1);
                this.updateStatsUI();
                this.postTurnSystems();
                return true;
            } else {
                this.logMessage('The door is locked. You need a key.', 'log-system');
                return false;
            }
        }
        if (tile === 9) {
            const idx = this.secretWalls.findIndex(w => w.x === targetX && w.y === targetY);
            if (idx !== -1) this.secretWalls.splice(idx, 1);
            this.map[targetY][targetX] = 1;
            this.spawnShards(targetX, targetY, '#78716c');
            this.triggerCameraShake(6, 150);
            sfx.playHit();
            const item = this.generateProceduralItem('rare_plus');
            item.x = targetX; item.y = targetY; item.popZ = 0; item.popVz = 4.5;
            this.itemsOnGround.push(item);
            this.logMessage('The wall crumbles, revealing a hidden cache!', 'log-loot');
            this.postTurnSystems();
            return true;
        }
        if (tile === 10) {
            const verb = CLASS_WALL_VERBS[this.player.classType] || 'You force your way through the crumbling wall!';
            const cidx = this.classLockedWalls.findIndex(w => w.x === targetX && w.y === targetY);
            if (cidx !== -1) this.classLockedWalls.splice(cidx, 1);
            this.map[targetY][targetX] = 1;
            this.spawnShards(targetX, targetY, '#78716c');
            this.triggerCameraShake(6, 150);
            sfx.playHit();
            const item = this.generateProceduralItem('rare_plus');
            item.x = targetX; item.y = targetY; item.popZ = 0; item.popVz = 4.5;
            this.itemsOnGround.push(item);
            this.logMessage(verb, 'log-loot');
            this.postTurnSystems();
            return true;
        }

        let enemyIndex = this.enemies.findIndex(e => e.x === targetX && e.y === targetY && !e.dying);
        if (enemyIndex !== -1) {
            this.combatRound(enemyIndex);
            this.postTurnSystems();
            return true;
        }

        let shrineIndex = this.shrines.findIndex(s => s.x === targetX && s.y === targetY);
        if (shrineIndex !== -1) {
            const shrine = this.shrines[shrineIndex];
            if (shrine.type === 'merchant') {
                this.showTutorialTip('shrine_merchant', 'Merchant Camps sell potions and gear for the gold you collect. No enemies here — spend freely.');
                this.openShop();
            } else if (shrine.type === 'anvil') {
                this.showTutorialTip('shrine_anvil', 'The Anvil enchants equipment or fuses 3 matching items into a better one. Worth a visit every camp.');
                this.openAnvil();
            } else if (shrine.type === 'blood') {
                this.player.hp = Math.max(1, Math.floor(this.player.hp * 0.7));
                this.player.baseAtk += 2;
                this.logMessage('Sacrificed health for power at Blood Altar.', 'log-system');
                this.shrines.splice(shrineIndex, 1);
            } else if (shrine.type === 'purify') {
                const cost = 15 + this.level * 3;
                if (this.player.gold >= cost) {
                    this.player.gold -= cost;
                    this.player.hp = this.player.maxHp; this.player.mp = this.player.maxMp; this.player.statuses = [];
                    this.logMessage(`Purified for ${cost} gold! Health and Mana restored.`, 'log-level');
                    this.shrines.splice(shrineIndex, 1);
                } else {
                    this.logMessage(`Not enough gold to purify (needs ${cost}).`, 'log-system');
                }
            } else if (shrine.type === 'haste') {
                this.player.hasteTurns = 50;
                sfx.playMagic();
                this.logMessage('Haste! You move with unnatural speed for 50 turns... but you feel exposed.', 'log-level');
                this.shrines.splice(shrineIndex, 1);
            } else if (shrine.type === 'gamble') {
                const cost = 30 + this.level * 5;
                if (this.player.gold < cost) {
                    this.logMessage(`The Gambling Shrine demands ${cost} gold for a roll.`, 'log-system');
                } else {
                    this.player.gold -= cost;
                    const roll = Math.random();
                    if (roll < 0.40) {
                        this.logMessage('The dice betray you. The shrine consumes your offering.', 'log-combat-enemy');
                    } else if (roll < 0.70) {
                        const win = cost * 2;
                        this.dropGoldAt(targetX, targetY, win);
                        this.spawnGoldSparkles(targetX, targetY);
                        this.logMessage(`The shrine spits out ${win} gold!`, 'log-loot');
                    } else if (roll < 0.90) {
                        this.dropLootAt(targetX, targetY);
                        this.logMessage('The shrine dispenses a mystery prize!', 'log-loot');
                    } else {
                        const it = this.generateProceduralItem('rare_plus');
                        it.x = targetX; it.y = targetY; it.popZ = 0; it.popVz = 4;
                        this.itemsOnGround.push(it);
                        this.dropRelicAt(targetX, targetY);
                        this.spawnGoldSparkles(targetX, targetY);
                        this.logMessage('JACKPOT! Treasure pours forth!', 'log-loot');
                        this.bumpStat('gambleJackpots', 1);
                    }
                    sfx.playLoot();
                    this.shrines.splice(shrineIndex, 1);
                    this.updateStatsUI();
                }
            } else if (shrine.type === 'well') {
                const cost = 25;
                if (this.player.gold < cost) {
                    this.logMessage('Toss in 25 gold to make a wish at the well.', 'log-system');
                } else {
                    this.player.gold -= cost;
                    const roll = Math.random();
                    if (roll < 0.10) {
                        this.dropRelicAt(targetX, targetY);
                        this.logMessage('The well glows — your wish is granted!', 'log-loot');
                    } else if (roll < 0.30) {
                        const p = Math.random() < 0.5 ? 'hp' : 'mp';
                        this.player.potions[p]++;
                        this.logMessage(`A ${p === 'hp' ? 'Health' : 'Mana'} Potion floats to the surface.`, 'log-loot');
                    } else if (roll < 0.45) {
                        this.dropGoldAt(targetX, targetY, cost * 3);
                        this.logMessage('Coins bubble back up — threefold!', 'log-loot');
                    } else {
                        const xp = 8 + this.level * 2;
                        this.player.xp += xp;
                        this.logMessage(`The well hums softly. (+${xp} XP)`, 'log-system');
                        this.checkLevelUp();
                    }
                    sfx.playLoot();
                    this.shrines.splice(shrineIndex, 1);
                    this.updateStatsUI();
                }
            } else if (shrine.type === 'curse') {
                const loss = Math.ceil(this.player.maxHp * 0.2);
                this.player.maxHp = Math.max(10, this.player.maxHp - loss);
                if (this.player.hp > this.player.maxHp) this.player.hp = this.player.maxHp;
                const item = this.generateProceduralItem('legendary');
                item.x = targetX; item.y = targetY; item.popZ = 0; item.popVz = 4.5;
                this.itemsOnGround.push(item);
                this.dropRelicAt(targetX, targetY);
                sfx.playHurt(); this.triggerCameraShake(10, 200);
                this.logMessage(`The curse altar takes ${loss} max HP in exchange for forbidden power!`, 'log-loot');
                this.shrines.splice(shrineIndex, 1);
                this.updateStatsUI();
            } else if (shrine.type === 'forge') {
                this.offerForgeSwap(shrineIndex, targetX, targetY);
            }
            return false;
        }

        let chestIndex = this.chests.findIndex(c => c.x === targetX && c.y === targetY && !c.opened);
        if (chestIndex !== -1) {
            this.showTutorialTip('chest', 'Chests drop gear or gold. A rare few bite back — mimics look identical until opened.');
            this.openChest(chestIndex);
            this.postTurnSystems();
            return true;
        }

        let captiveIndex = this.captives.findIndex(c => c.x === targetX && c.y === targetY && !c.rescued);
        if (captiveIndex !== -1) {
            const captive = this.captives[captiveIndex];
            captive.rescued = true;
            this.dropGoldAt(targetX, targetY, 30 + this.level * 8);
            this.addItemToInventory(this.generateProceduralItem('rare_plus'));
            sfx.playLevelUp();
            this.spawnGoldSparkles(targetX, targetY);
            this.logMessage('Rescued a captive! They reward you with gold and a relic.', 'log-loot');
            this.recruitRescuedAlly(targetX, targetY);
            this.postTurnSystems();
            return true;
        }

        let lootIndex = this.itemsOnGround.findIndex(i => i.x === targetX && i.y === targetY);
        if (lootIndex !== -1) {
            this.pickupItem(lootIndex);
        }

        if (targetX === this.stairs.x && targetY === this.stairs.y) {
            if (this.isBossArena && this.enemies.length > 0) {
                this.logMessage('The way is sealed while the guardian still lives!', 'log-system');
                return false;
            }
            sfx.playVictory();
            if (this.bossRushMode) {
                this.startLevelTransition(() => this.advanceBossRush());
            } else if (this.trialMode) {
                this.startLevelTransition(() => this.finishTrial());
            } else {
                this.resolveBounty();
                const nextLevel = this.level + 1;
                const offerChoice = !this.dailyMode && nextLevel % 3 === 0 && nextLevel % GUARDIAN_INTERVAL !== 0 && nextLevel % 4 !== 0;
                if (offerChoice) {
                    this.ui.openModal('route', { nextLevel });
                } else {
                    this.startLevelTransition(() => {
                        this.level++;
                        this.generateLevel();
                    });
                }
            }
            return true;
        }

        if (this.hasStatus(this.player, 'chill') && Math.random() < 0.4) {
            this.logMessage('Chilled! You struggle to move through the frost.', 'log-system');
            this.postTurnSystems();
            return true;
        }

        this.spawnFootstepDust(this.player.x, this.player.y);
        this.player.x = targetX;
        this.player.y = targetY;
        sfx.playStep();

        const steppedTile = this.map[targetY][targetX];
        if (steppedTile === 5) {
            const trap = this.trapStates[`${targetX},${targetY}`];
            if (!trap || trap.active) {
                if (this.relics.includes('frost_walker')) {
                    this.logMessage('Your charm turns the spikes aside.', 'log-system');
                } else {
                    this.lastAttacker = 'a spike trap';
                    const dmg = this.damagePlayer(5);
                    this.triggerHitFlash(this.player); this.resetGhostDelay(this.player);
                    this.logMessage('Stepped on spikes!', 'log-combat-enemy');
                    sfx.playHurt();
                    this.spawnDamageNumber(targetX, targetY, `-${dmg}`, '#fb7185');
                }
            }
        } else if (steppedTile === 7) {
            let base = 8 + Math.floor(this.level * 0.5);
            if (this.relics.includes('frost_walker')) base = Math.ceil(base / 2);
            this.lastAttacker = 'a lava pool';
            const dmg = this.damagePlayer(base);
            this.triggerHitFlash(this.player); this.resetGhostDelay(this.player);
            this.logMessage('The lava scorches you!', 'log-combat-enemy');
            sfx.playHurt();
            this.spawnDamageNumber(targetX, targetY, `-${dmg}`, '#f97316');
        } else if (steppedTile === 8) {
            if (this.relics.includes('frost_walker')) {
                this.logMessage('The webs cannot grip your frost-touched boots.', 'log-system');
            } else {
                if (!this.hasStatus(this.player, 'chill')) this.logMessage('Sticky webs cling to you, chilling your movement!', 'log-system');
                this.applyStatus(this.player, 'chill', 3);
            }
        } else if (steppedTile === 12) {
            const link = this.switchLinks && this.switchLinks[`${targetX},${targetY}`];
            if (link && this.map[link.y] && this.map[link.y][link.x] === 6) {
                this.map[link.y][link.x] = 1;
                sfx.playLoot();
                this.triggerCameraShake(5, 150);
                this.logMessage('A switch clicks — the opposite vault unseals!', 'log-loot');
            }
        } else if (steppedTile === 15) {
            this.rideCurrent();
        } else if (steppedTile === 13 || steppedTile === 14) {
            const link = this.shaftLinks && this.shaftLinks[`${targetX},${targetY}`];
            if (link) {
                this.player.x = link.x; this.player.y = link.y;
                this.player.visualX = link.x; this.player.visualY = link.y;
                sfx.playStep();
                this.logMessage(steppedTile === 13 ? 'You climb down into the dark below.' : 'You climb back up to the main floor.', 'log-system');
                this.camX = null; this.camY = null;
                this.updateFOV();
            }
        }

        const ambush = this.ambushTriggers.find(t => !t.spawned && t.x === targetX && t.y === targetY);
        if (ambush) this.spawnAmbush(ambush);

        const horde = this.hordeTriggers.find(t => !t.spawned && t.x === targetX && t.y === targetY);
        if (horde) this.startHorde(horde);

        this.postTurnSystems();
        return true;
    },

    // [new] 
    postTurnSystems() {
        if (this.player.skillCooldown > 0) this.player.skillCooldown--;
        if (this.player.skillCooldown2 > 0) this.player.skillCooldown2--;
        if (this.player.ultimateCooldown > 0) this.player.ultimateCooldown--;
        if (this.player.battleCryTurns > 0) this.player.battleCryTurns--;

        if (this.activeBounty) {
            if (this.activeBounty.id === 'speed') {
                this.activeBounty.turns++;
                if (this.activeBounty.turns > 40) this.activeBounty.failed = true;
            }
            this.updateBountyBadge();
        }

        Object.keys(this.trapStates).forEach(key => {
            const t = this.trapStates[key];
            t.timer--;
            if (t.timer <= 0) { t.active = !t.active; t.timer = 2 + Math.floor(Math.random() * 3); }
        });

        this.processStatuses(this.player);
        if (this.player.hp <= 0) { this.updateStatsUI(); this.handleGameOver(); return; }

        for (let i = this.telegraphs.length - 1; i >= 0; i--) {
            const t = this.telegraphs[i];
            t.turnsLeft--;
            if (t.turnsLeft <= 0) {
                const hitPlayer = t.thin ? (this.player.x === t.x && this.player.y === t.y) : (Math.abs(this.player.x - t.x) <= 1 && Math.abs(this.player.y - t.y) <= 1);
                if (hitPlayer) {
                    this.lastAttacker = t.source || 'a telegraphed blast';
                    const dmg = this.damagePlayer(t.dmg);
                    this.triggerHitFlash(this.player); this.resetGhostDelay(this.player);
                    this.logMessage(`Struck by a telegraphed attack for ${dmg}!`, 'log-combat-enemy');
                    sfx.playHurt();
                    this.triggerCameraShake(8, 200);
                    this.spawnDamageNumber(this.player.x, this.player.y, `-${dmg}`, '#fb7185');
                }
                this.spawnBloodParticles(t.x, t.y, '#9333ea');
                if (this.isBossArena && !t.thin) {
                    const biome = this.textures.currentBiome;
                    if (biome === 'forges') this.placeLavaPatch(t.x, t.y);
                    else if (biome === 'void') this.placeWebPatch(t.x, t.y);
                    else if (this.map[t.y] && this.map[t.y][t.x] === 1) this.placeSpike(t.x, t.y);
                }
                this.telegraphs.splice(i, 1);
            }
        }

        let skipEnemyTurn = false;
        if (this.player.hasteTurns > 0) {
            this.player.hasteTurns--;
            if (Math.random() < 0.5) skipEnemyTurn = true;
        }

        if (!skipEnemyTurn) this.processEnemyAI();
        this.updateAllies();
        this.updateUnstableFloor();
        this.updateFOV();
        this.updateStatsUI();
        this.drawMinimap();

        const musicCombat = this.enemies.some(e => !e.dying && e.aware && Math.hypot(e.x - this.player.x, e.y - this.player.y) <= 10);
        music.setTarget(musicCombat ? 1 : 0);

        if (this.player.hp <= 0) this.handleGameOver();
        this.saveAutosave();
    },

    // [old] 
    usePotion(type) {
        if (!this.player || this.player.hp <= 0 || this.transition || this.paused || this.isMenuOverlayOpen()) return;
        if (this.activeMutators && this.activeMutators.includes('iron_will')) {
            this.logMessage('Iron Will forbids potions.', 'log-system');
            return;
        }
        const heal = 50 + (this.relics.includes('alchemist_stone') ? 25 : 0);
        if (type === 'hp') {
            if (this.player.potions.hp > 0) {
                if (this.player.hp >= this.player.maxHp) {
                    this.logMessage(`Already at full health!`, 'log-system');
                    return;
                }
                this.player.potions.hp--;
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
                sfx.playLoot();
                this.spawnDamageNumber(this.player.x, this.player.y, `+${heal}`, '#34d399');
                this.logMessage(`Drank a Health Potion. Restored ${heal} HP.`, 'log-combat-player');
                this.failPotionBounty();
                this.updateStatsUI();
            } else {
                this.logMessage(`No Health Potions remaining!`, 'log-combat-enemy');
            }
        } else if (type === 'mp') {
            if (this.player.potions.mp > 0) {
                if (this.player.mp >= this.player.maxMp) {
                    this.logMessage(`Already at full mana!`, 'log-system');
                    return;
                }
                this.player.potions.mp--;
                this.player.mp = Math.min(this.player.maxMp, this.player.mp + heal);
                sfx.playMagic();
                this.spawnDamageNumber(this.player.x, this.player.y, `+${heal} MP`, '#3b82f6');
                this.logMessage(`Drank a Mana Potion. Restored ${heal} MP.`, 'log-combat-player');
                this.failPotionBounty();
                this.updateStatsUI();
            } else {
                this.logMessage(`No Mana Potions remaining!`, 'log-combat-enemy');
            }
        }
    },

    // [old] 
    failPotionBounty() {
        if (this.activeBounty && this.activeBounty.id === 'no_potion' && !this.activeBounty.failed) {
            this.activeBounty.failed = true;
            this.updateBountyBadge();
        }
    },
};
