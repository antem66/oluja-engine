/**
 * Asset Manifest
 * 
 * Defines all critical assets that need to be preloaded before the game starts.
 * Use the paths relative to the 'public' directory for assets located there.
 */

export const ASSET_MANIFEST = [
    // --- UI Elements / Logos ---
    // { alias: 'studioLogo', src: 'assets/images/ui/studio_logo.png' }, // Already loaded in main.js for loader screen
    { alias: 'logo', src: 'assets/images/ui/logo.png' }, 
    // Add other UI images like panel backgrounds if they are separate images

    // --- Backgrounds ---
    // Add aliases and paths for all background images used
    { alias: 'background_default', src: 'assets/images/background/bg.png' },
    // Note: Verify this path if free spins are implemented
    // { alias: 'background_fs', src: 'assets/images/backgrounds/bg_freespins.jpg' }, // REMOVED - Asset does not exist yet

    // --- Symbol Textures ---
    // Texturepacker output format is usually best here, but for individual files:
    { alias: 'FACE1', src: 'assets/images/FACE1.png' }, // Assuming SYM1 = FACE1
    { alias: 'FACE2', src: 'assets/images/FACE2.png' }, // Assuming SYM2 = FACE2
    { alias: 'FACE3', src: 'assets/images/FACE3.png' }, // Assuming SYM3 = FACE3
    { alias: 'CUP', src: 'assets/images/CUP.png' },     // Assuming SYM4 = CUP?
    { alias: 'KNIFE', src: 'assets/images/KNIFE.png' },   // Assuming SYM5 = KNIFE?
    { alias: 'PATCH', src: 'assets/images/PATCH.png' },   // Assuming SYM6 = PATCH?
    { alias: 'LOW', src: 'assets/images/LOW.png' },     // Assuming WILD = LOW? (Needs confirmation)
    { alias: 'SCAT', src: 'assets/images/SCAT.png' },    // Corrected scatter path

    // --- Control Icons (SVGs) ---
    // These should match the aliases used in ButtonFactory.js
    { alias: 'btn_spin', src: 'assets/control/spin.svg' },
    { alias: 'btn_stop', src: 'assets/control/stop.svg' },
    { alias: 'btn_turbo', src: 'assets/control/turbo.svg' },
    { alias: 'btn_autoplay', src: 'assets/control/autoplay.svg' },
    { alias: 'btn_plus', src: 'assets/control/plus.svg' },
    { alias: 'btn_minus', src: 'assets/control/minus.svg' },
    // Add any other control icons used (e.g., settings, info, paytable)
    // { alias: 'btn_settings', src: 'assets/control/settings.svg' },

    // --- Spritesheets (if any) ---
    // Example:
    // { alias: 'explosionSheet', src: 'assets/spritesheets/explosion.json' }, 

    // --- Audio Files (if any) ---
    // Example:
    // { alias: 'spinSound', src: 'assets/audio/spin.wav' },
    // { alias: 'winSound', src: 'assets/audio/win.mp3' },

];
