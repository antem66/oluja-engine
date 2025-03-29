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
    
    const btnSize = 40; // Reduced standard button diameter (was 45)
    const spinBtnSize = 85; // Slightly reduced spin button size (was 90)
    const sideMargin = 35; // Increased side margin for more padding (was 30)
    const buttonSpacing = 20; // Increased button spacing (was 15)
    const textButtonGap = 30; // Increased gap between text and buttons (was 25)
    const labelOffset = -15; // Adjust vertical offsets
    const valueOffset = 15;

    // --- Create UI Panel ---
    const panel = new PIXI.Graphics()
        .rect(0, panelY, GAME_WIDTH, panelHeight)
        .fill({ color: 0x1a1a1a, alpha: 0.85 }); // Keep panel style for now
    internalContainer.addChild(panel);

    // --- Create Buttons ---
    const buttonY = panelCenterY - btnSize / 2; // Top Y for standard buttons

    // Left Buttons (Autoplay, Turbo)
    const firstButtonX = sideMargin;
    turboButton = createButton("", firstButtonX, buttonY, handlers.toggleTurbo, {}, internalContainer, btnSize, btnSize, true, 'turbo');
    turboButton.name = "turboButton";

    const secondButtonX = firstButtonX + btnSize + buttonSpacing;
    autoplayButton = createButton("", secondButtonX, buttonY, handlers.toggleAutoplay, {}, internalContainer, btnSize, btnSize, true, 'autoplay');
    autoplayButton.name = "autoplayButton";

    // Right Buttons (Spin) - Move up slightly
    const spinButtonTopLeftX = GAME_WIDTH - sideMargin - spinBtnSize;
    const spinButtonTopLeftY = panelCenterY - spinBtnSize / 2 - 5; // Move up by 5px
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
    
    // --- Create Text Labels and Value Displays (before Bet buttons for layout) ---
    
    // Bet Group Center Calculation (more dynamic)
    const spinButtonLeftEdge = spinButtonTopLeftX;
    const betAreaRightMargin = spinButtonLeftEdge - textButtonGap; // Right edge of the bet area
    // Estimate bet text width (can be refined if PIXI.TextMetrics are available)
    const estimatedBetTextWidth = 100; // Adjust this guess based on font/size
    const betGroupWidth = btnSize + buttonSpacing + estimatedBetTextWidth + buttonSpacing + btnSize;
    const betGroupCenterX = betAreaRightMargin - betGroupWidth / 2; 

    // Bet Text & Label
    betLabel = new PIXI.Text({ text: "BET", style: uiStyles.label });
    betLabel.anchor.set(0.5, 0.5);
    betLabel.x = betGroupCenterX;
    betLabel.y = panelCenterY + labelOffset;
    
    betText = new PIXI.Text({ text: `€${state.currentTotalBet.toFixed(2)}`, style: uiStyles.betValue });
    betText.anchor.set(0.5, 0.5);
    betText.x = betGroupCenterX;
    betText.y = panelCenterY + valueOffset;
    internalContainer.addChild(betLabel, betText);
    
    // Bet Buttons (Positioned relative to the actual betText after creation)
    // Use timeout to ensure betText has dimensions (hacky, better with metrics)
    setTimeout(() => {
        const betTextActualWidth = betText.width;
        const betBtnY = panelCenterY + valueOffset - btnSize / 2; // Align vertically with value

        // Add more spacing between bet amount and buttons
        const betButtonSpacing = buttonSpacing + 10; // Extra padding for bet buttons

        const betDecreaseButtonX = betGroupCenterX - betTextActualWidth / 2 - betButtonSpacing - btnSize;
        betDecreaseButton = createButton("", betDecreaseButtonX, betBtnY, handlers.decreaseBet, {}, internalContainer, btnSize, btnSize, true, 'minus');
        betDecreaseButton.name = "betDecreaseButton";

        const betIncreaseButtonX = betGroupCenterX + betTextActualWidth / 2 + betButtonSpacing;
        betIncreaseButton = createButton("", betIncreaseButtonX, betBtnY, handlers.increaseBet, {}, internalContainer, btnSize, btnSize, true, 'plus');
        betIncreaseButton.name = "betIncreaseButton";
        
        // Initial enable/disable state might need setting here if buttons added late
        setButtonsEnabled(!state.isSpinning && !state.isInFreeSpins && !state.isTransitioning); 
    }, 0); // Execute after current stack

    // Balance (Right of Left Buttons)
    const balanceAreaLeftEdge = secondButtonX + btnSize + textButtonGap * 2; // Increased gap
    balanceLabel = new PIXI.Text({ text: "BALANCE", style: uiStyles.label });
    balanceLabel.anchor.set(0, 0.5);
    balanceLabel.x = balanceAreaLeftEdge;
    balanceLabel.y = panelCenterY + labelOffset;
    
    balanceText = new PIXI.Text({ text: `€${state.balance.toFixed(2)}`, style: uiStyles.balanceValue });
    balanceText.anchor.set(0, 0.5);
    balanceText.x = balanceAreaLeftEdge;
    balanceText.y = panelCenterY + valueOffset;
    internalContainer.addChild(balanceLabel, balanceText);

    // Win (Center Screen)
    winLabel = new PIXI.Text({ text: "WIN", style: uiStyles.label });
    winLabel.anchor.set(0.5, 0.5);
    winLabel.x = GAME_WIDTH / 2;
    winLabel.y = panelCenterY + labelOffset;
    
    winText = new PIXI.Text({ text: `€${state.lastTotalWin.toFixed(2)}`, style: uiStyles.winValue }); // Use winValue style
    winText.anchor.set(0.5, 0.5);
    winText.x = GAME_WIDTH / 2;
    winText.y = panelCenterY + valueOffset;
    winText.visible = state.lastTotalWin > 0;
    internalContainer.addChild(winLabel, winText);

    // Win Rollup Text
    winRollupText = new PIXI.Text({ text: `€0.00`, style: uiStyles.winRollup }); // Use winRollup style
    winRollupText.anchor.set(0.5, 0.5);
    winRollupText.x = GAME_WIDTH / 2;
    winRollupText.y = panelCenterY + valueOffset; // Position same as winText
    winRollupText.visible = false;
    internalContainer.addChild(winRollupText);

    // --- Final Setup ---

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
    if (!enabled && spinButton && spinButton.buttonIcon) {
        animateSpinButtonRotation();
    }
}

