import * as PIXI from 'pixi.js';
import { winAnimDelayMultiplier } from '../config/animationSettings.js';
import { REEL_WIDTH, reelAreaX, reelAreaY } from '../config/gameSettings.js'; // Import positioning constants

// Reference to the graphics object (needs initialization)
let winLineGraphics = null;
let winLineFadeTimeout = null;
let winLineFadeInterval = null;

/**
 * Initializes the reference to the win line graphics object.
 * @param {PIXI.Graphics} graphics - The Pixi Graphics object for drawing lines.
 */
export function initPaylineGraphics(graphics) {
    if (!graphics) {
        console.error("PaylineGraphics: Provided graphics object is invalid.");
        return;
    }
    winLineGraphics = graphics;
    // Set initial position based on config (could also be done in Game setup)
    winLineGraphics.x = reelAreaX;
    winLineGraphics.y = reelAreaY;
    console.log("PaylineGraphics initialized with:", winLineGraphics);
}

/**
 * Draws the winning paylines based on the provided win information.
 * Includes fade-in and fade-out animations.
 * @param {Array} winningLinesInfo - Array of objects, each describing a winning line.
 *                                   Expected format: { lineIndex, count, symbols: [symbolObj1, ...] }
 */
export function drawWinLines(winningLinesInfo) {
    if (!winLineGraphics) {
        console.error("PaylineGraphics: Graphics object not initialized.");
        return;
    }
    if (!winningLinesInfo || winningLinesInfo.length === 0) {
        winLineGraphics.clear(); // Clear if no wins
        return;
    }

    // Clear previous animations/timeouts
    if (winLineFadeTimeout) clearTimeout(winLineFadeTimeout);
    if (winLineFadeInterval) clearInterval(winLineFadeInterval);
    winLineGraphics.clear();
    winLineGraphics.alpha = 0; // Start transparent for fade-in

    const lineColors = [ // Define colors for different lines
        0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500,
        0x800080, 0x008000, 0x800000, 0xadd8e6, 0x90ee90, 0xffb6c1, 0xfaebd7, 0xdda0dd
    ];

    winningLinesInfo.forEach((info) => {
        if (!info.symbols || info.symbols.length < 1) return; // Skip if no symbols recorded

        const lineColor = lineColors[info.lineIndex % lineColors.length];
        winLineGraphics.lineStyle({ width: 5, color: lineColor, alpha: 0.7 });

        let firstValidPoint = true;
        for (let i = 0; i < info.count; i++) {
            const symbolObj = info.symbols[i];
            if (!symbolObj?.parent) { // Check if symbol is still valid and on stage
                console.warn(`PaylineGraphics: Symbol object invalid for line ${info.lineIndex}, index ${i}`);
                continue;
            }

            // Calculate position relative to the winLineGraphics container's origin (reelAreaX, reelAreaY)
            // Assumes symbolObj.parent is the reel container (rc)
            const reelIndex = symbolObj.parent.x / REEL_WIDTH; // Infer reel index from container position
            const symbolCenterX = reelIndex * REEL_WIDTH + REEL_WIDTH / 2;
            const symbolCenterY = symbolObj.y; // y position is relative to the reel container

            if (firstValidPoint) {
                winLineGraphics.moveTo(symbolCenterX, symbolCenterY);
                firstValidPoint = false;
            } else {
                winLineGraphics.lineTo(symbolCenterX, symbolCenterY);
            }
            // Draw circles at symbol centers
            winLineGraphics.drawCircle(symbolCenterX, symbolCenterY, 8).fill({ color: lineColor, alpha: 0.8 });
        }
        if (!firstValidPoint) {
            winLineGraphics.stroke(); // Draw the line segments
        }
    });

    // --- Fade In Animation ---
    let currentAlpha = 0;
    const fadeInDuration = 50 * winAnimDelayMultiplier; // Faster fade-in
    winLineFadeInterval = setInterval(() => {
        currentAlpha += 0.15; // Faster increment
        winLineGraphics.alpha = Math.min(0.8, currentAlpha);
        if (currentAlpha >= 0.8) {
            clearInterval(winLineFadeInterval);
        }
    }, fadeInDuration / (0.8 / 0.15)); // Adjust interval timing

    // --- Fade Out Timer ---
    const displayDuration = 3000 * winAnimDelayMultiplier;
    winLineFadeTimeout = setTimeout(() => {
        if (winLineFadeInterval) clearInterval(winLineFadeInterval); // Ensure fade-in stops

        let fadeOutAlpha = winLineGraphics.alpha;
        const fadeOutDuration = 50 * winAnimDelayMultiplier; // Faster fade-out
        const fadeOutInterval = setInterval(() => {
            fadeOutAlpha -= 0.15; // Faster decrement
            winLineGraphics.alpha = Math.max(0, fadeOutAlpha);
            if (fadeOutAlpha <= 0) {
                clearInterval(fadeOutInterval);
                winLineGraphics.clear(); // Clear graphics after fade out
            }
        }, fadeOutDuration / (fadeOutAlpha / 0.15 + 1)); // Adjust interval timing

    }, displayDuration);
}

/**
 * Clears any active win lines and stops animations.
 */
export function clearWinLines() {
    if (winLineFadeTimeout) clearTimeout(winLineFadeTimeout);
    if (winLineFadeInterval) clearInterval(winLineFadeInterval);
    if (winLineGraphics) {
        winLineGraphics.clear();
        winLineGraphics.alpha = 0;
    }
    winLineFadeTimeout = null;
    winLineFadeInterval = null;
}
