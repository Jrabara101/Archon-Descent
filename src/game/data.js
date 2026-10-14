// ============================================================================
// --- ARCHON'S DESCENT - GAME DATA & CONFIGURATION ---
// ============================================================================

export const GAME_VERSION = '2.0.0';
export const CHANGELOG_ENTRIES = [
    'A rebuilt interface: new title screen, illustrated class select, and a single Codex for the bestiary, lore, achievements and run history.',
    'Settings, mutators, save export/import, the Archon Hub, gamepad support and build-card sharing work again.',
    'Relics, class talents, weapon traits and the Volatile, Warded and Frenzied affixes now do what their descriptions say.',
    'Touch controls for phones: a movement pad, ability buttons and tap-to-path.',
    'A fourth biome, the Drowned Depths (B11–B15), with currents, four new creatures and a new guardian. Every biome now ends in its own guardian fight.'
];

export const RARITY_COLORS = { common: '#94a3b8', rare: '#3b82f6', epic: '#a855f7', legendary: '#eab308' };
export const RARITY_COLORS_CB = { common: '#94a3b8', rare: '#38bdf8', epic: '#f472b6', legendary: '#fb923c' };

export const PLAYER_COLORS = {
    warrior: '#ef4444',
    mage: '#a855f7',
    rogue: '#34d399',
    paladin: '#facc15',
    necromancer: '#581c87',
    ranger: '#14b8a6'
};

export const ABILITY_ICONS = {
    warrior: ['🛡️', '📯', '👊'],
    mage: ['🔥', '❄️', '☄️'],
    rogue: ['💨', '🗡️', '☠️'],
    paladin: ['✨', '🙏', '⚖️'],
    necromancer: ['💀', '🩸', '⚰️'],
    ranger: ['🎯', '🪤', '🌧️']
};

export const ALL_CLASSES = ['warrior', 'mage', 'rogue', 'paladin', 'necromancer', 'ranger'];
export const MASTERY_KILL_THRESHOLD = 500;
export const MASTERY_COLORS = {
    warrior: '#fbbf24',
    mage: '#f472b6',
    rogue: '#22d3ee',
    paladin: '#fde047',
    necromancer: '#c084fc',
    ranger: '#2dd4bf'
};

// Class recommendation quiz
export const CLASS_QUIZ = [
    {
        q: "When you fight, you'd rather:",
        answers: [
            { text: 'Hit things until they stop moving', scores: { warrior: 2, paladin: 1 } },
            { text: 'Stay at range and pick enemies apart', scores: { mage: 2, ranger: 2 } },
            { text: 'Strike from the shadows, unseen', scores: { rogue: 2 } },
            { text: 'Let something else do the fighting for me', scores: { necromancer: 2, paladin: 1 } }
        ]
    },
    {
        q: 'When things go wrong, you:',
        answers: [
            { text: 'Tank the hit and keep swinging', scores: { warrior: 2, paladin: 2 } },
            { text: 'Control the fight from a distance', scores: { mage: 1, ranger: 2 } },
            { text: 'Vanish and reposition', scores: { rogue: 2 } },
            { text: 'Let my minions take the damage', scores: { necromancer: 2 } }
        ]
    }
];

export const CAPTIVE_BARKS = [
    { id: 'bram', name: 'Bram the Freed', bark: "Owe you my life. Point me at something and I'll swing." },
    { id: 'sera', name: 'Sera the Unchained', bark: 'Three days in the dark. I remember every face that walked past.' },
    { id: 'old_kettle', name: 'Old Kettle', bark: "Heh. Didn't think anyone still came down this far." },
    { id: 'wisp', name: 'Wisp', bark: "...thank you. I'll fight. I don't have anywhere else to go." }
];

