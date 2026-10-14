import { CalendarDays, Skull, Infinity as InfinityIcon, Award, Lock, Check } from 'lucide-react';
import { ui } from '../bridge/store.js';
import { useMeta } from '../bridge/engine.js';
import { PageShell, depthCode } from '../components/ui.jsx';
import { CLASS_INFO, MUTATOR_POOL, TRIALS_DB, BIOME_INFO } from '../game/data.js';

export default function Modes() {
    const { meta, engine } = useMeta();
    if (!engine) return null;
    const daily = engine.getDailyInfo();
    const bossUnlocked = engine.isBossRushUnlocked();
    const s = meta.stats || {};
    const titles = meta.titles || [];
    const staged = engine.stagedMutators;
    const bonus = Math.round(staged.length * 15);

    return (
        <PageShell title="Modes" lede="Every mode feeds Archon Souls back to the Hub, except Trials, which award titles instead.">
            <div className="modes-grid">
                <article className="mode-card mode-card--daily">
                    <CalendarDays className="mode-card__icon" size={26} aria-hidden="true" />
                    <h2>Daily challenge</h2>
                    <p>Today's dungeon is the same for everyone: {CLASS_INFO[daily.cls].name}, fixed layout, no mutators.</p>
                    <p className="mode-card__stat">{daily.best ? `Your best today: ${depthCode(daily.best.depth)}` : 'Not attempted today'}</p>
                    <button className="btn btn--primary" onClick={() => engine.startDailyChallenge()}>Play {daily.key}</button>
                </article>

                <article className={`mode-card mode-card--boss${bossUnlocked ? '' : ' mode-card--locked'}`}>
                    {bossUnlocked ? <Skull className="mode-card__icon" size={26} aria-hidden="true" /> : <Lock className="mode-card__icon" size={26} aria-hidden="true" />}
                    <h2>Boss Rush</h2>
                    <p>All four floor guardians back to back, with a partial heal between each. Clear it to ascend and face them again, stronger.</p>
                    <p className="mode-card__stat">{bossUnlocked ? (s.maxAscension ? `Highest ascension: tier ${s.maxAscension}` : s.bossRushCleared ? 'Cleared' : 'Not cleared yet') : 'Defeat any floor guardian to unlock'}</p>
                    <button className="btn" disabled={!bossUnlocked} onClick={() => ui.navigate('classes', { mode: 'bossrush' })}>Choose a class</button>
                </article>

                <article className="mode-card mode-card--endless">
                    <InfinityIcon className="mode-card__icon" size={26} aria-hidden="true" />
                    <h2>Endless</h2>
                    <p>A sealed arena and waves that never stop. The biome darkens every five waves.</p>
                    <p className="mode-card__stat">{s.bestWave ? `Best wave: ${s.bestWave}` : 'No waves survived yet'}</p>
                    <button className="btn" onClick={() => ui.navigate('classes', { mode: 'endless' })}>Choose a class</button>
                </article>
            </div>

            <section className="section">
                <h2 className="section__title"><Award size={18} aria-hidden="true" /> Archon Trials</h2>
                <p className="section__lede">Hand-tuned dungeons with a fixed class and seed. Reach the stairs to earn a permanent title.</p>
                <div className="trial-list">
                    {TRIALS_DB.map(t => {
                        const earned = titles.includes(t.title);
                        const muts = t.mutators.map(id => (MUTATOR_POOL.find(m => m.id === id) || {}).name).filter(Boolean);
                        return (
                            <button key={t.id} className={`trial${earned ? ' trial--earned' : ''}`} onClick={() => engine.startTrial(t.id)}>
                                <span className="trial__name">{t.name}</span>
                                <span className="trial__meta">{CLASS_INFO[t.cls].name} · {BIOME_INFO[t.biome].name} · {depthCode(t.level)}{muts.length ? ` · ${muts.join(', ')}` : ''}</span>
                                <span className="trial__reward">{earned ? <><Check size={14} aria-hidden="true" /> “{t.title}” earned</> : `Earns “${t.title}”`}</span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="section">
                <h2 className="section__title">Mutators</h2>
                <p className="section__lede">Stack these onto your next normal descent. Each one adds 15% to the souls you earn. {staged.length > 0 && <strong>{staged.length} selected, +{bonus}% souls.</strong>}</p>
                <div className="mutator-list">
                    {MUTATOR_POOL.map(m => {
                        const on = staged.includes(m.id);
                        return (
                            <button key={m.id} className={`mutator${on ? ' mutator--on' : ''}`} aria-pressed={on} onClick={() => engine.toggleMutator(m.id)}>
                                <span className="mutator__icon" aria-hidden="true">{m.icon}</span>
                                <span className="mutator__name">{m.name}</span>
                                <span className="mutator__desc">{m.desc}</span>
                                <span className="mutator__check" aria-hidden="true">{on && <Check size={16} />}</span>
                            </button>
                        );
                    })}
                </div>
                <button className="btn btn--primary" onClick={() => ui.navigate('classes')}>
                    {staged.length ? `Start a descent with ${staged.length} mutator${staged.length > 1 ? 's' : ''}` : 'Start a normal descent'}
                </button>
            </section>
        </PageShell>
    );
}
