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
export const ENABLE_FREE_SPINS = true; // Config flag to enable/disable free spins feature
export const normalBgColor = 0x2f4f4f;
export const freeSpinsBgColor = 0x4b0082;

// Currency settings
export const CURRENCY = {
  EUR: {
    symbol: "€",
    format: (value) => `${CURRENCY.EUR.symbol}${formatNumberEU(value)}` // European format: 10.000,45€
  },
  USD: {
    symbol: "$",
    format: (value) => `${CURRENCY.USD.symbol}${formatNumberUS(value)}` // US format: $10,000.45
  }
};
export const DEFAULT_CURRENCY = "EUR"; // Default currency to use

// Helper functions for number formatting
function formatNumberEU(value) {
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".").replace(".", ",");
}

function formatNumberUS(value) {
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Derived constants (can also be calculated where needed, but useful here)
export const REEL_VISIBLE_HEIGHT = SYMBOLS_PER_REEL_VISIBLE * SYMBOL_SIZE;
export const reelAreaX = (GAME_WIDTH - NUM_REELS * REEL_WIDTH) / 2;
export const reelAreaY = 80; // Adjust as needed
export const bottomUIY = GAME_HEIGHT - 100; // Adjust as needed

// Background settings
export const BG_OFFSET_X = 0; // Horizontal offset adjustment
export const BG_OFFSET_Y = -20; // Move background up slightly to align with reels
export const BG_SCALE_MODE = 'cover'; // 'cover', 'contain', or 'exact'
export const BG_SCALE_FACTOR = 1.02; // Slight scale up to ensure full coverage
