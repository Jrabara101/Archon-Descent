// ============================================================================
// --- ARCHON'S DESCENT: MAIN ENGINE & HIGH-PERFORMANCE RENDER LOOP ---
// ============================================================================

class DungeonEngine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.lightingCanvas = document.createElement('canvas');
        this.lightingCtx = this.lightingCanvas.getContext('2d');

        this.tileSize = 32;
        this.mapWidth = 50;
        this.mapHeight = 50;

        this.textures = new TextureCache(this.tileSize);
        this.playerSprites = new PlayerSpriteCache(this.tileSize);
        this.glows = new GlowHaloCache();
        this.lightStamps = new LightStampCache();

        this.meta = this.loadMeta();
        this.settings = {
            sfxVolume: 1, musicVolume: 0.4, screenShake: true,
            highContrastText: false, colorblindMode: 'none',
            showTutorialTips: true, storyMode: true
        };

        this.bossRushOrder = ['catacombs', 'forges', 'void'];
        this.bossRushIndex = 0;
        this.ascensionTier = 0;

        this.stagedMutators = [];
        this.activeMutators = [];

        this.transition = null;
        this.levelUpAnim = null;
        this.hitStopTimer = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.lastTime = 0;
        this.paused = false;
        this.loopStarted = false;

        this.initDOM();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.bindEvents();
        this.updateHubUI();
        if (this.hasAutosave && this.hasAutosave()) {
            const rBtn = document.getElementById('resume-run-btn');
            if (rBtn) rBtn.classList.remove('hidden');
        }
        this.checkChangelog();
    }

    initDOM() {
        this.hpBar = document.getElementById('hp-bar');
        this.hpText = document.getElementById('hp-text');
        this.mpBar = document.getElementById('mp-bar');
        this.mpText = document.getElementById('mp-text');
        this.xpBar = document.getElementById('xp-bar');
        this.xpText = document.getElementById('xp-text');
        this.charLvl = document.getElementById('char-lvl');
        this.charAtk = document.getElementById('char-atk');
        this.charDef = document.getElementById('char-def');
        this.goldDisplay = document.getElementById('gold-display');
        this.combatLog = document.getElementById('combat-log');
        this.dungeonLevel = document.getElementById('dungeon-level');
        this.charClassTitle = document.getElementById('char-class-title');
        this.runTimerEl = document.getElementById('run-timer');
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
    }

    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = '100vw';
        this.canvas.style.height = '100vh';

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
        this.ctx.imageSmoothingEnabled = false;

        this.lightingCanvas.width = window.innerWidth;
        this.lightingCanvas.height = window.innerHeight;
        this.lightingCtx.imageSmoothingEnabled = false;

        this.viewportW = window.innerWidth;
        this.viewportH = window.innerHeight;
    }

    triggerCameraShake(intensity, durationMs) {
        if (!this.settings.screenShake) return;
        this.shakeIntensity = intensity;
        this.shakeTimer = durationMs;
    }

    triggerHitFlash(entity) {
        entity.hitFlash = 120;
    }

    triggerKnockback(entity, fromX, fromY) {
        const dx = Math.sign(entity.x - fromX);
        const dy = Math.sign(entity.y - fromY);
        entity.knockX = dx * 8;
        entity.knockY = dy * 8;
    }

    resetGhostDelay(entity) {
        entity.ghostDelay = 300;
    }

    spawnDamageNumber(x, y, text, color) {
        this.particles.push({
            x: (x + 0.5) * this.tileSize,
            y: (y + 0.2) * this.tileSize,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -1.4,
            life: 1.0,
            decay: 0.022,
            type: 'number',
            text,
            color
        });
    }

    spawnBloodParticles(x, y, color = '#fb7185') {
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 2 + 1;
            this.particles.push({
                x: (x + 0.5) * this.tileSize,
                y: (y + 0.5) * this.tileSize,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 1.0,
                decay: 0.04 + Math.random() * 0.03,
                type: 'pixel',
                color,
                size: Math.random() * 3 + 2
            });
        }
    }

    spawnSparks(x, y) {
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 3 + 1;
            this.particles.push({
                x: (x + 0.5) * this.tileSize,
                y: (y + 0.5) * this.tileSize,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 1.0,
                decay: 0.05,
                type: 'pixel',
                color: '#facc15',
                size: 2
            });
        }
    }

    spawnShards(x, y, color = '#78716c') {
        for (let i = 0; i < 7; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 2 + 0.5;
            this.particles.push({
                x: (x + 0.5) * this.tileSize,
                y: (y + 0.5) * this.tileSize,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 1.0,
                decay: 0.04,
                type: 'pixel',
                color,
                size: 3
            });
        }
    }

    spawnFootstepDust(x, y) {
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: (x + 0.5) * this.tileSize + (Math.random() - 0.5) * 8,
                y: (y + 0.7) * this.tileSize + (Math.random() - 0.5) * 6,
                vx: (Math.random() - 0.5) * 0.4,
                vy: -Math.random() * 0.4,
                life: 0.8,
                decay: 0.05,
                type: 'pixel',
                color: 'rgba(255,255,255,0.2)',
                size: 2
            });
        }
    }

    spawnLevelUpParticles() {
        for (let i = 0; i < 24; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 3 + 1.5;
            this.particles.push({
                x: (this.player.x + 0.5) * this.tileSize,
                y: (this.player.y + 0.5) * this.tileSize,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 1.0,
                decay: 0.03,
                type: 'pixel',
                color: Math.random() < 0.5 ? '#facc15' : '#38bdf8',
                size: 3
            });
        }
    }

    spawnGoldSparkles(x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 2 + 1;
            this.particles.push({
                x: (x + 0.5) * this.tileSize,
                y: (y + 0.5) * this.tileSize,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 1.0,
                decay: 0.035,
                type: 'pixel',
                color: '#facc15',
                size: 3
            });
        }
    }

    spawnAttackSwipe(fromX, fromY, toX, toY) {
        this.particles.push({
            x: ((fromX + toX) / 2 + 0.5) * this.tileSize,
            y: ((fromY + toY) / 2 + 0.5) * this.tileSize,
            life: 1.0,
            decay: 0.12,
            type: 'swipe',
            angle: Math.atan2(toY - fromY, toX - fromX)
        });
    }

    spawnCastWindup(entity) {
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const r = 24;
            this.particles.push({
                x: (entity.x + 0.5) * this.tileSize + Math.cos(angle) * r,
                y: (entity.y + 0.5) * this.tileSize + Math.sin(angle) * r,
                vx: -Math.cos(angle) * 1.5,
                vy: -Math.sin(angle) * 1.5,
                life: 1.0,
                decay: 0.08,
                type: 'pixel',
                color: '#818cf8',
                size: 2
            });
        }
    }

    spawnDeathBurst(entity) {
        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = Math.random() * 3 + 1;
            this.particles.push({
                x: (entity.x + 0.5) * this.tileSize,
                y: (entity.y + 0.5) * this.tileSize,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                life: 1.0,
                decay: 0.03,
                type: 'pixel',
                color: entity.color || '#fb7185',
                size: 3
            });
        }
    }

    startLevelTransition(cb) {
        this.transition = { alpha: 0, phase: 'in', cb };
    }

    gameLoop(now = 0) {
        const dt = Math.min(100, now - (this.lastTime || now));
        this.lastTime = now;

        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= dt;
        } else {
            this.update(dt);
        }

        this.render();
        requestAnimationFrame(t => this.gameLoop(t));
    }

    update(dt) {
        music.update(dt);

        if (this.runStats && this.player && this.player.hp > 0 && !this.paused && !this.isMenuOverlayOpen()) {
            this.runStats.activeMs += dt;
            const secs = Math.floor(this.runStats.activeMs / 1000);
            if (secs !== this.lastTimerSecs) {
                this.lastTimerSecs = secs;
                const m = Math.floor(secs / 60);
                const s = secs % 60;
                if (this.runTimerEl) this.runTimerEl.innerText = `⏱ ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
        }

        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const p = this.shakeTimer > 0 ? this.shakeIntensity : 0;
            this.shakeX = (Math.random() - 0.5) * p * 2;
            this.shakeY = (Math.random() - 0.5) * p * 2;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }

        if (this.player) {
            this.updateEntityVisuals(this.player, dt);
            if (this.player.path && this.player.path.length > 0) {
                const next = this.player.path[0];
                if (this.processAction(next.x, next.y)) {
                    this.player.path.shift();
                } else {
                    this.player.path = [];
                }
            }
        }

        this.enemies.forEach(e => this.updateEntityVisuals(e, dt));
        this.allies.forEach(a => this.updateEntityVisuals(a, dt));

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e.dying) {
                e.deathTimer -= dt;
                if (e.deathTimer <= 0) this.enemies.splice(i, 1);
            }
        }

        this.itemsOnGround.forEach(it => {
            if (it.popVz !== undefined) {
                it.popZ += it.popVz;
                it.popVz -= 0.35;
                if (it.popZ <= 0) { it.popZ = 0; it.popVz = 0; }
            }
        });

        this.updateParticles(dt);

        if (this.transition) {
            if (this.transition.phase === 'in') {
                this.transition.alpha += dt / 220;
                if (this.transition.alpha >= 1) {
                    this.transition.alpha = 1;
                    this.transition.phase = 'out';
                    if (this.transition.cb) this.transition.cb();
                }
            } else {
                this.transition.alpha -= dt / 220;
                if (this.transition.alpha <= 0) {
                    this.transition = null;
                }
            }
        }
    }

    updateEntityVisuals(entity, dt) {
        const lerpSpeed = 0.22;
        entity.visualX = (entity.visualX === undefined ? entity.x : entity.visualX) + (entity.x - (entity.visualX === undefined ? entity.x : entity.visualX)) * lerpSpeed;
        entity.visualY = (entity.visualY === undefined ? entity.y : entity.visualY) + (entity.y - (entity.visualY === undefined ? entity.y : entity.visualY)) * lerpSpeed;

        if (entity.hitFlash > 0) entity.hitFlash -= dt;
        if (entity.knockX) entity.knockX *= 0.8;
        if (entity.knockY) entity.knockY *= 0.8;
        if (Math.abs(entity.knockX) < 0.1) entity.knockX = 0;
        if (Math.abs(entity.knockY) < 0.1) entity.knockY = 0;

        if (entity.ghostDelay > 0) {
            entity.ghostDelay -= dt;
        } else if (entity.ghostHp !== undefined && entity.hp !== undefined && entity.ghostHp > entity.hp) {
            entity.ghostHp -= dt * 0.05 * entity.maxHp;
            if (entity.ghostHp < entity.hp) entity.ghostHp = entity.hp;
        }
    }

    updateParticles(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= p.decay;
            if (p.life <= 0) {
                if (p.cb) p.cb();
                this.particles.splice(i, 1);
                continue;
            }
            if (p.type === 'projectile') {
                p.x += (p.tx - p.x) * 0.25;
                p.y += (p.ty - p.y) * 0.25;
                if (Math.hypot(p.tx - p.x, p.ty - p.y) < 6) {
                    if (p.cb) p.cb();
                    this.particles.splice(i, 1);
                }
            } else if (p.vx !== undefined) {
                p.x += p.vx;
                p.y += p.vy;
            }
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.viewportW, this.viewportH);
        if (!this.player || !this.map) return;

        const targetCamX = this.player.visualX * this.tileSize + this.tileSize / 2 - this.viewportW / 2;
        const targetCamY = this.player.visualY * this.tileSize + this.tileSize / 2 - this.viewportH / 2;
        if (this.camX === null || this.camY === null) {
            this.camX = targetCamX; this.camY = targetCamY;
        } else {
            this.camX += (targetCamX - this.camX) * 0.14;
            this.camY += (targetCamY - this.camY) * 0.14;
        }

        const ox = -Math.round(this.camX) + this.shakeX;
        const oy = -Math.round(this.camY) + this.shakeY;

        ctx.save();
        ctx.translate(ox, oy);

        this.renderMapTiles(ctx);
        this.renderGroundItems(ctx);
        this.renderTelegraphs(ctx);
        this.renderAllies(ctx);
        this.renderEnemies(ctx);
        this.renderPlayer(ctx);
        this.renderParticles(ctx);

        ctx.restore();

        this.renderLightingOverlay(ox, oy);
        this.renderAmbientMotes(ctx);

        if (this.transition) {
            ctx.fillStyle = `rgba(15, 23, 42, ${this.transition.alpha})`;
            ctx.fillRect(0, 0, this.viewportW, this.viewportH);
        }
    }

    renderMapTiles(ctx) {
        const minX = Math.max(0, Math.floor((this.camX - 64) / this.tileSize));
        const maxX = Math.min(this.mapWidth - 1, Math.ceil((this.camX + this.viewportW + 64) / this.tileSize));
        const minY = Math.max(0, Math.floor((this.camY - 64) / this.tileSize));
        const maxY = Math.min(this.mapHeight - 1, Math.ceil((this.camY + this.viewportH + 64) / this.tileSize));

        const ts = this.tileSize;
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const fogState = this.fog[y][x];
                if (fogState === 0) continue;

                const tile = this.map[y][x];
                const px = x * ts, py = y * ts;

                if (tile === 0 || tile === 9 || tile === 10) {
                    const variant = this.tileVariants[y][x] % 3;
                    ctx.drawImage(this.textures.wallCanvas, variant * ts, 0, ts, ts, px, py, ts, ts);
                } else {
                    const variant = this.tileVariants[y][x] % 4;
                    ctx.drawImage(this.textures.floorCanvas, variant * ts, 0, ts, ts, px, py, ts, ts);

                    if (tile === 3) {
                        ctx.font = '20px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('🚪', px + ts / 2, py + ts / 2);
                    } else if (tile === 4) {
                        const d = this.destructibles.find(item => item.x === x && item.y === y);
                        ctx.font = '20px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(d && d.type === 'barrel' ? '🛢️' : '📦', px + ts / 2, py + ts / 2);
                    } else if (tile === 5) {
                        const trap = this.trapStates[`${x},${y}`];
                        ctx.fillStyle = trap && trap.active ? '#ef4444' : '#64748b';
                        ctx.fillRect(px + 8, py + 8, ts - 16, ts - 16);
                    } else if (tile === 6) {
                        ctx.font = '20px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('🔒', px + ts / 2, py + ts / 2);
                    } else if (tile === 7) {
                        ctx.fillStyle = 'rgba(249, 115, 22, 0.45)';
                        ctx.fillRect(px, py, ts, ts);
                    } else if (tile === 8) {
                        ctx.fillStyle = 'rgba(168, 85, 247, 0.35)';
                        ctx.fillRect(px, py, ts, ts);
                    } else if (tile === 11) {
                        ctx.fillStyle = '#05070e';
                        ctx.fillRect(px, py, ts, ts);
                    } else if (tile === 12) {
                        ctx.fillStyle = '#f59e0b';
                        ctx.fillRect(px + 10, py + 10, ts - 20, ts - 20);
                    } else if (tile === 13 || tile === 14) {
                        ctx.font = '20px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText('🪜', px + ts / 2, py + ts / 2);
                    }
                }
            }
        }
    }

    renderGroundItems(ctx) {
        const ts = this.tileSize;
        this.chests.forEach(c => {
            if (this.fog[c.y] && this.fog[c.y][c.x] > 0 && !c.opened) {
                const px = c.x * ts, py = c.y * ts;
                ctx.font = '20px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🧰', px + ts / 2, py + ts / 2);
            }
        });

        this.shrines.forEach(s => {
            if (this.fog[s.y] && this.fog[s.y][s.x] > 0) {
                const px = s.x * ts, py = s.y * ts;
                ctx.font = '22px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(s.icon, px + ts / 2, py + ts / 2);
            }
        });

        this.captives.forEach(c => {
            if (this.fog[c.y] && this.fog[c.y][c.x] > 0 && !c.rescued) {
                const px = c.x * ts, py = c.y * ts;
                ctx.font = '20px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(c.icon, px + ts / 2, py + ts / 2);
            }
        });

        this.itemsOnGround.forEach(it => {
            if (this.fog[it.y] && this.fog[it.y][it.x] > 0) {
                const px = it.x * ts, py = it.y * ts - (it.popZ || 0);
                ctx.font = '18px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(it.icon, px + ts / 2, py + ts / 2);
            }
        });
    }

    renderTelegraphs(ctx) {
        const ts = this.tileSize;
        this.telegraphs.forEach(t => {
            const px = t.x * ts, py = t.y * ts;
            ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
            if (t.thin) {
                ctx.fillRect(px + 4, py + 4, ts - 8, ts - 8);
            } else {
                ctx.fillRect(px - ts, py - ts, ts * 3, ts * 3);
            }
        });
    }

    renderAllies(ctx) {
        const ts = this.tileSize;
        this.allies.forEach(a => {
            if (this.fog[a.y] && this.fog[a.y][a.x] > 0) {
                const px = a.visualX * ts, py = a.visualY * ts;
                ctx.font = '20px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(a.icon, px + ts / 2, py + ts / 2);
            }
        });
    }

    renderEnemies(ctx) {
        const ts = this.tileSize;
        this.enemies.forEach(e => {
            if (!this.fog[e.y] || this.fog[e.y][e.x] !== 2) return;
            const px = e.visualX * ts + (e.knockX || 0);
            const py = e.visualY * ts + (e.knockY || 0);

            if (e.dying) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, Math.min(1, e.deathTimer / 300));
            }

            if (e.elite || e.isBoss) {
                const glow = this.glows.getGlow(e.color || '#facc15', e.isBoss ? 40 : 28);
                ctx.drawImage(glow, px + ts / 2 - glow.width / 2, py + ts / 2 - glow.height / 2);
            }

            ctx.font = e.isBoss ? '28px sans-serif' : '22px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(e.icon, px + ts / 2, py + ts / 2);

            if (e.dying) ctx.restore();

            if (e.hp < e.maxHp && !e.dying) {
                const bw = ts;
                const bh = 4;
                const bx = px;
                const by = py - 6;
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(bx, by, bw, bh);

                if (e.ghostHp > e.hp) {
                    ctx.fillStyle = '#f87171';
                    ctx.fillRect(bx, by, Math.max(0, (e.ghostHp / e.maxHp) * bw), bh);
                }

                ctx.fillStyle = '#ef4444';
                ctx.fillRect(bx, by, Math.max(0, (e.hp / e.maxHp) * bw), bh);
            }
        });
    }

    renderPlayer(ctx) {
        const ts = this.tileSize;
        const px = this.player.visualX * ts + (this.player.knockX || 0);
        const py = this.player.visualY * ts + (this.player.knockY || 0);

        const color = PLAYER_COLORS[this.player.classType] || '#38bdf8';
        const sheet = this.playerSprites.getSheet(color);
        const frameIdx = (Math.floor(Date.now() / 250)) % 2;
        const frame = sheet[this.player.facing || 'down'][frameIdx];

        if (this.player.hitFlash > 0) {
            const flash = this.playerSprites.getFlashFrame(frame);
            ctx.drawImage(flash, px, py);
        } else {
            ctx.drawImage(frame, px, py);
        }
    }

    renderParticles(ctx) {
        this.particles.forEach(p => {
            if (p.type === 'number') {
                ctx.save();
                ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
                ctx.font = 'bold 13px Outfit, sans-serif';
                ctx.fillStyle = p.color;
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
                ctx.restore();
            } else if (p.type === 'pixel') {
                ctx.save();
                ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size || 2, p.size || 2);
                ctx.restore();
            } else if (p.type === 'swipe') {
                ctx.save();
                ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 14, p.angle - 0.7, p.angle + 0.7);
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    renderLightingOverlay(ox, oy) {
        const lctx = this.lightingCtx;
        const w = this.lightingCanvas.width;
        const h = this.lightingCanvas.height;
        lctx.clearRect(0, 0, w, h);

        const baseAmbient = this.darknessFloor ? 'rgba(5, 7, 14, 0.96)' : 'rgba(10, 15, 30, 0.88)';
        lctx.fillStyle = baseAmbient;
        lctx.fillRect(0, 0, w, h);

        lctx.globalCompositeOperation = 'destination-out';

        const ts = this.tileSize;
        const fovR = this.getFovRadius() * ts;
        const playerDisc = this.lightStamps.getLightDisc(fovR);
        const pScreenX = this.player.visualX * ts + ts / 2 + ox;
        const pScreenY = this.player.visualY * ts + ts / 2 + oy;
        lctx.drawImage(playerDisc, pScreenX - fovR, pScreenY - fovR);

        const torchDisc = this.lightStamps.getTorchDisc(100);
        this.torches.forEach(t => {
            if (this.fog[t.y] && this.fog[t.y][t.x] > 0) {
                const tx = t.x * ts + ts / 2 + ox;
                const ty = t.y * ts + ts / 2 + oy;
                lctx.drawImage(torchDisc, tx - 100, ty - 100);
            }
        });

        lctx.globalCompositeOperation = 'source-over';

        this.ctx.drawImage(this.lightingCanvas, 0, 0);
    }

    renderAmbientMotes(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ambientMotes.forEach(m => {
            m.x += m.vx;
            m.y += m.vy;
            if (m.x < 0) m.x = this.mapWidth * this.tileSize;
            if (m.x > this.mapWidth * this.tileSize) m.x = 0;
            if (m.y < 0) m.y = this.mapHeight * this.tileSize;
            if (m.y > this.mapHeight * this.tileSize) m.y = 0;
            const sx = m.x - this.camX;
            const sy = m.y - this.camY;
            if (sx >= 0 && sx <= this.viewportW && sy >= 0 && sy <= this.viewportH) {
                ctx.fillRect(sx, sy, m.size, m.size);
            }
        });
        ctx.restore();
    }

    drawMinimap() {
        if (!this.minimapCtx) return;
        const mctx = this.minimapCtx;
        mctx.fillStyle = '#0f172a';
        mctx.fillRect(0, 0, 120, 120);

        const cw = 120 / this.mapWidth;
        const ch = 120 / this.mapHeight;

        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const f = this.fog[y][x];
                if (f === 0) continue;
                if (this.map[y][x] === 0) {
                    mctx.fillStyle = f === 2 ? '#334155' : '#1e293b';
                } else {
                    mctx.fillStyle = f === 2 ? '#94a3b8' : '#475569';
                }
                mctx.fillRect(x * cw, y * ch, Math.ceil(cw), Math.ceil(ch));
            }
        }

        mctx.fillStyle = '#38bdf8';
        mctx.fillRect(this.player.x * cw - 1, this.player.y * ch - 1, 3, 3);

        if (this.fog[this.stairs.y] && this.fog[this.stairs.y][this.stairs.x] > 0) {
            mctx.fillStyle = '#facc15';
            mctx.fillRect(this.stairs.x * cw - 1, this.stairs.y * ch - 1, 3, 3);
        }
    }

    bindEvents() {
        window.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                if (this.player && this.player.hp > 0 && !document.getElementById('start-overlay').offsetParent) {
                    const pauseOverlay = document.getElementById('pause-overlay');
                    if (pauseOverlay) {
                        if (pauseOverlay.classList.contains('hidden')) {
                            this.openMenuScreen('pause-overlay');
                            const pauseInfo = document.getElementById('pause-run-info');
                            if (pauseInfo) pauseInfo.innerText = `Depth B${this.level} · Level ${this.player.lvl}`;
                        } else {
                            pauseOverlay.classList.add('hidden');
                        }
                    }
                    return;
                }
            }
            if (this.isMenuOverlayOpen() || this.paused) return;
            const key = e.key.toLowerCase();
            if (key === 'arrowup' || key === 'w') { e.preventDefault(); this.executeTurn(0, -1); }
            else if (key === 'arrowdown' || key === 's') { e.preventDefault(); this.executeTurn(0, 1); }
            else if (key === 'arrowleft' || key === 'a') { e.preventDefault(); this.executeTurn(-1, 0); }
            else if (key === 'arrowright' || key === 'd') { e.preventDefault(); this.executeTurn(1, 0); }
            else if (key === '1') { e.preventDefault(); this.useSkill(); }
            else if (key === '4') { e.preventDefault(); this.useSkill2(); }
            else if (key === '5') { e.preventDefault(); this.useUltimate(); }
            else if (key === '2' || key === 'q') { e.preventDefault(); this.usePotion('hp'); }
            else if (key === '3' || key === 'e') { e.preventDefault(); this.usePotion('mp'); }
            else if (key === ' ') { e.preventDefault(); this.executeTurn(0, 0); }
        });

        this.canvas.addEventListener('click', e => {
            if (this.isMenuOverlayOpen() || this.paused) return;
            const rect = this.canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            const worldX = Math.floor((clickX + this.camX) / this.tileSize);
            const worldY = Math.floor((clickY + this.camY) / this.tileSize);
            if (worldX >= 0 && worldX < this.mapWidth && worldY >= 0 && worldY < this.mapHeight) {
                const path = AStar.findPath(this.map, this.mapWidth, this.mapHeight, this.player, { x: worldX, y: worldY });
                if (path.length > 0) this.player.path = path;
            }
        });

        // Class selection buttons on start screen
        document.querySelectorAll('.class-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cls = btn.getAttribute('data-class') || 'warrior';
                this.startGame(cls);
            });
        });

        // Route choice buttons
        document.querySelectorAll('.route-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const route = btn.getAttribute('data-route') || 'vault';
                this.routeModifier = route;
                document.getElementById('route-choice-overlay').classList.add('hidden');
                this.startLevelTransition(() => {
                    this.level++;
                    this.generateLevel();
                });
            });
        });

        // Mobile D-pad buttons
        document.querySelectorAll('.dpad-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const dx = parseInt(btn.getAttribute('data-dx'), 10) || 0;
                const dy = parseInt(btn.getAttribute('data-dy'), 10) || 0;
                this.executeTurn(dx, dy);
            });
        });

        const bindBtn = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        };

        bindBtn('ability-1', () => this.useSkill());
        bindBtn('ability-2', () => this.useSkill2());
        bindBtn('ability-ult', () => this.useUltimate());
        bindBtn('belt-pot-hp', () => this.usePotion('hp'));
        bindBtn('belt-pot-mp', () => this.usePotion('mp'));

        bindBtn('class-quiz-btn', () => this.openQuiz());
        bindBtn('quiz-close-btn', () => {
            document.getElementById('quiz-overlay').classList.add('hidden');
            document.getElementById('start-overlay').classList.remove('hidden');
        });
        bindBtn('quiz-pick-btn', () => {
            document.getElementById('quiz-overlay').classList.add('hidden');
            this.startGame(this.quizRecommendedClass || 'warrior');
        });
        bindBtn('resume-run-btn', () => this.resumeRun());

        bindBtn('daily-btn', () => this.startDailyChallenge());
        bindBtn('bossrush-btn', () => this.openClassSelect('bossrush'));
        bindBtn('endless-btn', () => this.openClassSelect('endless'));
        bindBtn('trials-btn', () => this.openTrialsSelect());
        bindBtn('open-hub-btn', () => this.openHub());
        bindBtn('start-bestiary-btn', () => this.openBestiary());
        bindBtn('start-history-btn', () => this.openHistory());
        bindBtn('start-achievements-btn', () => this.openAchievements());
        bindBtn('start-settings-btn', () => this.openSettings());
        bindBtn('whats-new-btn', () => this.openWhatsNew());

        // Modals back/close buttons
        bindBtn('whatsnew-close-btn', () => document.getElementById('whatsnew-overlay').classList.add('hidden'));
        bindBtn('hub-leave-btn', () => document.getElementById('hub-overlay').classList.add('hidden'));
        bindBtn('anvil-leave-btn', () => document.getElementById('anvil-overlay').classList.add('hidden'));
        bindBtn('shop-leave-btn', () => document.getElementById('shop-overlay').classList.add('hidden'));
        bindBtn('settings-back-btn', () => document.getElementById('settings-overlay').classList.add('hidden'));
        bindBtn('bestiary-back-btn', () => document.getElementById('bestiary-overlay').classList.add('hidden'));
        bindBtn('history-back-btn', () => document.getElementById('history-overlay').classList.add('hidden'));
        bindBtn('achievements-back-btn', () => document.getElementById('achievements-overlay').classList.add('hidden'));
        bindBtn('trials-back-btn', () => document.getElementById('trials-select-overlay').classList.add('hidden'));
        bindBtn('trial-victory-btn', () => {
            document.getElementById('trial-victory-overlay').classList.add('hidden');
            document.getElementById('start-overlay').classList.remove('hidden');
        });
        bindBtn('bossrush-ascend-btn', () => this.ascendBossRush());
        bindBtn('bossrush-victory-btn', () => {
            document.getElementById('bossrush-victory-overlay').classList.add('hidden');
            document.getElementById('start-overlay').classList.remove('hidden');
        });

        bindBtn('forge-accept-btn', () => this.acceptForgeSwap());
        bindBtn('forge-decline-btn', () => this.declineForgeSwap());

        bindBtn('pause-btn', () => {
            const po = document.getElementById('pause-overlay');
            if (po) {
                if (po.classList.contains('hidden')) {
                    this.openMenuScreen('pause-overlay');
                } else {
                    po.classList.add('hidden');
                }
            }
        });
        bindBtn('pause-resume-btn', () => document.getElementById('pause-overlay').classList.add('hidden'));
        bindBtn('pause-abandon-btn', () => {
            document.getElementById('pause-overlay').classList.add('hidden');
            this.handleGameOver();
        });

        bindBtn('hud-toggle-btn', () => {
            document.querySelector('.dashboard').classList.toggle('visible');
        });
        bindBtn('hud-close-btn', () => {
            document.querySelector('.dashboard').classList.remove('visible');
        });

        bindBtn('restart-btn', () => {
            document.getElementById('death-overlay').classList.add('hidden');
            document.getElementById('start-overlay').classList.remove('hidden');
        });
    }

    openClassSelect(mode = 'normal') {
        this.pendingMode = mode;
        this.openMenuScreen('class-select-overlay');
        const container = document.getElementById('class-cards');
        container.innerHTML = '';
        ALL_CLASSES.forEach(cls => {
            const card = document.createElement('div');
            card.className = 'class-card';
            card.innerHTML = `<div style="font-size:2rem;">${CLASS_ICONS[cls]}</div><div style="font-weight:700; margin-top:4px;">${cls.toUpperCase()}</div><div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">${CLASS_DESCS[cls]}</div>`;
            card.onclick = () => {
                document.getElementById('class-select-overlay').classList.add('hidden');
                if (this.pendingMode === 'bossrush') this.startBossRush(cls);
                else if (this.pendingMode === 'endless') this.startEndless(cls);
                else this.startGame(cls);
            };
            container.appendChild(card);
        });
    }

    startDailyChallenge() {
        const key = todayKey();
        this.dailyKey = key;
        this.dailySeed = hashStr('archon-' + key);
        const cls = ALL_CLASSES[this.dailySeed % ALL_CLASSES.length];
        this.startGame(cls, true);
    }

    startGame(playerClass, daily = false) {
        this.clearAutosave();
        this.dailyMode = daily;
        this.bossRushMode = false;
        this.endlessMode = false;
        this.trialMode = false; this.trialId = null;
        if (!daily) { this.dailySeed = 0; this.dailyKey = null; }
        const mutatorsToApply = daily ? [] : this.stagedMutators.slice();
        this.stagedMutators = [];
        this.level = 1;
        this.initNewPlayer(playerClass);
        if (mutatorsToApply.length > 0) {
            this.activeMutators = mutatorsToApply;
            this.applyMutatorEffects();
        }
        this.launchRun();
    }

    applyMutatorEffects() {
        if (!this.meta.stats) this.meta.stats = {};
        if (this.activeMutators.length > (this.meta.stats.maxMutatorsAtStart || 0)) {
            this.meta.stats.maxMutatorsAtStart = this.activeMutators.length;
            this.saveMeta();
        }
        if (this.activeMutators.includes('bloodlust')) {
            const loss = Math.ceil(this.player.maxHp * 0.2);
            this.player.maxHp = Math.max(10, this.player.maxHp - loss);
            this.player.hp = this.player.maxHp;
        }
    }

    startBossRush(playerClass) {
        this.clearAutosave();
        this.dailyMode = false;
        this.bossRushMode = true;
        this.endlessMode = false;
        this.trialMode = false;
        this.bossRushIndex = 0;
        this.ascensionTier = 0;
        this.level = 10;
        this.initNewPlayer(playerClass);
        this.launchRun();
    }

    startEndless(playerClass) {
        this.clearAutosave();
        this.dailyMode = false;
        this.bossRushMode = false;
        this.endlessMode = true;
        this.trialMode = false;
        this.endlessWave = 0;
        this.level = 5;
        this.initNewPlayer(playerClass);
        this.launchRun();
    }

    openTrialsSelect() {
        this.openMenuScreen('trials-select-overlay');
        const list = document.getElementById('trials-list');
        list.innerHTML = '';
        const titles = this.meta.titles || [];
        TRIALS_DB.forEach(t => {
            const earned = titles.includes(t.title);
            const el = document.createElement('div');
            el.className = 'bestiary-entry';
            el.style.cursor = 'pointer';
            el.innerHTML = `<span class="be-icon">${earned ? '🏵️' : '⚔️'}</span><div><div class="be-name">${t.name}${earned ? '<span class="be-kills">Earned</span>' : ''}</div><div class="be-lore">${t.cls.toUpperCase()} · ${t.biome} · Reward: "${t.title}"</div></div>`;
            el.onclick = () => this.startTrial(t.id);
            list.appendChild(el);
        });
    }

    startTrial(trialId) {
        const trial = TRIALS_DB.find(t => t.id === trialId);
        if (!trial) return;
        this.clearAutosave();
        document.getElementById('trials-select-overlay').classList.add('hidden');
        this.trialMode = true; this.trialId = trialId; this.trialSeed = trial.seed;
        this.level = trial.level;
        this.initNewPlayer(trial.cls);
        this.activeMutators = trial.mutators.slice();
        this.applyMutatorEffects();
        this.launchRun();
    }

    launchRun() {
        this.generateLevel();
        sfx.playVictory();
        music.start();
        music.setTarget(0);
        if (!this.loopStarted) {
            this.loopStarted = true;
            this.gameLoop();
        }
    }

    openHub() {
        this.openMenuScreen('hub-overlay');
        this.updateHubUI();
    }

    updateHubUI() {
        const soulsEl = document.getElementById('hub-souls');
        if (soulsEl) soulsEl.innerText = `Archon Souls: ${this.meta.souls || 0} 🔮`;
        const list = document.getElementById('hub-upgrades');
        if (!list) return;
        list.innerHTML = '';
        HUB_UPGRADES.forEach(u => {
            const current = this.meta[u.id] || 0;
            const cost = u.cost(current);
            const maxed = current >= u.max;
            const el = document.createElement('div');
            el.className = 'shop-item';
            el.innerHTML = `<div><span>${u.icon}</span> <span style="font-weight:600;">${u.name} (Rank ${current}/${u.max})</span><div style="font-size:0.8rem; color:var(--text-muted);">${u.desc}</div></div> <div class="price">${maxed ? 'MAX' : `${cost} Souls`}</div>`;
            if (!maxed) {
                el.onclick = () => {
                    if ((this.meta.souls || 0) >= cost) {
                        this.meta.souls -= cost;
                        this.meta[u.id] = (this.meta[u.id] || 0) + 1;
                        this.saveMeta();
                        sfx.playLevelUp();
                        this.updateHubUI();
                    } else {
                        sfx.playHurt();
                    }
                };
            }
            list.appendChild(el);
        });
    }

    openBestiary() {
        this.openMenuScreen('bestiary-overlay');
        const list = document.getElementById('bestiary-list');
        list.innerHTML = '';
        BESTIARY_DB.forEach(b => {
            const kills = (this.meta.bestiary && this.meta.bestiary[b.id]) || 0;
            const el = document.createElement('div');
            el.className = 'bestiary-entry';
            el.innerHTML = `<span class="be-icon">${b.icon}</span><div><div class="be-name">${b.name} <span class="be-kills">Slain: ${kills}</span></div><div class="be-lore">${kills > 0 ? b.lore : '??? Slay this enemy to reveal its lore.'}</div></div>`;
            list.appendChild(el);
        });
    }

    openLore() {
        this.openMenuScreen('lore-overlay');
        const list = document.getElementById('lore-list');
        list.innerHTML = '';
        LORE_DB.forEach((l, idx) => {
            const unlocked = (this.meta.unlockedLore || []).includes(idx);
            const el = document.createElement('div');
            el.className = 'bestiary-entry';
            el.innerHTML = `<span class="be-icon">📜</span><div><div class="be-name">${unlocked ? l.title : 'Ancient Fragment'}</div><div class="be-lore">${unlocked ? l.text : 'Find this scrap in the dungeon depths to read its words.'}</div></div>`;
            list.appendChild(el);
        });
    }

    openHistory() {
        this.openMenuScreen('history-overlay');
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        const hist = this.meta.history || [];
        if (hist.length === 0) {
            list.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">No recorded descents yet.</div>';
            return;
        }
        hist.forEach(h => {
            const el = document.createElement('div');
            el.className = 'bestiary-entry';
            el.innerHTML = `<span class="be-icon">💀</span><div><div class="be-name">${h.classType.toUpperCase()} · Depth B${h.level}</div><div class="be-lore">${h.date} · Level ${h.charLvl} · ${h.gold} Gold · Killed by ${h.killer}</div></div>`;
            list.appendChild(el);
        });
    }

    openAchievements() {
        this.openMenuScreen('achievements-overlay');
        const list = document.getElementById('achievements-list');
        list.innerHTML = '';
        const stats = this.meta.stats || {};
        ACHIEVEMENTS_DB.forEach(a => {
            const done = typeof a.check === 'function' && a.check(stats, this.meta);
            const el = document.createElement('div');
            el.className = 'bestiary-entry';
            el.innerHTML = `<span class="be-icon">${done ? '🏆' : '🔒'}</span><div><div class="be-name">${a.name} ${done ? '<span class="be-kills">Unlocked</span>' : ''}</div><div class="be-lore">${a.desc}</div></div>`;
            list.appendChild(el);
        });
    }

    sampleRunPeaks() {
        if (!this.player) return;
        if (!this.meta.stats) this.meta.stats = {};
        const stats = this.meta.stats;
        if (!this.dailyMode && !this.bossRushMode && !this.endlessMode && !this.trialMode) {
            if (this.level > (stats.maxDepthReached || 0)) stats.maxDepthReached = this.level;
        }
        const relicCount = (this.relics || []).length;
        if (relicCount > (stats.maxRelicsHeld || 0)) stats.maxRelicsHeld = relicCount;
        const talentCount = (this.talents || []).length;
        if (talentCount > (stats.maxTalentsUnlocked || 0)) stats.maxTalentsUnlocked = talentCount;
        const gold = this.player.gold || 0;
        if (gold > (stats.maxGoldHeld || 0)) stats.maxGoldHeld = gold;
        const allyCount = (this.allies || []).length;
        if (allyCount > (stats.maxAllies || 0)) stats.maxAllies = allyCount;
    }

    checkAchievements() {
        this.sampleRunPeaks();
        const stats = this.meta.stats || {};
        ACHIEVEMENTS_DB.forEach(a => {
            if (typeof a.check === 'function' && a.check(stats, this.meta)) {
                if (!this.meta.unlockedAchievements) this.meta.unlockedAchievements = [];
                if (!this.meta.unlockedAchievements.includes(a.id)) {
                    this.meta.unlockedAchievements.push(a.id);
                    this.saveMeta();
                    this.showLoreToast(`🏆 Achievement Unlocked: ${a.name}!`);
                    sfx.playLevelUp();
                }
            }
        });
    }

    openSettings() {
        this.openMenuScreen('settings-overlay');
    }

    openWhatsNew() {
        this.openMenuScreen('whatsnew-overlay');
        const list = document.getElementById('whatsnew-list');
        if (list) {
            list.innerHTML = `
                <div style="margin-bottom: 12px;">
                    <ul style="padding-left: 20px; font-size:0.9rem; line-height: 1.6; color: var(--text-main);">
                        ${CHANGELOG_ENTRIES.map(it => `<li style="margin-bottom: 8px;">${it}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        const verEl = document.getElementById('whatsnew-version');
        if (verEl) verEl.innerText = `v${GAME_VERSION}`;
    }

    checkChangelog() {
        const lastSeen = localStorage.getItem('archonDescent_lastSeenVersion');
        if (lastSeen !== GAME_VERSION) {
            localStorage.setItem('archonDescent_lastSeenVersion', GAME_VERSION);
            this.openWhatsNew();
        }
    }
}

// Attach all split modules to prototype
attachGameplayMethods(DungeonEngine.prototype);
attachCombatMethods(DungeonEngine.prototype);
attachSkillMethods(DungeonEngine.prototype);
attachTurnMethods(DungeonEngine.prototype);
attachItemMethods(DungeonEngine.prototype);
attachUIOverlayMethods(DungeonEngine.prototype);

// Initialize game on load
window.addEventListener('DOMContentLoaded', () => {
    window.game = new DungeonEngine();
});
