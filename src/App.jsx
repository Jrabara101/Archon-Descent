import { useEffect } from 'react';
import { useStore, ui, getState } from './bridge/store.js';
import { getEngine } from './bridge/engine.js';
import GameStage from './components/GameStage.jsx';
import Toasts from './components/Toasts.jsx';
import GamepadNav from './components/GamepadNav.jsx';
import Title from './pages/Title.jsx';
import ClassSelect from './pages/ClassSelect.jsx';
import Modes from './pages/Modes.jsx';
import Hub from './pages/Hub.jsx';
import Codex from './pages/Codex.jsx';
import Settings from './pages/Settings.jsx';
import SpriteForge from './pages/SpriteForge.jsx';
import Play from './pages/Play.jsx';

const PAGES = {
    title: Title,
    classes: ClassSelect,
    modes: Modes,
    hub: Hub,
    codex: Codex,
    settings: Settings,
    forge: SpriteForge,
    play: Play,
};

// #/codex/bestiary -> { name: 'codex', params: { tab: 'bestiary' } }
function parseHash() {
    const [name, sub] = window.location.hash.replace(/^#\/?/, '').split('/');
    if (!name || !PAGES[name]) return { name: 'title', params: {} };
    return { name, params: sub ? { tab: sub } : {} };
}

function hashFor(route) {
    if (route.name === 'title') return '#/';
    return `#/${route.name}${route.params && route.params.tab ? `/${route.params.tab}` : ''}${route.params && route.params.mode ? `/${route.params.mode}` : ''}`;
}

export default function App() {
    const route = useStore(s => s.route);

    // Deep links and the browser back button drive the route; the run screen can't be
    // entered from a URL because there is no run behind it.
    useEffect(() => {
        const initial = parseHash();
        if (initial.name !== 'play') ui.navigate(initial.name, initial.params);
        const onHash = () => {
            const next = parseHash();
            const current = getState().route;
            if (hashFor(current) === hashFor(next)) return;
            if (current.name === 'play') {
                const engine = getEngine();
                if (engine && engine.player && !engine.gameOverHandled) {
                    engine.returnToTitle();
                    return;
                }
            }
            if (next.name === 'play') { ui.navigate('title'); return; }
            ui.navigate(next.name, next.params);
        };
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    useEffect(() => {
        const target = hashFor(route);
        if (window.location.hash !== target) {
            if (route.name === 'play') history.replaceState(null, '', target);
            else history.pushState(null, '', target);
        }
        document.documentElement.dataset.route = route.name;
    }, [route]);

    const Page = PAGES[route.name] || Title;
    return (
        <>
            <GameStage active={route.name === 'play'} />
            <Page key={route.name} params={route.params} />
            <Toasts />
            <GamepadNav />
        </>
    );
}
