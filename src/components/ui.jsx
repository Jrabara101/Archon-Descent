import { useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ui } from '../bridge/store.js';

export const artUrl = (key, small = false) => `${import.meta.env.BASE_URL}art/${key}${small ? '-sm' : ''}.webp`;

export const CLASS_ART = cls => artUrl(`class-${cls}`);
export const FOE_ART = new Set(['goblin_scout', 'iron_guardian', 'skeleton_archer', 'savage_orc', 'mimic', 'bound_wraith', 'lava_orc', 'hex_weaver', 'fire_elemental']);

export const formatTime = ms => {
    const s = Math.floor((ms || 0) / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export const depthCode = n => `B${String(n).padStart(2, '0')}`;

// Focus the first interactive element inside `ref` when it mounts, so keyboard
// and gamepad players always land on something.
export function useAutoFocus(ref, deps = []) {
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const target = el.querySelector('[data-autofocus]') || el.querySelector('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])');
        if (target) target.focus({ preventScroll: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}

export function PageShell({ title, lede, back = 'title', backLabel = 'Back', children, className = '', aside }) {
    const ref = useRef(null);
    useAutoFocus(ref);
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape' && back) { e.preventDefault(); ui.navigate(back); } };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [back]);
    return (
        <main ref={ref} className={`page ${className}`}>
            <header className="page__head">
                {back && (
                    <button className="btn btn--ghost page__back" onClick={() => ui.navigate(back)}>
                        <ChevronLeft size={18} aria-hidden="true" /> {backLabel}
                    </button>
                )}
                <div className="page__titles">
                    <h1 className="page__title">{title}</h1>
                    {lede && <p className="page__lede">{lede}</p>}
                </div>
                {aside && <div className="page__aside">{aside}</div>}
            </header>
            {children}
        </main>
    );
}

export function Modal({ title, tone = 'default', children, actions, labelledBy, wide = false, className = '' }) {
    const ref = useRef(null);
    useAutoFocus(ref);
    return (
        <div className="modal-backdrop">
            <section ref={ref} className={`modal modal--${tone}${wide ? ' modal--wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy || 'modal-title'}>
                {title && <h2 id="modal-title" className="modal__title">{title}</h2>}
                <div className="modal__body">{children}</div>
                {actions && <div className="modal__actions">{actions}</div>}
            </section>
        </div>
    );
}

export function Meter({ label, value, max, tone, showText = true, compact = false }) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    return (
        <div className={`meter meter--${tone}${compact ? ' meter--compact' : ''}${pct < 25 ? ' meter--low' : ''}`}>
            <div className="meter__label">
                <span>{label}</span>
                {showText && <span className="num">{value}<span className="meter__max"> / {max}</span></span>}
            </div>
            <div className="meter__track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
                <div className="meter__ghost" style={{ width: `${pct}%` }} />
                <div className="meter__fill" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export function Pips({ value, max, label }) {
    return (
        <span className="pips" role="img" aria-label={`${label}: ${value} of ${max}`}>
            {Array.from({ length: max }, (_, i) => <span key={i} className={`pip${i < value ? ' pip--on' : ''}`} />)}
        </span>
    );
}

export function ItemGlyph({ item, size = 'md' }) {
    if (!item) return <span className={`glyph glyph--${size} glyph--empty`} />;
    return (
        <span className={`glyph glyph--${size} rarity-${item.rarity || 'common'}${item.uniqueId ? ' glyph--unique' : ''}`} aria-hidden="true">
            {item.icon}
        </span>
    );
}

export function itemStatLine(item) {
    if (!item) return '';
    const stat = item.type === 'weapon' ? 'ATK' : item.type === 'accessory' ? 'ATK/DEF/sight' : 'DEF';
    return `+${item.statBonus} ${stat}`;
}