export const CAPTIVE_CLASS_BARKS = {
    bram: {
        warrior: "Bram: \"A fellow shield-arm. Good. I fight better next to someone who won't flinch.\"",
        mage: "Bram: \"Magic, huh. Just don't light me on fire by accident.\"",
        rogue: "Bram: \"Quiet ones like you scare me more than the loud ones. I mean that as a compliment.\"",
        paladin: "Bram: \"Never thought I'd be glad to see holy light down here. Lead on.\"",
        necromancer: "Bram: \"...you raise the dead. I'm going to try very hard not to think about that.\"",
        ranger: "Bram: \"Keep me out of your arrow line and we'll get along fine.\""
    },
    sera: {
        warrior: "Sera: \"You hit like the wall did. Good. I've had enough of the wall.\"",
        mage: "Sera: \"I've seen what mages down here can become. You're not that. Yet.\"",
        rogue: "Sera: \"You move like someone who's been caught before. We should compare notes.\"",
        paladin: "Sera: \"I stopped praying on day two. Maybe I'll start again.\"",
        necromancer: "Sera: \"The bones out there — are they listening to you, or to it? Watch that line.\"",
        ranger: "Sera: \"You saw me before I saw you. That's the first time that's happened down here.\""
    },
    old_kettle: {
        warrior: "Old Kettle: \"Built like the last one who tried this. He didn't make it either. No offense.\"",
        mage: "Old Kettle: \"Careful with that down here. The Descent likes to answer back.\"",
        rogue: "Old Kettle: \"Didn't hear you coming. Didn't hear the last three who tried that either.\"",
        paladin: "Old Kettle: \"Haven't seen that light in these tunnels in a long, long time.\"",
        necromancer: "Old Kettle: \"...you and this place have a lot in common, lad. Don't let it show too much.\"",
        ranger: "Old Kettle: \"Good eye. You'll need it. This place doesn't announce itself twice.\""
    },
    wisp: {
        warrior: "Wisp: \"...you're not scared of anything, are you. I wish I felt that.\"",
        mage: "Wisp: \"...the fire follows you different than it follows others. I don't know why.\"",
        rogue: "Wisp: \"...I didn't even see the door open. I'm glad you're the one who found it.\"",
        paladin: "Wisp: \"...it's warmer near you. I don't think that's just the light.\"",
        necromancer: "Wisp: \"...I should be more afraid of you than I am. I don't understand that.\"",
        ranger: "Wisp: \"...you watch everything, don't you. Watch out for me too, please.\""
    }
};

export const CAPTIVE_ACT_LINES = {
    bram: {
        2: "Bram: \"Forges took my brother. Said the ore called to him. I didn't believe it — until I heard it too.\"",
        3: "Bram: \"I can feel it down here. Not sound. Pressure. Like something's counting how many of us are left.\""
    },
    sera: {
        2: "Sera: \"I mapped three depths before they caught me. The forges weren't on any of my old charts. They grew in after.\"",
        3: "Sera: \"The Void doesn't have walls, not really. It has the memory of walls, worn into shape by everyone who tried to leave.\""
    },
    old_kettle: {
        2: "Old Kettle: \"Forty years I've run these camps. Never once seen the Archon. Never once needed to — you can smell what it wants.\"",
        3: "Old Kettle: \"Don't look right at it when you find it, lad. I've seen delvers come back from the Void who wish they hadn't looked.\""
    },
    wisp: {
        2: "Wisp: \"...the fire here isn't angry. It's grieving. I don't know how I know that. I just do.\"",
        3: "Wisp: \"...I don't want to go any deeper. But I don't want you going alone either. So — deeper, then.\""
    }
};

export const MERCHANT_BARKS = [
    "Careful down there. My last regular didn't come back for seconds.",
    'Gold spends the same whether it was earned or pried from a corpse.',
    "Everything's genuine. Mostly.",
    "I don't ask where the Descent's gold comes from. Neither should you."
];

export const UNIQUE_ITEMS_DB = [
    { id: 'voidfang', name: 'Voidfang', type: 'weapon', icon: '🗡️', statBonus: 10, uniqueEffect: 'lifesteal', lore: 'It does not cut. It drinks.' },
    { id: 'aegis_eternal', name: 'Aegis Eternal', type: 'shield', icon: '🛡️', statBonus: 8, uniqueEffect: 'thorns', lore: 'Forged by the first ward-smith. It remembers every blow it has ever stopped.' },
    { id: 'cinderheart', name: 'Cinderheart', type: 'weapon', icon: '🔥', statBonus: 9, uniqueEffect: 'burn_on_hit', lore: "A splinter of the Forge's original flame, still burning after a thousand years." },
    { id: 'wanderers_cloak', name: "Wanderer's Cloak", type: 'armor', icon: '🧥', statBonus: 7, uniqueEffect: 'vision', lore: 'Worn by a scout who mapped three depths of the Descent and lived to tell it.' },
    { id: 'tidebreaker', name: 'Tidebreaker', type: 'weapon', icon: '🔱', statBonus: 9, uniqueEffect: 'chill_on_hit', lore: "A harpoon pulled from the Tidemother's side. It still drips, and everything it touches slows to listen." },
    { id: 'soulbound_ring', name: 'Soulbound Ring', type: 'accessory', icon: '💍', statBonus: 6, uniqueEffect: 'soul_heal', lore: 'It was a wedding band once. Now it only remembers how to hold on.' }
];

