// ============================================================================
// --- SKILL SVG ICONS & IN-WORLD SVG EFFECTS ---
// Replaces the emoji ability icons with animated inline SVG, and adds a
// vector effect layer above the game canvas for skill casts.
// ============================================================================

// --- Per-class ability icon art -------------------------------------------
// Each entry: [slot1, slot2, ultimate]. Paths are authored on a 0 0 24 24 grid.
// `accent` drives the glow/cooldown-ring color for that class.
const SKILL_ICON_ART = {
    warrior: {
        accent: '#ef4444',
        icons: [
            { name: 'Shield Slam', motion: 'slam', svg: `
                <path class="fx-fill" d="M12 2.6 20 5.4v6.1c0 4.7-3.2 8.6-8 9.9-4.8-1.3-8-5.2-8-9.9V5.4Z"/>
                <path class="fx-stroke" d="M12 2.6 20 5.4v6.1c0 4.7-3.2 8.6-8 9.9-4.8-1.3-8-5.2-8-9.9V5.4Z"/>
                <path class="fx-stroke fx-detail" d="M12 6.5v9M8 10h8"/>` },
            { name: 'Battle Cry', motion: 'cry', svg: `
                <path class="fx-fill" d="M4 9.5 11 6v12L4 14.5Z"/>
                <path class="fx-stroke" d="M4 9.5 11 6v12L4 14.5Z"/>
                <path class="fx-stroke fx-wave" d="M14 8.5c1.9 2 1.9 5 0 7"/>
                <path class="fx-stroke fx-wave fx-wave-2" d="M17 6c3.3 3.3 3.3 8.7 0 12"/>` },
            { name: 'Earthshatter', motion: 'quake', svg: `
                <path class="fx-fill" d="M12 2.5 14.6 9h6.6l-5.3 4 2 6.6L12 15.8 6.1 19.6l2-6.6L2.8 9h6.6Z"/>
                <path class="fx-stroke" d="M12 2.5 14.6 9h6.6l-5.3 4 2 6.6L12 15.8 6.1 19.6l2-6.6L2.8 9h6.6Z"/>` }
        ]
    },
    mage: {
        accent: '#a855f7',
        icons: [
            { name: 'Fireball', motion: 'flame', svg: `
                <path class="fx-fill" d="M12 2.5c3.4 3.4 5.6 6 5.6 9.4a5.6 5.6 0 1 1-11.2 0c0-2 .8-3.6 2.2-5.2.3 1.4 1 2.2 2 2.5-.5-2.6.1-4.8 1.4-6.7Z"/>
                <path class="fx-stroke" d="M12 2.5c3.4 3.4 5.6 6 5.6 9.4a5.6 5.6 0 1 1-11.2 0c0-2 .8-3.6 2.2-5.2.3 1.4 1 2.2 2 2.5-.5-2.6.1-4.8 1.4-6.7Z"/>
                <path class="fx-core" d="M12 12.4c1.5 1.6 2.3 2.8 2.3 4a2.3 2.3 0 1 1-4.6 0c0-1.2.8-2.4 2.3-4Z"/>` },
            { name: 'Frost Nova', motion: 'frost', svg: `
                <path class="fx-stroke fx-detail" d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17"/>
                <path class="fx-stroke fx-detail" d="M12 6.4 9.6 4M12 6.4 14.4 4M12 17.6 9.6 20M12 17.6l2.4 2.4"/>
                <circle class="fx-fill" cx="12" cy="12" r="2.6"/>` },
            { name: 'Meteor', motion: 'meteor', svg: `
                <circle class="fx-fill" cx="15" cy="9" r="5"/>
                <circle class="fx-stroke" cx="15" cy="9" r="5"/>
                <path class="fx-stroke fx-trail" d="M9.4 14.6 3 21M12 17l-3 3M6 12l-3 3"/>` }
        ]
    },
    rogue: {
        accent: '#34d399',
        icons: [
            { name: 'Shadowstep', motion: 'blink', svg: `
                <path class="fx-fill fx-ghost" d="M7 4.5c2.2 0 4 1.8 4 4v11H3v-11c0-2.2 1.8-4 4-4Z"/>
                <path class="fx-fill" d="M16 4.5c2.2 0 4 1.8 4 4v11h-8v-11c0-2.2 1.8-4 4-4Z"/>
                <path class="fx-stroke" d="M16 4.5c2.2 0 4 1.8 4 4v11h-8v-11c0-2.2 1.8-4 4-4Z"/>` },
            { name: 'Poison Blade', motion: 'drip', svg: `
                <path class="fx-fill" d="M13.5 2.5 17 6 8 20l-2.6-2.6Z"/>
                <path class="fx-stroke" d="M13.5 2.5 17 6 8 20l-2.6-2.6Z"/>
                <circle class="fx-core fx-drop" cx="18.5" cy="14" r="2.2"/>` },
            { name: 'Assassins Mark', motion: 'mark', svg: `
                <path class="fx-fill" d="M12 3.5c2.4 2.6 3.8 4.6 3.8 6.6a3.8 3.8 0 1 1-7.6 0c0-2 1.4-4 3.8-6.6Z"/>
                <path class="fx-stroke fx-detail" d="M7.5 15.5 12 20l4.5-4.5"/>
                <circle class="fx-core" cx="12" cy="10.4" r="1.4"/>` }
        ]
    },
    paladin: {
        accent: '#facc15',
        icons: [
            { name: 'Holy Strike', motion: 'holy', svg: `
                <path class="fx-fill" d="M10.6 2.5h2.8v6.2h6.1v2.8h-6.1V21.5h-2.8V11.5H4.5V8.7h6.1Z"/>
                <path class="fx-stroke" d="M10.6 2.5h2.8v6.2h6.1v2.8h-6.1V21.5h-2.8V11.5H4.5V8.7h6.1Z"/>
                <circle class="fx-halo" cx="12" cy="10" r="8.4"/>` },
            { name: 'Lay on Hands', motion: 'mend', svg: `
                <path class="fx-fill" d="M12 20.5C6.5 16.8 3.5 13.8 3.5 10.2A4.7 4.7 0 0 1 12 7.4a4.7 4.7 0 0 1 8.5 2.8c0 3.6-3 6.6-8.5 10.3Z"/>
                <path class="fx-stroke" d="M12 20.5C6.5 16.8 3.5 13.8 3.5 10.2A4.7 4.7 0 0 1 12 7.4a4.7 4.7 0 0 1 8.5 2.8c0 3.6-3 6.6-8.5 10.3Z"/>` },
            { name: 'Divine Judgment', motion: 'judge', svg: `
                <path class="fx-stroke fx-detail" d="M12 3v18M5 7h14M7.5 7 5 13h5ZM16.5 7 14 13h5Z"/>
                <circle class="fx-fill" cx="12" cy="3.6" r="1.8"/>` }
        ]
    },
    necromancer: {
        accent: '#a78bfa',
        icons: [
            { name: 'Raise Skeleton', motion: 'raise', svg: `
                <path class="fx-fill" d="M12 3a7 7 0 0 1 7 7v3.4l-2 1.2v3.2H7v-3.2l-2-1.2V10a7 7 0 0 1 7-7Z"/>
                <path class="fx-stroke" d="M12 3a7 7 0 0 1 7 7v3.4l-2 1.2v3.2H7v-3.2l-2-1.2V10a7 7 0 0 1 7-7Z"/>
                <circle class="fx-eye" cx="9.5" cy="10.5" r="1.7"/>
                <circle class="fx-eye fx-eye-2" cx="14.5" cy="10.5" r="1.7"/>` },
            { name: 'Drain Life', motion: 'drain', svg: `
                <path class="fx-fill" d="M12 2.8c3.6 4.3 5.6 7 5.6 9.5a5.6 5.6 0 1 1-11.2 0c0-2.5 2-5.2 5.6-9.5Z"/>
                <path class="fx-stroke" d="M12 2.8c3.6 4.3 5.6 7 5.6 9.5a5.6 5.6 0 1 1-11.2 0c0-2.5 2-5.2 5.6-9.5Z"/>
                <path class="fx-core fx-siphon" d="M12 8.5v7"/>` },
            { name: 'Grave Tide', motion: 'tide', svg: `
                <path class="fx-fill" d="M6 20V9.5a6 6 0 0 1 12 0V20Z"/>
                <path class="fx-stroke" d="M6 20V9.5a6 6 0 0 1 12 0V20Z"/>
                <path class="fx-stroke fx-detail" d="M9.5 20v-4M14.5 20v-4M12 20V14"/>` }
        ]
    },
    ranger: {
        accent: '#14b8a6',
        icons: [
            { name: 'Piercing Shot', motion: 'shot', svg: `
                <path class="fx-stroke fx-shaft" d="M3.5 20.5 20 4"/>
                <path class="fx-fill" d="M20.5 3.5 21 9l-5.5-.5Z"/>
                <path class="fx-stroke fx-detail" d="M4 15.5 8.5 20M7 13l4 4"/>` },
            { name: 'Snare Trap', motion: 'snap', svg: `
                <circle class="fx-stroke" cx="12" cy="12" r="7.5"/>
                <path class="fx-stroke fx-jaw" d="M12 4.5 9.5 9h5ZM12 19.5 9.5 15h5ZM4.5 12 9 9.5v5ZM19.5 12 15 9.5v5Z"/>
                <circle class="fx-core" cx="12" cy="12" r="1.8"/>` },
            { name: 'Arrow Storm', motion: 'storm', svg: `
                <path class="fx-stroke fx-rain" d="M5 3.5 5 13M12 2.5 12 13M19 3.5 19 13"/>
                <path class="fx-fill" d="M5 16.5 2.8 12h4.4ZM12 15.5 9.8 11h4.4ZM19 16.5 16.8 12h4.4Z"/>` }
        ]
    }
};

