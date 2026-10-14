import { useEffect, useRef, useState } from 'react';
import { Play, Swords, CalendarDays, Landmark, BookOpen, Settings as SettingsIcon, Sparkles, Hammer, Layers } from 'lucide-react';
import { ui } from '../bridge/store.js';
import { useMeta } from '../bridge/engine.js';
import { CLASS_ART, Modal, depthCode, useAutoFocus } from '../components/ui.jsx';
import { CLASS_INFO, GAME_VERSION, CHANGELOG_ENTRIES } from '../game/data.js';

const SEEN_KEY = 'archonDescent_lastSeenVersion';

function Wordmark() {
    return (
        <h1 className="wordmark" aria-label="Archon's Descent">
            <span className="wordmark__top" aria-hidden="true">Archon's</span>
            <span className="wordmark__fall" aria-hidden="true">
                {'DESCENT'.split('').map((ch, i) => <span key={i} style={{ '--i': i }}>{ch}</span>)}
            </span>
        </h1>
    );
}

export default function Title() {
    const { meta, engine } = useMeta();
    const ref = useRef(null);
    const [showNews, setShowNews] = useState(false);
    const [seenVersion, setSeenVersion] = useState(() => { try { return localStorage.getItem(SEEN_KEY); } catch (e) { return GAME_VERSION; } });
    useAutoFocus(ref, [!!engine]);

    useEffect(() => {
        if (seenVersion !== GAME_VERSION && engine) setShowNews(true);
    }, [engine, seenVersion]);

    if (!engine) return <main className="page title-page" />;

    const save = engine.getAutosaveSummary();
    const daily = engine.getDailyInfo();
    const featured = save ? save.classType : (meta.runHistory && meta.runHistory[0] ? meta.runHistory[0].cls : 'warrior');
    const totalRuns = (meta.runHistory || []).length;
    const deepest = (meta.stats && meta.stats.maxDepthReached) || 0;

    const closeNews = () => {
        try { localStorage.setItem(SEEN_KEY, GAME_VERSION); } catch (e) {}
        setSeenVersion(GAME_VERSION);
        setShowNews(false);
    };

    return (
        <main ref={ref} className="page title-page">
            <div className="title-page__art" style={{ backgroundImage: `url(${CLASS_ART(featured)})` }} aria-hidden="true" />
            <div className="title-page__shaft" aria-hidden="true">
                <span className="shaft shaft--catacombs" /><span className="shaft shaft--forges" /><span className="shaft shaft--void" />
            </div>

            <div className="title-page__inner">
                <Wordmark />
                <p className="title-page__tag">Six classes, four biomes, one way down. Nothing you carry survives the trip, except what the Archon Hub remembers.</p>

                <nav className="menu" aria-label="Main menu">
                    {save && (
                        <button className="menu__item menu__item--primary" onClick={() => engine.resumeRun()}>
                            <Play size={20} aria-hidden="true" />
                            <span className="menu__label">Continue</span>
                            <span className="menu__meta">{CLASS_INFO[save.classType].name} · level {save.lvl} · {depthCode(save.level)}{save.daily ? ' · daily' : ''}</span>
                        </button>
                    )}
                    <button className={`menu__item${save ? '' : ' menu__item--primary'}`} onClick={() => ui.navigate('classes')}>
                        <Swords size={20} aria-hidden="true" />
                        <span className="menu__label">{save ? 'New descent' : 'Begin the descent'}</span>
                        {save && <span className="menu__meta">Starting over clears your saved run</span>}
                    </button>
                    <button className="menu__item" onClick={() => engine.startDailyChallenge()}>
                        <CalendarDays size={20} aria-hidden="true" />
                        <span className="menu__label">Daily challenge</span>
                        <span className="menu__meta">{daily.key} · {CLASS_INFO[daily.cls].name}{daily.best ? ` · best ${depthCode(daily.best.depth)}` : ''}</span>
                    </button>
                    <div className="menu__row">
                        <button className="menu__item menu__item--small" onClick={() => ui.navigate('modes')}>
                            <Layers size={18} aria-hidden="true" /><span className="menu__label">Modes</span>
                        </button>
                        <button className="menu__item menu__item--small" onClick={() => ui.navigate('hub')}>
                            <Landmark size={18} aria-hidden="true" /><span className="menu__label">Archon Hub</span>
                            <span className="menu__badge num">{meta.souls}</span>
                        </button>
                        <button className="menu__item menu__item--small" onClick={() => ui.navigate('codex', { tab: 'bestiary' })}>
                            <BookOpen size={18} aria-hidden="true" /><span className="menu__label">Codex</span>
                        </button>
                        <button className="menu__item menu__item--small" onClick={() => ui.navigate('settings')}>
                            <SettingsIcon size={18} aria-hidden="true" /><span className="menu__label">Settings</span>
                        </button>
                    </div>
                </nav>

                <footer className="title-page__foot">
                    <span>{totalRuns > 0 ? `${totalRuns} descents recorded · deepest ${depthCode(deepest)}` : 'No descents recorded yet'}</span>
                    <button className="link-btn" onClick={() => setShowNews(true)}>
                        <Sparkles size={14} aria-hidden="true" /> What's new in v{GAME_VERSION}{seenVersion !== GAME_VERSION && <span className="dot" aria-label="unread" />}
                    </button>
                    <button className="link-btn" onClick={() => ui.navigate('forge')}>
                        <Hammer size={14} aria-hidden="true" /> Sprite Forge
                    </button>
                </footer>
            </div>

            {showNews && (
                <Modal title={`What's new in v${GAME_VERSION}`} actions={<button className="btn btn--primary" data-autofocus onClick={closeNews}>Got it</button>}>
                    <ul className="news-list">{CHANGELOG_ENTRIES.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </Modal>
            )}
        </main>
    );
}
