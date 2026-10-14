import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Backpack, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Hourglass, Target } from 'lucide-react';
import { useStore } from '../bridge/store.js';
import { getEngine, useMeta } from '../bridge/engine.js';
import { Meter, ItemGlyph, itemStatLine, formatTime } from './ui.jsx';
import { SKILL_ICON_ART } from '../game/skillArt.js';
import { CLASS_INFO } from '../game/data.js';

const CD_RING = 2 * Math.PI * 19.5;
const STATUS_LABEL = { burn: '🔥 Burning', poison: '☠️ Poisoned', chill: '❄️ Chilled', stun: '💫 Stunned' };

function SkillIcon({ art, accent }) {
    return (
        <svg className="skill-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ '--skill-accent': accent }}>
            <g className={`skill-art skill-motion-${art.motion}`} dangerouslySetInnerHTML={{ __html: art.svg }} />
        </svg>
    );
}

function SkillSlot({ id, hotkey, art, accent, cd, onUse }) {
    const pulse = useStore(s => s.pulse[id] || 0);
    const [fired, setFired] = useState(false);
    useEffect(() => {
        if (!pulse) return;
        setFired(false);
        const raf = requestAnimationFrame(() => setFired(true));
        const t = setTimeout(() => setFired(false), 520);
        return () => { cancelAnimationFrame(raf); clearTimeout(t); };
    }, [pulse]);
    const frac = cd.locked ? 1 : Math.max(0, Math.min(1, cd.cd / (cd.max || 1)));
    const cooling = !cd.locked && cd.cd > 0;
    const state = cd.locked ? 'skill-locked' : cooling ? 'skill-cooling' : 'skill-ready';
    const label = `${art.name}, key ${hotkey}${cd.locked ? ', unlocks at level 10' : cooling ? `, ready in ${cd.cd} turns` : ', ready'}`;
    return (
        <button className={`belt-slot svg-skill-slot ${state}${fired ? ' skill-fired' : ''}`} style={{ '--skill-accent': accent }}
            onClick={onUse} aria-label={label} title={label} disabled={cd.locked}>
            <span className="hotkey" aria-hidden="true">{hotkey}</span>
            <span className="icon svg-icon-host"><SkillIcon art={art} accent={accent} /></span>
            <div className="cd-ring-wrap" aria-hidden="true">
                <svg className="cd-ring" viewBox="0 0 44 44">
                    <circle className="cd-ring-track" cx="22" cy="22" r="19.5" />
                    <circle className="cd-ring-fill" cx="22" cy="22" r="19.5" style={{ strokeDasharray: CD_RING, strokeDashoffset: CD_RING * (1 - frac) }} />
                </svg>
            </div>
            <span className="cooldown-overlay" aria-hidden="true">{cd.locked ? 'LV10' : cooling ? cd.cd : ''}</span>
        </button>
    );
}

function Belt({ hud }) {
    const engine = getEngine();
    const set = SKILL_ICON_ART[hud.classType];
    if (!set || !engine) return null;
    const slots = [
        { id: 'ability-1', hotkey: '1', art: set.icons[0], use: () => engine.canAct() && engine.useSkill() },
        { id: 'ability-2', hotkey: '4', art: set.icons[1], use: () => engine.canAct() && engine.useSkill2() },
        { id: 'ability-ult', hotkey: '5', art: set.icons[2], use: () => engine.canAct() && engine.useUltimate() },
    ];
    return (
        <div className="belt" role="toolbar" aria-label="Abilities and potions">
            {slots.map(s => <SkillSlot key={s.id} id={s.id} hotkey={s.hotkey} art={s.art} accent={set.accent} cd={hud.cooldowns[s.id]} onUse={s.use} />)}
            <span className="belt__gap" aria-hidden="true" />
            <button className="belt-slot belt-slot--potion belt-slot--hp" onClick={() => engine.canAct() && engine.usePotion('hp')} aria-label={`Health potion, key 2, ${hud.potions.hp} left`} disabled={hud.potions.hp <= 0}>
                <span className="hotkey" aria-hidden="true">2</span><span className="potion" aria-hidden="true">🍎</span><span className="count-badge num">{hud.potions.hp}</span>
            </button>
            <button className="belt-slot belt-slot--potion" onClick={() => engine.canAct() && engine.usePotion('mp')} aria-label={`Mana potion, key 3, ${hud.potions.mp} left`} disabled={hud.potions.mp <= 0}>
                <span className="hotkey" aria-hidden="true">3</span><span className="potion" aria-hidden="true">🧪</span><span className="count-badge num">{hud.potions.mp}</span>
            </button>
        </div>
    );
}

