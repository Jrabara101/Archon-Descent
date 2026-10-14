// Bridge between the canvas engine and React.
// The engine pushes UI state here (HUD snapshot, log lines, toasts, modals, route);
// React components read it with useStore(). Nothing in React polls the engine.
import { useSyncExternalStore } from 'react';

const LOG_LIMIT = 80;
const listeners = new Set();
let toastSeq = 0;

let state = {
    route: { name: 'title', params: {} },
    modals: [],          // stack: [{ type, props }]; top of stack owns input
    hud: null,           // plain snapshot built by engine.emitHud()
    log: [],             // [{ id, text, cls }]
    toasts: [],          // [{ id, text }]
    metaRev: 0,          // bumped whenever engine.meta / settings change
    pulse: {},           // slotId -> counter, bumped when a skill fires
};

export function getState() { return state; }

function setState(patch) {
    state = { ...state, ...patch };
    listeners.forEach(l => l());
}

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// Selectors must return values that are stable between unrelated updates
// (a slice of state, not a freshly built object).
export function useStore(selector) {
    return useSyncExternalStore(subscribe, () => selector(state));
}

// The API the engine talks to. Keeping it this narrow means the engine never
// touches the DOM outside its own canvases.
export const ui = {
    navigate(name, params = {}) {
        setState({ route: { name, params }, modals: [] });
    },
    openModal(type, props = {}) {
        // Replace an existing modal of the same type (e.g. shop refresh) instead of stacking it.
        const rest = state.modals.filter(m => m.type !== type);
        setState({ modals: [...rest, { type, props }] });
    },
    closeModal(type) {
        if (!type) setState({ modals: state.modals.slice(0, -1) });
        else setState({ modals: state.modals.filter(m => m.type !== type) });
    },
    closeAllModals() { setState({ modals: [] }); },
    getRoute() { return state.route.name; },
    topModal() { return state.modals[state.modals.length - 1] || null; },
    hasModal(type) { return state.modals.some(m => m.type === type); },
    // True whenever gameplay input must be ignored.
    isBlocking() { return state.route.name !== 'play' || state.modals.length > 0; },
    hud(snapshot) { setState({ hud: snapshot }); },
    log(text, cls = '') {
        const entry = { id: ++toastSeq, text, cls };
        const log = state.log.length >= LOG_LIMIT ? state.log.slice(1) : state.log.slice();
        log.push(entry);
        setState({ log });
    },
    clearLog() { setState({ log: [] }); },
    toast(text, ms = 4200) {
        const id = ++toastSeq;
        // Keep at most two toasts on screen; story beats can arrive back to back.
        setState({ toasts: [...state.toasts.slice(-1), { id, text }] });
        setTimeout(() => setState({ toasts: state.toasts.filter(t => t.id !== id) }), ms);
    },
    metaChanged() { setState({ metaRev: state.metaRev + 1 }); },
    pulse(slotId) { setState({ pulse: { ...state.pulse, [slotId]: (state.pulse[slotId] || 0) + 1 } }); },
};
