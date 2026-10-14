import Hud from '../components/Hud.jsx';
import ModalHost from '../components/Modals.jsx';

// The canvas itself lives in GameStage; this page only layers the HUD and modals over it.
export default function Play() {
    return (
        <div className="play">
            <Hud />
            <ModalHost />
        </div>
    );
}
