

export const renderMethods = {
    // [old] 
    render() {
        if (!this.player) return;
        this.ctx.save(); this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        let shakeX = 0, shakeY = 0;
        if (this.cameraShake.duration > 0) {
            shakeX = (Math.random()-0.5)*this.cameraShake.intensity;
            shakeY = (Math.random()-0.5)*this.cameraShake.intensity;
            this.ctx.translate(shakeX, shakeY);
            this.cameraShake.duration -= 16;
        }
        const targetCamX = Math.max(0, Math.min(this.player.visualX - this.viewWidth / 2, this.mapWidth - this.viewWidth));
        const targetCamY = Math.max(0, Math.min(this.player.visualY - this.viewHeight / 2, this.mapHeight - this.viewHeight));
        this.camX = this.camX === null ? targetCamX : this.camX + (targetCamX - this.camX) * 0.15;
        this.camY = this.camY === null ? targetCamY : this.camY + (targetCamY - this.camY) * 0.15;
        const camX = this.camX, camY = this.camY;
        const ox = -camX * this.tileSize; const oy = -camY * this.tileSize;
        this.syncSkillFXCamera(ox + shakeX, oy + shakeY);
        const startX = Math.max(0, Math.floor(camX)); const endX = Math.min(this.mapWidth, Math.ceil(camX + this.viewWidth));
        const startY = Math.max(0, Math.floor(camY)); const endY = Math.min(this.mapHeight, Math.ceil(camY + this.viewHeight));

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (this.fog[y][x] === 0) {
                    this.ctx.fillStyle = '#0b0f19'; this.ctx.fillRect(x*this.tileSize+ox, y*this.tileSize+oy, this.tileSize, this.tileSize);
                    continue;
                }
                const tile = this.map[y][x]; const variant = this.tileVariants[y][x];
                if (tile === 1 || tile === 5) { // Floor or Spikes
                    this.ctx.drawImage(this.textures.floorCanvas, (variant%4)*this.tileSize, 0, this.tileSize, this.tileSize, x*this.tileSize+ox, y*this.tileSize+oy, this.tileSize, this.tileSize);
                    if (tile === 5) { // Draw Spikes - extended (active) or retracted
                        const trap = this.trapStates[`${x},${y}`];
                        const active = !trap || trap.active;
                        this.ctx.fillStyle = active ? '#94a3b8' : '#475569';
                        const inset = active ? 12 : 14, size = active ? 8 : 4;
                        this.ctx.fillRect(x*this.tileSize+ox+inset, y*this.tileSize+oy+inset, size, size);
                    }
                } else if (tile === 0 || tile === 9 || tile === 10) { // Secret and class-locked walls look like ordinary rock
                    this.ctx.drawImage(this.textures.wallCanvas, (variant%3)*this.tileSize, 0, this.tileSize, this.tileSize, x*this.tileSize+ox, y*this.tileSize+oy, this.tileSize, this.tileSize);
                } else if (tile === 3) { // Stairs
                    this.ctx.fillStyle = '#1e293b'; this.ctx.fillRect(x*this.tileSize+ox, y*this.tileSize+oy, this.tileSize, this.tileSize);
                    this.ctx.strokeStyle = '#38bdf8'; this.ctx.strokeRect(x*this.tileSize+ox+4, y*this.tileSize+oy+4, this.tileSize-8, this.tileSize-8);
                    this.ctx.fillStyle = '#38bdf8'; this.ctx.font = '10px "Outfit"'; this.ctx.fillText('DOWN', x*this.tileSize+ox+6, y*this.tileSize+oy+20);
                } else if (tile === 4) { // Destructible Crate or volatile Barrel
                    const isBarrel = this.destructibles.some(d => d.x === x && d.y === y && d.type === 'barrel');
                    this.ctx.drawImage(this.textures.floorCanvas, 0, 0, this.tileSize, this.tileSize, x*this.tileSize+ox, y*this.tileSize+oy, this.tileSize, this.tileSize);
                    this.ctx.fillStyle = isBarrel ? '#7f1d1d' : '#92400e'; this.ctx.fillRect(x*this.tileSize+ox+4, y*this.tileSize+oy+4, this.tileSize-8, this.tileSize-8);
                    this.ctx.strokeStyle = isBarrel ? '#f97316' : '#78350f'; this.ctx.strokeRect(x*this.tileSize+ox+4, y*this.tileSize+oy+4, this.tileSize-8, this.tileSize-8);
                    if (isBarrel) {
                        this.ctx.font = '14px serif'; this.ctx.fillText('💥', x*this.tileSize+ox+8, y*this.tileSize+oy+22);
                    } else {
                        this.ctx.beginPath(); this.ctx.moveTo(x*this.tileSize+ox+4, y*this.tileSize+oy+4); this.ctx.lineTo(x*this.tileSize+ox+this.tileSize-4, y*this.tileSize+oy+this.tileSize-4); this.ctx.stroke();
                    }
                } else if (tile === 6) { // Locked vault door
                    this.ctx.drawImage(this.textures.wallCanvas, (variant%3)*this.tileSize, 0, this.tileSize, this.tileSize, x*this.tileSize+ox, y*this.tileSize+oy, this.tileSize, this.tileSize);
                    this.ctx.fillStyle = '#eab308'; this.ctx.fillRect(x*this.tileSize+ox+13, y*this.tileSize+oy+10, 6, 12);
                    this.ctx.strokeStyle = '#eab308'; this.ctx.lineWidth = 2;
                    this.ctx.beginPath(); this.ctx.arc(x*this.tileSize+ox+16, y*this.tileSize+oy+8, 5, Math.PI, 0); this.ctx.stroke();
                    this.ctx.lineWidth = 1;
                } else if (tile === 7) { // Lava pool - deals damage while crossing
                    const pulse = 0.55 + Math.sin(Date.now()*0.004 + x*3+y*2)*0.15;
                    this.ctx.fillStyle = `rgba(249, 115, 22, ${pulse})`;
                    this.ctx.fillRect(x*this.tileSize+ox, y*this.tileSize+oy, this.tileSize, this.tileSize);
                    this.ctx.fillStyle = '#7c2d12';
                    this.ctx.fillRect(x*this.tileSize+ox+5, y*this.tileSize+oy+5, this.tileSize-10, this.tileSize-10);
                } else if (tile === 8) { // Web - chills movement
                    this.ctx.drawImage(this.textures.floorCanvas, (variant%4)*this.tileSize, 0, this.tileSize, this.tileSize, x*this.tileSize+ox, y*this.tileSize+oy, this.tileSize, this.tileSize);
                    this.ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)'; this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x*this.tileSize+ox, y*this.tileSize+oy); this.ctx.lineTo(x*this.tileSize+ox+this.tileSize, y*this.tileSize+oy+this.tileSize);
                    this.ctx.moveTo(x*this.tileSize+ox+this.tileSize, y*this.tileSize+oy); this.ctx.lineTo(x*this.tileSize+ox, y*this.tileSize+oy+this.tileSize);
                    this.ctx.stroke();
                } else if (tile === 15) { // Drowned Depths current: chevrons drift downstream
                    const px = x*this.tileSize+ox, py = y*this.tileSize+oy;
                    const cur = this.currents && this.currents[`${x},${y}`];
                    this.ctx.fillStyle = '#0b4b4f'; this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    this.ctx.fillStyle = `rgba(45, 212, 191, ${0.18 + Math.sin(Date.now()*0.004 + x + y)*0.06})`;
                    this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    if (cur) {
                        const phase = ((Date.now() * 0.03) % this.tileSize);
                        this.ctx.save();
                        this.ctx.beginPath(); this.ctx.rect(px, py, this.tileSize, this.tileSize); this.ctx.clip();
                        this.ctx.translate(px + this.tileSize/2, py + this.tileSize/2);
                        this.ctx.rotate(Math.atan2(cur.dy, cur.dx));
                        this.ctx.strokeStyle = 'rgba(153, 246, 228, 0.55)'; this.ctx.lineWidth = 2;
                        for (let k = -1; k <= 1; k++) {
                            const cx = -this.tileSize/2 + phase + k * (this.tileSize/2);
                            this.ctx.beginPath(); this.ctx.moveTo(cx - 4, -5); this.ctx.lineTo(cx + 1, 0); this.ctx.lineTo(cx - 4, 5); this.ctx.stroke();
                        }
                        this.ctx.restore();
                        this.ctx.lineWidth = 1;
                    }
                } else if (tile === 11) { // Chasm - a one-way drop to the next floor
                    const px = x*this.tileSize+ox, py = y*this.tileSize+oy;
                    this.ctx.fillStyle = '#020309'; this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    this.ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)'; this.ctx.strokeRect(px+3, py+3, this.tileSize-6, this.tileSize-6);
                } else if (tile === 12) { // Mirror-vault floor switch
                    const px = x*this.tileSize+ox, py = y*this.tileSize+oy;
                    this.ctx.drawImage(this.textures.floorCanvas, (variant%4)*this.tileSize, 0, this.tileSize, this.tileSize, px, py, this.tileSize, this.tileSize);
                    this.ctx.fillStyle = '#f59e0b'; this.ctx.fillRect(px+10, py+10, this.tileSize-20, this.tileSize-20);
                    this.ctx.strokeStyle = '#78350f'; this.ctx.strokeRect(px+10, py+10, this.tileSize-20, this.tileSize-20);
                } else if (tile === 13 || tile === 14) { // Ladder down to / up from a shaft chamber
                    const px = x*this.tileSize+ox, py = y*this.tileSize+oy;
                    this.ctx.drawImage(this.textures.floorCanvas, (variant%4)*this.tileSize, 0, this.tileSize, this.tileSize, px, py, this.tileSize, this.tileSize);
                    this.ctx.strokeStyle = tile === 13 ? '#a16207' : '#38bdf8'; this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(px+10, py+4); this.ctx.lineTo(px+10, py+28); this.ctx.moveTo(px+22, py+4); this.ctx.lineTo(px+22, py+28);
                    for (let r = 8; r < 28; r += 6) { this.ctx.moveTo(px+10, py+r); this.ctx.lineTo(px+22, py+r); }
                    this.ctx.stroke(); this.ctx.lineWidth = 1;
                }
            }
        }

        this.renderAmbientMotes(ox, oy, startX, endX, startY, endY);

        // Telegraphs - pulsing fill with a shrinking border to count down the strike
        this.telegraphs.forEach(t => {
            if(this.fog[t.y][t.x]>0) {
                if (t.spawnTime === undefined) t.spawnTime = Date.now();
                const pulse = 0.25 + Math.sin(Date.now()*0.012)*0.15;
                this.ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
                if (t.thin) {
                    // Charge telegraphs only threaten their exact tile, so only mark that tile
                    this.ctx.fillRect(t.x*this.tileSize+ox, t.y*this.tileSize+oy, this.tileSize, this.tileSize);
                    const elapsed = Math.min(1, (Date.now()-t.spawnTime)/700);
                    this.ctx.strokeStyle = `rgba(248, 113, 113, ${0.8-elapsed*0.5})`; this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(t.x*this.tileSize+ox+2, t.y*this.tileSize+oy+2, this.tileSize-4, this.tileSize-4);
                    this.ctx.lineWidth = 1;
                } else {
                    for(let dy=-1; dy<=1; dy++) {
                        for(let dx=-1; dx<=1; dx++) {
                            this.ctx.fillRect((t.x+dx)*this.tileSize+ox, (t.y+dy)*this.tileSize+oy, this.tileSize, this.tileSize);
                        }
                    }
                    const elapsed = Math.min(1, (Date.now()-t.spawnTime)/700);
                    const inset = elapsed * this.tileSize * 1.4;
                    this.ctx.strokeStyle = `rgba(248, 113, 113, ${0.8-elapsed*0.5})`; this.ctx.lineWidth = 2;
                    this.ctx.strokeRect((t.x-1)*this.tileSize+ox+inset, (t.y-1)*this.tileSize+oy+inset, this.tileSize*3-inset*2, this.tileSize*3-inset*2);
                    this.ctx.lineWidth = 1;
                }
            }
        });

        // Shrines
        this.shrines.forEach(s => {
            if (s.x >= startX && s.x < endX && s.y >= startY && s.y < endY && this.fog[s.y][s.x] > 0) {
                this.ctx.font = '24px serif'; this.ctx.fillText(s.icon, s.x*this.tileSize+ox+4, s.y*this.tileSize+oy+24);
            }
        });

        this.playerTraps.forEach(t => {
            if (t.x >= startX && t.x < endX && t.y >= startY && t.y < endY && this.fog[t.y][t.x] === 2) {
                this.ctx.globalAlpha = 0.75;
                this.ctx.font = '16px serif'; this.ctx.fillText('🪤', t.x*this.tileSize+ox+8, t.y*this.tileSize+oy+22);
                this.ctx.globalAlpha = 1;
            }
        });

        this.chests.forEach(chest => {
            if (chest.x >= startX && chest.x < endX && chest.y >= startY && chest.y < endY && this.fog[chest.y][chest.x] > 0) {
                const cx = chest.x * this.tileSize + ox; const cy = chest.y * this.tileSize + oy;
                this.ctx.fillStyle = chest.opened ? '#475569' : '#b45309'; this.ctx.fillRect(cx+6, cy+8, 20, 16);
                this.ctx.fillStyle = '#f59e0b'; this.ctx.fillRect(cx+10, cy+8, 2, 16); this.ctx.fillRect(cx+20, cy+8, 2, 16);
            }
        });

        this.captives.forEach(c => {
            if (!c.rescued && c.x >= startX && c.x < endX && c.y >= startY && c.y < endY && this.fog[c.y][c.x] > 0) {
                this.ctx.font = '20px serif'; this.ctx.fillText(c.icon, c.x*this.tileSize+ox+6, c.y*this.tileSize+oy+24);
            }
        });


        this.itemsOnGround.forEach(item => {
            if (item.x >= startX && item.x < endX && item.y >= startY && item.y < endY && this.fog[item.y][item.x] > 0) {
                let bobY;
                if (item.popVz !== undefined && (item.popZ > 0.5 || item.popVz !== 0)) bobY = -(item.popZ || 0);
                else bobY = -Math.abs(Math.sin(Date.now()*0.0025 + item.x*13 + item.y*7)) * 3;
                this.ctx.shadowBlur = 8; this.ctx.shadowColor = item.isGold ? '#facc15' : item.isRelic ? '#f0abfc' : this.getRarityColor(item.rarity);
                this.ctx.font = '16px serif'; this.ctx.fillText(item.icon, item.x*this.tileSize+ox+8, item.y*this.tileSize+oy+22+bobY);
                this.ctx.shadowBlur = 0;
            }
        });

        if (this.player.path.length > 0) {
            this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'; this.ctx.lineWidth = 3; this.ctx.beginPath();
            this.ctx.moveTo(this.player.visualX * this.tileSize + 16 + ox, this.player.visualY * this.tileSize + 16 + oy);
            this.player.path.forEach(step => this.ctx.lineTo(step.x * this.tileSize + 16 + ox, step.y * this.tileSize + 16 + oy));
            this.ctx.stroke(); this.ctx.lineWidth = 1;
        }

        this.enemies.forEach(enemy => {
            if (enemy.x >= startX && enemy.x < endX && enemy.y >= startY && enemy.y < endY && this.fog[enemy.y][enemy.x] === 2) {
                const ex = enemy.visualX * this.tileSize + ox + (enemy.knockX||0);
                const ey = enemy.visualY * this.tileSize + oy + (enemy.knockY||0);
                const radius = enemy.isBoss ? 15 : 10;
                const distMoving = Math.hypot(enemy.x-enemy.visualX, enemy.y-enemy.visualY);
                const bob = distMoving > 0.02 ? -Math.sin(Math.PI*(1-Math.min(1,distMoving)))*4 : 0;
                const breathe = distMoving <= 0.02 ? 1 + Math.sin(Date.now()*0.0018 + enemy.x*3+enemy.y*5)*0.05 : 1;
                const deathScale = enemy.dying ? Math.max(0, enemy.deathTimer) : 1;

                this.ctx.save();
                this.ctx.globalAlpha = deathScale;
                this.ctx.translate(ex+16, ey+16+bob);
                this.ctx.scale(deathScale, deathScale*breathe);
                if (enemy.isBoss) { this.ctx.shadowBlur = 14; this.ctx.shadowColor = enemy.color; }
                this.ctx.fillStyle = enemy.color; this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI*2); this.ctx.fill();
                if (enemy.hitFlash > 0) {
                    this.ctx.fillStyle = `rgba(255,255,255,${enemy.hitFlash})`;
                    this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI*2); this.ctx.fill();
                }
                this.ctx.shadowBlur = 0;
                if (enemy.elite) {
                    this.ctx.strokeStyle = '#eab308'; this.ctx.lineWidth = 2;
                    this.ctx.shadowBlur = 10; this.ctx.shadowColor = '#eab308';
                    this.ctx.beginPath(); this.ctx.arc(0, 0, radius + 4, 0, Math.PI*2); this.ctx.stroke();
                    this.ctx.shadowBlur = 0; this.ctx.lineWidth = 1;
                }
                this.ctx.font = enemy.isBoss ? '20px "Outfit"' : '14px "Outfit"'; this.ctx.textAlign = 'center'; this.ctx.fillText(enemy.icon, 0, 5);
                this.ctx.restore();

                if (!enemy.dying) {
                    if (enemy.aware === false) {
                        this.ctx.font = '10px serif';
                        this.ctx.fillText('💤', ex+24, ey-2);
                    }

                    // Status visuals: circling stars for stun, icons for DOTs/chill
                    if (enemy.statuses && enemy.statuses.length > 0) {
                        let iconOffset = 0;
                        enemy.statuses.forEach(st => {
                            if (st.type === 'stun') {
                                for (let s = 0; s < 3; s++) {
                                    const ang = Date.now()*0.006 + (s/3)*Math.PI*2;
                                    this.ctx.font = '10px serif';
                                    this.ctx.fillText('⭐', ex+16+Math.cos(ang)*14, ey-6+Math.sin(ang)*6);
                                }
                            } else {
                                const icon = st.type === 'burn' ? '🔥' : st.type === 'poison' ? '☠️' : st.type === 'chill' ? '❄️' : '';
                                if (icon) {
                                    this.ctx.font = '10px serif';
                                    this.ctx.fillText(icon, ex+10+iconOffset, ey-8);
                                    iconOffset += 10;
                                }
                            }
                        });
                    }

                    if (enemy.isBoss || enemy.hp < enemy.maxHp) {
                        if (enemy.ghostHp === undefined) enemy.ghostHp = enemy.hp;
                        const barWidth = enemy.isBoss ? 28 : 20;
                        this.ctx.fillStyle = 'rgba(0,0,0,0.5)'; this.ctx.fillRect(ex+16-barWidth/2, ey-6, barWidth, 4);
                        this.ctx.fillStyle = '#fde047'; this.ctx.fillRect(ex+16-barWidth/2, ey-6, barWidth * Math.max(0, enemy.ghostHp/enemy.maxHp), 4);
                        this.ctx.fillStyle = '#fb7185'; this.ctx.fillRect(ex+16-barWidth/2, ey-6, barWidth * Math.max(0, enemy.hp/enemy.maxHp), 4);
                    }
                }
                this.ctx.textAlign = 'left'; // Reset
            }
        });

        this.allies.forEach(a => {
            if (a.x >= startX && a.x < endX && a.y >= startY && a.y < endY && this.fog[a.y][a.x] === 2) {
                const ax = a.visualX * this.tileSize + ox + (a.knockX||0);
                const ay = a.visualY * this.tileSize + oy + (a.knockY||0);
                const distMoving = Math.hypot(a.x-a.visualX, a.y-a.visualY);
                const bob = distMoving > 0.02 ? -Math.sin(Math.PI*(1-Math.min(1,distMoving)))*4 : 0;
                const breathe = distMoving <= 0.02 ? 1 + Math.sin(Date.now()*0.0018 + a.x*3+a.y*5)*0.05 : 1;

                this.ctx.save();
                this.ctx.translate(ax+16, ay+16+bob);
                this.ctx.scale(1, breathe);
                this.ctx.shadowBlur = 8; this.ctx.shadowColor = a.color;
                this.ctx.fillStyle = a.color; this.ctx.globalAlpha = 0.85;
                this.ctx.beginPath(); this.ctx.arc(0, 0, 9, 0, Math.PI*2); this.ctx.fill();
                this.ctx.globalAlpha = 1; this.ctx.shadowBlur = 0;
                if (a.hitFlash > 0) {
                    this.ctx.fillStyle = `rgba(255,255,255,${a.hitFlash})`;
                    this.ctx.beginPath(); this.ctx.arc(0, 0, 9, 0, Math.PI*2); this.ctx.fill();
                }
                this.ctx.font = '13px "Outfit"'; this.ctx.textAlign = 'center'; this.ctx.fillText(a.icon, 0, 4);
                this.ctx.textAlign = 'left';
                this.ctx.restore();
            }
        });

        const distMovingP = Math.hypot(this.player.x-this.player.visualX, this.player.y-this.player.visualY);
        const bobP = distMovingP > 0.02 ? -Math.sin(Math.PI*(1-Math.min(1,distMovingP)))*4 : 0;
        const breatheP = distMovingP <= 0.02 ? 1 + Math.sin(Date.now()*0.0018)*0.05 : 1;
        const px = this.player.visualX * this.tileSize + ox + (this.player.knockX||0);
        const py = this.player.visualY * this.tileSize + oy + (this.player.knockY||0);
        const playerColor = this.getPlayerRenderColor();
        // Power-state tell: 6+ relics wraps the player in a layered aura
        if (this.relics.length >= 6) {
            const t = Date.now() * 0.003;
            for (let ring = 0; ring < 2; ring++) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.28 - ring * 0.1;
                this.ctx.strokeStyle = ring === 0 ? playerColor : '#eab308';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(px+16, py+16+bobP, 15 + ring * 5 + Math.sin(t + ring) * 1.5, 0, Math.PI*2);
                this.ctx.stroke();
                this.ctx.restore();
            }
        }
        const sheet = this.playerSprites.getSheet(playerColor);
        const walking = distMovingP > 0.02;
        const frameIdx = walking ? Math.floor(Date.now() / 140) % 2 : Math.floor(Date.now() / 450) % 2;
        const frame = sheet[this.player.facing || 'down'][frameIdx];
        this.ctx.save();
        this.ctx.translate(px+16, py+16+bobP);
        this.ctx.scale(1, breatheP);
        this.ctx.drawImage(this.player.hitFlash > 0.3 ? this.playerSprites.getFlashFrame(frame) : frame, -16, -16);
        this.ctx.restore();

        if (this.player.statuses && this.player.statuses.length > 0) {
            let iconOffset = 0;
            this.player.statuses.forEach(st => {
                const icon = st.type === 'burn' ? '🔥' : st.type === 'poison' ? '☠️' : st.type === 'chill' ? '❄️' : '';
                if (icon) { this.ctx.font = '10px serif'; this.ctx.fillText(icon, px+10+iconOffset, py-8); iconOffset += 10; }
            });
        }
        if (this.player.hasteTurns > 0) { this.ctx.font = '10px serif'; this.ctx.fillText('⚡', px+16, py-18); }

        this.renderLightingOverlay(ox, oy, startX, endX, startY, endY);

        this.particles.forEach(p => {
            const rx = p.screenSpace ? p.x : p.x + ox;
            const ry = p.screenSpace ? p.y : (p.y - (p.z||0)) + oy;
            if (p.type === 'dust' || p.type === 'trail' || p.type === 'sparkle') {
                this.ctx.fillStyle = p.color; this.ctx.globalAlpha = p.life;
                if (p.rot !== undefined) {
                    this.ctx.save(); this.ctx.translate(rx, ry); this.ctx.rotate(p.rot);
                    this.ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                    this.ctx.restore();
                } else {
                    this.ctx.fillRect(rx, ry, p.size, p.size);
                }
            } else if (p.type === 'projectile') {
                this.ctx.fillStyle = p.color; this.ctx.globalAlpha = p.life;
                this.ctx.beginPath(); this.ctx.arc(rx, ry, 6, 0, Math.PI*2); this.ctx.fill();
            } else if (p.type === 'converge') {
                this.ctx.fillStyle = p.color; this.ctx.globalAlpha = p.life;
                this.ctx.beginPath(); this.ctx.arc(rx, ry, 3, 0, Math.PI*2); this.ctx.fill();
            } else if (p.type === 'swipe') {
                this.ctx.strokeStyle = p.color; this.ctx.globalAlpha = p.life; this.ctx.lineWidth = 3;
                this.ctx.beginPath(); this.ctx.arc(rx, ry, 18, p.angle - 0.9, p.angle + 0.9); this.ctx.stroke();
                this.ctx.lineWidth = 1;
            } else if (p.type === 'text') {
                const size = Math.round(12 * (p.scale || 1));
                this.ctx.font = `800 ${size}px "Press Start 2P", sans-serif`; this.ctx.textAlign = 'center';
                this.ctx.fillStyle = p.color; this.ctx.globalAlpha = p.life; this.ctx.fillText(p.text, rx, ry);
            }
        });
        this.ctx.globalAlpha = 1.0; this.ctx.textAlign = 'left'; this.ctx.restore();

        this.renderTransition();
        this.renderLevelUpCinematic();
    },

    // [old] 
    renderAmbientMotes(ox, oy, startX, endX, startY, endY) {
        this.ctx.save();
        this.ambientMotes.forEach(m => {
            const tx = Math.floor(m.x/this.tileSize), ty = Math.floor(m.y/this.tileSize);
            if (tx < startX || tx >= endX || ty < startY || ty >= endY) return;
            if (this.fog[ty] && this.fog[ty][tx] === 2) {
                const alpha = Math.max(0, 0.15 + Math.sin(Date.now()*0.001 + m.phase)*0.08);
                this.ctx.globalAlpha = alpha;
                this.ctx.fillStyle = '#cbd5e1';
                this.ctx.beginPath(); this.ctx.arc(m.x+ox, m.y+oy, m.size, 0, Math.PI*2); this.ctx.fill();
            }
        });
        this.ctx.globalAlpha = 1; this.ctx.restore();
    },

    // [old] 
    renderTransition() {
        if (!this.transition) return;
        const t = this.transition;
        const maxR = Math.hypot(this.canvas.width, this.canvas.height) * 0.6;
        const r = t.phase === 'out' ? maxR * (1 - t.progress) : maxR * t.progress;
        this.ctx.save();
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.arc(t.cx, t.cy, Math.max(0, r), 0, Math.PI*2, true);
        this.ctx.fill('evenodd');
        this.ctx.restore();
    },

    // [old] 
    renderLevelUpCinematic() {
        if (!this.levelUpAnim) return;
        const a = this.levelUpAnim;
        const cx = this.canvas.width/2, cy = this.canvas.height/2;
        this.ctx.save();
        if (a.phase === 'zoom') {
            const p = Math.min(1, a.timer/300);
            const scale = 0.5 + p*1.2;
            const alpha = a.timer < 400 ? 1 : Math.max(0, 1 - (a.timer-400)/100);
            this.ctx.globalAlpha = alpha;
            this.ctx.translate(cx, cy); this.ctx.scale(scale, scale);
            this.ctx.font = '800 32px "Press Start 2P", sans-serif';
            this.ctx.textAlign = 'center'; this.ctx.fillStyle = '#eab308';
            this.ctx.shadowBlur = 20; this.ctx.shadowColor = '#eab308';
            this.ctx.fillText('LEVEL UP!', 0, 0);
        }
        this.ctx.restore();
    },

    // [old] 
    renderLightingOverlay(ox, oy, startX, endX, startY, endY) {
        const lctx = this.lightCanvas.getContext('2d');
        lctx.fillStyle = 'rgba(7, 10, 18, 0.90)'; lctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        lctx.globalCompositeOperation = 'destination-out';
        
        const pVisualX = this.player.visualX * this.tileSize + this.tileSize / 2 + ox;
        const pVisualY = this.player.visualY * this.tileSize + this.tileSize / 2 + oy;
        const flicker = 1.0 + Math.sin(Date.now() * 0.008) * 0.03;
        const playerLightRadius = (this.getFovRadius() * this.tileSize) * flicker;
        const radGrad = lctx.createRadialGradient(pVisualX, pVisualY, 10, pVisualX, pVisualY, playerLightRadius);
        radGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)'); radGrad.addColorStop(0.3, 'rgba(0, 0, 0, 0.8)'); radGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
        lctx.fillStyle = radGrad; lctx.beginPath(); lctx.arc(pVisualX, pVisualY, playerLightRadius, 0, Math.PI * 2); lctx.fill();

        this.torches.forEach(t => {
            if (t.x >= startX && t.x < endX && t.y >= startY && t.y < endY && this.fog[t.y][t.x] === 2) {
                const tx = t.x * this.tileSize + 16 + ox; const ty = t.y * this.tileSize + 16 + oy;
                if (Math.random() < 0.1) this.particles.push({x:t.x*this.tileSize+16+(Math.random()-0.5)*8,y:t.y*this.tileSize+16,vx:(Math.random()-0.5)*1.5,vy:-Math.random()*2-0.5,life:1,decay:0.05,color:'#fb923c',size:Math.random()*3+1,type:'dust'});
                const torchGrad = lctx.createRadialGradient(tx, ty, 5, tx, ty, 90 * (1.0 + Math.sin(Date.now() * 0.012 + t.flickerPhase) * 0.05));
                torchGrad.addColorStop(0, 'rgba(0, 0, 0, 1.0)'); torchGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.7)'); torchGrad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
                lctx.fillStyle = torchGrad; lctx.beginPath(); lctx.arc(tx, ty, 100, 0, Math.PI * 2); lctx.fill();
            }
        });
        
        this.ctx.drawImage(this.lightCanvas, 0, 0);
        this.ctx.fillStyle = 'rgba(7, 10, 18, 0.5)';
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (this.fog[y][x] === 1) this.ctx.fillRect(x*this.tileSize+ox, y*this.tileSize+oy, this.tileSize, this.tileSize);
            }
        }
    },

    drawMinimap() {
        if (!this.mmCtx || !this.player || !this.map.length) return;
        const ctx = this.mmCtx;
        const size = this.minimapCanvas.width;
        const scale = size / Math.max(this.mapWidth, this.mapHeight);
        ctx.fillStyle = '#05070e';
        ctx.fillRect(0, 0, size, size);
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const f = this.fog[y][x];
                if (f === 0) continue;
                const t = this.map[y][x];
                if (t === 0 || t === 9 || t === 10) continue;
                ctx.fillStyle = t === 6 ? '#eab308' : t === 7 ? '#c2410c' : t === 8 ? '#6d28d9' : t === 15 ? '#0f766e' : (f === 2 ? '#64748b' : '#334155');
                ctx.fillRect(x * scale, y * scale, Math.ceil(scale), Math.ceil(scale));
            }
        }
        this.shrines.forEach(s => { if (this.fog[s.y][s.x] > 0) { ctx.fillStyle = '#a855f7'; ctx.fillRect(s.x * scale - 1, s.y * scale - 1, scale + 2, scale + 2); } });
        this.enemies.forEach(e => {
            if (!e.dying && this.fog[e.y] && this.fog[e.y][e.x] === 2) { ctx.fillStyle = e.isBoss ? '#f97316' : '#fb7185'; ctx.fillRect(e.x * scale, e.y * scale, scale + 1, scale + 1); }
        });
        if (this.stairs && this.stairs.x >= 0 && this.fog[this.stairs.y][this.stairs.x] > 0) {
            ctx.fillStyle = '#facc15';
            ctx.fillRect(this.stairs.x * scale - 1, this.stairs.y * scale - 1, scale + 2, scale + 2);
        }
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(this.player.x * scale - 1, this.player.y * scale - 1, scale + 2, scale + 2);
    },

    // [old] 
    triggerCameraShake(intensity, duration) {
        const scale = this.settings ? this.settings.shake : 1;
        if (scale <= 0) return;
        this.cameraShake.intensity = intensity * scale;
        this.cameraShake.duration = duration;
    },

    // [old] 
    triggerHitFlash(entity) { entity.hitFlash = 1; if (entity.aware === false) entity.aware = true; },

    // [old] 
    triggerKnockback(entity, fromX, fromY) {
        const dx = entity.x - fromX, dy = entity.y - fromY;
        const dist = Math.hypot(dx, dy) || 1;
        entity.knockX = (dx / dist) * 5;
        entity.knockY = (dy / dist) * 5;
    },

    // [old] 
    resetGhostDelay(entity) { entity.ghostDelay = 300; },

    // [old] 
    updateEntityAnim(e) {
        if (e.ghostHp === undefined) e.ghostHp = e.hp;
        e.hitFlash = Math.max(0, (e.hitFlash || 0) - 0.08);
        e.knockX = (e.knockX || 0) * 0.8; if (Math.abs(e.knockX) < 0.05) e.knockX = 0;
        e.knockY = (e.knockY || 0) * 0.8; if (Math.abs(e.knockY) < 0.05) e.knockY = 0;
        if (e.ghostHp > e.hp) {
            e.ghostDelay = (e.ghostDelay || 0) - 16;
            if (e.ghostDelay <= 0) e.ghostHp = Math.max(e.hp, e.ghostHp - e.maxHp * 0.025);
        } else {
            e.ghostHp = e.hp;
        }
    },

    // [old] 
    spawnBloodParticles(x, y, color) { for(let i=0;i<8;i++) this.particles.push({x:(x+0.5)*this.tileSize,y:(y+0.5)*this.tileSize,vx:(Math.random()-0.5)*5,vy:(Math.random()-0.5)*5,z:1,vz:Math.random()*2,gravity:0.18,bounce:0.3,friction:0.9,life:1,decay:0.04+Math.random()*0.08,color,size:Math.random()*3+2,type:'dust'}); },

    // [old] 
    spawnGoldSparkles(x, y) { for(let i=0;i<12;i++) this.particles.push({x:(x+0.5)*this.tileSize,y:(y+0.5)*this.tileSize,vx:(Math.random()-0.5)*3,vy:(Math.random()-0.7)*4,life:1,decay:0.03+Math.random()*0.05,color:'#fef08a',size:Math.random()*4+1,type:'dust'}); },

    // [old] 
    spawnLevelUpParticles() { for(let i=0;i<40;i++) this.particles.push({x:(this.player.x+0.5)*this.tileSize,y:(this.player.y+0.5)*this.tileSize,vx:(Math.random()-0.5)*6,vy:-Math.random()*5-2,life:1.2,decay:0.03,color:'#eab308',size:Math.random()*4+2,type:'dust'}); },

    // [old] 
    spawnDamageNumber(x, y, text, color) { this.particles.push({x:(x+0.5)*this.tileSize+(Math.random()-0.5)*10,y:y*this.tileSize,vx:(Math.random()-0.5)*1.4,vy:-1.4,life:1,decay:0.025,color,text,type:'text',scale:1.8}); },

    // [old] 
    spawnSparks(x, y) {
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2; const spd = 2 + Math.random() * 3;
            this.particles.push({ x: (x+0.5)*this.tileSize, y: (y+0.5)*this.tileSize, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd, z: 2, vz: Math.random()*2, gravity: 0.25, bounce: 0.5, friction: 0.94, life: 0.6, decay: 0.05, color: '#fef9c3', size: Math.random()*2+1, type: 'dust' });
        }
    },

    // [old] 
    spawnShards(x, y, color) {
        const cx = (x+0.5)*this.tileSize, cy = (y+0.5)*this.tileSize;
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2; const spd = 1 + Math.random() * 3;
            this.particles.push({ x: cx, y: cy, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd, z: 2, vz: Math.random()*2+1, gravity: 0.2, bounce: 0.35, friction: 0.92, life: 1, decay: 0.025, color, size: Math.random()*3+2, rot: Math.random()*Math.PI, rotSpeed: (Math.random()-0.5)*0.3, type: 'dust' });
        }
    },

    // [old] 
    spawnDeathBurst(enemy) {
        const cx = (enemy.x+0.5)*this.tileSize, cy = (enemy.y+0.5)*this.tileSize;
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2; const spd = 1 + Math.random() * 4;
            this.particles.push({ x: cx, y: cy, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd, z: 0, vz: Math.random()*3+1, gravity: 0.15, bounce: 0.4, friction: 0.9, life: 1, decay: 0.02+Math.random()*0.02, color: enemy.color, size: Math.random()*3+2, type: 'dust' });
        }
    },

    // [old] 
    spawnAttackSwipe(fromX, fromY, toX, toY) {
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const cx = (fromX + (toX-fromX)*0.6 + 0.5) * this.tileSize;
        const cy = (fromY + (toY-fromY)*0.6 + 0.5) * this.tileSize;
        this.particles.push({ x: cx, y: cy, life: 1, decay: 0.15, color: '#e2e8f0', type: 'swipe', angle });
    },

    // [old] 
    spawnCastWindup(caster) {
        const tx = (caster.x+0.5)*this.tileSize, ty = (caster.y+0.5)*this.tileSize;
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2; const dist = 30 + Math.random() * 20;
            this.particles.push({ x: tx+Math.cos(angle)*dist, y: ty+Math.sin(angle)*dist, tx, ty, life: 1, decay: 0.05, color: '#f97316', type: 'converge', speed: 3 });
        }
    },

    // [old] 
    spawnFootstepDust(x, y) {
        for (let i = 0; i < 3; i++) {
            this.particles.push({ x: (x+0.5)*this.tileSize+(Math.random()-0.5)*10, y: (y+0.7)*this.tileSize, vx: (Math.random()-0.5)*0.6, vy: -0.2-Math.random()*0.2, life: 0.6, decay: 0.06+Math.random()*0.05, color: 'rgba(210,210,220,0.5)', size: Math.random()*2+1, type: 'dust' });
        }
    },

    // [old] 
    spawnLevelUpShatter() {
        const cx = this.canvas.width/2, cy = this.canvas.height/2;
        for (let i = 0; i < 24; i++) {
            const angle = Math.random() * Math.PI * 2; const spd = 2 + Math.random() * 6;
            this.particles.push({ x: cx, y: cy, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd, life: 1, decay: 0.03, color: '#eab308', size: Math.random()*3+2, type: 'dust', friction: 0.96, screenSpace: true });
        }
    },

    // [old] 
    startLevelTransition(onMidpoint) {
        this.transition = { phase: 'out', progress: 0, cx: this.canvas.width/2, cy: this.canvas.height/2, onMidpoint };
    },

    // [old] 
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            if (p.type === 'projectile') {
                const dx = p.tx - p.x; const dy = p.ty - p.y;
                const dist = Math.hypot(dx, dy);
                p.trailTimer = (p.trailTimer || 0) - 1;
                if (p.trailTimer <= 0) {
                    this.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.6, decay: 0.07, color: p.color, size: 3, type: 'trail' });
                    p.trailTimer = 2;
                }
                if (dist < 5) { p.life = 0; if(p.cb) p.cb(); }
                else { p.x += (dx/dist)*8; p.y += (dy/dist)*8; }
            } else if (p.type === 'converge') {
                const dx = p.tx - p.x, dy = p.ty - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 2) { p.x += (dx/dist)*p.speed; p.y += (dy/dist)*p.speed; }
                p.life -= p.decay;
            } else if (p.type === 'text') {
                p.x += p.vx; p.y += p.vy; p.vy += 0.015; p.life -= p.decay;
                p.scale = p.scale !== undefined ? Math.max(1, p.scale - 0.06) : 1;
            } else if (p.type === 'swipe') {
                p.life -= p.decay;
            } else {
                p.x += p.vx || 0; p.y += p.vy || 0;
                if (p.gravity) {
                    p.vz = (p.vz || 0) - p.gravity;
                    p.z = (p.z || 0) + p.vz;
                    if (p.z < 0) { p.z = 0; p.vz *= -(p.bounce || 0); if (Math.abs(p.vz) < 0.3) p.vz = 0; }
                }
                if (p.friction) { p.vx *= p.friction; p.vy *= p.friction; }
                else if (p.type === 'dust') { p.vy += 0.08; }
                if (p.rot !== undefined) p.rot += p.rotSpeed || 0;
                p.life -= p.decay;
            }
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    },
};
