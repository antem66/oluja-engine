import * as PIXI from 'pixi.js';
// Removed duplicate PIXI import
import { state } from '../core/GameState.js'; // Assuming state access
import { GAME_WIDTH, GAME_HEIGHT, bottomUIY, CURRENCY } from '../config/gameSettings.js'; // Added CURRENCY import
import { gsap } from 'gsap'; // Import GSAP for animations
import { createButton } from './ButtonFactory.js'; // Import ButtonFactory
import * as handlers from './ButtonHandlers.js'; // Import ButtonHandlers

// References to UI elements managed by this module
let internalContainer = null; // This manager's own container
let balanceText = null;
let winText = null;
let betText = null;
let winRollupText = null;
let balanceLabel = null;
let betLabel = null;
let winLabel = null;
let autoplayButton = null;
let turboButton = null;
let spinButton = null;
let betDecreaseButton = null;
let betIncreaseButton = null;

// Reference to the SpinManager
let spinManagerRef = null;

// Removed FS UI variables

/**
 * Returns the bound startSpin function from the stored SpinManager instance.
 * @returns {Function | null} The bound startSpin function or null if manager isn't set.
 */
export function getSpinManagerStartFunction() {
    return spinManagerRef ? spinManagerRef.startSpin.bind(spinManagerRef) : null;
}

/**
 * Formats money values according to the current currency setting
 * @param {number} value - The value to format
 * @returns {string} - Formatted value with currency symbol
 */
function formatMoney(value) {
    // Fix NaN issue by ensuring value is a valid number
    if (value === undefined || isNaN(value)) {
        value = 0;
    }
    const currency = CURRENCY[state.currentCurrency];
    return currency.format(value);
}

/**
 * Initializes the UI Manager.
 * Creates the UI panel, text elements, and buttons, adding them to the provided parent layer.
 * @param {PIXI.Container} parentLayer - The layer to add the UI elements to (e.g., layerUI).
 * @param {object} uiStyles - Object containing different PIXI.TextStyle definitions.
 * @param {object} spinManagerInstance - Instance of the SpinManager.
 */
