import { PageShell } from '../components/ui.jsx';

// The Sprite Forge is a separate tool (sprite-forge/) deployed on its own; embed it lazily.
export default function SpriteForge() {
    return (
        <PageShell title="Sprite Forge" lede="Turn PNG artwork into pixel-art sprite sheets for the game." className="forge-page">
            <iframe
                className="forge-frame"
                title="Sprite Forge, a pixel-art sprite sheet converter"
                src="https://archons-sprite-forge.surge.sh/"
                loading="lazy"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-downloads allow-same-origin"
            />
        </PageShell>
    );
}