export const TRIALS_DB = [
    { id: 'trial_steel', name: 'Trial of Steel', cls: 'warrior', biome: 'catacombs', level: 5, mutators: [], title: 'The Unbroken', seed: 0x51ee1001 },
    { id: 'trial_flame', name: 'Trial of Flame', cls: 'mage', biome: 'forges', level: 12, mutators: ['glass'], title: 'Ashwalker', seed: 0xf1a3e002 },
    { id: 'trial_tides', name: 'Trial of Tides', cls: 'ranger', biome: 'drowned', level: 13, mutators: ['swarm'], title: 'Tidewalker', seed: 0x71de5004 },
    { id: 'trial_shadow', name: 'Trial of Shadow', cls: 'rogue', biome: 'void', level: 20, mutators: ['nightmare'], title: 'Nightborn', seed: 0x5ad0c003 }
];

export const BOUNTY_POOL = [
    { id: 'no_potion', name: 'Abstinence', desc: "Don't drink a potion this floor.", icon: '🚫' },
    { id: 'speed', name: 'Swift Descent', desc: 'Reach the stairs within 40 turns.', icon: '⏱️' },
    { id: 'slayer', name: 'Bloodwork', desc: 'Defeat 3 enemies on this floor.', icon: '⚔️' }
];

export const MUTATOR_POOL = [
    { id: 'iron_will', name: 'Iron Will', icon: '🧊', desc: 'No potions may be used.' },
    { id: 'swarm', name: 'Swarm', icon: '🐝', desc: '+2 enemies spawn per room.' },
    { id: 'glass', name: 'Glass Cannon Run', icon: '🏺', desc: '+30% damage dealt and taken.' },
    { id: 'nightmare', name: 'Nightmare', icon: '🌑', desc: 'Every floor is shrouded in Darkness.' },
    { id: 'bloodlust', name: 'Bloodlust', icon: '🩸', desc: '-20% max HP, but 10% lifesteal on every hit.' }
];

export const WEAPON_TRAITS = [
    { id: 'cleave', suffixName: 'of Cleaving', desc: 'Basic attacks also strike enemies adjacent to your target.' },
    { id: 'bounce', suffixName: 'of Ricochet', desc: 'Basic attacks have a chance to chain to a second nearby enemy.' }
];

export const RELIC_POOL = [
    { id: 'lucky_strikes', name: 'Loaded Dice', icon: '🎯', desc: 'Every 4th strike is a guaranteed critical hit.' },
    { id: 'soul_siphon', name: 'Soul Siphon', icon: '🌀', desc: 'Kills restore 5 MP.' },
    { id: 'stoneheart', name: 'Stoneheart Idol', icon: '🗿', desc: 'All incoming damage reduced by 2.' },
    { id: 'momentum', name: 'Momentum Engine', icon: '⚙️', desc: 'After a kill, your next strike deals +50% damage.' },
    { id: 'scavenger', name: "Scavenger's Eye", icon: '🔍', desc: '+30% gold from all sources.' },
    { id: 'glass_cannon', name: 'Glass Cannon', icon: '🏺', desc: '+30% damage dealt, +15% damage taken.' },
    { id: 'phoenix_feather', name: 'Phoenix Feather', icon: '🪶', desc: 'Once per run, survive a killing blow at 1 HP.' },
    { id: 'frost_walker', name: 'Frostwalker Charm', icon: '🧊', desc: 'Immune to chill and spikes; lava burns for half.' },
    { id: 'alchemist_stone', name: "Alchemist's Stone", icon: '⚗️', desc: 'Potions restore 25 more.' },
    { id: 'hunters_instinct', name: "Hunter's Instinct", icon: '🦉', desc: '+2 vision radius.' },
    { id: 'vampire_sigil', name: 'Vampire Sigil', icon: '🧛', desc: 'Kills heal 5% of your max HP.' },
    { id: 'battle_rhythm', name: 'Battle Rhythm', icon: '🥁', desc: 'Ability cooldowns reduced by 1.' }
];

