import { useState } from 'react';
import { Camera, Home, RotateCcw, Flame, Play as PlayIcon, Settings as SettingsIcon, Star, LogOut, Skull } from 'lucide-react';
import { useStore, ui } from '../bridge/store.js';
import { getEngine } from '../bridge/engine.js';
import { Modal, ItemGlyph, itemStatLine, formatTime, depthCode } from './ui.jsx';
import { SettingsBody } from '../pages/Settings.jsx';
import { CLASS_INFO, LORE_DB } from '../game/data.js';

function TalentDraft({ choices, lvl }) {
    const engine = getEngine();
    return (
        <Modal title={`Level ${lvl}: choose a talent`} tone="gold" wide>
            <div className="talents">
                {choices.map((c, i) => (
                    <button key={c.id} className={`talent${c.classTalent ? ' talent--class' : ''}`} onClick={() => engine.pickTalent(c.id)} data-autofocus={i === 0 ? true : undefined}>
                        <span className="talent__icon" aria-hidden="true">{c.icon}</span>
                        <span className="talent__name">{c.name}</span>
                        <span className="talent__desc">{c.desc}</span>
                        {c.classTalent && <span className="talent__tag">Class talent</span>}
                        {c.preset && <span className="talent__tag talent__tag--preset">In your saved build</span>}
                        {c.synergy && <span className="talent__syn">Combos with {c.synergy.icon} {c.synergy.name}{c.synergy.owned ? ' (owned)' : ''}</span>}
                    </button>
                ))}
            </div>
        </Modal>
    );
}

function Shop({ bark }) {
    const engine = getEngine();
    const hud = useStore(s => s.hud);
    const [msg, setMsg] = useState(null);
    const stock = engine.getShopStock();
    return (
        <Modal title="Merchant camp" tone="epic"
            actions={<button className="btn" onClick={() => ui.closeModal('shop')}>Leave camp</button>}>
            <p className="modal__lede">“{bark}”</p>
            <p className="modal__gold num">🪙 {hud ? hud.gold : 0} gold</p>
            <div className="stock">
                {stock.map(it => {
                    const afford = hud && hud.gold >= it.price;
                    return (
                        <button key={it.id} className="stock__item" disabled={!afford} onClick={() => setMsg(engine.buyShopItem(it.id))}>
                            <span className="stock__icon" aria-hidden="true">{it.icon}</span>
                            <span className="stock__name">{it.name}<span className="stock__desc">{it.desc}</span></span>
                            <span className="stock__price num">{it.price}</span>
                        </button>
                    );
                })}
            </div>
            {msg && <p className={msg.ok ? 'ok' : 'warn'} role="status">{msg.message}</p>}
        </Modal>
    );
}

function Anvil() {
    const engine = getEngine();
    useStore(s => s.hud); // re-read options whenever gold or inventory changes
    const opts = engine.getAnvilOptions();
    const gold = engine.player ? engine.player.gold : 0;
    return (
        <Modal title="Arcane anvil" tone="orange"
            actions={<button className="btn" onClick={() => ui.closeModal('anvil')}>Leave the anvil</button>}>
            <h3 className="modal__section">Fuse</h3>
            {opts.fuse ? (
                <button className="stock__item" onClick={() => engine.craftUpgrade(opts.fuse.from, opts.fuse.to)}>
                    <span className="stock__icon" aria-hidden="true">⬆️</span>
                    <span className="stock__name">Fuse 3 {opts.fuse.from} items<span className="stock__desc">Get one random {opts.fuse.to} item.</span></span>
                    <span className="stock__price">Free</span>
                </button>
            ) : <p className="muted">Fusing needs three items of the same rarity in your bag.</p>}

            <h3 className="modal__section">Enchant {opts.weapon ? opts.weapon.name : 'your weapon'}</h3>
            {opts.weapon ? (
                <div className="stock">
                    {opts.enchants.map(e => (
                        <button key={e.id} className={`stock__item${e.active ? ' stock__item--on' : ''}`} disabled={e.active || gold < e.cost} onClick={() => engine.enchantWeapon(e.id, e.cost)}>
                            <span className="stock__icon" aria-hidden="true">{e.icon}</span>
                            <span className="stock__name">{e.name}<span className="stock__desc">{e.effect} (30% chance){e.active ? ' · active' : ''}</span></span>
                            <span className="stock__price num">{e.cost}</span>
                        </button>
                    ))}
                </div>
            ) : <p className="muted">Equip a weapon to enchant it.</p>}
        </Modal>
    );
}

