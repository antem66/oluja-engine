import * as PIXI from 'pixi.js';
// Removed duplicate PIXI import
import { state } from '../core/GameState.js'; // Assuming state access
import { GAME_WIDTH, GAME_HEIGHT, bottomUIY } from '../config/gameSettings.js'; // Added GAME_HEIGHT
import { gsap } from 'gsap'; // Import GSAP for animations
import { createButton } from './ButtonFactory.js'; // Import ButtonFactory
import * as handlers from './ButtonHandlers.js'; // Import ButtonHandlers

// References to UI elements managed by this module
let internalContainer = null; // This manager's own container
let balanceText = null;
let winText = null;
let betText = null;
let winRollupText = null;
let autoplayButton = null;
let turboButton = null;
let spinButton = null;
let betDecreaseButton = null;
let betIncreaseButton = null;

// Removed FS UI variables

/**
 * Initializes the UI Manager.
 * Creates the UI panel, text elements, and buttons, adding them to the provided parent layer.
 * @param {PIXI.Container} parentLayer - The layer to add the UI elements to (e.g., layerUI).
 * @param {object} uiTextStyle - Style object for labels.
 * @param {object} uiValueStyle - Style object for value displays.
 */
export function initUIManager(parentLayer, uiTextStyle, uiValueStyle) {
    if (!parentLayer) {
        console.error("UIManager: Parent layer is required!");
        return;
    }

    // Create and add this manager's container to the parent layer
    internalContainer = new PIXI.Container();
    parentLayer.addChild(internalContainer);

    // --- Create UI Panel ---
    const panelHeight = 100;
    const panel = new PIXI.Graphics()
        .rect(0, GAME_HEIGHT - panelHeight, GAME_WIDTH, panelHeight)
        .fill({ color: 0x1a1a1a, alpha: 0.85 });
    internalContainer.addChild(panel);

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
    internalContainer.addChild(balanceLabel, balanceText); // Add to internal container

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
    internalContainer.addChild(winLabel, winText); // Add to internal container

    // Win Rollup Text (Initially hidden, positioned similarly to Win)
    // Style can be adjusted for more prominence
    const rollupStyle = { ...uiValueStyle, fill: 0xffd700, fontSize: 48, stroke: { color: 0x000000, width: 4 } };
    winRollupText = new PIXI.Text({ text: `€0.00`, style: rollupStyle });
    winRollupText.anchor.set(0.5, 0);
    winRollupText.x = GAME_WIDTH / 2;
    winRollupText.y = bottomUIY + 30; // Adjust Y position as needed
    winRollupText.visible = false; // Hidden until a win animation starts
    internalContainer.addChild(winRollupText); // Add to internal container


    // Bet
    const betLabel = new PIXI.Text({ text: "BET", style: uiTextStyle });
    betLabel.anchor.set(1, 0);
    betLabel.x = GAME_WIDTH - 50;
    betLabel.y = bottomUIY + 15;
    betText = new PIXI.Text({ text: `€${state.currentTotalBet.toFixed(2)}`, style: uiValueStyle });
    betText.anchor.set(1, 0);
    betText.x = GAME_WIDTH - 50;
    betText.y = bottomUIY + 40;
    internalContainer.addChild(betLabel, betText); // Add to internal container

    // --- Create Buttons ---
    const btnW = 45, btnH = 45;
    const spinBtnSize = 85;

    // Bet Buttons
    betDecreaseButton = createButton("", GAME_WIDTH - 180, bottomUIY + 52, handlers.decreaseBet, {}, internalContainer, btnW, btnH, false, 'minus');
    betDecreaseButton.name = "betDecreaseButton";
    betIncreaseButton = createButton("", GAME_WIDTH - 115, bottomUIY + 52, handlers.increaseBet, {}, internalContainer, btnW, btnH, false, 'plus');
    betIncreaseButton.name = "betIncreaseButton";

    // Spin Button
    spinButton = createButton("", GAME_WIDTH - 80, GAME_HEIGHT / 2 + 80, handlers.startSpin, {}, internalContainer, spinBtnSize, spinBtnSize, true, 'spin');
    spinButton.name = "spinButton";

    // Turbo Button
    turboButton = createButton("", 100, bottomUIY + 52, handlers.toggleTurbo, {}, internalContainer, btnW, btnH, false, 'turbo');
    turboButton.name = "turboButton";

    // Autoplay Button
    autoplayButton = createButton("", 180, bottomUIY + 52, handlers.toggleAutoplay, {}, internalContainer, btnW, btnH, false, 'autoplay');
    autoplayButton.name = "autoplayButton";

    // Set initial button states
    updateAutoplayButtonState();
    updateTurboButtonState();

    // Removed FS indicator creation - now in FreeSpinsUIManager

    console.log("UIManager initialized.");
}

// Removed FS indicator functions (createFreeSpinsIndicator, updateFreeSpinsIndicator, startGlowAnimation, stopGlowAnimation)

/**
 * Updates the text displays (Balance, Bet, Win) based on the current game state.
 */
export function updateDisplays() {
    if (balanceText) balanceText.text = `€${state.balance.toFixed(2)}`;
    if (betText) betText.text = `€${state.currentTotalBet.toFixed(2)}`;
    
    // Win text handling - ensure only one win display is visible at a time
    if (winText && winRollupText) {
        // Update the text content for both displays
        winText.text = `€${state.lastTotalWin.toFixed(2)}`;
        
        // PRIORITY LOGIC: Rollup takes absolute priority when visible
        // When rollup is active (visible OR alpha > 0), always hide static win text
        const rollupActive = winRollupText.visible || winRollupText.alpha > 0;
        
        // Set visibility with a safe check to ensure they're never both visible
        if (rollupActive) {
            winText.visible = false;
            // Only log when state changes to avoid console spam
            if (winText._lastVisible !== false) {
                console.log(`Win Display: Hiding static text (rollup active)`);
                winText._lastVisible = false;
            }
        } else {
            // Only show winText if we have a win amount
            const shouldShow = state.lastTotalWin > 0;
            winText.visible = shouldShow;
            
            // Only log when state changes to avoid console spam
            if (winText._lastVisible !== shouldShow) {
                console.log(`Win Display: Static=${shouldShow}, amount=${state.lastTotalWin.toFixed(2)}`);
                winText._lastVisible = shouldShow;
            }
        }
    }
    
    // Update Info Overlay (DOM) - called separately by Game or state change listener
    // updateInfoOverlay();

    // Removed FS indicator update call
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
