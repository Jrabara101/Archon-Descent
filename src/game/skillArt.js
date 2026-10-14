export const SKILL_ICON_ART = {
    warrior: {
        accent: '#ef4444',
        icons: [
            { name: 'Shield Slam', motion: 'slam', svg: `
                <path class="fx-fill" d="M12 2.6 20 5.4v6.1c0 4.7-3.2 8.6-8 9.9-4.8-1.3-8-5.2-8-9.9V5.4Z"/>
                <path class="fx-stroke" d="M12 2.6 20 5.4v6.1c0 4.7-3.2 8.6-8 9.9-4.8-1.3-8-5.2-8-9.9V5.4Z"/>
                <path class="fx-stroke fx-detail" d="M12 6.5v9M8 10h8"/>` },
            { name: 'Battle Cry', motion: 'cry', svg: `
                <path class="fx-fill" d="M4 9.5 11 6v12L4 14.5Z"/>
                <path class="fx-stroke" d="M4 9.5 11 6v12L4 14.5Z"/>
                <path class="fx-stroke fx-wave" d="M14 8.5c1.9 2 1.9 5 0 7"/>
                <path class="fx-stroke fx-wave fx-wave-2" d="M17 6c3.3 3.3 3.3 8.7 0 12"/>` },
            { name: 'Earthshatter', motion: 'quake', svg: `
                <path class="fx-fill" d="M12 2.5 14.6 9h6.6l-5.3 4 2 6.6L12 15.8 6.1 19.6l2-6.6L2.8 9h6.6Z"/>
                <path class="fx-stroke" d="M12 2.5 14.6 9h6.6l-5.3 4 2 6.6L12 15.8 6.1 19.6l2-6.6L2.8 9h6.6Z"/>` }
        ]
    },
    mage: {
        accent: '#a855f7',
        icons: [
            { name: 'Fireball', motion: 'flame', svg: `
                <path class="fx-fill" d="M12 2.5c3.4 3.4 5.6 6 5.6 9.4a5.6 5.6 0 1 1-11.2 0c0-2 .8-3.6 2.2-5.2.3 1.4 1 2.2 2 2.5-.5-2.6.1-4.8 1.4-6.7Z"/>
                <path class="fx-stroke" d="M12 2.5c3.4 3.4 5.6 6 5.6 9.4a5.6 5.6 0 1 1-11.2 0c0-2 .8-3.6 2.2-5.2.3 1.4 1 2.2 2 2.5-.5-2.6.1-4.8 1.4-6.7Z"/>
                <path class="fx-core" d="M12 12.4c1.5 1.6 2.3 2.8 2.3 4a2.3 2.3 0 1 1-4.6 0c0-1.2.8-2.4 2.3-4Z"/>` },
            { name: 'Frost Nova', motion: 'frost', svg: `
                <path class="fx-stroke fx-detail" d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17"/>
                <path class="fx-stroke fx-detail" d="M12 6.4 9.6 4M12 6.4 14.4 4M12 17.6 9.6 20M12 17.6l2.4 2.4"/>
                <circle class="fx-fill" cx="12" cy="12" r="2.6"/>` },
            { name: 'Meteor', motion: 'meteor', svg: `
                <circle class="fx-fill" cx="15" cy="9" r="5"/>
                <circle class="fx-stroke" cx="15" cy="9" r="5"/>
                <path class="fx-stroke fx-trail" d="M9.4 14.6 3 21M12 17l-3 3M6 12l-3 3"/>` }
        ]
    },
    rogue: {
        accent: '#34d399',
        icons: [
            { name: 'Shadowstep', motion: 'blink', svg: `
                <path class="fx-fill fx-ghost" d="M7 4.5c2.2 0 4 1.8 4 4v11H3v-11c0-2.2 1.8-4 4-4Z"/>
                <path class="fx-fill" d="M16 4.5c2.2 0 4 1.8 4 4v11h-8v-11c0-2.2 1.8-4 4-4Z"/>
                <path class="fx-stroke" d="M16 4.5c2.2 0 4 1.8 4 4v11h-8v-11c0-2.2 1.8-4 4-4Z"/>` },
            { name: 'Poison Blade', motion: 'drip', svg: `
                <path class="fx-fill" d="M13.5 2.5 17 6 8 20l-2.6-2.6Z"/>
                <path class="fx-stroke" d="M13.5 2.5 17 6 8 20l-2.6-2.6Z"/>
                <circle class="fx-core fx-drop" cx="18.5" cy="14" r="2.2"/>` },
            { name: 'Assassins Mark', motion: 'mark', svg: `
                <path class="fx-fill" d="M12 3.5c2.4 2.6 3.8 4.6 3.8 6.6a3.8 3.8 0 1 1-7.6 0c0-2 1.4-4 3.8-6.6Z"/>
                <path class="fx-stroke fx-detail" d="M7.5 15.5 12 20l4.5-4.5"/>
                <circle class="fx-core" cx="12" cy="10.4" r="1.4"/>` }
        ]
    },
    paladin: {
        accent: '#facc15',
        icons: [
            { name: 'Holy Strike', motion: 'holy', svg: `
                <path class="fx-fill" d="M10.6 2.5h2.8v6.2h6.1v2.8h-6.1V21.5h-2.8V11.5H4.5V8.7h6.1Z"/>
                <path class="fx-stroke" d="M10.6 2.5h2.8v6.2h6.1v2.8h-6.1V21.5h-2.8V11.5H4.5V8.7h6.1Z"/>
                <circle class="fx-halo" cx="12" cy="10" r="8.4"/>` },
            { name: 'Lay on Hands', motion: 'mend', svg: `
                <path class="fx-fill" d="M12 20.5C6.5 16.8 3.5 13.8 3.5 10.2A4.7 4.7 0 0 1 12 7.4a4.7 4.7 0 0 1 8.5 2.8c0 3.6-3 6.6-8.5 10.3Z"/>
                <path class="fx-stroke" d="M12 20.5C6.5 16.8 3.5 13.8 3.5 10.2A4.7 4.7 0 0 1 12 7.4a4.7 4.7 0 0 1 8.5 2.8c0 3.6-3 6.6-8.5 10.3Z"/>` },
            { name: 'Divine Judgment', motion: 'judge', svg: `
                <path class="fx-stroke fx-detail" d="M12 3v18M5 7h14M7.5 7 5 13h5ZM16.5 7 14 13h5Z"/>
                <circle class="fx-fill" cx="12" cy="3.6" r="1.8"/>` }
        ]
    },
    necromancer: {
        accent: '#a78bfa',
        icons: [
            { name: 'Raise Skeleton', motion: 'raise', svg: `
                <path class="fx-fill" d="M12 3a7 7 0 0 1 7 7v3.4l-2 1.2v3.2H7v-3.2l-2-1.2V10a7 7 0 0 1 7-7Z"/>
                <path class="fx-stroke" d="M12 3a7 7 0 0 1 7 7v3.4l-2 1.2v3.2H7v-3.2l-2-1.2V10a7 7 0 0 1 7-7Z"/>
                <circle class="fx-eye" cx="9.5" cy="10.5" r="1.7"/>
                <circle class="fx-eye fx-eye-2" cx="14.5" cy="10.5" r="1.7"/>` },
            { name: 'Drain Life', motion: 'drain', svg: `
                <path class="fx-fill" d="M12 2.8c3.6 4.3 5.6 7 5.6 9.5a5.6 5.6 0 1 1-11.2 0c0-2.5 2-5.2 5.6-9.5Z"/>
                <path class="fx-stroke" d="M12 2.8c3.6 4.3 5.6 7 5.6 9.5a5.6 5.6 0 1 1-11.2 0c0-2.5 2-5.2 5.6-9.5Z"/>
                <path class="fx-core fx-siphon" d="M12 8.5v7"/>` },
            { name: 'Grave Tide', motion: 'tide', svg: `
                <path class="fx-fill" d="M6 20V9.5a6 6 0 0 1 12 0V20Z"/>
                <path class="fx-stroke" d="M6 20V9.5a6 6 0 0 1 12 0V20Z"/>
                <path class="fx-stroke fx-detail" d="M9.5 20v-4M14.5 20v-4M12 20V14"/>` }
        ]
    },
    ranger: {
        accent: '#14b8a6',
        icons: [
            { name: 'Piercing Shot', motion: 'shot', svg: `
                <path class="fx-stroke fx-shaft" d="M3.5 20.5 20 4"/>
                <path class="fx-fill" d="M20.5 3.5 21 9l-5.5-.5Z"/>
                <path class="fx-stroke fx-detail" d="M4 15.5 8.5 20M7 13l4 4"/>` },
            { name: 'Snare Trap', motion: 'snap', svg: `
                <circle class="fx-stroke" cx="12" cy="12" r="7.5"/>
                <path class="fx-stroke fx-jaw" d="M12 4.5 9.5 9h5ZM12 19.5 9.5 15h5ZM4.5 12 9 9.5v5ZM19.5 12 15 9.5v5Z"/>
                <circle class="fx-core" cx="12" cy="12" r="1.8"/>` },
            { name: 'Arrow Storm', motion: 'storm', svg: `
                <path class="fx-stroke fx-rain" d="M5 3.5 5 13M12 2.5 12 13M19 3.5 19 13"/>
                <path class="fx-fill" d="M5 16.5 2.8 12h4.4ZM12 15.5 9.8 11h4.4ZM19 16.5 16.8 12h4.4Z"/>` }
        ]
    }
};