function Forge({ offer, current }) {
    const engine = getEngine();
    return (
        <Modal title="The forge offers a weapon" tone="orange"
            actions={<>
                <button className="btn btn--primary" onClick={() => engine.acceptForgeSwap()}>Take the weapon</button>
                <button className="btn" onClick={() => engine.declineForgeSwap()}>Walk away</button>
            </>}>
            <div className="compare">
                <div className="compare__col">
                    <p className="compare__label">Offered</p>
                    <ItemGlyph item={offer} size="lg" />
                    <p className="compare__name rarity-text-epic">{offer.name}</p>
                    <p className="compare__stat">{itemStatLine(offer)}</p>
                    <p className="compare__note">{offer.traitDesc}</p>
                    <p className="compare__note">Also: +20% damage dealt for the rest of this run.</p>
                </div>
                <div className="compare__col compare__col--muted">
                    <p className="compare__label">Current</p>
                    <ItemGlyph item={current} size="lg" />
                    <p className="compare__name">{current ? current.name : 'Nothing equipped'}</p>
                    {current && <p className="compare__stat">{itemStatLine(current)}</p>}
                    <p className="compare__note">Goes to your bag if there is room.</p>
                </div>
            </div>
        </Modal>
    );
}

const ROUTES = [
    { id: 'vault', icon: '💰', name: 'Treasure vault', desc: 'More enemies, an extra chest.' },
    { id: 'shrine', icon: '⛩️', name: 'Shrine path', desc: 'Fewer enemies, an extra shrine.' },
    { id: 'shortcut', icon: '🏃', name: 'Shortcut', desc: 'A small, quick floor.' },
    { id: 'gauntlet', icon: '💀', name: 'Elite gauntlet', desc: 'A guaranteed champion fight that drops a relic.', danger: true },
];

function Route({ nextLevel }) {
    const engine = getEngine();
    return (
        <Modal title={`The way to ${depthCode(nextLevel)} splits`} wide>
            <div className="routes">
                {ROUTES.map(r => (
                    <button key={r.id} className={`route${r.danger ? ' route--danger' : ''}`} onClick={() => engine.chooseRoute(r.id)}>
                        <span className="route__icon" aria-hidden="true">{r.icon}</span>
                        <span className="route__name">{r.name}</span>
                        <span className="route__desc">{r.desc}</span>
                    </button>
                ))}
            </div>
        </Modal>
    );
}