export function initUIManager(parentLayer, uiStyles, spinManagerInstance) {
    if (!parentLayer) {
        console.error("UIManager: Parent layer is required!");
        return;
    }
    // Store the SpinManager instance
    if (!spinManagerInstance) {
         console.error("UIManager: SpinManager instance is required!");
    } else {
        spinManagerRef = spinManagerInstance;
    }

    // Create and add this manager's container to the parent layer
    internalContainer = new PIXI.Container();
    parentLayer.addChild(internalContainer);

    // --- Define Sizes and Spacing ---
    const panelHeight = 80; // Keep panel height
    const panelY = GAME_HEIGHT - panelHeight;
    const panelCenterY = panelY + panelHeight / 2;
    
    const btnSize = 40; // Standard button diameter 
    const spinBtnSize = 85; // Spin button size
    const sideMargin = 35; // Side margin
    const buttonSpacing = 20; // Spacing between buttons
    const textButtonGap = 20; // Reduced gap between text and buttons
    const labelOffset = -15; // Vertical offset for labels
    const valueOffset = 15;  // Vertical offset for values

    // --- Create UI Panel ---
    const panel = new PIXI.Graphics()
        .rect(0, panelY, GAME_WIDTH, panelHeight)
        .fill({ color: 0x1a1a1a, alpha: 0.85 }); // Keep panel style for now
    internalContainer.addChild(panel);

    // --- Create Buttons ---
    // Position all main buttons at the same Y level
    const standardButtonY = panelCenterY - btnSize / 2; // All standard buttons aligned at this Y

    // Left Buttons (Turbo, Autoplay)
    const firstButtonX = sideMargin;
    turboButton = createButton("", firstButtonX, standardButtonY, handlers.toggleTurbo, {}, internalContainer, btnSize, btnSize, true, 'turbo');
    turboButton.name = "turboButton";

    const secondButtonX = firstButtonX + btnSize + buttonSpacing;
    autoplayButton = createButton("", secondButtonX, standardButtonY, handlers.toggleAutoplay, {}, internalContainer, btnSize, btnSize, true, 'autoplay');
    autoplayButton.name = "autoplayButton";

    // Right Buttons (Spin) - Move up higher
    const spinButtonTopLeftX = GAME_WIDTH - sideMargin - spinBtnSize;
    const spinButtonTopLeftY = panelCenterY - spinBtnSize / 2 - 15; // Move up by 15px (was 5px)
    if (spinManagerRef) {
        spinButton = createButton(
            "", spinButtonTopLeftX, spinButtonTopLeftY, 
            spinManagerRef.startSpin.bind(spinManagerRef), {}, 
            internalContainer, spinBtnSize, spinBtnSize, true, 'spin'
        );
        spinButton.name = "spinButton";
    } else {
        console.error("UIManager: Spin button could not be created.");
    }
    
    // --- Create Text Labels and Value Displays ---
    
    // Bet Group Center Calculation
    const spinButtonLeftEdge = spinButtonTopLeftX;
    const betAreaRightMargin = spinButtonLeftEdge - textButtonGap;
    const estimatedBetTextWidth = 100;
    const betGroupWidth = btnSize + buttonSpacing + estimatedBetTextWidth + buttonSpacing + btnSize;
    const betGroupCenterX = betAreaRightMargin - betGroupWidth / 2; 

    // Bet Text & Label
    betLabel = new PIXI.Text({ text: "BET", style: uiStyles.label });
    betLabel.anchor.set(0.5, 0.5);
    betLabel.x = betGroupCenterX;
    betLabel.y = panelCenterY + labelOffset;
    
    betText = new PIXI.Text({ text: formatMoney(state.currentTotalBet), style: uiStyles.betValue });
    betText.anchor.set(0.5, 0.5);
    betText.x = betGroupCenterX;
    betText.y = panelCenterY + valueOffset;
    internalContainer.addChild(betLabel, betText);
    
    // Bet Buttons (Positioned relative to betText) - Aligned with standard buttons
    setTimeout(() => {
        const betTextActualWidth = betText.width;
        
        // Use standard button Y position for vertical alignment
        const betBtnY = standardButtonY;
        
        // Increased spacing between bet text and buttons
        const betButtonSpacing = 35; // Increase from 25 to 35 for more spacing
        
        // Fix plus/minus button positioning to be more symmetrical around the bet text
        // Position the minus button to the left of the bet text with proper spacing
        const betDecreaseButtonX = betGroupCenterX - (betTextActualWidth / 2) - betButtonSpacing - (btnSize / 2);
        betDecreaseButton = createButton("", betDecreaseButtonX, betBtnY, handlers.decreaseBet, {}, internalContainer, btnSize, btnSize, true, 'minus');
        betDecreaseButton.name = "betDecreaseButton";

        // Position the plus button to the right of the bet text with proper spacing
        const betIncreaseButtonX = betGroupCenterX + (betTextActualWidth / 2) + betButtonSpacing - (btnSize / 2);
        betIncreaseButton = createButton("", betIncreaseButtonX, betBtnY, handlers.increaseBet, {}, internalContainer, btnSize, btnSize, true, 'plus');
        betIncreaseButton.name = "betIncreaseButton";
        
        // Initial enable/disable state
        setButtonsEnabled(!state.isSpinning && !state.isInFreeSpins && !state.isTransitioning); 
    }, 0);

    // Balance (Left Side) - centered text
    const balanceAreaLeftEdge = secondButtonX + btnSize + textButtonGap * 2; // Space after autoplay button
    const balanceCenterX = balanceAreaLeftEdge + 100; // Center point for balance display
    
    balanceLabel = new PIXI.Text({ text: "BALANCE", style: uiStyles.label });
    balanceLabel.anchor.set(0.5, 0.5); // Center alignment
    balanceLabel.x = balanceCenterX;
    balanceLabel.y = panelCenterY + labelOffset;
    
    balanceText = new PIXI.Text({ text: formatMoney(state.balance), style: uiStyles.balanceValue });
    balanceText.anchor.set(0.5, 0.5); // Center alignment
    balanceText.x = balanceCenterX;
    balanceText.y = panelCenterY + valueOffset;
    internalContainer.addChild(balanceLabel, balanceText);

    // Win (Center Screen)
    winLabel = new PIXI.Text({ text: "WIN", style: uiStyles.label });
    winLabel.anchor.set(0.5, 0.5);
    winLabel.x = GAME_WIDTH / 2;
    winLabel.y = panelCenterY + labelOffset;
    
    winText = new PIXI.Text({ text: formatMoney(state.lastTotalWin), style: uiStyles.winValue }); 
    winText.anchor.set(0.5, 0.5);
    winText.x = GAME_WIDTH / 2;
    winText.y = panelCenterY + valueOffset;
    winText.visible = state.lastTotalWin > 0;
    internalContainer.addChild(winLabel, winText);

    // Win Rollup Text
    winRollupText = new PIXI.Text({ text: formatMoney(0), style: uiStyles.winRollup }); 
    winRollupText.anchor.set(0.5, 0.5);
    winRollupText.x = GAME_WIDTH / 2;
    winRollupText.y = panelCenterY + valueOffset; // Position same as winText
    winRollupText.visible = false;
    internalContainer.addChild(winRollupText);

    // --- Final Setup ---

    // Set initial button states
    updateAutoplayButtonState();
    updateTurboButtonState();

    console.log("UIManager initialized.");
}

// Removed FS indicator functions

/**
 * Updates the text display elements with current game state values.
 * This is called whenever the state changes and displays need to be updated.
 */