export const CLASS_WALL_VERBS = {
    warrior: 'You bash through the crumbling wall with your shoulder!',
    mage: 'A bolt of force shatters the wall to rubble!',
    rogue: 'You find the seam and pry the false wall open in seconds.',
    paladin: 'A word of power and the wall collapses in holy light!',
    necromancer: 'The wall dissolves at your touch, its stone forgetting how to hold together.',
    ranger: 'A precise strike finds the wall\'s one weak point.'
};

export const CLASS_TALENTS = {
    warrior: { id: 'shield_wall', name: 'Shield Wall', desc: 'Thorns reflect scales up to +25% the lower your HP.', icon: '🛡️' },
    mage: { id: 'arcane_overload', name: 'Arcane Overload', desc: 'Critical hits also set the target ablaze.', icon: '🌟' },
    rogue: { id: 'shadow_step', name: 'Shadow Step', desc: 'Sneak attacks on unaware enemies deal +50% more.', icon: '🥷' },
    paladin: { id: 'sacred_vigor', name: 'Sacred Vigor', desc: '+50% healing from Lay on Hands and your ultimate.', icon: '✨' },
    necromancer: { id: 'deaths_due', name: "Death's Due", desc: 'Kills restore 8 MP.', icon: '💀' },
    ranger: { id: 'piercing_focus', name: 'Piercing Focus', desc: '+10% critical hit chance.', icon: '🎯' }
};

export const TALENT_SYNERGIES = {
    vampiric: 'lucky_strikes',
    executioner: 'lucky_strikes',
    berserker: 'phoenix_feather',
    thorns: 'stoneheart'
};

export const RELIC_SYNERGIES = [
    { pair: ['momentum', 'lucky_strikes'], text: '⚡ Loaded Dice + Momentum Engine: your post-kill strike is now guaranteed to crit.' },
    { pair: ['vampire_sigil', 'soul_siphon'], text: '⚡ Vampire Sigil + Soul Siphon: every kill now fully tops up both HP and MP.' },
    { pair: ['glass_cannon', 'stoneheart'], text: '⚡ Glass Cannon + Stoneheart Idol: the flat reduction quietly takes the edge off glass cannon\'s risk.' },
    { pair: ['scavenger', 'alchemist_stone'], text: "⚡ Scavenger's Eye + Alchemist's Stone: more gold, and every potion it buys heals for more." }
];

export const AFFIX_POOL = ['vampiric', 'armored', 'swift', 'volatile', 'warded', 'frenzied'];
export const AFFIX_NAMES = { vampiric: 'Vampiric', armored: 'Armored', swift: 'Swift', volatile: 'Volatile', warded: 'Warded', frenzied: 'Frenzied' };

