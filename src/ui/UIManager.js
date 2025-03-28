import * as PIXI from 'pixi.js';
import { state } from '../core/GameState.js'; // Assuming state access
import { GAME_WIDTH, bottomUIY } from '../config/gameSettings.js';
import { gsap } from 'gsap'; // Import GSAP for animations

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

// Add new variables for free spins UI elements
let freeSpinsIndicator = null;
let freeSpinsCountText = null;
let freeSpinsTotalWinText = null;
let freeSpinsGlow = null;

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

    // Create free spins indicator (hidden by default)
    createFreeSpinsIndicator(uiContainer);

    console.log("UIManager initialized.");
}

/**
 * Creates the free spins indicator overlay
 * @param {PIXI.Container} container - The UI container
 */
function createFreeSpinsIndicator(container) {
    // Create container for free spins UI elements
    freeSpinsIndicator = new PIXI.Container();
    freeSpinsIndicator.visible = false; // Hide initially
    
    // Position at the top center of the screen
    freeSpinsIndicator.x = GAME_WIDTH / 2;
    freeSpinsIndicator.y = 10;
    
    // Create background panel
    const panel = new PIXI.Graphics();
    panel.beginFill(0x9932CC, 0.85); // Deep purple with transparency
    panel.lineStyle(3, 0xFFD700, 1); // Gold border
    panel.drawRoundedRect(-150, 0, 300, 80, 10); // Centered rectangle
    panel.endFill();
    
    // Add glow filter
    freeSpinsGlow = new PIXI.Graphics();
    freeSpinsGlow.beginFill(0xFFD700, 0.3);
    freeSpinsGlow.drawRoundedRect(-155, -5, 310, 90, 12);
    freeSpinsGlow.endFill();
    freeSpinsGlow.alpha = 0;
    
    // Create title text
    const titleStyle = new PIXI.TextStyle({
        fontFamily: 'Impact, Charcoal, sans-serif',
        fontSize: 24,
        fontWeight: 'bold',
        fill: 0xFFD700, // Single gold color as hex number
        stroke: { color: 0x000000, width: 3 },
        dropShadow: { color: 0x000000, alpha: 0.5, blur: 2, distance: 2 },
        align: 'center'
    });
    
    const title = new PIXI.Text("FREE SPINS", titleStyle);
    title.anchor.set(0.5, 0);
    title.y = 10;
    
    // Create free spins count text
    const countStyle = new PIXI.TextStyle({
        fontFamily: '"Arial Black", Gadget, sans-serif',
        fontSize: 18,
        fill: 0xFFFFFF, // Use hex number instead of string
        fontWeight: 'bold',
        align: 'center'
    });
    
    freeSpinsCountText = new PIXI.Text("Remaining: 10", countStyle);
    freeSpinsCountText.anchor.set(0.5, 0);
    freeSpinsCountText.y = 45;
    
    // Create total win text
    freeSpinsTotalWinText = new PIXI.Text("Total Win: €0.00", countStyle);
    freeSpinsTotalWinText.anchor.set(0.5, 0);
    freeSpinsTotalWinText.y = 45;
    freeSpinsTotalWinText.x = 180; // Position to the right of spins count
    
    // Add all elements to container
    freeSpinsIndicator.addChild(freeSpinsGlow);
    freeSpinsIndicator.addChild(panel);
    freeSpinsIndicator.addChild(title);
    freeSpinsIndicator.addChild(freeSpinsCountText);
    freeSpinsIndicator.addChild(freeSpinsTotalWinText);
    
    // Add to main container
    container.addChild(freeSpinsIndicator);
}

/**
 * Updates the free spins indicator with current state
 */
function updateFreeSpinsIndicator() {
    if (!freeSpinsIndicator || !freeSpinsCountText || !freeSpinsTotalWinText) return;
    
    // Show/hide based on free spins state
    const inFreeSpin = state.isInFreeSpins;
    
    if (inFreeSpin) {
        // Update text content
        freeSpinsCountText.text = `Remaining: ${state.freeSpinsRemaining}`;
        freeSpinsTotalWinText.text = `Win: €${state.totalFreeSpinsWin.toFixed(2)}`;
        
        // Show indicator if not already visible
        if (!freeSpinsIndicator.visible) {
            freeSpinsIndicator.visible = true;
            freeSpinsIndicator.alpha = 0;
            freeSpinsIndicator.y = -50;
            
            // Animate it in
            gsap.to(freeSpinsIndicator, {
                y: 10,
                alpha: 1,
                duration: 0.5,
                ease: "back.out(1.7)"
            });
            
            // Start pulsing glow animation
            startGlowAnimation();
        }
        
        // Flash when spins count changes
        if (freeSpinsIndicator._lastCount && freeSpinsIndicator._lastCount !== state.freeSpinsRemaining) {
            gsap.to(freeSpinsCountText.scale, {
                x: 1.2, y: 1.2,
                duration: 0.2,
                repeat: 1,
                yoyo: true,
                ease: "power1.inOut"
            });
        }
        
        // Store current count for comparison on next update
        freeSpinsIndicator._lastCount = state.freeSpinsRemaining;
        
    } else if (freeSpinsIndicator.visible) {
        // Animate it out
        gsap.to(freeSpinsIndicator, {
            y: -50,
            alpha: 0,
            duration: 0.5,
            ease: "back.in(1.7)",
            onComplete: () => {
                freeSpinsIndicator.visible = false;
                stopGlowAnimation();
            }
        });
    }
}

/**
 * Starts pulsing glow animation
 */
function startGlowAnimation() {
    if (!freeSpinsGlow) return;
    
    // Kill any existing animations
    gsap.killTweensOf(freeSpinsGlow);
    
    // Create pulsing animation
    gsap.to(freeSpinsGlow, {
        alpha: 0.7,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
    });
}

/**
 * Stops glow animation
 */
function stopGlowAnimation() {
    if (!freeSpinsGlow) return;
    
    // Kill animation and reset
    gsap.killTweensOf(freeSpinsGlow);
    freeSpinsGlow.alpha = 0;
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

    // Update the free spins indicator
    updateFreeSpinsIndicator();
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