function PauseMenu({ depth, classType, lvl, timeMs, canSave }) {
    const engine = getEngine();
    const [view, setView] = useState('menu');
    const [confirm, setConfirm] = useState(false);
    if (view === 'settings') {
        return (
            <Modal title="Settings" wide actions={<button className="btn btn--primary" onClick={() => setView('menu')}>Done</button>}>
                <SettingsBody inRun />
            </Modal>
        );
    }
    return (
        <Modal title="Paused">
            <p className="modal__lede">{depth} · {CLASS_INFO[classType].name} level {lvl} · {formatTime(timeMs)}</p>
            <div className="stack">
                <button className="btn btn--primary" data-autofocus onClick={() => engine.togglePause()}><PlayIcon size={16} aria-hidden="true" /> Resume</button>
                <button className="btn" onClick={() => setView('settings')}><SettingsIcon size={16} aria-hidden="true" /> Settings</button>
                <button className="btn" onClick={() => engine.saveLoadoutPreset()} title="Future talent drafts for this class will favor this run's talents"><Star size={16} aria-hidden="true" /> Save build preset</button>
                <button className="btn" onClick={() => engine.returnToTitle()}><LogOut size={16} aria-hidden="true" /> {canSave ? 'Save and quit to title' : 'Quit to title'}</button>
                {!confirm
                    ? <button className="btn btn--danger" onClick={() => setConfirm(true)}><Skull size={16} aria-hidden="true" /> Abandon run</button>
                    : <div className="confirm">
                        <p>End this run now? You keep the souls it has earned so far.</p>
                        <div className="row">
                            <button className="btn btn--danger" onClick={() => engine.abandonRun()}>Abandon run</button>
                            <button className="btn" onClick={() => setConfirm(false)}>Keep playing</button>
                        </div>
                    </div>}
            </div>
            {!canSave && <p className="muted small">Boss Rush, Endless and Trial runs can't be resumed later.</p>}
        </Modal>
    );
}

function Death({ headline, souls, timeMs, kills, killer, timesKilled, daily, bestDiff, classType, lvl }) {
    const engine = getEngine();
    const killLine = timesKilled > 1
        ? `${killer} has ended ${timesKilled} of your descents now. It is starting to recognize you.`
        : `Ended by ${killer}.`;
    return (
        <Modal title="Died in the dark" tone="red"
            actions={<>
                <button className="btn btn--primary" onClick={() => ui.navigate('classes')}><RotateCcw size={16} aria-hidden="true" /> Descend again</button>
                <button className="btn" onClick={() => engine.exportBuildCard()}><Camera size={16} aria-hidden="true" /> Save build card</button>
                <button className="btn btn--ghost" onClick={() => ui.navigate('title')}><Home size={16} aria-hidden="true" /> Title</button>
            </>}>
            <p className="death__headline">{headline}</p>
            <p className="death__souls num">+{souls} Archon Souls</p>
            <p className="modal__lede">{killLine}</p>
            <dl className="statgrid statgrid--3">
                <div><dt>Class</dt><dd>{CLASS_INFO[classType].name} {lvl}</dd></div>
                <div><dt>Kills</dt><dd className="num">{kills}</dd></div>
                <div><dt>Time</dt><dd className="num">{formatTime(timeMs)}</dd></div>
            </dl>
            {bestDiff && (
                <p className={bestDiff.delta > 0 ? 'ok' : 'muted'}>
                    {bestDiff.prev === 0 ? `Your first recorded ${CLASS_INFO[classType].name} descent.`
                        : bestDiff.delta > 0 ? `New ${CLASS_INFO[classType].name} record: ${bestDiff.delta} floor${bestDiff.delta > 1 ? 's' : ''} deeper than your best.`
                        : bestDiff.delta === 0 ? `Tied your ${CLASS_INFO[classType].name} best of ${depthCode(bestDiff.prev)}.`
                        : `${-bestDiff.delta} floor${bestDiff.delta < -1 ? 's' : ''} short of your ${CLASS_INFO[classType].name} best (${depthCode(bestDiff.prev)}).`}
                </p>
            )}
            {daily && <p className="ok">{daily.isNew ? `New daily best: ${depthCode(daily.depth)}.` : `Today's best stands at ${depthCode(daily.depth)}.`}</p>}
        </Modal>
    );
}

function BossRushVictory({ ascension, guardians = 4, souls, timeMs, classType, lvl }) {
    const engine = getEngine();
    return (
        <Modal title="Gauntlet cleared" tone="gold"
            actions={<>
                <button className="btn btn--primary" onClick={() => engine.ascendBossRush()}><Flame size={16} aria-hidden="true" /> Ascend to tier {ascension + 1}</button>
                <button className="btn" onClick={() => engine.exportBuildCard()}><Camera size={16} aria-hidden="true" /> Save build card</button>
                <button className="btn btn--ghost" onClick={() => ui.navigate('title')}><Home size={16} aria-hidden="true" /> Title</button>
            </>}>
            <p className="death__headline">{ascension > 0 ? `All guardians fallen at ascension tier ${ascension}.` : `All ${guardians} floor guardians have fallen.`}</p>
            <p className="death__souls num">+{souls} Archon Souls</p>
            <p className="modal__lede">{CLASS_INFO[classType].name} level {lvl} · {formatTime(timeMs)}. Ascending keeps your character and brings the guardians back stronger.</p>
        </Modal>
    );
}

function TrialVictory({ name, title, newTitle, timeMs }) {
    return (
        <Modal title="Trial cleared" tone="orange"
            actions={<button className="btn btn--primary" onClick={() => ui.navigate('modes')}>Back to modes</button>}>
            <p className="death__headline">{name} complete in {formatTime(timeMs)}.</p>
            <p className="death__souls">{newTitle ? `Title earned: “${title}”` : `You already hold “${title}”.`}</p>
        </Modal>
    );
}

function Epilogue() {
    const engine = getEngine();
    const close = () => ui.closeModal('epilogue');
    return (
        <Modal title="The descent ends" tone="gold"
            actions={<>
                <button className="btn btn--primary" onClick={close}>Keep descending</button>
                <button className="btn" onClick={() => { close(); engine.exportBuildCard(); }}><Camera size={16} aria-hidden="true" /> Save build card</button>
            </>}>
            <div className="epilogue">
                <p>The Void Archon Prime comes apart like a held breath finally let go. Beneath it there is no throne and no master. Only more stairs, and the sound of something very large deciding whether you are worth noticing.</p>
                <p>{LORE_DB[LORE_DB.length - 1]}</p>
                <p>You could climb now. Nobody would blame you. The Descent keeps going either way.</p>
            </div>
        </Modal>
    );
}

const MODALS = {
    talent: TalentDraft, shop: Shop, anvil: Anvil, forge: Forge, route: Route,
    pause: PauseMenu, death: Death, bossRushVictory: BossRushVictory, trialVictory: TrialVictory, epilogue: Epilogue,
};

export default function ModalHost() {
    const modals = useStore(s => s.modals);
    // Only the top modal is interactive; earlier ones stay hidden underneath.
    const top = modals[modals.length - 1];
    if (!top) return null;
    const Cmp = MODALS[top.type];
    return Cmp ? <Cmp key={top.type} {...top.props} /> : null;
}