export const BESTIARY_DB = {
    goblin_scout: { name: 'Goblin Scout', icon: '👹', lore: 'Starving wretches that slipped into the Descent chasing rumors of gold. What they found instead was hunger without end — now they swarm anything that still carries warmth.' },
    skeleton_archer: { name: 'Skeleton Archer', icon: '🏹', lore: 'The bones of the First Expedition, rearranged by the dark. They remember just enough of their training to keep their distance and loose arrows.' },
    savage_orc: { name: 'Savage Orc', icon: '👺', lore: 'Orc clans mine the upper catacombs for relic-iron. Trespassers are considered a richer vein.' },
    iron_guardian: { name: 'Iron Guardian', icon: '🛡️', lore: 'Animate siege armor that plants itself between you and its allies. Its warding aura blunts every blow struck near it.' },
    fire_elemental: { name: 'Fire Elemental', icon: '🔥', lore: 'A knot of living furnace-heat. Slaying one releases everything it was holding in — stand well back.' },
    lava_orc: { name: 'Lava Orc', icon: '👺', lore: 'Forge-clan orcs quenched in magma until their skin took the temper. Slow to anger, fast to swing.' },
    void_summoner: { name: 'Void Summoner', icon: '👁️', lore: "It does not fight you. It simply opens doors that should stay closed, and lets what's behind them do the fighting." },
    void_archon: { name: 'Void Archon', icon: '🐉', lore: 'Lesser echoes of the Archon itself. Their strikes warp the floor before they land — watch the red light, then move.' },
    void_spawn: { name: 'Void Spawn', icon: '👾', lore: "Fragments shed by a Summoner's open door. Individually pitiful; collectively a tide." },
    bound_wraith: { name: 'Bound Wraith', icon: '👻', lore: 'Souls chained to the arena guardians, hurled at intruders when their master weakens.' },
    hex_weaver: { name: 'Hex Weaver', icon: '🕸️', lore: 'It will not meet you blade to blade. It simply makes sure the floor itself remembers you were here, and hates you for it.' },
    mimic: { name: 'Mimic', icon: '😈', lore: 'Not every chest in the Descent is furniture. The older ones have learned patience, and teeth.' },
    bone_colossus: { name: 'Bone Colossus', icon: '💀', lore: "The fused remains of a hundred failed delvers, stacked into a warden. It guards the passage below Depth 10 with all their regret." },
    molten_behemoth: { name: 'Molten Behemoth', icon: '🌋', lore: "The Forge's heart given legs. Its second wind melts the very ground it defends." },
    drowned_husk: { name: 'Drowned Husk', icon: '🧟', lore: 'Delvers who tried to swim the flooded tier. The water kept them, and now it walks them back up to meet the next ones. Their touch is cold enough to slow you.' },
    siren: { name: 'Siren', icon: '🧜', lore: 'It sings from the far side of every pool. The song is not for you. It is for the water, and the water listens.' },
    tide_leech: { name: 'Tide Leech', icon: '🪱', lore: 'A gut with teeth at both ends. It drinks while it bites and gets harder to kill the longer you let it feed.' },
    abyssal_angler: { name: 'Abyssal Angler', icon: '🐡', lore: 'A lure of false torchlight on a stalk of bone. By the time you see the rest of it, the floor is already giving way under the strike.' },
    brine_spawn: { name: 'Brine Spawn', icon: '🦐', lore: 'Small, salted things that boil out of the Tidemother when she is hurt. Alone they are nothing.' },
    tidemother: { name: 'Tidemother', icon: '🐙', lore: 'The flood has a heart and the heart has arms. She guards the last dry stair above the Void, and she does not want you to reach it.' },
    void_archon_prime: { name: 'Void Archon Prime', icon: '🐲', lore: "The deepest warden — a crowned fragment of the power that dug the Descent in the first place. It does not intend to let you leave with what you've learned." }
};

export const BOSS_ACT_LORE = {
    bone_colossus: {
        pre: "📖 ACT I — Before the bones piled this high, they had names. The Colossus doesn't remember them. It only remembers it must not let you pass.",
        post: "📖 The Colossus falls, and for a moment the pile of it looks almost peaceful — a hundred failed delvers, finally allowed to stop standing guard. Whatever stitched them together this way is still down there."
    },
    molten_behemoth: {
        pre: "📖 ACT II — The forges didn't always burn like this. Something reached up from below and taught the fire to want.",
        post: "📖 The Behemoth's second wind melts the floor around its own corpse, and in the cooling slag you understand: the forges were never the Archon's furnace. They were its warning system. You just tripped it."
    },
    tidemother: {
        pre: "📖 ACT III — The forges poured their heat down here once, and the sea came up to meet it. Something was born where they touched.",
        post: "📖 The Tidemother sinks without a sound, and the water finally goes still. Below it the stairs are dry, and they are very, very old."
    },
    void_archon_prime: {
        pre: "📖 ACT IV — This is not the Archon. It is what the Archon sends when it wants you to feel like you've already lost."
    }
};

