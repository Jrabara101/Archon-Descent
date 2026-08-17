// ============================================================================
// --- TURN RESOLUTION, ENEMY AI, LOOT & COMBAT ROUNDS ---
// ============================================================================

function attachTurnMethods(proto) {
    proto.usePotion = function(type) {
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
    };

    proto.failPotionBounty = function() {
        if (this.activeBounty && this.activeBounty.id === 'no_potion' && !this.activeBounty.failed) {
            this.activeBounty.failed = true;
            this.updateBountyBadge();
        }
    };

    proto.processAction = function(targetX, targetY) {
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
                const offerChoice = !this.dailyMode && nextLevel % 3 === 0 && nextLevel % 10 !== 0 && nextLevel % 4 !== 0;
                if (offerChoice) {
                    document.getElementById('route-choice-overlay').classList.remove('hidden');
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
    };

    proto.postTurnSystems = function() {
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
    };

    proto.processEnemyAI = function() {
        this.enemies.forEach(enemy => {
            if (enemy.dying) return;
            this.processStatuses(enemy);
            if (enemy.hp <= 0) return;
            if (this.hasStatus(enemy, 'stun')) return;

            const dist = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
            const inFOV = this.fog[enemy.y] && this.fog[enemy.y][enemy.x] === 2;

            if (inFOV && dist <= 8) enemy.aware = true;
            if (enemy.aware) this.runEnemyAction(enemy, dist);
        });
        this.checkEnemyDeaths();
    };

    proto.runEnemyAction = function(enemy, dist) {
        if (enemy.ai === 'telegraph') {
            if (enemy.isBoss && enemy.phase === 3 && dist <= 7 && Math.random() < 0.4) {
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const ring = Math.max(Math.abs(dx), Math.abs(dy));
                        if (ring !== 2) continue;
                        const tx = this.player.x + dx, ty = this.player.y + dy;
                        if (tx < 0 || tx >= this.mapWidth || ty < 0 || ty >= this.mapHeight) continue;
                        if (this.map[ty][tx] === 0 || this.map[ty][tx] === 4) continue;
                        this.telegraphs.push({x: tx, y: ty, turnsLeft: 1, dmg: enemy.atk * 1.3, spawnTime: Date.now(), thin: true});
                    }
                }
                this.logMessage(`${enemy.name} calls down a ring of devastation!`, 'log-combat-enemy');
                return;
            }
            if (enemy.isBoss && enemy.phase === 2 && dist <= 6 && Math.random() < 0.35) {
                const dx = Math.sign(this.player.x - enemy.x), dy = Math.sign(this.player.y - enemy.y);
                for (let step = 1; step <= 3; step++) {
                    const tx = enemy.x + dx * step, ty = enemy.y + dy * step;
                    if (tx < 0 || tx >= this.mapWidth || ty < 0 || ty >= this.mapHeight || this.map[ty][tx] === 0 || this.map[ty][tx] === 4) break;
                    this.telegraphs.push({x: tx, y: ty, turnsLeft: 1, dmg: enemy.atk * 1.5, spawnTime: Date.now(), thin: true});
                }
                this.logMessage(`${enemy.name} charges forward!`, 'log-combat-enemy');
                return;
            }
            if (dist <= 4 && Math.random() < (enemy.phase >= 2 ? 0.4 : 0.3)) {
                this.telegraphs.push({x: this.player.x, y: this.player.y, turnsLeft: 1, dmg: enemy.atk * 2, spawnTime: Date.now()});
                this.logMessage(`${enemy.name} begins a massive attack!`, 'log-combat-enemy');
                return;
            }
        }

        if (enemy.ai === 'ranged') {
            if (dist < 2.5) {
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
            if (dist === Math.floor(dist) || dist < 4) {
                this.particles.push({ x: enemy.visualX * this.tileSize, y: enemy.visualY * this.tileSize, tx: this.player.visualX * this.tileSize, ty: this.player.visualY * this.tileSize, life: 1, decay: 0.1, type: 'projectile', color: '#d1d5db', trailTimer: 0, cb: () => {
                    this.lastAttacker = enemy.name;
                    const dmg = this.damagePlayer(Math.max(1, enemy.atk - this.getPlayerDefense()));
                    this.triggerHitFlash(this.player); this.triggerKnockback(this.player, enemy.x, enemy.y); this.resetGhostDelay(this.player);
                    this.spawnBloodParticles(this.player.x, this.player.y, '#fb7185');
                    this.spawnSparks(this.player.x, this.player.y);
                    this.spawnDamageNumber(this.player.x, this.player.y, `-${dmg}`, '#fb7185');
                    this.logMessage(`${enemy.name} shoots you for ${dmg}!`, 'log-combat-enemy');
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
            let sx = enemy.x + (Math.random() < 0.5 ? 1 : -1);
            let sy = enemy.y + (Math.random() < 0.5 ? 1 : -1);
            if (this.map[sy] && this.map[sy][sx] === 1 && !this.enemies.some(e=>e.x===sx && e.y===sy)) {
                this.enemies.push({ x: sx, y: sy, visualX: sx, visualY: sy, name: 'Void Spawn', hp: 10, maxHp: 10, atk: 5, def: 0, xpReward: 5, icon: '👾', color: '#a855f7', codexKey: 'void_spawn', ai: 'melee', statuses: [], aware: true, elite: false, affixes: [], hitFlash: 0, knockX: 0, knockY: 0, ghostHp: 10, ghostDelay: 0, dying: false, deathTimer: 0 });
                this.logMessage(`${enemy.name} summons a minion!`, 'log-system');
                return;
            }
        }

        if (enemy.ai === 'trapper' && dist > 2 && dist <= 6 && Math.random() < 0.35) {
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
                if (this.talents.includes('shield_wall')) {
                    const missingHpPct = 1 - (this.player.hp / this.player.maxHp);
                    thornsPct += 0.25 * missingHpPct;
                }
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
            if (enemy.affixes && enemy.affixes.includes('vampiric')) {
                const heal = Math.floor(dmg * 0.3);
                enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
                this.spawnDamageNumber(enemy.x, enemy.y, `+${heal}`, '#34d399');
            }
        } else {
            if (this.hasStatus(enemy, 'chill') && Math.random() < 0.4) return;
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
    };

    proto.checkPlayerTrapTrigger = function(enemy) {
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
    };

    proto.combatRound = function(enemyIndex) {
        const enemy = this.enemies[enemyIndex];
        enemy.aware = true;
        let isCrit = Math.random() < (0.10 + (this.relics.includes('crit_eye') ? 0.15 : 0) + (this.talents.includes('dagger_master') ? 0.15 : 0));
        let atkPower = this.getPlayerAttack();
        if (isCrit) atkPower = Math.floor(atkPower * (1.75 + (this.talents.includes('executioner') ? 0.5 : 0)));

        const dealtDmg = this.applyDamageToEnemy(enemy, atkPower);
        enemy.hp -= dealtDmg;
        this.triggerHitFlash(enemy); this.triggerKnockback(enemy, this.player.x, this.player.y); this.resetGhostDelay(enemy);
        this.spawnAttackSwipe(this.player.x, this.player.y, enemy.x, enemy.y);
        sfx.playHit();
        this.spawnDamageNumber(enemy.x, enemy.y, `${isCrit ? 'CRIT! ' : ''}-${dealtDmg}`, isCrit ? '#facc15' : '#fb7185');
        this.logMessage(`You hit ${enemy.name} for ${dealtDmg} damage!`, 'log-combat-player');

        if (this.talents.includes('vampiric') || (this.equipped.weapon && this.equipped.weapon.uniqueEffect === 'lifesteal')) {
            const heal = Math.max(1, Math.floor(dealtDmg * 0.15));
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
            this.spawnDamageNumber(this.player.x, this.player.y, `+${heal}`, '#34d399');
        }

        if (enemy.hp <= 0) {
            this.hitStopTimer = 70;
            this.triggerCameraShake(10, 150);
            this.checkEnemyDeaths();
            return;
        }

        if (enemy.isBoss) {
            const hpPct = enemy.hp / enemy.maxHp;
            const newPhase = hpPct < 0.33 ? 3 : (hpPct < 0.66 ? 2 : 1);
            if (newPhase > enemy.phase) {
                enemy.phase = newPhase;
                this.logMessage(`${enemy.name} enters Phase ${newPhase}!`, 'log-combat-enemy');
                this.triggerCameraShake(14, 250);
                this.spawnLevelUpParticles();
            }
        }
    };

    proto.damagePlayer = function(amount) {
        let finalDmg = amount;
        if (this.activeMutators && this.activeMutators.includes('glass_cannon')) finalDmg = Math.floor(finalDmg * 1.5);
        if (this.player.battleCryTurns > 0) finalDmg = Math.max(1, Math.floor(finalDmg * 0.7));
        this.player.hp -= finalDmg;
        return finalDmg;
    };

    proto.applyDamageToEnemy = function(enemy, rawDmg) {
        let d = Math.max(1, rawDmg - (enemy.def || 0));
        if (this.player.forgeDamageBonus) d = Math.floor(d * (1 + this.player.forgeDamageBonus));
        return d;
    };

    proto.checkEnemyDeaths = function() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e.hp <= 0 && !e.dying) {
                e.dying = true;
                e.deathTimer = 300;
                this.recordKill(e);
                this.player.xp += e.xpReward;
                this.spawnDeathBurst(e);
                this.dropLootAt(e.x, e.y);
                this.logMessage(`Defeated ${e.name}! (+${e.xpReward} XP)`, 'log-level');
                if (e.isBoss) this.recordBossKill(e);
                this.checkLevelUp();
            }
        }
    };

    proto.explodeBarrel = function(x, y) {
        sfx.playHit();
        this.triggerCameraShake(12, 250);
        this.spawnBloodParticles(x, y, '#ea580c');
        this.spawnSparks(x, y);
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const tx = x + dx, ty = y + dy;
                if (tx < 0 || tx >= this.mapWidth || ty < 0 || ty >= this.mapHeight) continue;
                if (tx === this.player.x && ty === this.player.y) {
                    const dmg = this.damagePlayer(15);
                    this.triggerHitFlash(this.player); this.resetGhostDelay(this.player);
                    this.spawnDamageNumber(tx, ty, `-${dmg}`, '#ea580c');
                    this.logMessage('Caught in the barrel blast!', 'log-combat-enemy');
                }
                const hitEnemy = this.enemies.find(e => !e.dying && e.x === tx && e.y === ty);
                if (hitEnemy) {
                    const dmg = this.applyDamageToEnemy(hitEnemy, 25);
                    hitEnemy.hp -= dmg;
                    this.triggerHitFlash(hitEnemy); this.resetGhostDelay(hitEnemy);
                    this.spawnDamageNumber(tx, ty, `-${dmg}`, '#ea580c');
                }
            }
        }
        this.checkEnemyDeaths();
    };

    proto.dropLootAt = function(x, y) {
        const roll = Math.random();
        if (roll < 0.35) {
            this.dropGoldAt(x, y, 10 + this.level * 3);
        } else if (roll < 0.60) {
            const item = this.generateProceduralItem();
            item.x = x; item.y = y; item.popZ = 0; item.popVz = 4;
            this.itemsOnGround.push(item);
        } else if (roll < 0.70) {
            this.dropRelicAt(x, y);
        }
    };

    proto.dropGoldAt = function(x, y, amount) {
        this.itemsOnGround.push({ isGold: true, amount, name: `${amount} Gold`, icon: '🪙', x, y, popZ: 0, popVz: 4 });
    };

    proto.dropRelicAt = function(x, y) {
        const pool = RELIC_POOL.filter(r => !this.relics.includes(r.id));
        if (pool.length === 0) { this.dropGoldAt(x, y, 50); return; }
        const r = pool[Math.floor(Math.random() * pool.length)];
        this.itemsOnGround.push({ isRelic: true, relicId: r.id, name: r.name, icon: r.icon, x, y, popZ: 0, popVz: 4 });
    };

    proto.grantRelic = function(relicId) {
        if (this.relics.includes(relicId)) return;
        this.relics.push(relicId);
        const r = RELIC_POOL.find(item => item.id === relicId);
        this.logMessage(`Acquired Relic: ${r ? r.name : relicId}`, 'log-loot');
        sfx.playLevelUp();
        this.updateStatsUI();
        this.checkAchievements();
    };
}
