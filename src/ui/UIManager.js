/**
 * @module UIManager
 * @description Manages the creation, state, and updates of all primary UI elements,
 * including text displays (balance, bet, win) and interactive buttons.
 * It uses ButtonFactory to create buttons and handles their visual state.
 * It coordinates with GameState for data and potentially SpinManager for actions.
 *
 * Public API:
 * - initUIManager(parentLayer, uiStyles, spinManagerInstance): Initializes the UI.
 * - updateDisplays(): Updates text displays based on GameState.
 * - setButtonsEnabled(enabled): Controls interactability of buttons.
 * - animateWin(winAmount): Animates the win display counter.
 * - updateAutoplayButtonState(): Updates autoplay button visual state.
 * - updateTurboButtonState(): Updates turbo button visual state.
 * - animateSpinButtonRotation(): Starts the spin button rotation animation.
 * - stopSpinButtonRotation(): Stops the spin button rotation animation.
 * - getSpinManagerStartFunction(): (Temporary) Provides access to SpinManager's startSpin.
 * - getWinRollupText(): (Potentially deprecated/internal) Gets win rollup text element.
 *
 * Events Emitted (Future - Phase 2):
 * - ui:button:click {buttonName: string} (e.g., when spin, bet+, bet-, autoplay, turbo are clicked)
 * - ui:initialized
 *
 * Events Consumed (Future - Phase 2):
 * - game:stateChanged { updatedProps: string[], newState: object } (or granular state events)
 * - server:balanceUpdated { newBalance: number }
 * - win:validatedForAnimation { totalWin: number } (To trigger win display update/animation)
 */

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
let winRollupText = null; // Keep reference for now, might be removed if only winText is used
let balanceLabel = null;
let betLabel = null;
let winLabel = null;
let autoplayButton = null;
let turboButton = null;
let spinButton = null;
let betDecreaseButton = null;
let betIncreaseButton = null;

// Reference to the SpinManager (Temporary - Will be replaced by event/DI)
let spinManagerRef = null;

// Removed FS UI variables

/**
 * Returns the bound startSpin function from the stored SpinManager instance.
 * @returns {Function | null} The bound startSpin function or null if manager isn't set.
 * @deprecated Will be removed once button clicks emit events instead of calling handlers directly.
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
 * @param {object} spinManagerInstance - Instance of the SpinManager (Temporary).
 */
