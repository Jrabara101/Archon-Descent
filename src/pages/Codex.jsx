import { ui } from '../bridge/store.js';
import { useMeta } from '../bridge/engine.js';
import { PageShell, artUrl, FOE_ART, formatTime, depthCode } from '../components/ui.jsx';
import { BESTIARY_DB, LORE_DB, LORE_CHAPTER_NAMES, LORE_CHAPTER_OF, CLASS_INFO } from '../game/data.js';

const TABS = [
    { id: 'bestiary', label: 'Bestiary' },
    { id: 'lore', label: 'Lore' },
    { id: 'achievements', label: 'Achievements' },
    { id: 'history', label: 'Run history' },
];

function Bestiary({ meta }) {
    const keys = Object.keys(BESTIARY_DB);
    const known = keys.filter(k => (meta.bestiary || {})[k] > 0).length;
    return (
        <>
            <p className="codex__progress">{known} of {keys.length} creatures recorded. Defeat one to learn what it is.</p>
            <div className="bestiary">
                {keys.map(k => {
                    const e = BESTIARY_DB[k];
                    const kills = (meta.bestiary || {})[k] || 0;
                    const seen = kills > 0;
                    return (
                        <article key={k} className={`beast${seen ? '' : ' beast--unknown'}`}>
                            <div className="beast__art">
                                {FOE_ART.has(k)
                                    ? <img src={artUrl(`foe-${k}`, true)} alt="" loading="lazy" />
                                    : <span className="beast__emoji" aria-hidden="true">{seen ? e.icon : '?'}</span>}
                            </div>
                            <div className="beast__text">
                                <h3 className="beast__name">{seen ? e.name : 'Unknown creature'}</h3>
                                {seen && <p className="beast__kills num">Slain {kills}×</p>}
                                <p className="beast__lore">{seen ? e.lore : 'Nothing is known about this creature yet.'}</p>
                            </div>
                        </article>
                    );
                })}
            </div>
        </>
    );
}

function Lore({ meta }) {
    const found = new Set(meta.lore || []);
    return (
        <>
            <p className="codex__progress">{found.size} of {LORE_DB.length} scraps recovered. Watch for 📜 on hostile floors.</p>
            {LORE_CHAPTER_NAMES.map((name, ci) => {
                const pages = LORE_DB.map((t, i) => ({ t, i })).filter(({ i }) => LORE_CHAPTER_OF[i].chapter === ci + 1);
                return (
                    <section key={name} className="lore-chapter">
                        <h3 className="lore-chapter__name">{name}</h3>
                        {pages.map(({ t, i }) => found.has(i)
                            ? <blockquote key={i} className="lore-page">{t}</blockquote>
                            : <p key={i} className="lore-page lore-page--missing">A missing page.</p>)}
                    </section>
                );
            })}
        </>
    );
}

function Achievements({ engine }) {
    const list = engine.getAchievementStatus();
    const done = list.filter(a => a.unlockedAt).length;
    return (
        <>
            <p className="codex__progress">{done} of {list.length} unlocked.</p>
            <ul className="achievements">
                {list.map(a => (
                    <li key={a.id} className={`achievement${a.unlockedAt ? ' achievement--done' : ''}`}>
                        <span className="achievement__icon" aria-hidden="true">{a.unlockedAt ? a.icon : '🔒'}</span>
                        <span className="achievement__name">{a.name}</span>
                        <span className="achievement__desc">{a.desc}</span>
                        <span className="achievement__date">{a.unlockedAt ? new Date(a.unlockedAt).toLocaleDateString() : ''}</span>
                    </li>
                ))}
            </ul>
        </>
    );
}

const MODE_LABEL = { normal: 'Descent', daily: 'Daily', bossrush: 'Boss Rush', endless: 'Endless', trial: 'Trial' };

function History({ meta }) {
    const runs = meta.runHistory || [];
    if (runs.length === 0) {
        return (
            <div className="empty">
                <p>No descents recorded yet. Your last 30 runs will appear here.</p>
                <button className="btn btn--primary" onClick={() => ui.navigate('classes')}>Start a descent</button>
            </div>
        );
    }
    const totalKills = runs.reduce((s, r) => s + (r.kills || 0), 0);
    const depthRuns = runs.filter(r => !r.mode || r.mode === 'normal' || r.mode === 'daily');
    const best = depthRuns.reduce((a, r) => (!a || r.depth > a.depth ? r : a), null);
    return (
        <>
            <p className="codex__progress">
                {runs.length} recent runs, {totalKills} kills.{best ? ` Deepest: ${depthCode(best.depth)} as ${CLASS_INFO[best.cls] ? CLASS_INFO[best.cls].name : best.cls}.` : ''}
            </p>
            <div className="table-wrap">
                <table className="history">
                    <thead><tr><th scope="col">Result</th><th scope="col">Class</th><th scope="col">Mode</th><th scope="col">Level</th><th scope="col">Kills</th><th scope="col">Time</th><th scope="col">Ended by</th><th scope="col">Date</th></tr></thead>
                    <tbody>
                        {runs.map((r, i) => {
                            const result = r.mode === 'bossrush' ? 'Cleared' : r.mode === 'endless' ? `Wave ${r.depth}` : r.mode === 'trial' ? (r.depth ? depthCode(r.depth) : 'Cleared') : depthCode(r.depth);
                            return (
                                <tr key={i}>
                                    <td className="num history__depth">{result}</td>
                                    <td>{CLASS_INFO[r.cls] ? CLASS_INFO[r.cls].name : r.cls}</td>
                                    <td>{MODE_LABEL[r.mode] || 'Descent'}</td>
                                    <td className="num">{r.lvl}</td>
                                    <td className="num">{r.kills}</td>
                                    <td className="num">{r.ms ? formatTime(r.ms) : '—'}</td>
                                    <td>{r.killer || '—'}</td>
                                    <td>{new Date(r.d).toLocaleDateString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
}

export default function Codex({ params }) {
    const { meta, engine } = useMeta();
    const tab = TABS.some(t => t.id === (params && params.tab)) ? params.tab : 'bestiary';
    if (!engine) return null;
    return (
        <PageShell title="Codex" className="codex-page">
            <div className="tabs" role="tablist" aria-label="Codex sections">
                {TABS.map(t => (
                    <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab${tab === t.id ? ' tab--on' : ''}`}
                        onClick={() => ui.navigate('codex', { tab: t.id })}>{t.label}</button>
                ))}
            </div>
            <div className="codex__body" role="tabpanel">
                {tab === 'bestiary' && <Bestiary meta={meta} />}
                {tab === 'lore' && <Lore meta={meta} />}
                {tab === 'achievements' && <Achievements engine={engine} />}
                {tab === 'history' && <History meta={meta} />}
            </div>
        </PageShell>
    );
}
