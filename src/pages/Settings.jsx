import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useMeta } from '../bridge/engine.js';
import { PageShell } from '../components/ui.jsx';

function Range({ id, label, value, onChange, min = 0, max = 100, step = 5, format = v => `${v}%` }) {
    return (
        <div className="setting">
            <label htmlFor={id} className="setting__label">{label}</label>
            <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
            <output htmlFor={id} className="setting__value num">{format(value)}</output>
        </div>
    );
}

function Toggle({ id, label, hint, checked, onChange }) {
    return (
        <div className="setting setting--toggle">
            <label htmlFor={id} className="setting__label">{label}{hint && <span className="setting__hint">{hint}</span>}</label>
            <input id={id} type="checkbox" role="switch" className="switch" checked={!!checked} onChange={e => onChange(e.target.checked)} />
        </div>
    );
}

const CONTROLS = [
    ['Move', 'WASD / arrow keys, tap a tile, D-pad'],
    ['Wait a turn', 'Space'],
    ['Class abilities', '1, 4 and 5 (ultimate)'],
    ['Health / mana potion', '2 or Q / 3 or E'],
    ['Pause', 'Esc or P, Start on a gamepad'],
    ['Gamepad', 'A ability · Y second ability · RB ultimate · B/X potions'],
];

export function SettingsBody({ inRun = false }) {
    const { settings, engine } = useMeta();
    const fileRef = useRef(null);
    const [status, setStatus] = useState(null);
    if (!engine) return null;
    const set = patch => engine.updateSettings(patch);

    const onImport = async e => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        setStatus(await engine.importSaveData(file));
    };

    return (
            <div className={`settings-grid${inRun ? ' settings-grid--compact' : ''}`}>
                <section className="panel">
                    <h2 className="panel__title">Sound</h2>
                    <Range id="set-sfx" label="Effects volume" value={Math.round(settings.sfx * 100)} onChange={v => set({ sfx: v / 100 })} />
                    <Range id="set-music" label="Music volume" value={Math.round(settings.music * 100)} onChange={v => set({ music: v / 100 })} />
                </section>

                <section className="panel">
                    <h2 className="panel__title">Display</h2>
                    <Range id="set-shake" label="Screen shake" value={Math.round(settings.shake * 100)} onChange={v => set({ shake: v / 100 })} />
                    <Range id="set-uiscale" label="Interface size" min={80} max={130} step={10} value={Math.round((settings.uiScale || 1) * 100)} onChange={v => set({ uiScale: v / 100 })} />
                    <Toggle id="set-colorblind" label="Colorblind-safe rarity colors" checked={settings.colorblind} onChange={v => set({ colorblind: v })} />
                    <Toggle id="set-motion" label="Reduce interface motion" hint="Turns off menu animations. Combat effects stay." checked={settings.reduceMotion} onChange={v => set({ reduceMotion: v })} />
                </section>

                <section className="panel">
                    <h2 className="panel__title">Gameplay</h2>
                    <Toggle id="set-story" label="Story mode" hint="Lore beats as you descend, and an ending." checked={settings.storyMode} onChange={v => set({ storyMode: v })} />
                    <Toggle id="set-tips" label="First-time tips" checked={settings.showTutorialTips} onChange={v => set({ showTutorialTips: v })} />
                    <div className="setting">
                        <label htmlFor="set-touch" className="setting__label">Touch controls</label>
                        <select id="set-touch" value={settings.touchControls || 'auto'} onChange={e => set({ touchControls: e.target.value })}>
                            <option value="auto">Show on touch screens</option>
                            <option value="on">Always show</option>
                            <option value="off">Never show</option>
                        </select>
                    </div>
                </section>

                {!inRun && <section className="panel">
                    <h2 className="panel__title">Save data</h2>
                    <p className="panel__text">Export your souls, unlocks and history to a file, or load one from another device.</p>
                    <div className="row">
                        <button className="btn" onClick={() => engine.exportSaveData()}><Download size={16} aria-hidden="true" /> Export save</button>
                        <button className="btn" onClick={() => fileRef.current && fileRef.current.click()}><Upload size={16} aria-hidden="true" /> Import save</button>
                        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImport} />
                    </div>
                    {status && <p className={status.ok ? 'ok' : 'warn'} role="status">{status.message}</p>}
                </section>}

                <section className="panel panel--wide">
                    <h2 className="panel__title">Controls</h2>
                    <dl className="controls">
                        {CONTROLS.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
                    </dl>
                </section>
            </div>
    );
}

export default function Settings() {
    return (
        <PageShell title="Settings" className="settings-page">
            <SettingsBody />
        </PageShell>
    );
}