function Vitals({ hud }) {
    return (
        <section className="vitals" aria-label="Character status" style={{ '--cls': hud.color }}>
            <div className="vitals__head">
                <span className="vitals__class">{CLASS_INFO[hud.classType].name}</span>
                <span className="vitals__lvl">Level {hud.lvl}</span>
            </div>
            <Meter label="HP" value={hud.hp} max={hud.maxHp} tone="hp" compact />
            <Meter label="MP" value={hud.mp} max={hud.maxMp} tone="mp" compact />
            <Meter label="XP" value={hud.xp} max={hud.xpNeeded} tone="xp" compact showText={false} />
            {(hud.statuses.length > 0 || hud.haste > 0 || hud.battleCry > 0 || hud.keys > 0) && (
                <div className="vitals__chips">
                    {hud.statuses.map(s => <span key={s.type} className={`chip chip--${s.type}`}>{STATUS_LABEL[s.type] || s.type} {s.turns}</span>)}
                    {hud.haste > 0 && <span className="chip chip--haste">⚡ Haste {hud.haste}</span>}
                    {hud.battleCry > 0 && <span className="chip chip--buff">📯 Battle Cry {hud.battleCry}</span>}
                    {hud.keys > 0 && <span className="chip chip--gold">🗝️ ×{hud.keys}</span>}
                </div>
            )}
        </section>
    );
}

function TopBar({ hud, onCharacter }) {
    const engine = getEngine();
    const [where, kind] = (hud.depthLabel || '').split(' - ');
    return (
        <header className="topbar">
            <div className="topbar__where">
                <span className="topbar__depth">{where}</span>
                {kind && <span className="topbar__biome">{kind.toLowerCase()}</span>}
                <span className="topbar__time num" aria-label="Run time"><Hourglass size={13} aria-hidden="true" /> {formatTime(hud.timeMs)}</span>
                {hud.bounty && (
                    <span className={`topbar__bounty${hud.bounty.failed ? ' topbar__bounty--failed' : ''}`} title={hud.bounty.desc}>
                        <Target size={13} aria-hidden="true" /> {hud.bounty.name}{hud.bounty.progress ? ` ${hud.bounty.progress}` : ''}{hud.bounty.failed ? ' · failed' : ''}
                    </span>
                )}
            </div>
            <div className="topbar__actions">
                <span className="topbar__gold num" aria-label={`${hud.gold} gold`}>🪙 {hud.gold}</span>
                <button className="icon-btn" onClick={onCharacter} aria-label="Character and inventory (I)" title="Character and inventory (I)"><Backpack size={20} /></button>
                <button className="icon-btn" onClick={() => engine && engine.togglePause()} aria-label="Pause (Esc)" title="Pause (Esc)"><Pause size={20} /></button>
            </div>
        </header>
    );
}

function LogFeed() {
    const log = useStore(s => s.log);
    const recent = log.slice(-4);
    return (
        <ol className="logfeed" aria-label="Recent events">
            {recent.map((l, i) => <li key={l.id} className={`logline ${l.cls}`} style={{ '--age': recent.length - 1 - i }}>{l.text}</li>)}
        </ol>
    );
}

function useTouchVisible() {
    const { settings } = useMeta();
    const coarse = useMemo(() => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches, []);
    const pref = settings ? settings.touchControls || 'auto' : 'auto';
    return pref === 'on' || (pref === 'auto' && coarse);
}