export function initUIManager(parentLayer, uiStyles, spinManagerInstance) {
    // TODO (Phase 2): Accept dependencies (EventBus, Logger, FeatureManager) via DI
    if (!parentLayer) {
        // TODO: Use Logger
        console.error("UIManager: Parent layer is required!");
        return;
    }
    // Store the SpinManager instance (Temporary)
    if (!spinManagerInstance) {
        // TODO: Use Logger
         console.error("UIManager: SpinManager instance is required! (Temporary)");
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
    // TODO (Phase 2): Button creation should assign callbacks that emit events,
    // e.g., () => eventBus.emit('ui:button:click', { buttonName: 'turbo' })
    // instead of calling handlers directly.
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
        // Temporary direct call
        spinButton = createButton(
            "", spinButtonTopLeftX, spinButtonTopLeftY,
            spinManagerRef.startSpin.bind(spinManagerRef), {}, 
            internalContainer, spinBtnSize, spinBtnSize, true, 'spin'
        );
        spinButton.name = "spinButton";
    } else {
        // TODO: Use Logger
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

    // Win Rollup Text (May become deprecated if animateWin only targets winText)
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

    // TODO: Replace with Logger
    console.log("UIManager initialized.");
    // TODO (Phase 2): Emit ui:initialized event
    // eventBus.emit('ui:initialized');
}

// Removed FS indicator functions

/**
 * Updates the text display elements with current game state values.
 * This function might be triggered by event listeners in Phase 2.
 */
export function updateDisplays() {
    if (!balanceText || !betText || !winText) {
        // TODO: Use Logger
        console.warn("UIManager: Cannot update displays - text elements not initialized.");
        return;
    }
    
    // TODO (Phase 2): Update based on received state data from events, not direct state import
    // Update balance display
    balanceText.text = formatMoney(state.balance);
    
    // Update bet display
    betText.text = formatMoney(state.currentTotalBet);
    
    // Handle win display - visibility is controlled here, value by animateWin
    const winDisplayThreshold = 0.01; // Don't display wins below this value
    
    // Only handle visibility here - keep text content as is (animateWin handles value)
    winText.visible = state.lastTotalWin >= winDisplayThreshold;
    winLabel.visible = state.lastTotalWin >= winDisplayThreshold;
    
    // Rollup text is only visible during animations (managed by animateWin?)
    if (winRollupText) {
        winRollupText.visible = false; // Ensure hidden unless animating
    }
}

/**
 * Enables or disables interaction and adjusts alpha for primary game buttons.
 * Might be triggered by state change events in Phase 2.
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
        // TODO: Feature flag check?
        autoplayButton.eventMode = 'static';
        autoplayButton.alpha = 1.0;
        autoplayButton.cursor = 'pointer';
    }

    // Handle turbo button separately to keep it interactive at ALL TIMES
    if (turboButton) {
        // Always keep turbo button interactive regardless of state
        // TODO: Feature flag check?
        turboButton.eventMode = 'static';
        turboButton.alpha = 1.0;
        turboButton.cursor = 'pointer';
    }

    buttonsToToggle.forEach(button => {
        if (!button) return; // Skip if button reference wasn't found

        // TODO (Phase 2): Base this on state received from events
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
    // TODO (Phase 2): Triggered by spin:started event?
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
 * TODO (Phase 2): Triggered by spin:stopped event?
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
 * Might be triggered by state change events in Phase 2.
 */
export function updateAutoplayButtonState() {
    // If button doesn't exist, we can't update it
    if (!autoplayButton) return;
    // TODO: Check feature flag featureManager.isEnabled('autoplay')

    // TODO (Phase 2): Update based on received state data from events
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
 * Might be triggered by state change events in Phase 2.
 */
export function updateTurboButtonState() {
    // If button doesn't exist, we can't update it
    if (!turboButton) return;
    // TODO: Check feature flag featureManager.isEnabled('turboMode')

    // TODO (Phase 2): Update based on received state data from events
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
 * @deprecated May be removed if win animation only uses primary winText.
 */
export function getWinRollupText() {
    return winRollupText;
}

/**
 * Animates the win value from 0 to the final win amount.
 * TODO (Phase 3): This function should register itself with the AnimationController
 * instead of being called directly.
 * @param {number} winAmount - The final win amount to animate to.
 */
export function animateWin(winAmount) {
    // TODO: Use Logger
    if (!winText) {
        console.error("UIManager: winText element not found for animation.");
        return;
    }
    // Decide if winRollupText is still needed. If not, remove it.
    // if (!winText || !winRollupText) return; 

    // Don't animate if win is 0 or negative
    if (winAmount <= 0) {
        winText.text = formatMoney(0);
        winText.visible = false;
        winLabel.visible = false;
        // Ensure rollup is also hidden if used
        if (winRollupText) winRollupText.visible = false;
        return;
    }

    // Make sure win text and label are visible
    winText.visible = true;
    winLabel.visible = true;
    // Hide rollup text if it exists, as winText will animate
    if (winRollupText) winRollupText.visible = false;

    // Setup animation values
    const animationDuration = 1.5; // seconds
    const animationValues = {
        currentValue: 0
    };

    // Kill any existing animation on the value tracker
    gsap.killTweensOf(animationValues);
    // Also kill tweens targeting the text element itself directly (e.g., alpha fades)
    gsap.killTweensOf(winText);
    winText.alpha = 1; // Ensure alpha is reset

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
            // TODO: Maybe emit ui:winAnimationComplete?
        }
    });
}
