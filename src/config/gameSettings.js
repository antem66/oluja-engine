export const GAME_WIDTH = 1000;
export const GAME_HEIGHT = 700;
export const NUM_REELS = 5;
export const SYMBOLS_PER_REEL_VISIBLE = 4;
export const REEL_WIDTH = 150;
export const SYMBOL_SIZE = 130;
export const SCATTER_SYMBOL_ID = "SCAT";
export const MIN_SCATTERS_FOR_FREE_SPINS = 3;
export const FREE_SPINS_AWARDED = 10;
export const AUTOPLAY_SPINS_DEFAULT = 10;
export const BET_PER_LINE_LEVELS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0];
export const ENABLE_FREE_SPINS = false; // Config flag to enable/disable free spins feature
export const normalBgColor = 0x2f4f4f;
export const freeSpinsBgColor = 0x4b0082;

// Derived constants (can also be calculated where needed, but useful here)
export const REEL_VISIBLE_HEIGHT = SYMBOLS_PER_REEL_VISIBLE * SYMBOL_SIZE;
export const reelAreaX = (GAME_WIDTH - NUM_REELS * REEL_WIDTH) / 2;
export const reelAreaY = 80; // Adjust as needed
export const bottomUIY = GAME_HEIGHT - 100; // Adjust as needed
