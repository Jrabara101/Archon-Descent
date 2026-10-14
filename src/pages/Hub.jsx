import { useMeta } from '../bridge/engine.js';
import { PageShell, Pips } from '../components/ui.jsx';
import { HUB_UPGRADES } from '../game/data.js';

const TIER_COPY = [
    'The Hub is a cold room with one lit brazier.',
    'Banners hang where there were none. Others have heard you are still coming back.',
    'The Hub hums. Delvers you have never met leave offerings at the door.',
    'The Hub burns like a forge. Whatever waits at the bottom knows your name now.',
];

export default function Hub() {
    const { meta, engine } = useMeta();
    if (!engine) return null;
    const { tier, totalRank } = engine.getHubTier();

    return (
        <PageShell title="Archon Hub" className={`hub-page hub-tier-${tier}`}
            lede={TIER_COPY[tier]}
            aside={<div className="soul-count" aria-label={`${meta.souls} Archon Souls`}><span className="soul-count__n num">{meta.souls}</span><span className="soul-count__l">souls</span></div>}>
            <div className="hub-banners" aria-hidden="true">{Array.from({ length: Math.min(6, Math.floor(totalRank / 4)) }, (_, i) => <span key={i} className="hub-banner" style={{ '--i': i }} />)}</div>
            <div className="upgrade-list">
                {HUB_UPGRADES.map(u => {
                    const rank = meta[u.id] || 0;
                    const maxed = rank >= u.max;
                    const cost = engine.getHubUpgradeCost(u);
                    const affordable = meta.souls >= cost;
                    return (
                        <article key={u.id} className={`upgrade${maxed ? ' upgrade--max' : ''}`}>
                            <span className="upgrade__icon" aria-hidden="true">{u.icon}</span>
                            <div className="upgrade__text">
                                <h2 className="upgrade__name">{u.name}</h2>
                                <p className="upgrade__desc">{u.desc}</p>
                                <Pips value={rank} max={u.max} label={`${u.name} rank`} />
                            </div>
                            <button className="btn btn--gold" disabled={maxed || !affordable} onClick={() => engine.buyHubUpgrade(u.id)}>
                                {maxed ? 'Maxed' : affordable ? `Buy for ${cost}` : `Need ${cost}`}
                            </button>
                        </article>
                    );
                })}
            </div>
            <p className="page__note">Souls come from every run: deeper floors, higher levels and more gold earn more, and each active mutator adds 15%.</p>
        </PageShell>
    );
}