export const LORE_DB = [
    'The Descent was not dug downward. Something beneath dug upward, and stopped just short of the surface.',
    "Expedition log, day 3: The torches burn blue past Depth 4. The captain says it's the air. The captain is lying.",
    'Merchants reach the camps by roads that do not exist on the way back. Do not ask them about the roads.',
    'The Archon was a warden once, they say — set to guard the deep places. Nothing remains to say what it was guarding them from.',
    'Blood shrines do not grant power. They make a trade. Read the contract in your veins carefully.',
    'Every crate in the Descent was packed by someone who believed they were coming back for it.',
    'Expedition log, day 11: Kell swears the walls rearrange when we sleep. We no longer sleep.',
    'The orcs did not invade the forges. The forges called them, the way a hearth calls the cold.',
    'Depth 16 and below is called the Void not for its darkness, but for what the darkness costs.',
    'A rusty key opens one vault. The vaults outnumber the keys a hundredfold. Choose your door.',
    'The wraiths in the arenas are volunteers. That is the worst part. They volunteered.',
    'Final entry, unsigned: If you are reading this, take the souls and climb. The Descent counts its guests, and it never miscounts twice.',
    'Harbor log, salvaged: The forges ran hot for a hundred years. Then one morning the water came up the stairs to see what was making all that noise.',
    'Scratched into a drowned lantern: Do not follow the singing. Do not follow the lights. Follow the current only if you want to arrive faster.',
    'The Tidemother was a well once. Every delver who drank from it left a little of themselves behind. She remembers all of them.'
];

export const LORE_CHAPTER_NAMES = ['The Descent Begins', 'What the Forges Called', 'Into the Void', 'The Last Entries', 'Salvaged From the Flood'];
export const LORE_CHAPTER_OF = LORE_DB.map((_, i) => ({ chapter: Math.floor(i / 3) + 1, page: (i % 3) + 1 }));

export const STORY_BEATS = [
    { depth: 1, text: "📖 You did not choose to come here so much as run out of reasons to stay above. The Descent doesn't care why. It only counts who enters." },
    { depth: 5, text: "📖 Five floors down, and the dead outnumber the living by a margin that should worry you more than it does. Something ahead is watching the count." },
    { depth: 10, text: "📖 The catacombs are behind you now. Whatever built this place didn't stop at bones — it kept building, deeper, hungrier, until stone learned to burn." },
    { depth: 11, text: "📖 The forges end in steam, and the steam ends in water. Whole corridors here are drowned. The current pulls toward something that wants company." },
    { depth: 15, text: "📖 Fifteen floors. The water is louder here, and it has a rhythm, like breathing. Whatever guards the dry stair below has heard you coming for a long time." },
    { depth: 16, text: "📖 Past the drowned tier, the air changes first. Then the light. You've stopped trusting either. The Void doesn't hide from you. It waits for you to notice it was never empty." },
    { depth: 20, text: "📖 Twenty floors. Most delvers who make it this far stop asking how deep the Descent goes and start asking what's holding the bottom up. You're close enough now to find out." }
];

