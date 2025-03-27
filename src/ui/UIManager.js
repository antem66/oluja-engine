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

        button.eventMode = finalEnabled ? 'static' : 'none'; // Keep using string literals
        button.alpha = finalEnabled ? 1.0 : 0.5;
        button.cursor = finalEnabled ? 'pointer' : 'default';

        // Reset visual state if disabling
        if (!finalEnabled && button.bgHover) {
             button.bgHover.visible = false;
             button.bgDown.visible = false;
             // Check if bgIdle exists before setting visibility
             if (button.bgIdle) button.bgIdle.visible = true;
        }
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

    // Update the icon using the new method in Button class
    const newIconType = state.isAutoplaying ? 'autoplay_stop' : 'autoplay_play';
    // Check if the updateIcon method exists before calling
    if (typeof autoplayButton.updateIcon === 'function') {
        autoplayButton.updateIcon(newIconType);
    } else {
        // Fallback or warning if method doesn't exist (e.g., old button instance)
        console.warn("UIManager: autoplayButton does not have updateIcon method.");
    }

    // Update background tint if backgrounds are stored (e.g., button.bgIdle)
    // Ensure bgIdle exists before accessing tint
    if (autoplayButton.bgIdle) {
        const color = state.isAutoplaying ? 0xffa500 : 0x555555; // Orange when active
        autoplayButton.bgIdle.tint = color;
        // Ensure correct visibility if disabled/enabled changed state ONLY if not interacting
        if (!(autoplayButton.bgDown?.visible || autoplayButton.bgHover?.visible)) {
            autoplayButton.bgIdle.visible = true;
            if (autoplayButton.bgHover) autoplayButton.bgHover.visible = false;
            if (autoplayButton.bgDown) autoplayButton.bgDown.visible = false;
        }
    }
}

/**
 * Updates the visual state of the Turbo button (color).
 */
export function updateTurboButtonState() {
    if (!turboButton) return;
    // Update background tint if backgrounds are stored
    // Ensure turboButton and its idle background exist
    if (turboButton?.bgIdle) {
        const isActive = state.isTurboMode;
        const activeColor = 0x00ffff; // Cyan
        const idleColor = 0x555555; // Default dark grey

        turboButton.bgIdle.tint = isActive ? activeColor : idleColor;

        // Reset visibility ONLY if the button isn't currently being interacted with
        // This prevents overriding the hover/down states visually during interaction
        // Note: This assumes bgDown/bgHover visibility reflects interaction state.
        if (!(turboButton.bgDown?.visible || turboButton.bgHover?.visible)) {
            turboButton.bgIdle.visible = true;
            if (turboButton.bgHover) turboButton.bgHover.visible = false;
            if (turboButton.bgDown) turboButton.bgDown.visible = false;
        }
        // If the button IS being interacted with (hover/down visible), the interaction
        // logic in ButtonFactory._onPointerUp/Out should handle setting the correct
        // background visibility when the interaction ends.
    }
}

/**
 * Returns a reference to the win rollup text element.
 * @returns {PIXI.Text | null}
 */
export function getWinRollupText() {
    return winRollupText;
}
