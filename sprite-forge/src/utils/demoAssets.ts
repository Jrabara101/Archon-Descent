// Synthetic high-res 1024x1024 dungeon-baked artwork generator for instant testing

import { AssetType } from '../types';

export interface DemoArtwork {
  name: string;
  filename: string;
  type: AssetType;
  description: string;
  generate: () => string; // Returns Data URL
}

export function generateDemoArtwork(type: AssetType): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.imageSmoothingEnabled = false;

  // 1. Draw baked dungeon background
  // Catacombs / Forges / Void atmospheric dungeon backdrop
  const bgGrad = ctx.createRadialGradient(512, 512, 100, 512, 512, 600);
  if (type === 'boss' || type === 'enemy') {
    bgGrad.addColorStop(0, '#290b02');
    bgGrad.addColorStop(0.7, '#1e110d');
    bgGrad.addColorStop(1, '#0f172a');
  } else if (type === 'skill_fx') {
    bgGrad.addColorStop(0, '#17053b');
    bgGrad.addColorStop(0.7, '#0c021f');
    bgGrad.addColorStop(1, '#080114');
  } else {
    bgGrad.addColorStop(0, '#1e293b');
    bgGrad.addColorStop(0.7, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
  }

  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Dungeon stone texture grid lines in background
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 4;
  for (let x = 0; x <= 1024; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  for (let y = 0; y <= 1024; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // 2. Draw character / object with #22d3ee rim light
  ctx.save();
  ctx.translate(512, 512);

  if (type === 'character' || type === 'companion') {
    // Cyberpunk Paladin / Operative
    // Shadow base
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 360, 240, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body Cloak / Armor
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-180, 320);
    ctx.lineTo(-140, -60);
    ctx.lineTo(0, -180);
    ctx.lineTo(140, -60);
    ctx.lineTo(180, 320);
    ctx.closePath();
    ctx.fill();

    // Torso Armor Plates
    ctx.fillStyle = '#334155';
    ctx.fillRect(-90, -40, 180, 180);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-70, 0, 140, 120);

    // Core energy crest
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.arc(0, 50, 24, 0, Math.PI * 2);
    ctx.fill();

    // Helmet & Visor
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, -160, 90, 0, Math.PI * 2);
    ctx.fill();

    // Cyan glowing visor
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(-60, -175, 120, 28);

    // Pauldrons
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(-140, -70, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(140, -70, 60, 0, Math.PI * 2);
    ctx.fill();

    // Legs / Boots
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-110, 240, 80, 120);
    ctx.fillRect(30, 240, 80, 120);

    // Glowing weapon / blade
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(180, -220, 30, 480);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(186, -210, 18, 380);

    // Rim light bleeding on top/left edges (#22d3ee)
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(0, -160, 95, Math.PI * 0.9, Math.PI * 1.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-140, -70, 65, Math.PI * 0.8, Math.PI * 1.6);
    ctx.stroke();
  } else if (type === 'boss' || type === 'enemy') {
    // Cyber Forge Golem / Demon
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.ellipse(0, 380, 300, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    // Huge spiked silhouette
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.moveTo(-260, 280);
    ctx.lineTo(-280, -100);
    ctx.lineTo(-120, -280);
    ctx.lineTo(0, -320);
    ctx.lineTo(120, -280);
    ctx.lineTo(280, -100);
    ctx.lineTo(260, 280);
    ctx.closePath();
    ctx.fill();

    // Molten core
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(-140, -80, 280, 240);
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(-90, -40, 180, 160);

    // Glowing magma eyes & core
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-80, -200, 50, 25);
    ctx.fillRect(30, -200, 50, 25);
    ctx.fillStyle = '#22d3ee'; // Tech implants
    ctx.fillRect(-40, 0, 80, 80);

    // Rim light on outer edges
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(-280, -100);
    ctx.lineTo(-120, -280);
    ctx.lineTo(0, -320);
    ctx.stroke();
  } else if (type === 'weapon') {
    // Cyber Energy Greatsword
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-25, 120, 50, 180); // Hilt
    ctx.fillStyle = '#334155';
    ctx.fillRect(-120, 90, 240, 36); // Crossguard

    // Energy Blade
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-60, 90);
    ctx.lineTo(-50, -320);
    ctx.lineTo(0, -400);
    ctx.lineTo(50, -320);
    ctx.lineTo(60, 90);
    ctx.closePath();
    ctx.fill();

    // Inner glowing channel
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(-20, 80);
    ctx.lineTo(-15, -300);
    ctx.lineTo(0, -360);
    ctx.lineTo(15, -300);
    ctx.lineTo(20, 80);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-60, 90);
    ctx.lineTo(-50, -320);
    ctx.lineTo(0, -400);
    ctx.stroke();
  } else if (type === 'skill_fx') {
    // Void Plasma Orb / Spell Effect
    const fxGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, 240);
    fxGrad.addColorStop(0, '#ffffff');
    fxGrad.addColorStop(0.2, '#22d3ee');
    fxGrad.addColorStop(0.6, '#4c1d95');
    fxGrad.addColorStop(0.9, '#17053b');
    fxGrad.addColorStop(1, 'rgba(23, 5, 59, 0)');

    ctx.fillStyle = fxGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 240, 0, Math.PI * 2);
    ctx.fill();

    // Energy tendrils
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 10;
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      ctx.beginPath();
      ctx.arc(
        Math.cos(angle) * 120,
        Math.sin(angle) * 120,
        60,
        angle,
        angle + Math.PI
      );
      ctx.stroke();
    }
  } else {
    // Map Tile / Prop (Catacomb Cyber Altar / Chest)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-220, -120, 440, 360);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-180, -80, 360, 280);

    // Glowing runes / glyphs
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(-100, 20, 200, 40);
    ctx.fillRect(-20, -40, 40, 160);

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 12;
    ctx.strokeRect(-220, -120, 440, 360);
  }

  ctx.restore();

  return canvas.toDataURL('image/png');
}

export const DEMO_PRESETS: { name: string; type: AssetType; label: string }[] = [
  { name: 'Paladin_Stitch_1024', type: 'character', label: 'Cyber Paladin (1024x1024)' },
  { name: 'Forge_Golem_1024', type: 'enemy', label: 'Forge Golem (1024x1024)' },
  { name: 'Void_Demon_Boss_1024', type: 'boss', label: 'Void Boss (1024x1024)' },
  { name: 'Energy_Greatsword', type: 'weapon', label: 'Plasma Blade (1024x1024)' },
  { name: 'Plasma_Nova_Spell', type: 'skill_fx', label: 'Void Spell FX (1024x1024)' },
  { name: 'Cyber_Altar_Prop', type: 'prop', label: 'Dungeon Prop (1024x1024)' },
];
