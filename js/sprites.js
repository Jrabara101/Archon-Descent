// ============================================================================
// --- TEXTURE, SPRITE & LIGHTING CACHE ENGINE ---
// ============================================================================

class TextureCache {
    constructor(tileSize) {
        this.tileSize = tileSize;
        this.biomes = {
            catacombs: { floor: ['#1e293b', '#0f172a'], wall: ['#0f172a', '#1e293b', '#334155'] },
            forges:    { floor: ['#451a03', '#290b02'], wall: ['#7c2d12', '#9a3412', '#431407'] },
            void:      { floor: ['#2e1065', '#17053b'], wall: ['#4c1d95', '#5b21b6', '#2e1065'] }
        };
        this.currentBiome = 'catacombs';
        this.generateCanvases();
    }

    setBiome(biomeId) {
        if (this.currentBiome === biomeId && this.floorCanvas && this.wallCanvas) return;
        this.currentBiome = biomeId;
        this.generateCanvases();
    }

    generateCanvases() {
        this.floorCanvas = this.createFloorCanvas();
        this.wallCanvas = this.createWallCanvas();
    }

    createFloorCanvas() {
        const c = document.createElement('canvas');
        c.width = this.tileSize * 4;
        c.height = this.tileSize;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        const b = this.biomes[this.currentBiome] || this.biomes.catacombs;

        for (let i = 0; i < 4; i++) {
            const ox = i * this.tileSize;
            ctx.fillStyle = b.floor[0];
            ctx.fillRect(ox, 0, this.tileSize, this.tileSize);
            ctx.strokeStyle = b.floor[1];
            ctx.lineWidth = 1;
            ctx.strokeRect(ox, 0, this.tileSize, this.tileSize);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.beginPath();
            if (i === 1) {
                ctx.moveTo(ox + 4, 8);
                ctx.lineTo(ox + 16, 20);
                ctx.lineTo(ox + 28, 14);
            } else if (i === 2) {
                ctx.moveTo(ox + 8, 24);
                ctx.lineTo(ox + 20, 10);
            } else if (i === 3) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.fillRect(ox + 8, 8, 4, 4);
                ctx.fillRect(ox + 20, 18, 6, 4);
            }
            ctx.stroke();
        }
        return c;
    }

    createWallCanvas() {
        const c = document.createElement('canvas');
        c.width = this.tileSize * 3;
        c.height = this.tileSize;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        const b = this.biomes[this.currentBiome] || this.biomes.catacombs;

        for (let i = 0; i < 3; i++) {
            const ox = i * this.tileSize;
            ctx.fillStyle = b.wall[0];
            ctx.fillRect(ox, 0, this.tileSize, this.tileSize);
            ctx.fillStyle = b.wall[1];
            ctx.fillRect(ox + 2, 2, this.tileSize - 4, this.tileSize - 4);
            ctx.strokeStyle = b.wall[2];
            ctx.lineWidth = 1;
            ctx.strokeRect(ox + 2, 2, this.tileSize - 4, this.tileSize - 4);
            ctx.strokeStyle = b.wall[0];
            ctx.beginPath();
            ctx.moveTo(ox + this.tileSize / 2, 2);
            ctx.lineTo(ox + this.tileSize / 2, this.tileSize - 2);
            ctx.moveTo(ox + 2, this.tileSize / 2);
            ctx.lineTo(ox + this.tileSize - 2, this.tileSize / 2);
            ctx.stroke();
        }
        return c;
    }
}

// Procedural pixel-art player sprite walk cycle generator
class PlayerSpriteCache {
    constructor(tileSize) {
        this.tileSize = tileSize;
        this.px = Math.max(2, Math.floor(tileSize / 16));
        this.sheets = {};
        this.flashCache = new Map();
    }

    getSheet(color) {
        if (!this.sheets[color]) this.sheets[color] = this.buildSheet(color);
        return this.sheets[color];
    }

    getFlashFrame(sourceCanvas) {
        if (this.flashCache.has(sourceCanvas)) return this.flashCache.get(sourceCanvas);
        const c = document.createElement('canvas');
        c.width = sourceCanvas.width;
        c.height = sourceCanvas.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(sourceCanvas, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        this.flashCache.set(sourceCanvas, c);
        return c;
    }

    buildSheet(color) {
        const dirs = ['down', 'up', 'left', 'right'];
        const sheet = {};
        dirs.forEach(dir => {
            sheet[dir] = [0, 1].map(frame => this.drawFrame(color, dir, frame));
        });
        return sheet;
    }

    drawFrame(color, dir, frame) {
        const size = this.tileSize;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        const p = this.px;
        const cx = size / (2 * p);
        const cyOff = (size / p - 14) / 2;
        const skin = '#e0ac7c';
        const strideUp = frame === 1;

        const block = (bx, by, w, h) => ctx.fillRect((cx + bx) * p, (cyOff + by) * p, w * p, h * p);

        // Legs
        ctx.fillStyle = '#1e293b';
        block(-1.8, strideUp ? 10.5 : 9.5, 1.6, strideUp ? 2.5 : 3.5);
        block(0.2, strideUp ? 9.5 : 10.5, 1.6, strideUp ? 3.5 : 2.5);

        // Torso
        ctx.fillStyle = color;
        block(-2, 5, 4, 5.5);

        // Arms
        block(-3, strideUp ? 6 : 5.5, 1, 3.5);
        block(2, strideUp ? 5.5 : 6, 1, 3.5);

        // Head + helmet
        ctx.fillStyle = skin;
        block(-1.3, 1.5, 2.6, 3.2);
        ctx.fillStyle = color;
        block(-1.6, 1, 3.2, 1.3);

        // Facing shading
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        if (dir === 'up') block(-2, 5, 4, 9.5);
        else if (dir === 'left') block(0.2, 1, 2.8, 13);
        else if (dir === 'right') block(-2, 1, 2.8, 13);

        // Eyes
        if (dir === 'down') {
            ctx.fillStyle = '#1e293b';
            block(-0.8, 2.6, 0.7, 0.7);
            block(0.3, 2.6, 0.7, 0.7);
        }

        return c;
    }
}

// Pre-baked Glow Halos replacing slow software ctx.shadowBlur
class GlowHaloCache {
    constructor() {
        this.cache = new Map();
    }

    getGlow(color, radius = 32) {
        const key = `${color}_${radius}`;
        if (this.cache.has(key)) return this.cache.get(key);

        const size = radius * 2;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');

        const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
        grad.addColorStop(0, color);
        grad.addColorStop(0.4, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, Math.PI * 2);
        ctx.fill();

        this.cache.set(key, c);
        return c;
    }
}

// Pre-baked Lighting Discs for lighting pass
class LightStampCache {
    constructor() {
        this.cache = new Map();
    }

    getLightDisc(radius) {
        const r = Math.max(16, Math.round(radius));
        if (this.cache.has(r)) return this.cache.get(r);

        const size = r * 2;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');

        const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.85)');
        grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.3)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.fill();

        this.cache.set(r, c);
        return c;
    }

    getTorchDisc(radius = 100) {
        const r = Math.round(radius);
        const key = `torch_${r}`;
        if (this.cache.has(key)) return this.cache.get(key);

        const size = r * 2;
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');

        const grad = ctx.createRadialGradient(r, r, 5, r, r, r);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        grad.addColorStop(0.4, 'rgba(0, 0, 0, 0.7)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.fill();

        this.cache.set(key, c);
        return c;
    }
}
