import { useEffect } from 'react';
import { getState } from '../bridge/store.js';

// Menu navigation with a controller: D-pad/stick moves focus to the nearest control in
// that direction, A presses it, B acts like Escape. Gameplay input is handled by the
// engine, so this only runs while a page or modal owns the screen.
const FOCUSABLE = 'button:not([disabled]), [href], input:not([type="hidden"]), select, [tabindex]:not([tabindex="-1"])';

function moveFocus(dx, dy) {
    const scope = document.querySelector('.modal-backdrop:last-of-type .modal') || document.querySelector('main.page') || document.body;
    const items = [...scope.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
    if (items.length === 0) return;
    const current = document.activeElement;
    if (!current || !items.includes(current)) { items[0].focus(); return; }
    const a = current.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bestScore = Infinity;
    for (const el of items) {
        if (el === current) continue;
        const b = el.getBoundingClientRect();
        const bx = b.left + b.width / 2, by = b.top + b.height / 2;
        const ddx = bx - ax, ddy = by - ay;
        const along = dx !== 0 ? ddx * dx : ddy * dy;
        if (along <= 4) continue;
        const across = dx !== 0 ? Math.abs(ddy) : Math.abs(ddx);
        const score = along + across * 2;
        if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) { best.focus(); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
}

export default function GamepadNav() {
    useEffect(() => {
        let raf, prev = [], lastMove = 0;
        const tick = now => {
            raf = requestAnimationFrame(tick);
            const pads = navigator.getGamepads ? navigator.getGamepads() : [];
            const gp = pads && Array.from(pads).find(Boolean);
            if (!gp) return;
            const s = getState();
            const menuActive = s.route.name !== 'play' || s.modals.length > 0;
            const pressed = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
            const just = i => pressed(i) && !prev[i];
            if (menuActive) {
                let dx = 0, dy = 0;
                if (pressed(14) || gp.axes[0] < -0.5) dx = -1; else if (pressed(15) || gp.axes[0] > 0.5) dx = 1;
                else if (pressed(12) || gp.axes[1] < -0.5) dy = -1; else if (pressed(13) || gp.axes[1] > 0.5) dy = 1;
                if ((dx || dy) && now - lastMove > 180) { lastMove = now; moveFocus(dx, dy); }
                if (just(0) && document.activeElement && document.activeElement !== document.body) document.activeElement.click();
                if (just(1)) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            }
            prev = gp.buttons.map(b => b.pressed);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, []);
    return null;
}