export const ACHIEVEMENTS_DB = [
    { id: 'first_descent', name: 'First Descent', icon: '🪜', desc: 'Reach Depth 5.', check: (stats, meta) => (meta.stats && meta.stats.maxDepthReached || 0) >= 5 },
    { id: 'deep_delver', name: 'Deep Delver', icon: '⛏️', desc: 'Reach Depth 10.', check: (stats, meta) => (meta.stats && meta.stats.maxDepthReached || 0) >= 10 },
    { id: 'into_the_void', name: 'Into the Void', icon: '🌌', desc: 'Reach Depth 20.', check: (stats, meta) => (meta.stats && meta.stats.maxDepthReached || 0) >= 20 },
    { id: 'archon_slayer', name: 'Archon Slayer', icon: '💀', desc: 'Defeat a floor guardian.', check: (stats) => !!(stats.bossesDefeated && stats.bossesDefeated.length > 0) },
    { id: 'triple_threat', name: 'Triple Threat', icon: '👑', desc: 'Defeat all three floor guardians (across any runs).', check: (stats) => !!(stats.bossesDefeated && ['bone_colossus', 'molten_behemoth', 'void_archon_prime'].every(k => stats.bossesDefeated.includes(k))) },
    { id: 'tide_turner', name: 'Tide Turner', icon: '🌊', desc: 'Defeat the Tidemother.', check: (stats) => !!(stats.bossesDefeated && stats.bossesDefeated.includes('tidemother')) },
    { id: 'warden_breaker', name: 'Warden Breaker', icon: '🗝️', desc: 'Defeat all four floor guardians (across any runs).', check: (stats) => !!(stats.bossesDefeated && ['bone_colossus', 'molten_behemoth', 'tidemother', 'void_archon_prime'].every(k => stats.bossesDefeated.includes(k))) },
    { id: 'bestiary_complete', name: 'Cartographer of Horrors', icon: '📖', desc: 'Record every creature in the Bestiary.', check: (stats, meta) => Object.keys(meta.bestiary || {}).length >= Object.keys(BESTIARY_DB).length },
    { id: 'lore_keeper', name: 'Lore Keeper', icon: '📜', desc: 'Recover every lore scrap.', check: (stats, meta) => (meta.unlockedLore || []).length >= LORE_DB.length },
    { id: 'relic_hoarder', name: 'Relic Hoarder', icon: '🎒', desc: 'Hold 5 relics at once in a single run.', check: (stats) => (stats.maxRelicsHeld || 0) >= 5 },
    { id: 'talented', name: 'Talented', icon: '🧠', desc: 'Unlock 5 talents in a single run.', check: (stats) => (stats.maxTalentsUnlocked || 0) >= 5 },
    { id: 'rich_archon', name: 'Rich Archon', icon: '💰', desc: 'Carry 500 gold at once.', check: (stats) => (stats.maxGoldHeld || 0) >= 500 },
    { id: 'soul_collector', name: 'Soul Collector', icon: '👻', desc: 'Earn 100 Archon Souls in total.', check: (stats, meta) => (meta.souls || 0) >= 100 },
    { id: 'century_club', name: 'Century Club', icon: '⚔️', desc: 'Defeat 100 enemies in total.', check: (stats) => (stats.totalKills || 0) >= 100 },
    { id: 'mimic_hunter', name: 'Mimic Hunter', icon: '😈', desc: 'Defeat a Mimic.', check: (stats, meta) => !!((meta.bestiary || {}).mimic > 0) },
    { id: 'vault_breaker', name: 'Vault Breaker', icon: '🗝️', desc: 'Open a sealed vault.', check: (stats) => (stats.vaultsOpened || 0) > 0 },
    { id: 'high_roller', name: 'High Roller', icon: '🎰', desc: 'Hit the jackpot at a Gambling Shrine.', check: (stats) => (stats.gambleJackpots || 0) > 0 },
    { id: 'phoenix_reborn', name: 'Phoenix Reborn', icon: '🪶', desc: 'Survive a killing blow with the Phoenix Feather.', check: (stats) => (stats.phoenixSaves || 0) > 0 },
    { id: 'daily_devotee', name: 'Daily Devotee', icon: '📅', desc: 'Complete 3 Daily Challenges.', check: (stats) => (stats.dailyCompletions || 0) >= 3 },
    { id: 'speed_descent', name: 'Speed Descent', icon: '⏱️', desc: 'Reach Depth 5 in under 3 minutes.', check: (stats) => stats.speedDepth5Ms !== undefined && stats.speedDepth5Ms < 3 * 60 * 1000 },
    { id: 'boss_rush_champion', name: 'Boss Rush Champion', icon: '🏅', desc: 'Clear the Boss Rush gauntlet.', check: (stats) => (stats.bossRushCleared || 0) > 0 },
    { id: 'wave_survivor', name: 'Wave Survivor', icon: '🌊', desc: 'Reach Wave 10 in Endless Mode.', check: (stats) => (stats.bestWave || 0) >= 10 },
    { id: 'not_alone', name: 'Not Alone', icon: '🐾', desc: 'Fight alongside 2 companions at once.', check: (stats) => (stats.maxAllies || 0) >= 2 },
    { id: 'ascendant', name: 'Ascendant', icon: '🔥', desc: 'Reach Ascension Tier 3 in Boss Rush.', check: (stats) => (stats.maxAscensionTier || 0) >= 3 },
    { id: 'masochist', name: 'Masochist', icon: '🎲', desc: 'Start a run with 3 Challenge Mutators active.', check: (stats) => (stats.maxMutatorsAtStart || 0) >= 3 },
    { id: 'trial_master', name: 'Trial Master', icon: '🏵️', desc: 'Earn all three Archon Trial titles.', check: (stats, meta) => !!(meta.titles && TRIALS_DB.every(t => meta.titles.includes(t.title))) }
];

export const HUB_UPGRADES = [
    { id: 'vitality', name: 'Titan Physiology', desc: '+5 Max HP per rank', icon: '❤️', max: 10, baseCost: 20 },
    { id: 'power', name: 'Ancestral Strength', desc: '+1 Base ATK per rank', icon: '💪', max: 10, baseCost: 25 },
    { id: 'fortune', name: "Fortune's Favor", desc: '+5% Gold Found per rank', icon: '🪙', max: 10, baseCost: 20 }
];

