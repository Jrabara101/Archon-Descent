// ============================================================================
// --- INPUT: KEYBOARD, TAP-TO-PATH, GAMEPAD ---
// Buttons and menus are React's job; the engine only listens to the keyboard,
// the canvas, and the gamepad, and ignores all of them while a modal is open.
// ============================================================================
import { AStar } from './astar.js';

const MOVES = {
    ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
    ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
};

export const inputMethods = {
    canAct() {
        return !!(this.player && this.player.hp > 0 && !this.paused && !this.transition && !this.gameOverHandled && !this.ui.isBlocking());
    },

    bindInput() {
        this._onKeyDown = e => {
            // Let form fields and React-owned controls keep their keys
            const tag = e.target && e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            if (e.key === 'Escape') { if (this.handleEscape()) e.preventDefault(); return; }
            if (e.key === 'p' || e.key === 'P') { if (this.ui.getRoute && this.ui.getRoute() === 'play') this.togglePause(); return; }
            if (!this.canAct()) return;
            const mv = MOVES[e.key];
            if (mv) { e.preventDefault(); this.executeTurn(mv[0], mv[1]); return; }
            if (e.key === '1') { e.preventDefault(); this.useSkill(); }
            else if (e.key === '2' || e.key === 'q' || e.key === 'Q') { e.preventDefault(); this.usePotion('hp'); }
            else if (e.key === '3' || e.key === 'e' || e.key === 'E') { e.preventDefault(); this.usePotion('mp'); }
            else if (e.key === '4') { e.preventDefault(); this.useSkill2(); }
            else if (e.key === '5') { e.preventDefault(); this.useUltimate(); }
            else if (e.key === ' ' || e.key === '.') { e.preventDefault(); this.waitTurn(); }
        };
        document.addEventListener('keydown', this._onKeyDown);

        // Tap / click a visible tile to walk there along an A* path
        const handleTapMove = (clientX, clientY) => {
            if (!this.canAct()) return;
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = (clientX - rect.left) * (this.canvas.width / rect.width);
            const mouseY = (clientY - rect.top) * (this.canvas.height / rect.height);
            const camX = this.camX === null ? 0 : this.camX;
            const camY = this.camY === null ? 0 : this.camY;
            const targetX = Math.floor(mouseX / this.tileSize + camX);
            const targetY = Math.floor(mouseY / this.tileSize + camY);
            if (targetX < 0 || targetX >= this.mapWidth || targetY < 0 || targetY >= this.mapHeight) return;
            if (this.map[targetY][targetX] === 0 || this.fog[targetY][targetX] === 0) return;
            // Tapping an adjacent tile acts on it directly (attack, open, talk) instead of pathing
            const dx = targetX - this.player.x, dy = targetY - this.player.y;
            if (Math.abs(dx) + Math.abs(dy) === 1) { this.executeTurn(dx, dy); return; }
            const path = AStar.findPath(this.map, this.mapWidth, this.mapHeight, this.player, { x: targetX, y: targetY });
            if (path.length > 0) this.player.path = path;
        };
        this._onClick = e => handleTapMove(e.clientX, e.clientY);
        this._onTouchEnd = e => {
            if (e.changedTouches.length === 0) return;
            e.preventDefault();
            const t = e.changedTouches[0];
            handleTapMove(t.clientX, t.clientY);
        };
        this.canvas.addEventListener('click', this._onClick);
        this.canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });
    },

    unbindInput() {
        document.removeEventListener('keydown', this._onKeyDown);
        this.canvas.removeEventListener('click', this._onClick);
        this.canvas.removeEventListener('touchend', this._onTouchEnd);
    },

    // Spend a turn standing still (lets enemies come to you, ticks cooldowns).
    waitTurn() {
        if (!this.canAct()) return;
        this.player.path = [];
        this.logMessage('You hold your ground.', 'log-system');
        this.postTurnSystems();
    },

    // Escape closes the top modal if it allows it, otherwise toggles pause.
    // Returns true when the key was consumed.
    handleEscape() {
        const top = this.ui.topModal();
        if (top) {
            if (top.type === 'pause') { this.togglePause(); return true; }
            if (top.props && top.props.dismissible) { this.ui.closeModal(); return true; }
            if (top.type === 'shop' || top.type === 'anvil') { this.ui.closeModal(); return true; }
            if (top.type === 'forge') { this.declineForgeSwap(); return true; }
            return false; // talent drafts, route choices and end screens need an explicit choice
        }
        if (this.player && this.player.hp > 0 && !this.gameOverHandled && !this.ui.isBlocking()) {
            this.togglePause();
            return true;
        }
        return false;
    },

    // Gamepad: D-pad / left stick to move, face buttons for abilities and potions,
    // RB for the ultimate, Start to pause. Polled each frame because browsers only
    // report live button state inside a polling loop.
    pollGamepad(now) {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = pads && Array.from(pads).find(Boolean);
        if (!gp) return;

        const pressed = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
        if (!this._gpPrevButtons) this._gpPrevButtons = [];
        const justPressed = i => pressed(i) && !this._gpPrevButtons[i];

        if (justPressed(9)) this.togglePause();

        if (this.canAct()) {
            let dx = 0, dy = 0;
            if (pressed(14)) dx = -1; else if (pressed(15)) dx = 1;
            else if (gp.axes[0] < -0.5) dx = -1; else if (gp.axes[0] > 0.5) dx = 1;
            if (pressed(12)) dy = -1; else if (pressed(13)) dy = 1;
            else if (gp.axes[1] < -0.5) dy = -1; else if (gp.axes[1] > 0.5) dy = 1;
            if (dx !== 0 && dy !== 0) dy = 0; // movement is 4-directional

            if (!this._gpLastMove) this._gpLastMove = 0;
            if ((dx !== 0 || dy !== 0) && now - this._gpLastMove > 160) {
                this._gpLastMove = now;
                this.executeTurn(dx, dy);
            }

            if (justPressed(0)) this.useSkill();       // A / Cross
            if (justPressed(1)) this.usePotion('hp');  // B / Circle
            if (justPressed(2)) this.usePotion('mp');  // X / Square
            if (justPressed(3)) this.useSkill2();      // Y / Triangle
            if (justPressed(5)) this.useUltimate();    // RB / R1
        }

        this._gpPrevButtons = gp.buttons.map(b => b.pressed);
    },
};