export function updateDisplays() {
    if (!balanceText || !betText || !winText) {
        console.warn("UIManager: Cannot update displays - text elements not initialized.");
        return;
    }
    
    // Update balance display
    balanceText.text = formatMoney(state.balance);
    
    // Update bet display
    betText.text = formatMoney(state.currentTotalBet);
    
    // Handle win display - don't update win text directly here
    // Win text will be updated by animateWin function when needed
    const winDisplayThreshold = 0.01; // Don't display wins below this value
    
    // Only handle visibility here - keep text content as is
    winText.visible = state.lastTotalWin >= winDisplayThreshold;
    winLabel.visible = state.lastTotalWin >= winDisplayThreshold;
    
    // Rollup text is only visible during animations
    if (winRollupText) {
        winRollupText.visible = false;
    }
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
        betDecreaseButton,
        betIncreaseButton,
    ];

    // Handle autoplay button separately to keep it interactive at ALL TIMES
    if (autoplayButton) {
        // Always keep autoplay button interactive regardless of state
        autoplayButton.eventMode = 'static';
        autoplayButton.alpha = 1.0;
        autoplayButton.cursor = 'pointer';
    }

    // Handle turbo button separately to keep it interactive at ALL TIMES
    if (turboButton) {
        // Always keep turbo button interactive regardless of state
        turboButton.eventMode = 'static';
        turboButton.alpha = 1.0;
        turboButton.cursor = 'pointer';
    }

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
    
    // If buttons are being disabled, it means we're likely starting a spin
    // Start the spin button rotation animation
    if (!enabled && spinButton) {
        animateSpinButtonRotation();
    }
}

/**
 * Animates the spin button rotation when a spin is initiated.
 * The spin button will rotate once cleanly.
 */
export function animateSpinButtonRotation() {
    if (!spinButton) return;
    
    // Get the icon element consistently
    const iconElement = spinButton.buttonIcon;
    if (!iconElement) return;
    
    // First, reset any current rotations or animations
    gsap.killTweensOf(iconElement);
    iconElement.angle = 0;
    
    // Animate a single rotation
    gsap.to(iconElement, {
        angle: 360,
        duration: 1.2,
        ease: "power1.inOut"
    });
}

/**
 * Stops the spin button rotation animation.
 */
export function stopSpinButtonRotation() {
    if (!spinButton) return;
    
    // Get the icon element consistently
    const iconElement = spinButton.buttonIcon;
    if (!iconElement) return;
    
    // Reset the angle after the animation completes
    gsap.killTweensOf(iconElement);
    gsap.to(iconElement, {
        angle: 0,
        duration: 0.2,
        ease: "power1.out"
    });
}

/**
 * Updates the visual state of the autoplay button to match the game state.
 * Called whenever autoplay mode changes or during general UI updates.
 */
export function updateAutoplayButtonState() {
    // If button doesn't exist, we can't update it
    if (!autoplayButton) return;

    // Update the button's icon and active state
    if (state.isAutoplaying) {
        autoplayButton.updateIcon('autoplay-active');
        autoplayButton.setActiveState(true);
    } else {
        autoplayButton.updateIcon('autoplay');
        autoplayButton.setActiveState(false);
    }
}

/**
 * Updates the visual state of the turbo button to match the game state.
 * Called whenever turbo mode changes or during general UI updates.
 */
export function updateTurboButtonState() {
    // If button doesn't exist, we can't update it
    if (!turboButton) return;

    // Update the button's icon and active state
    if (state.isTurboMode) {
        turboButton.updateIcon('turbo-active');
        turboButton.setActiveState(true);
    } else {
        turboButton.updateIcon('turbo');
        turboButton.setActiveState(false);
    }
}

/**
 * Returns a reference to the win rollup text element.
 * @returns {PIXI.Text | null}
 */
export function getWinRollupText() {
    return winRollupText;
}

/**
 * Animates the win value from 0 to the final win amount
 * @param {number} winAmount - The final win amount to animate to
 */
export function animateWin(winAmount) {
    if (!winText || !winRollupText) return;
    
    // Don't animate if win is 0 or negative
    if (winAmount <= 0) {
        winText.text = formatMoney(0);
        winText.visible = false;
        winLabel.visible = false;
        return;
    }
    
    // Make sure win text is visible
    winText.visible = true;
    winLabel.visible = true;
    
    // Setup animation values
    const animationDuration = 1.5; // seconds
    const animationValues = {
        currentValue: 0
    };
    
    // Kill any existing animation
    gsap.killTweensOf(animationValues);
    
    // Set initial win text to 0
    winText.text = formatMoney(0);
    
    // Animate the win value
    gsap.to(animationValues, {
        currentValue: winAmount,
        duration: animationDuration,
        ease: "power2.out",
        onUpdate: function() {
            winText.text = formatMoney(animationValues.currentValue);
        },
        onComplete: function() {
            // Ensure final value is precise
            winText.text = formatMoney(winAmount);
        }
    });
}