// Seeded RNG helpers (daily challenge)
export function mulberry32(seed) {
    let a = seed >>> 0;
    return function() {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function hashStr(s) {
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) {
        h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
}

export function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- Talents (base pool + one class-flavored talent per class) ---
export const BASE_TALENTS = [
    { id: 'vampiric', name: 'Vampiric Fangs', desc: 'Lifesteal 15% of dealt damage.', icon: '🦇' },
    { id: 'thorns', name: 'Thorn Carapace', desc: 'Deal 25% of taken damage back.', icon: '🌵' },
    { id: 'vitality', name: 'Titan Vitality', desc: '+30 Max HP', icon: '❤️' },
    { id: 'focus', name: 'Deep Focus', desc: '+30 Max MP', icon: '🔮' },
    { id: 'strength', name: 'Brute Force', desc: '+5 Base ATK', icon: '💪' },
    { id: 'berserker', name: "Berserker's Fury", desc: 'Below 30% HP, 30% chance to strike again.', icon: '⚔️' },
    { id: 'executioner', name: 'Executioner', desc: 'Critical hits heal you for 25% of damage dealt.', icon: '💀' }
];
export const TALENT_DEFS = Object.fromEntries(
    [...BASE_TALENTS, ...Object.values(CLASS_TALENTS)].map(t => [t.id, t])
);

// --- Class profiles for the class-select screen ---
export const CLASS_INFO = {
    warrior: { name: 'Warrior', role: 'Frontline bruiser', blurb: 'Soaks the hits nobody else can, then answers with a shield to the face.', hp: 120, mp: 50, atk: 10, def: 3, abilities: ['Shield Slam', 'Battle Cry', "Titan's Wrath"], difficulty: 1 },
    mage: { name: 'Mage', role: 'Ranged burst', blurb: 'Fragile, but nothing in the Descent survives a fireball it never saw coming.', hp: 80, mp: 100, atk: 15, def: 0, abilities: ['Fireball', 'Frost Nova', 'Meteor Storm'], difficulty: 2 },
    rogue: { name: 'Rogue', role: 'Ambusher', blurb: 'Strikes unaware enemies for triple damage and is gone before they turn.', hp: 100, mp: 50, atk: 12, def: 0, abilities: ['Shadowstep', 'Poison Blade', 'Death Mark'], difficulty: 3 },
    paladin: { name: 'Paladin', role: 'Self-healing tank', blurb: 'Every smite mends a little. Slow, steady and very hard to put down.', hp: 115, mp: 50, atk: 9, def: 4, abilities: ['Holy Strike', 'Lay on Hands', 'Divine Judgment'], difficulty: 1 },
    necromancer: { name: 'Necromancer', role: 'Summoner', blurb: 'Lets the dead do the fighting and drinks what is left of the living.', hp: 75, mp: 110, atk: 13, def: 0, abilities: ['Raise Skeleton', 'Drain Life', 'Army of the Dead'], difficulty: 2 },
    ranger: { name: 'Ranger', role: 'Marksman', blurb: 'Sees furthest in the dark. Pins whole corridors with a single arrow.', hp: 100, mp: 50, atk: 13, def: 0, abilities: ['Piercing Shot', 'Snare Trap', 'Rain of Arrows'], difficulty: 2 }
};

export const BIOME_INFO = {
    catacombs: { name: 'Catacombs', depths: 'B01–B05', guardian: 'Bone Colossus' },
    forges: { name: 'Forges', depths: 'B06–B10', guardian: 'Molten Behemoth' },
    drowned: { name: 'Drowned Depths', depths: 'B11–B15', guardian: 'Tidemother' },
    void: { name: 'Void', depths: 'B16+', guardian: 'Void Archon Prime' }
};
export const BIOME_ORDER = ['catacombs', 'forges', 'drowned', 'void'];
export const GUARDIAN_INTERVAL = 5; // a guardian waits at the end of every biome
export function biomeForDepth(level) {
    if (level <= 5) return 'catacombs';
    if (level <= 10) return 'forges';
    if (level <= 15) return 'drowned';
    return 'void';
}