// Rendered once per belt slot. viewBox is fixed so every icon shares a grid.
function buildSkillIconSVG(art, accent) {
    return `<svg class="skill-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"
              style="--skill-accent:${accent}">
                <g class="skill-art skill-motion-${art.motion}">${art.svg}</g>
            </svg>`;
}

// Cooldown ring is a separate SVG so it can sit above the art without
// inheriting its motion transforms.
function buildCooldownRingSVG() {
    return `<svg class="cd-ring" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
                <circle class="cd-ring-track" cx="22" cy="22" r="19.5"/>
                <circle class="cd-ring-fill" cx="22" cy="22" r="19.5"/>
            </svg>`;
}

const CD_RING_CIRCUMFERENCE = 2 * Math.PI * 19.5;

function attachSkillFXMethods(proto) {

    // ---- Belt icon installation ------------------------------------------
    proto.installSkillIcons = function(playerClass) {
        const set = SKILL_ICON_ART[playerClass];
        if (!set) return;
        this.skillIconMeta = { accent: set.accent, icons: set.icons };

        const slots = ['ability-1', 'ability-2', 'ability-ult'];
        const hotkeys = [1, 4, 5];
        slots.forEach((slotId, i) => {
            const slot = document.getElementById(slotId);
            if (!slot) return;
            const art = set.icons[i];
            if (!art) return;

            slot.classList.add('svg-skill-slot');
            slot.style.setProperty('--skill-accent', set.accent);
            slot.setAttribute('title', `${art.name} (Hotkey: ${hotkeys[i]})`);

            const iconHost = slot.querySelector('.icon');
            if (iconHost) {
                iconHost.innerHTML = buildSkillIconSVG(art, set.accent);
                iconHost.classList.add('svg-icon-host');
            }

            // Insert the ring once, behind the numeric cooldown overlay.
            if (!slot.querySelector('.cd-ring')) {
                const overlay = slot.querySelector('.cooldown-overlay');
                const wrap = document.createElement('div');
                wrap.className = 'cd-ring-wrap';
                wrap.innerHTML = buildCooldownRingSVG();
                slot.insertBefore(wrap, overlay || null);
            }
        });
        this.updateSkillIconStates();
    };

    // ---- Cooldown ring + ready-state driving ------------------------------
    proto.updateSkillIconStates = function() {
        if (!this.player) return;
        const p = this.player;
        const specs = [
            { id: 'ability-1', cd: p.skillCooldown, max: p.maxSkillCooldown, locked: false },
            { id: 'ability-2', cd: p.skillCooldown2, max: p.maxSkillCooldown2, locked: false },
            { id: 'ability-ult', cd: p.ultimateCooldown, max: p.maxUltimateCooldown, locked: p.lvl < 10 }
        ];

        specs.forEach(spec => {
            const slot = document.getElementById(spec.id);
            if (!slot || !slot.classList.contains('svg-skill-slot')) return;

            const ring = slot.querySelector('.cd-ring-fill');
            const max = spec.max || 1;
            const frac = spec.locked ? 1 : Math.max(0, Math.min(1, spec.cd / max));

            if (ring) {
                ring.style.strokeDasharray = `${CD_RING_CIRCUMFERENCE}`;
                // The arc shows remaining cooldown and sweeps away as cd drops.
                ring.style.strokeDashoffset = `${CD_RING_CIRCUMFERENCE * (1 - frac)}`;
            }

            const onCooldown = !spec.locked && spec.cd > 0;
            slot.classList.toggle('skill-cooling', onCooldown);
            slot.classList.toggle('skill-locked', !!spec.locked);
            slot.classList.toggle('skill-ready', !onCooldown && !spec.locked);
        });
    };

    // Fired the moment a skill actually goes off — pops the icon.
    proto.pulseSkillIcon = function(slotId) {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        slot.classList.remove('skill-fired');
        // Force reflow so the animation restarts on rapid re-casts.
        void slot.offsetWidth;
        slot.classList.add('skill-fired');
        setTimeout(() => slot.classList.remove('skill-fired'), 520);
    };

    // ---- In-world SVG effect layer ----------------------------------------
    proto.initSkillFXLayer = function() {
        let layer = document.getElementById('skill-fx-layer');
        if (!layer) {
            layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            layer.setAttribute('id', 'skill-fx-layer');
            layer.setAttribute('aria-hidden', 'true');
            // Sit directly after the canvas in whatever wrapper actually holds
            // it, so the layer inherits the same stacking context.
            const canvas = document.getElementById('gameCanvas');
            if (canvas && canvas.parentNode) {
                canvas.parentNode.insertBefore(layer, canvas.nextSibling);
            } else {
                const container = document.querySelector('.game-view-container');
                if (container) container.appendChild(layer);
            }
        }
        this.fxLayer = layer;
        layer.innerHTML = `
            <defs>
                <radialGradient id="fx-glow-grad">
                    <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
                    <stop offset="45%" stop-color="#fff" stop-opacity="0.45"/>
                    <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
                </radialGradient>
                <mask id="fx-glow-mask" maskContentUnits="objectBoundingBox">
                    <circle cx="0.5" cy="0.5" r="0.5" fill="url(#fx-glow-grad)"/>
                </mask>
            </defs>`;
        this.fxWorld = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        layer.appendChild(this.fxWorld);
        this.resizeSkillFXLayer();
    };

    proto.resizeSkillFXLayer = function() {
        if (!this.fxLayer) return;
        this.fxLayer.setAttribute('width', window.innerWidth);
        this.fxLayer.setAttribute('height', window.innerHeight);
        this.fxLayer.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
    };

    // Called each frame with the same camera offset the canvas uses, so vector
    // effects stay locked to world tiles (including screen shake).
    proto.syncSkillFXCamera = function(ox, oy) {
        if (this.fxWorld) this.fxWorld.setAttribute('transform', `translate(${ox} ${oy})`);
    };

    // Adds one SVG effect node and removes it when its animation ends.
    proto.addWorldFX = function(markup, lifeMs) {
        if (!this.fxWorld) return null;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'fx-node');
        g.innerHTML = markup;
        this.fxWorld.appendChild(g);
        setTimeout(() => { if (g.parentNode) g.parentNode.removeChild(g); }, lifeMs);
        return g;
    };

    proto.tileCenter = function(x, y) {
        return { cx: (x + 0.5) * this.tileSize, cy: (y + 0.5) * this.tileSize };
    };

    // --- Effect vocabulary -------------------------------------------------

    // Expanding ring — novas, shockwaves, ground slams.
    proto.fxNova = function(x, y, color, radiusTiles = 3, ms = 620) {
        const { cx, cy } = this.tileCenter(x, y);
        const r = radiusTiles * this.tileSize;
        this.addWorldFX(`
            <circle class="fx-nova-ring" cx="${cx}" cy="${cy}" r="${r}"
                    stroke="${color}" style="--fx-ms:${ms}ms"/>
            <circle class="fx-nova-glow" cx="${cx}" cy="${cy}" r="${r}"
                    fill="${color}" mask="url(#fx-glow-mask)" style="--fx-ms:${ms}ms"/>`, ms + 60);
    };

    // Rotating rune circle under the caster — windups and channels.
    proto.fxCastCircle = function(x, y, color, ms = 900) {
        const { cx, cy } = this.tileCenter(x, y);
        const r = this.tileSize * 1.15;
        this.addWorldFX(`
            <g class="fx-cast-circle" style="--fx-ms:${ms}ms"
               transform="translate(${cx} ${cy})">
                <circle r="${r}" stroke="${color}" class="fx-cast-outer"/>
                <circle r="${r * 0.66}" stroke="${color}" class="fx-cast-inner"/>
                <path class="fx-cast-runes" stroke="${color}"
                      d="M${-r} 0h${r * 0.3}M${r * 0.7} 0h${r * 0.3}M0 ${-r}v${r * 0.3}M0 ${r * 0.7}v${r * 0.3}"/>
            </g>`, ms + 60);
    };

    // Straight beam between two tiles — bolts, piercing shots, drains.
    proto.fxBeam = function(fromX, fromY, toX, toY, color, ms = 420) {
        const a = this.tileCenter(fromX, fromY);
        const b = this.tileCenter(toX, toY);
        this.addWorldFX(`
            <line class="fx-beam-glow" x1="${a.cx}" y1="${a.cy}" x2="${b.cx}" y2="${b.cy}"
                  stroke="${color}" style="--fx-ms:${ms}ms"/>
            <line class="fx-beam-core" x1="${a.cx}" y1="${a.cy}" x2="${b.cx}" y2="${b.cy}"
                  stroke="${color}" style="--fx-ms:${ms}ms"/>`, ms + 60);
    };

    // Curved slash arc across a target tile — melee skills.
    proto.fxSlash = function(fromX, fromY, toX, toY, color, ms = 340) {
        const a = this.tileCenter(fromX, fromY);
        const b = this.tileCenter(toX, toY);
        const angle = Math.atan2(b.cy - a.cy, b.cx - a.cx) * 180 / Math.PI;
        const r = this.tileSize * 0.9;
        this.addWorldFX(`
            <g class="fx-slash" style="--fx-ms:${ms}ms"
               transform="translate(${b.cx} ${b.cy}) rotate(${angle})">
                <path stroke="${color}" d="M${-r * 0.2} ${-r} A ${r} ${r} 0 0 1 ${-r * 0.2} ${r}"/>
            </g>`, ms + 60);
    };

    // Impact burst at a tile — hit confirmation on top of canvas particles.
    proto.fxImpact = function(x, y, color, ms = 380) {
        const { cx, cy } = this.tileCenter(x, y);
        const r = this.tileSize * 0.75;
        let spokes = '';
        for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2;
            spokes += `<line x1="${Math.cos(ang) * r * 0.3}" y1="${Math.sin(ang) * r * 0.3}"
                             x2="${Math.cos(ang) * r}" y2="${Math.sin(ang) * r}" stroke="${color}"/>`;
        }
        this.addWorldFX(`
            <g class="fx-impact" style="--fx-ms:${ms}ms" transform="translate(${cx} ${cy})">
                ${spokes}
            </g>`, ms + 60);
    };

    // Rising motes — buffs, heals, resurrections.
    proto.fxUplift = function(x, y, color, count = 7, ms = 780) {
        const { cx, cy } = this.tileCenter(x, y);
        let motes = '';
        for (let i = 0; i < count; i++) {
            const dx = (Math.random() - 0.5) * this.tileSize * 1.4;
            const delay = Math.random() * 220;
            const rise = this.tileSize * (1.2 + Math.random() * 0.8);
            motes += `<circle class="fx-mote" cx="${cx + dx}" cy="${cy + this.tileSize * 0.4}"
                              r="${2 + Math.random() * 2.5}" fill="${color}"
                              style="--fx-ms:${ms}ms; --fx-delay:${delay}ms; --fx-rise:${rise}px"/>`;
        }
        this.addWorldFX(motes, ms + 300);
    };

    // Descending strike column — meteors, judgment, arrow storms.
    proto.fxSkyfall = function(x, y, color, ms = 520) {
        const { cx, cy } = this.tileCenter(x, y);
        const w = this.tileSize * 0.55;
        const h = this.tileSize * 6;
        this.addWorldFX(`
            <g class="fx-skyfall" style="--fx-ms:${ms}ms">
                <rect x="${cx - w / 2}" y="${cy - h}" width="${w}" height="${h}"
                      fill="${color}" class="fx-skyfall-beam"/>
            </g>`, ms + 60);
        setTimeout(() => this.fxNova(x, y, color, 1.6, 420), ms * 0.55);
    };
}
