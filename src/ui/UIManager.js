import * as PIXI from 'pixi.js';
import { state } from '../core/GameState.js'; // Assuming state access
import { GAME_WIDTH, bottomUIY } from '../config/gameSettings.js';

// References to UI elements (Text objects, Buttons)
let uiContainerRef = null;
let balanceText = null;
let winText = null; // Existing static win display
let betText = null;
let winRollupText = null; // New text for animated rollup
let autoplayButton = null;
let turboButton = null;
let spinButton = null;
let betDecreaseButton = null;
let betIncreaseButton = null;
// Add other buttons if they need state management

/**
 * Initializes the UI Manager.
 * Creates text elements and stores references to them and the main UI container.
 * @param {PIXI.Container} uiContainer - The main container for UI elements.
 * @param {object} uiTextStyle - Style object for labels.
 * @param {object} uiValueStyle - Style object for value displays.
 */
export function initUIManager(uiContainer, uiTextStyle, uiValueStyle) {
    if (!uiContainer) {
        console.error("UIManager: Provided uiContainer is invalid.");
        return;
    }
    uiContainerRef = uiContainer;

    // --- Create Text Labels and Value Displays ---

    // Balance (Left Side)
    const balanceLabel = new PIXI.Text({ text: "BALANCE", style: uiTextStyle });
    balanceLabel.anchor.set(0, 0); // Left anchor
    balanceLabel.x = 50; // Position from left
    balanceLabel.y = bottomUIY + 15;
    balanceText = new PIXI.Text({ text: `€${state.balance.toFixed(2)}`, style: uiValueStyle });
    balanceText.anchor.set(0, 0); // Left anchor
    balanceText.x = 50; // Position from left
    balanceText.y = bottomUIY + 40;
    uiContainer.addChild(balanceLabel, balanceText);

    // Win (Center)
    const winLabel = new PIXI.Text({ text: "WIN", style: uiTextStyle });
    winLabel.anchor.set(0.5, 0); // Center anchor
    winLabel.x = GAME_WIDTH / 2;
    winLabel.y = bottomUIY + 15;
    winText = new PIXI.Text({ text: `€${state.lastTotalWin.toFixed(2)}`, style: { ...uiValueStyle, fill: 0xf1c40f, fontSize: 26 } });
    winText.anchor.set(0.5, 0);
    winText.x = GAME_WIDTH / 2;
    winText.y = bottomUIY + 40;
    winText.visible = state.lastTotalWin > 0; // Initially hide if no win
    uiContainer.addChild(winLabel, winText);

    // Win Rollup Text (Initially hidden, positioned similarly to Win)
    // Style can be adjusted for more prominence
    const rollupStyle = { ...uiValueStyle, fill: 0xffd700, fontSize: 48, stroke: { color: 0x000000, width: 4 } };
    winRollupText = new PIXI.Text({ text: `€0.00`, style: rollupStyle });
    winRollupText.anchor.set(0.5, 0);
    winRollupText.x = GAME_WIDTH / 2;
    winRollupText.y = bottomUIY + 30; // Adjust Y position as needed
    winRollupText.visible = false; // Hidden until a win animation starts
    uiContainer.addChild(winRollupText);


    // Bet
    const betLabel = new PIXI.Text({ text: "BET", style: uiTextStyle });
    betLabel.anchor.set(1, 0);
    betLabel.x = GAME_WIDTH - 50;
    betLabel.y = bottomUIY + 15;
    betText = new PIXI.Text({ text: `€${state.currentTotalBet.toFixed(2)}`, style: uiValueStyle });
    betText.anchor.set(1, 0);
    betText.x = GAME_WIDTH - 50;
    betText.y = bottomUIY + 40;
    uiContainer.addChild(betLabel, betText);

    // --- Store Button References (assuming they are named in Game.js) ---
    // Buttons are added by ButtonFactory, find them by name
    spinButton = uiContainer.getChildByName("spinButton");
    autoplayButton = uiContainer.getChildByName("autoplayButton");
    turboButton = uiContainer.getChildByName("turboButton");
    betDecreaseButton = uiContainer.getChildByName("betDecreaseButton");
    betIncreaseButton = uiContainer.getChildByName("betIncreaseButton");

    if (!spinButton || !autoplayButton || !turboButton || !betDecreaseButton || !betIncreaseButton) {
         console.warn("UIManager: Could not find all expected buttons by name in uiContainer.");
    }

    // Set initial button states
    updateAutoplayButtonState();
    updateTurboButtonState();

    console.log("UIManager initialized.");
}

/**
 * Updates the text displays (Balance, Bet, Win) based on the current game state.
 */
export function updateDisplays() {
    if (balanceText) balanceText.text = `€${state.balance.toFixed(2)}`;
    if (betText) betText.text = `€${state.currentTotalBet.toFixed(2)}`;
    if (winText) {
        // Hide static win text if rollup is active (or about to be)
        const rollupVisible = winRollupText && winRollupText.visible;
        winText.text = `€${state.lastTotalWin.toFixed(2)}`;
        // Only show static win if > 0 AND rollup is not visible
        winText.visible = state.lastTotalWin > 0 && !rollupVisible;
    }
    // Update Info Overlay (DOM) - called separately by Game or state change listener
    // updateInfoOverlay();
}

/**
 * Enables or disables interaction and adjusts alpha for primary game buttons.
 * @param {boolean} enabled - True to enable, false to disable.
 */
export function setButtonsEnabled(enabled) {
    const alpha = enabled ? 1.0 : 0.5;
    const eventMode = enabled ? 'static' : 'none'; // Keep using string literals
    const cursor = enabled ? 'pointer' : 'default';

    const buttonsToToggle = [
        spinButton,
        autoplayButton,
        turboButton,
        betDecreaseButton,
        betIncreaseButton,
    ];

    buttonsToToggle.forEach(button => {
        if (!button) return; // Skip if button reference wasn't found

        // Special handling for bet buttons during free spins
        const isBetButton = button === betDecreaseButton || button === betIncreaseButton;
        const finalEnabled = enabled && !(isBetButton && state.isInFreeSpins);

        button.eventMode = finalEnabled ? 'static' : 'none';
        button.alpha = finalEnabled ? 1.0 : 0.5;
        button.cursor = finalEnabled ? 'pointer' : 'default';
    });

    // Update specific button states after general enable/disable
    updateAutoplayButtonState();
    updateTurboButtonState();
}

/**
 * Updates the visual state of the Autoplay button (icon, color).
 */
export function updateAutoplayButtonState() {
    if (!autoplayButton) return;

    // Set active state if button supports it directly
    if (typeof autoplayButton.setActiveState === 'function') {
        autoplayButton.setActiveState(state.isAutoplaying);
    }

    // Update the icon 
    if (typeof autoplayButton.updateIcon === 'function') {
        // Use play icon when not autoplaying, stop icon when autoplaying
        const newIconType = state.isAutoplaying ? 'stop' : 'autoplay';
        autoplayButton.updateIcon(newIconType);
    }
}

/**
 * Updates the visual state of the Turbo button (color).
 */
export function updateTurboButtonState() {
    if (!turboButton) return;

    // Set active state if button supports it directly
    if (typeof turboButton.setActiveState === 'function') {
        turboButton.setActiveState(state.isTurboMode);
    }
}

/**
 * Returns a reference to the win rollup text element.
 * @returns {PIXI.Text | null}
 */
export function getWinRollupText() {
    return winRollupText;
}