// Hold-to-repeat movement pad for touch screens.
function TouchPad() {
    const timer = useRef(null);
    const stop = () => { clearInterval(timer.current); timer.current = null; };
    useEffect(() => stop, []);
    const press = (dx, dy) => e => {
        e.preventDefault();
        const engine = getEngine();
        if (!engine) return;
        const step = () => engine.canAct() && engine.executeTurn(dx, dy);
        step();
        stop();
        timer.current = setInterval(step, 190);
        if (navigator.vibrate) navigator.vibrate(8);
    };
    const btn = (dx, dy, label, Icon, cls) => (
        <button className={`pad__btn ${cls}`} aria-label={label}
            onPointerDown={press(dx, dy)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
            onContextMenu={e => e.preventDefault()}>
            <Icon size={26} aria-hidden="true" />
        </button>
    );
    return (
        <div className="pad" aria-label="Movement">
            {btn(0, -1, 'Move up', ChevronUp, 'pad__up')}
            {btn(-1, 0, 'Move left', ChevronLeft, 'pad__left')}
            <button className="pad__btn pad__wait" aria-label="Wait a turn" onClick={() => { const e = getEngine(); if (e) e.waitTurn(); }}>
                <Hourglass size={18} aria-hidden="true" />
            </button>
            {btn(1, 0, 'Move right', ChevronRight, 'pad__right')}
            {btn(0, 1, 'Move down', ChevronDown, 'pad__down')}
        </div>
    );
}

function ItemDetail({ item, where, onClose }) {
    const engine = getEngine();
    if (!item || !engine) return null;
    const equipped = engine.equipped[item.type];
    const act = fn => { fn(); onClose(); };
    return (
        <div className="item-detail" role="region" aria-label={`${item.name} details`}>
            <div className="item-detail__head">
                <ItemGlyph item={item} size="lg" />
                <div>
                    <p className={`item-detail__name rarity-text-${item.rarity}`}>{item.name}</p>
                    <p className="item-detail__meta">{item.rarity} {item.type} · {itemStatLine(item)}</p>
                </div>
            </div>
            {item.lore && <p className="item-detail__lore">“{item.lore}”</p>}
            {item.weaponTrait && <p className="item-detail__trait">{item.weaponTrait === 'cleave' ? 'Cleave: attacks also hit enemies next to your target.' : 'Ricochet: attacks may chain to a second nearby enemy.'}</p>}
            {item.enchant && <p className="item-detail__trait">Enchanted: {item.enchant}</p>}
            {where.type === 'bag' && equipped && <p className="item-detail__cmp">Replaces {equipped.name} ({itemStatLine(equipped)})</p>}
            <div className="row">
                {where.type === 'bag' ? (
                    <>
                        <button className="btn btn--primary" onClick={() => act(() => engine.equipItem(where.index))}>Equip</button>
                        <button className="btn" onClick={() => act(() => engine.dropItemFromInventory(where.index))}>Drop</button>
                        <button className="btn btn--danger" onClick={() => act(() => engine.removeItemFromInventory(where.index))}>Destroy</button>
                    </>
                ) : (
                    <button className="btn" onClick={() => act(() => engine.unequipItem(where.slot))}>Unequip</button>
                )}
            </div>
        </div>
    );
}

function CharacterDrawer({ hud, onClose }) {
    const [sel, setSel] = useState(null);
    const ref = useRef(null);
    const log = useStore(s => s.log);
    useEffect(() => { if (ref.current) ref.current.focus(); }, []);
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape' || e.key === 'i' || e.key === 'I') { e.stopPropagation(); onClose(); } };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onClose]);
    const selItem = sel ? (sel.type === 'bag' ? hud.inventory[sel.index] : hud.equipped[sel.slot]) : null;
    return (
        <aside className="drawer" aria-label="Character and inventory" ref={ref} tabIndex={-1}>
            <header className="drawer__head">
                <h2>{CLASS_INFO[hud.classType].name} · level {hud.lvl} {hud.rank}</h2>
                <button className="icon-btn" onClick={onClose} aria-label="Close character panel"><X size={20} /></button>
            </header>
            <dl className="statgrid">
                <div><dt>ATK</dt><dd className="num">{hud.atk}</dd></div>
                <div><dt>DEF</dt><dd className="num">{hud.def}</dd></div>
                <div><dt>Crit</dt><dd className="num">{hud.crit}%</dd></div>
                <div><dt>Gold</dt><dd className="num">{hud.gold}</dd></div>
            </dl>

            <h3 className="drawer__label">Equipped</h3>
            <div className="gear">
                {['weapon', 'armor', 'shield', 'accessory'].map(slot => (
                    <button key={slot} className={`slot${sel && sel.slot === slot ? ' slot--sel' : ''}`} aria-label={hud.equipped[slot] ? `${slot}: ${hud.equipped[slot].name}` : `${slot}: empty`}
                        onClick={() => hud.equipped[slot] && setSel({ type: 'gear', slot })}>
                        <ItemGlyph item={hud.equipped[slot]} />
                        <span className="slot__label">{slot}</span>
                    </button>
                ))}
            </div>

            <h3 className="drawer__label">Bag <span className="muted num">{hud.inventory.filter(Boolean).length}/{hud.inventory.length}</span></h3>
            <div className="bag">
                {hud.inventory.map((it, i) => (
                    <button key={i} className={`slot${sel && sel.type === 'bag' && sel.index === i ? ' slot--sel' : ''}`} disabled={!it}
                        aria-label={it ? `${it.name}, ${it.rarity} ${it.type}` : 'Empty slot'} onClick={() => it && setSel({ type: 'bag', index: i })}>
                        <ItemGlyph item={it} />
                    </button>
                ))}
            </div>
            {selItem && <ItemDetail item={selItem} where={sel} onClose={() => setSel(null)} />}

            <h3 className="drawer__label">Relics</h3>
            {hud.relics.length ? <ul className="taglist">{hud.relics.map(r => <li key={r.id} title={r.desc}><span aria-hidden="true">{r.icon}</span> {r.name}<span className="taglist__desc">{r.desc}</span></li>)}</ul> : <p className="muted">None yet. Bosses, elites, chests and shrines drop them.</p>}

            <h3 className="drawer__label">Talents</h3>
            {hud.talents.length ? <ul className="taglist">{hud.talents.map(t => <li key={t.id}><span aria-hidden="true">{t.icon}</span> {t.name}<span className="taglist__desc">{t.desc}</span></li>)}</ul> : <p className="muted">You choose one each time you level up.</p>}

            {hud.allies.length > 0 && <>
                <h3 className="drawer__label">Companions</h3>
                <ul className="taglist">{hud.allies.map((a, i) => <li key={i}><span aria-hidden="true">{a.icon}</span> {a.name}{a.turnsLeft !== undefined && <span className="taglist__desc">{a.turnsLeft} turns left</span>}</li>)}</ul>
            </>}

            {hud.mutators.length > 0 && <>
                <h3 className="drawer__label">Mutators</h3>
                <p className="chips">{hud.mutators.map(m => <span key={m.id} className="chip chip--epic">{m.icon} {m.name}</span>)}</p>
            </>}

            <h3 className="drawer__label">Chronicle</h3>
            <ol className="chronicle">{log.slice().reverse().map(l => <li key={l.id} className={`logline ${l.cls}`}>{l.text}</li>)}</ol>
        </aside>
    );
}

export default function Hud() {
    const hud = useStore(s => s.hud);
    const [drawer, setDrawer] = useState(false);
    const touch = useTouchVisible();
    const blocked = useStore(s => s.modals.length > 0);

    useEffect(() => {
        const onKey = e => {
            if ((e.key === 'i' || e.key === 'I' || e.key === 'Tab') && !drawer && !blocked) { e.preventDefault(); setDrawer(true); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [drawer, blocked]);

    if (!hud) return null;
    return (
        <div className={`hud${touch ? ' hud--touch' : ''}`}>
            <TopBar hud={hud} onCharacter={() => setDrawer(d => !d)} />
            <Vitals hud={hud} />
            <LogFeed />
            {touch && <TouchPad />}
            <Belt hud={hud} />
            {drawer && <CharacterDrawer hud={hud} onClose={() => setDrawer(false)} />}
        </div>
    );
}
