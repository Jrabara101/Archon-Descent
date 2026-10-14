import { useEffect, useRef } from 'react';
import { DungeonEngine } from '../game/core.js';
import { ui } from '../bridge/store.js';
import { setEngine } from '../bridge/engine.js';

// The canvas, the vector skill-effect layer and the minimap live here for the whole
// session, so the game loop never restarts when React changes pages.
export default function GameStage({ active }) {
    const canvasRef = useRef(null);
    const fxRef = useRef(null);
    const miniRef = useRef(null);

    useEffect(() => {
        const engine = new DungeonEngine({ canvas: canvasRef.current, minimap: miniRef.current, fxLayer: fxRef.current, ui });
        setEngine(engine);
        ui.metaChanged();
        if (import.meta.env.DEV) window.game = engine;
        return () => engine.destroy();
    }, []);

    return (
        <div className={`stage${active ? ' stage--active' : ''}`} aria-hidden={!active}>
            <canvas ref={canvasRef} className="stage__canvas" aria-label="Dungeon view" />
            <svg ref={fxRef} className="stage__fx" aria-hidden="true" />
            <canvas ref={miniRef} className="stage__minimap" width="120" height="120" aria-label="Minimap" />
        </div>
    );
}
