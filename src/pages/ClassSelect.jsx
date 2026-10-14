import { useEffect, useState } from 'react';
import { HelpCircle, Swords, X } from 'lucide-react';
import { ui } from '../bridge/store.js';
import { useMeta } from '../bridge/engine.js';
import { PageShell, Modal, CLASS_ART, depthCode } from '../components/ui.jsx';
import { ALL_CLASSES, CLASS_INFO, CLASS_QUIZ, MUTATOR_POOL, MASTERY_KILL_THRESHOLD, PLAYER_COLORS } from '../game/data.js';

const MODE_COPY = {
    normal: { title: 'Choose your class', start: 'Begin descent' },
    bossrush: { title: 'Boss Rush: choose your class', start: 'Face the guardians' },
    endless: { title: 'Endless: choose your class', start: 'Enter the arena' },
};

function StatBar({ label, value, max }) {
    return (
        <div className="statbar">
            <span className="statbar__label">{label}</span>
            <span className="statbar__track"><span className="statbar__fill" style={{ width: `${(value / max) * 100}%` }} /></span>
            <span className="statbar__val num">{value}</span>
        </div>
    );
}

function Quiz({ onPick, onClose }) {
    const [step, setStep] = useState(0);
    const [scores, setScores] = useState({});
    const q = CLASS_QUIZ[step];
    const answer = a => {
        const next = { ...scores };
        Object.entries(a.scores).forEach(([c, p]) => { next[c] = (next[c] || 0) + p; });
        setScores(next);
        setStep(step + 1);
    };
    const result = !q ? Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] : null;
    return (
        <Modal title={q ? `Question ${step + 1} of ${CLASS_QUIZ.length}` : 'Your match'}
            actions={<button className="btn btn--ghost" onClick={onClose}><X size={16} aria-hidden="true" /> Close</button>}>
            {q ? (
                <>
                    <p className="modal__lede">{q.q}</p>
                    <div className="stack">{q.answers.map((a, i) => <button key={i} className="choice" onClick={() => answer(a)}>{a.text}</button>)}</div>
                </>
            ) : (
                <div className="quiz-result">
                    <img src={CLASS_ART(result)} alt="" />
                    <div>
                        <p className="quiz-result__name">{CLASS_INFO[result].name}</p>
                        <p>{CLASS_INFO[result].blurb}</p>
                        <button className="btn btn--primary" data-autofocus onClick={() => onPick(result)}>Select {CLASS_INFO[result].name}</button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

export default function ClassSelect({ params }) {
    const { meta, engine } = useMeta();
    const mode = (params && (params.mode || params.tab)) || 'normal';
    const copy = MODE_COPY[mode] || MODE_COPY.normal;
    const lastCls = meta && meta.runHistory && meta.runHistory[0] ? meta.runHistory[0].cls : 'warrior';
    const [selected, setSelected] = useState(ALL_CLASSES.includes(lastCls) ? lastCls : 'warrior');
    const [quiz, setQuiz] = useState(false);

    const start = cls => {
        if (!engine) return;
        if (mode === 'bossrush') engine.startBossRush(cls);
        else if (mode === 'endless') engine.startEndless(cls);
        else engine.startGame(cls);
    };

    useEffect(() => {
        const onKey = e => {
            if (quiz || e.target.tagName === 'INPUT') return;
            const i = ALL_CLASSES.indexOf(selected);
            if (e.key === 'ArrowRight') { e.preventDefault(); setSelected(ALL_CLASSES[(i + 1) % ALL_CLASSES.length]); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); setSelected(ALL_CLASSES[(i + ALL_CLASSES.length - 1) % ALL_CLASSES.length]); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selected, quiz]);

    if (!engine) return null;
    const info = CLASS_INFO[selected];
    const kills = (meta.classKills && meta.classKills[selected]) || 0;
    const best = (meta.bestDepthByClass && meta.bestDepthByClass[selected]) || 0;
    const staged = mode === 'normal' ? engine.stagedMutators.map(id => MUTATOR_POOL.find(m => m.id === id)).filter(Boolean) : [];
    const hasSave = mode === 'normal' && engine.hasAutosave();

    return (
        <PageShell title={copy.title} className="class-page" back={mode === 'normal' ? 'title' : 'modes'}
            aside={<button className="btn btn--ghost" onClick={() => setQuiz(true)}><HelpCircle size={16} aria-hidden="true" /> Not sure? Take the quiz</button>}>
            <div className="slabs" role="radiogroup" aria-label="Classes">
                {ALL_CLASSES.map(cls => (
                    <button key={cls} role="radio" aria-checked={cls === selected}
                        className={`slab${cls === selected ? ' slab--on' : ''}`}
                        style={{ '--cls': PLAYER_COLORS[cls] }}
                        onClick={() => setSelected(cls)}
                        onDoubleClick={() => start(cls)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); start(cls); } }}
                        onFocus={() => setSelected(cls)}
                        aria-label={`${CLASS_INFO[cls].name}, ${CLASS_INFO[cls].role}`}>
                        <img className="slab__art" src={CLASS_ART(cls)} alt="" loading="lazy" />
                        <span className="slab__name">{CLASS_INFO[cls].name}</span>
                    </button>
                ))}
            </div>

            <section className="class-detail" style={{ '--cls': PLAYER_COLORS[selected] }} aria-live="polite">
                <div className="class-detail__main">
                    <h2 className="class-detail__name">{info.name}</h2>
                    <p className="class-detail__role">{info.role}</p>
                    <p className="class-detail__blurb">{info.blurb}</p>
                    <ul className="ability-list">
                        {info.abilities.map((a, i) => (
                            <li key={a}><span className="ability-list__key">{['1', '4', '5'][i]}</span>{a}{i === 2 && <span className="muted"> · unlocks at level 10</span>}</li>
                        ))}
                    </ul>
                </div>
                <div className="class-detail__stats">
                    <StatBar label="HP" value={info.hp + (meta.vitality || 0) * 5} max={175} />
                    <StatBar label="MP" value={info.mp} max={110} />
                    <StatBar label="ATK" value={info.atk + (meta.power || 0)} max={25} />
                    <StatBar label="DEF" value={info.def} max={10} />
                    <p className="class-detail__record">
                        {best ? `Deepest: ${depthCode(best)}` : 'Not yet descended with this class'}
                        {' · '}Mastery {Math.min(kills, MASTERY_KILL_THRESHOLD)}/{MASTERY_KILL_THRESHOLD} kills
                    </p>
                </div>
                <div className="class-detail__go">
                    {staged.length > 0 && (
                        <p className="chips" aria-label="Active mutators">
                            {staged.map(m => <span key={m.id} className="chip chip--epic">{m.icon} {m.name}</span>)}
                        </p>
                    )}
                    {hasSave && <p className="warn">Starting a new descent replaces your saved run.</p>}
                    <button className="btn btn--primary btn--lg" onClick={() => start(selected)}>
                        <Swords size={18} aria-hidden="true" /> {copy.start}
                    </button>
                    {mode === 'normal' && <button className="link-btn" onClick={() => ui.navigate('modes')}>{staged.length ? 'Change mutators' : 'Add mutators for bonus souls'}</button>}
                </div>
            </section>

            {quiz && <Quiz onClose={() => setQuiz(false)} onPick={cls => { setQuiz(false); setSelected(cls); }} />}
        </PageShell>
    );
}
