// Single engine instance shared by every page. GameStage creates it once its
// canvases exist; pages call engine methods and read engine.meta / settings.
import { useStore } from './store.js';

let engine = null;
const waiters = new Set();

export function setEngine(e) {
    engine = e;
    waiters.forEach(fn => fn(e));
    waiters.clear();
}

export function getEngine() { return engine; }

export function whenEngine(fn) {
    if (engine) fn(engine);
    else waiters.add(fn);
}

// Re-renders the caller whenever meta-progression or settings change.
export function useMeta() {
    useStore(s => s.metaRev);
    return engine ? { meta: engine.meta, settings: engine.settings, engine } : { meta: null, settings: null, engine: null };
}
