import * as PIXI from 'pixi.js';
import { state } from '../core/GameState.js'; // Assuming state access
import { GAME_WIDTH, bottomUIY } from '../config/gameSettings.js';

// References to UI elements (Text objects, Buttons)
let uiContainerRef = null;
let balanceText = null;
let winText = null;
let betText = null;
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

    // Balance
    const balanceLabel = new PIXI.Text({ text: "BALANCE", style: uiTextStyle });
    balanceLabel.x = 50;
    balanceLabel.y = bottomUIY + 15;
    balanceText = new PIXI.Text({ text: `€${state.balance.toFixed(2)}`, style: uiValueStyle });
    balanceText.x = 50;
    balanceText.y = bottomUIY + 40;
    uiContainer.addChild(balanceLabel, balanceText);

    // Win
    const winLabel = new PIXI.Text({ text: "WIN", style: uiTextStyle });
    winLabel.anchor.set(0.5, 0);
    winLabel.x = GAME_WIDTH / 2;
    winLabel.y = bottomUIY + 15;
    winText = new PIXI.Text({ text: `€${state.lastTotalWin.toFixed(2)}`, style: { ...uiValueStyle, fill: 0xf1c40f, fontSize: 26 } });
    winText.anchor.set(0.5, 0);
    winText.x = GAME_WIDTH / 2;
    winText.y = bottomUIY + 40;
    winText.visible = state.lastTotalWin > 0; // Initially hide if no win
    uiContainer.addChild(winLabel, winText);

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

    console.log("UIManager initialized.");
}

/**
 * Updates the text displays (Balance, Bet, Win) based on the current game state.
 */
export function updateDisplays() {
    if (balanceText) balanceText.text = `€${state.balance.toFixed(2)}`;
    if (betText) betText.text = `€${state.currentTotalBet.toFixed(2)}`;
    if (winText) {
        winText.text = `€${state.lastTotalWin.toFixed(2)}`;
        winText.visible = state.lastTotalWin > 0;
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

        button.eventMode = finalEnabled ? 'static' : 'none'; // Keep using string literals
        button.alpha = finalEnabled ? 1.0 : 0.5;
        button.cursor = finalEnabled ? 'pointer' : 'default';

        // Reset visual state if disabling
        if (!finalEnabled && button.bgHover) {
             button.bgHover.visible = false;
             button.bgDown.visible = false;
             button.bgIdle.visible = true;
        }
    });

    // Update specific button states after general enable/disable
    updateAutoplayButtonState();
    updateTurboButtonState();
}

/**
 * Updates the visual state of the Autoplay button (text, color).
 */
export function updateAutoplayButtonState() {
    if (!autoplayButton) return;
    if (autoplayButton.buttonLabel) {
        autoplayButton.buttonLabel.text = state.isAutoplaying ? "■" : "▶"; // Square for stop, Play for start
    }
    // Update background tint if backgrounds are stored (e.g., button.bgIdle)
    if (autoplayButton.bgIdle) {
        const color = state.isAutoplaying ? 0xffa500 : 0x555555; // Orange when active
        autoplayButton.bgIdle.tint = color;
        // Ensure correct visibility if disabled/enabled changed state
        autoplayButton.bgIdle.visible = true;
        autoplayButton.bgHover.visible = false;
        autoplayButton.bgDown.visible = false;
    }
}

/**
 * Updates the visual state of the Turbo button (color).
 */
export function updateTurboButtonState() {
    if (!turboButton) return;
    // Update background tint if backgrounds are stored
    if (turboButton.bgIdle) {
        const color = state.isTurboMode ? 0x00ffff : 0x555555; // Cyan when active
        turboButton.bgIdle.tint = color;
         // Ensure correct visibility
        turboButton.bgIdle.visible = true;
        turboButton.bgHover.visible = false;
        turboButton.bgDown.visible = false;
    }
}
