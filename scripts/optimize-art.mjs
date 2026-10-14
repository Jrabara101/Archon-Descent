// Converts the raw illustrated character art into small WebP files the game ships with.
// Source PNGs (Characters 1/, Characters 2/) stay out of git; run this after adding new art:
//   node scripts/optimize-art.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = name => path.join(name.startsWith('c1:') ? 'Characters 1' : 'Characters 2', 'stitch_stitch_design_system',
    `dark_cyberpunk_infused_retro_dungeon_crawler_game_art_archon_s_descent._clean_${name.slice(3)}`, 'screen.png');

// output key -> source image
const ART = {
    // Playable classes
    'class-warrior': 'c1:11', 'class-mage': 'c1:10', 'class-rogue': 'c1:7',
    'class-paladin': 'c1:8', 'class-necromancer': 'c1:6', 'class-ranger': 'c1:9',
    // Bestiary
    'foe-goblin_scout': 'c1:1', 'foe-iron_guardian': 'c1:2', 'foe-skeleton_archer': 'c1:3',
    'foe-savage_orc': 'c1:4', 'foe-mimic': 'c1:5', 'foe-bound_wraith': 'c1:12',
    'foe-lava_orc': 'c2:1', 'foe-hex_weaver': 'c2:2', 'foe-fire_elemental': 'c2:9',
    // Companions and captives
    'npc-sera': 'c2:3', 'npc-wolf': 'c2:4', 'npc-bram': 'c2:5', 'npc-wisp': 'c2:6', 'npc-old_kettle': 'c2:7',
};

const OUT = path.join('public', 'art');
fs.mkdirSync(OUT, { recursive: true });

let total = 0;
for (const [key, src] of Object.entries(ART)) {
    const file = SRC(src);
    if (!fs.existsSync(file)) { console.warn(`missing source for ${key}: ${file}`); continue; }
    for (const [suffix, size, quality] of [['', 640, 78], ['-sm', 192, 72]]) {
        const out = path.join(OUT, `${key}${suffix}.webp`);
        await sharp(file).resize(size, size, { fit: 'cover' }).webp({ quality, effort: 6 }).toFile(out);
        total += fs.statSync(out).size;
    }
}
console.log(`wrote ${Object.keys(ART).length * 2} files, ${(total / 1024 / 1024).toFixed(2)} MB total`);