/**
 * Animates the spin button rotation during spinning - rotates exactly once.
 */
function animateSpinButtonRotation() {
    if (!spinButton || !spinButton.buttonIcon) return;
    
    // Kill any existing animation
    if (spinButton.currentRotationTween) {
        spinButton.currentRotationTween.kill();
    }
    
    // Reset rotation to 0 before starting
    spinButton.buttonIcon.angle = 0;
    
    // Simple single rotation with nice easing
    spinButton.currentRotationTween = gsap.to(spinButton.buttonIcon, {
        angle: 180, // Exactly one full rotation
        duration: 0.6, // Duration of the single rotation
        ease: "power1.inOut", // Smooth acceleration and deceleration
        onComplete: () => {
            // Reset angle when done
            spinButton.buttonIcon.angle = 0;
            spinButton.currentRotationTween = null;
            spinButton._rotationActive = false;
        }
    });
    
    spinButton._rotationActive = true;
}

/**
 * Stops the spin button rotation animation if it's still active.
 */
export function stopSpinButtonRotation() {
    if (!spinButton || !spinButton.buttonIcon || !spinButton.currentRotationTween) return;
    
    // Just let the animation complete naturally since it's only one rotation
    // No need for complicated stopping animations
}

/**
 * Updates the visual state of the Autoplay button (icon, color).
 * Ensures the button immediately reflects the current autoplay state.
 */
export function updateAutoplayButtonState() {
    if (!autoplayButton) return;

    // Set active state if button supports it directly
    if (typeof autoplayButton.setActiveState === 'function') {
        // Force immediate visual update to active/inactive state
        autoplayButton.setActiveState(state.isAutoplaying);
    }

    // Update the icon (switch between play/stop icons based on state)
    if (typeof autoplayButton.updateIcon === 'function') {
        // Use stop icon when autoplaying, autoplay icon when not autoplaying
        const newIconType = state.isAutoplaying ? 'stop' : 'autoplay';
        autoplayButton.updateIcon(newIconType);
    }
    
    // Ensure the button remains interactive
    autoplayButton.eventMode = 'static';
    autoplayButton.alpha = 1.0;
    autoplayButton.cursor = 'pointer';
}

/**
 * Updates the visual state of the Turbo button (color and tint).
 */
export function updateTurboButtonState() {
    if (!turboButton) return;

    // Set active state if button supports it directly
    if (typeof turboButton.setActiveState === 'function') {
        turboButton.setActiveState(state.isTurboMode);
    }
    
    // Make the icon yellow when turbo mode is active
    if (turboButton.buttonIcon && state.isTurboMode) {
        turboButton.buttonIcon.tint = 0xFFD700; // Gold/yellow color when active
    } else if (turboButton.buttonIcon) {
        turboButton.buttonIcon.tint = 0xFFFFFF; // Reset to white when inactive
    }
}

/**
 * Returns a reference to the win rollup text element.
 * @returns {PIXI.Text | null}
 */
export function getWinRollupText() {
    return winRollupText;
}
