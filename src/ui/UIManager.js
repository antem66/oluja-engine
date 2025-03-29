/**
 * @module UIManager
 * @description Manages the creation, state, and updates of all primary UI elements.
 * Instantiated by Game and dependencies injected.
 * 
 * Public API:
 * - constructor(dependencies)
 * - init(uiStyles, initialState): Sets up UI elements.
 * - updateDisplays(): Updates text displays based on GameState (will shift to event-driven).
 * - setButtonsEnabled(enabled): Controls interactability of buttons (will shift to event-driven).
 * - animateWin(winAmount): Animates the win display counter.
 * - updateAutoplayButtonState(): Updates autoplay button visual state (will shift to event-driven).
 * - updateTurboButtonState(): Updates turbo button visual state (will shift to event-driven).
 * - animateSpinButtonRotation(): Starts the spin button rotation animation.
 * - stopSpinButtonRotation(): Stops the spin button rotation animation.
 * - destroy(): Cleans up listeners.
 *
 * Events Emitted:
 * - ui:button:click { buttonName: string }
 * - ui:initialized
 *
 * Events Consumed:
 * - game:stateChanged { updatedProps: string[], newState: object } (or granular state events)
 * - server:balanceUpdated { newBalance: number }
 * - win:validatedForAnimation { totalWin: number }
 */

import * as PIXI from 'pixi.js';
import { GAME_WIDTH, GAME_HEIGHT, CURRENCY } from '../config/gameSettings.js'; 
import { gsap } from 'gsap';
import { createButton } from './ButtonFactory.js';
// Import types
import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';
import { FeatureManager } from '../utils/FeatureManager.js';
import { AnimationController } from '../core/AnimationController.js'; // Import AnimationController

export class UIManager {
    // Dependencies
    /** @type {PIXI.Container | null} */
    parentLayer = null;
    /** @type {import('../utils/Logger.js').Logger | null} */
    logger = null;
    /** @type {import('../utils/EventBus.js').EventBus | null} */
    eventBus = null;
    /** @type {import('../utils/FeatureManager.js').FeatureManager | null} */
    featureManager = null;
    /** @type {import('../core/AnimationController.js').AnimationController | null} */
    animationController = null; // Add AnimationController dependency

    // UI Elements
    /** @type {PIXI.Container | null} */
    internalContainer = null;
    /** @type {PIXI.Text | null} */
    balanceText = null;
    /** @type {PIXI.Text | null} */
    winText = null;
    /** @type {PIXI.Text | null} */
    betText = null;
    /** @type {PIXI.Text | null} */
    winRollupText = null;
    /** @type {PIXI.Text | null} */
    balanceLabel = null;
    /** @type {PIXI.Text | null} */
    betLabel = null;
    /** @type {PIXI.Text | null} */
    winLabel = null;
    /** @type {ReturnType<typeof createButton> | null} */ // Use inferred type from factory
    autoplayButton = null;
    /** @type {ReturnType<typeof createButton> | null} */
    turboButton = null;
    /** @type {ReturnType<typeof createButton> | null} */
    spinButton = null;
    /** @type {ReturnType<typeof createButton> | null} */
    betDecreaseButton = null;
    /** @type {ReturnType<typeof createButton> | null} */
    betIncreaseButton = null;

    /** @type {object | null} */
    uiStyles = null; // Store UI styles

    /** @type {Array<Function>} */
    _listeners = []; // To store unsubscribe functions
    /** @type {Function | null} */
    _unregisterWinRollup = null; // To store unregister function for winRollup

    /**
     * @param {object} dependencies
     * @param {PIXI.Container} dependencies.parentLayer
     * @param {import('../utils/Logger.js').Logger} dependencies.logger
     * @param {import('../utils/EventBus.js').EventBus} dependencies.eventBus
     * @param {import('../utils/FeatureManager.js').FeatureManager} dependencies.featureManager
     * @param {import('../core/AnimationController.js').AnimationController} dependencies.animationController // Add to constructor params
     */
    constructor(dependencies) {
        this.parentLayer = dependencies.parentLayer;
        this.logger = dependencies.logger;
        this.eventBus = dependencies.eventBus;
        this.featureManager = dependencies.featureManager;
        this.animationController = dependencies.animationController; // Store the instance

        if (!this.parentLayer || !this.logger || !this.eventBus || !this.featureManager || !this.animationController) {
            (this.logger || console).error("UIManager: Missing critical dependencies during construction (parentLayer, logger, eventBus, featureManager, animationController).");
            // TODO: Handle error - throw?
        }
        this.logger?.info('UIManager', 'Instance created.');
    }

    /**
     * Creates the UI elements.
     * @param {object} uiStyles - Object containing PIXI.TextStyle definitions.
     * @param {object} initialState - The initial game state.
     */
    init(uiStyles, initialState) {
        this.uiStyles = uiStyles; 
        if (!this.parentLayer || !initialState) {
            this.logger?.error("UIManager", "Cannot initialize - parentLayer or initialState is missing.");
            return;
        }
        if (!this.uiStyles) {
             this.logger?.error("UIManager", "Cannot initialize - uiStyles are missing.");
        }
        if (!this.animationController) {
             this.logger?.error("UIManager", "Cannot initialize animations - animationController is missing.");
        }

        // Create and add this manager's container
        this.internalContainer = new PIXI.Container();
        this.parentLayer.addChild(this.internalContainer);

        // --- Define Sizes and Spacing --- (Move constants inside method? Or make them class fields?)
        const panelHeight = 80;
    const panelY = GAME_HEIGHT - panelHeight;
    const panelCenterY = panelY + panelHeight / 2;
        const btnSize = 40;
        const spinBtnSize = 85;
        const sideMargin = 35;
        const buttonSpacing = 20;
        const textButtonGap = 20;
        const labelOffset = -15;
    const valueOffset = 15;

    // --- Create UI Panel ---
    const panel = new PIXI.Graphics()
        .rect(0, panelY, GAME_WIDTH, panelHeight)
            .fill({ color: 0x1a1a1a, alpha: 0.85 });
        this.internalContainer.addChild(panel);

        this._createButtons(panelCenterY, btnSize, spinBtnSize, sideMargin, buttonSpacing);
        this._createTextDisplays(panelCenterY, labelOffset, valueOffset, sideMargin, btnSize, buttonSpacing, textButtonGap, initialState);
        
        // Set initial state visually using initialState
        this.updateAutoplayButtonState(initialState);
        this.updateTurboButtonState(initialState);
        this.setButtonsEnabled(initialState);

        // Subscribe to events
        this._subscribeToEvents();

        // Register win animation with the controller
        const unregisterFunc = this.animationController?.registerAnimation('winRollup', this.animateWin.bind(this));
        this._unregisterWinRollup = unregisterFunc || null; // Assign null if undefined
        if (!this._unregisterWinRollup) {
             this.logger?.warn("UIManager", "Failed to register 'winRollup' animation. AnimationController might be missing or registration failed.");
        }

        this.logger?.info("UIManager", "Initialized.");
        this.eventBus?.emit('ui:initialized');
    }

    _createButtons(panelCenterY, btnSize, spinBtnSize, sideMargin, buttonSpacing) {
        if (!this.internalContainer) {
            this.logger?.error("UIManager", "Cannot create buttons - internalContainer is missing.");
            return;
        }
        const standardButtonY = panelCenterY - btnSize / 2;

        // Use inline arrow functions to emit events
        const createAndStore = (name, x, y, size, icon) => {
            if (!this.internalContainer) return null; 
            // Create the button - pass an inline function that emits the click event
            const button = createButton(
                "", x, y, 
                () => { 
                    this.logger?.debug('UIManager', `${name} button clicked.`);
                    this.eventBus?.emit('ui:button:click', { buttonName: name });
                }, 
                {}, this.internalContainer, size, size, true, icon
            );
            button.name = `${name}Button`;
            this[name + 'Button'] = button;
            return button;
        };

        // Left Buttons
        const turboX = sideMargin;
        // Pass button name directly, remove handlers.toggleTurbo
        createAndStore('turbo', turboX, standardButtonY, btnSize, 'turbo'); 

        const autoplayX = turboX + btnSize + buttonSpacing;
        // Pass button name directly, remove handlers.toggleAutoplay
        createAndStore('autoplay', autoplayX, standardButtonY, btnSize, 'autoplay');

        // Right Buttons (Spin) - Already emits event
        const spinX = GAME_WIDTH - sideMargin - spinBtnSize;
        const spinY = panelCenterY - spinBtnSize / 2 - 15; 
        createAndStore('spin', spinX, spinY, spinBtnSize, 'spin');
    }

    _createTextDisplays(panelCenterY, labelOffset, valueOffset, sideMargin, btnSize, buttonSpacing, textButtonGap, initialState) {
        if (!this.internalContainer || !this.uiStyles || !initialState) { 
            this.logger?.error("UIManager", "Cannot create text displays - internalContainer, uiStyles, or initialState missing.");
            return;
        }
        
        // Bet Group Center Calculation
        const spinButtonLeftEdge = GAME_WIDTH - sideMargin - 85; // Assuming spinBtnSize is 85
        const betAreaRightMargin = spinButtonLeftEdge - textButtonGap;
        const estimatedBetTextWidth = 100;
    const betGroupWidth = btnSize + buttonSpacing + estimatedBetTextWidth + buttonSpacing + btnSize;
    const betGroupCenterX = betAreaRightMargin - betGroupWidth / 2; 

        // Create generic text element function
        const createText = (text, style, x, y, anchorX = 0.5, anchorY = 0.5) => {
            if (!this.internalContainer) return null; // Guard before addChild
            const pixiText = new PIXI.Text({ text, style });
            pixiText.anchor.set(anchorX, anchorY);
            pixiText.x = x;
            pixiText.y = y;
            this.internalContainer.addChild(pixiText);
            return pixiText;
        };

    // Bet Text & Label
        this.betLabel = createText("BET", this.uiStyles.label, betGroupCenterX, panelCenterY + labelOffset);
        this.betText = createText(this._formatMoney(initialState.currentTotalBet, initialState.currentCurrency), this.uiStyles.betValue, betGroupCenterX, panelCenterY + valueOffset);
        
        // Bet Buttons (Positioned relative to betText after short delay)
        setTimeout(() => {
            if (!this.betText || !this.internalContainer) return;
            const betTextActualWidth = this.betText.width;
            const standardButtonY = panelCenterY - btnSize / 2; 
            const betButtonSpacing = 35;
            
            // Use inline arrow functions to emit events
            const createBetButton = (name, x, icon) => { 
                if (!this.internalContainer) return null; 
                const button = createButton(
                    "", x, standardButtonY, 
                    () => { 
                        this.logger?.debug('UIManager', `${name} button clicked.`);
                        this.eventBus?.emit('ui:button:click', { buttonName: name });
                    }, 
                    {}, this.internalContainer, btnSize, btnSize, true, icon
                );
                 button.name = `${name}Button`;
                 this[name + 'Button'] = button;
            };

            const decreaseX = betGroupCenterX - (betTextActualWidth / 2) - betButtonSpacing - (btnSize / 2);
            // Pass button name directly, remove handlers.decreaseBet
            createBetButton('betDecrease', decreaseX, 'minus');

            const increaseX = betGroupCenterX + (betTextActualWidth / 2) + betButtonSpacing - (btnSize / 2);
            // Pass button name directly, remove handlers.increaseBet
            createBetButton('betIncrease', increaseX, 'plus');
            
            // Re-apply initial button enabled state after buttons are created
            this.setButtonsEnabled(initialState);
        }, 0);

        // Balance (Left Side)
        const autoplayButtonRightEdge = sideMargin + btnSize + buttonSpacing + btnSize; // Position after autoplay btn
        const balanceAreaLeftEdge = autoplayButtonRightEdge + textButtonGap * 2;
        const balanceCenterX = balanceAreaLeftEdge + 100;
        this.balanceLabel = createText("BALANCE", this.uiStyles.label, balanceCenterX, panelCenterY + labelOffset);
        this.balanceText = createText(this._formatMoney(initialState.balance, initialState.currentCurrency), this.uiStyles.balanceValue, balanceCenterX, panelCenterY + valueOffset);

    // Win (Center Screen)
        const winX = GAME_WIDTH / 2;
        this.winLabel = createText("WIN", this.uiStyles.label, winX, panelCenterY + labelOffset);
        this.winText = createText(this._formatMoney(initialState.lastTotalWin, initialState.currentCurrency), this.uiStyles.winValue, winX, panelCenterY + valueOffset);
        if (this.winText) this.winText.visible = initialState.lastTotalWin > 0;
        if (this.winLabel) this.winLabel.visible = initialState.lastTotalWin > 0;

    // Win Rollup Text
        this.winRollupText = createText(this._formatMoney(0, initialState.currentCurrency), this.uiStyles.winRollup, winX, panelCenterY + valueOffset);
        if (this.winRollupText) this.winRollupText.visible = false;
    }

    /**
     * Subscribes to relevant events.
     * @private
     */
    _subscribeToEvents() {
        if (!this.eventBus) return;
        
        // Example subscriptions (implement handlers later)
        const unsubscribeBalance = this.eventBus.on('server:balanceUpdated', this._handleBalanceUpdate.bind(this));
        const unsubscribeState = this.eventBus.on('game:stateChanged', this._handleStateChange.bind(this));
        // TODO: Add listener for win animation event

        this._listeners.push(unsubscribeBalance, unsubscribeState);
        this.logger?.info('UIManager', 'Subscribed to events.');
    }

    /**
     * Cleans up event listeners and animation registrations.
     */
    destroy() {
        this._listeners.forEach(unsubscribe => unsubscribe());
        this._listeners = [];

        // Unregister win animation
        if (this._unregisterWinRollup) {
            this._unregisterWinRollup();
            this._unregisterWinRollup = null;
            this.logger?.info('UIManager', 'Unregistered winRollup animation.');
        }
        
        this.logger?.info('UIManager', 'Destroyed and unsubscribed from events.');
        // Nullify dependencies
        this.parentLayer = null;
        this.logger = null;
        this.eventBus = null;
        this.featureManager = null;
        this.animationController = null;
        // Nullify elements?
        this.internalContainer = null;
        this.balanceText = null;
        // ... nullify other elements ...
    }

    // --- Event Handlers --- 
    
    /** @private */
    _handleBalanceUpdate(eventData) {
        if (!this.balanceText || !eventData) return;
        const newBalance = eventData.newBalance;
        this.logger?.debug('UIManager', 'Handling server:balanceUpdated', eventData);
        if (typeof newBalance === 'number') {
            this.balanceText.text = this._formatMoney(newBalance);
        }
    }

    /** @private */
    _handleStateChange(eventData) {
        if (!eventData || !eventData.newState) {
            this.logger?.warn('UIManager', 'Received game:stateChanged event without newState.');
            return;
        }
        const newState = eventData.newState;
        this.logger?.debug('UIManager', 'Handling game:stateChanged', { newState });
        
        // Pass newState to update methods
        this.updateDisplays(newState); 
        this.setButtonsEnabled(newState); 
        this.updateAutoplayButtonState(newState);
        this.updateTurboButtonState(newState);
        
        // Handle spin button animation based on state change
        if (newState.isSpinning) { 
            this.animateSpinButtonRotation();
        } else {
            // Optional: Stop animation immediately if needed
            this.stopSpinButtonRotation(); 
        }
    }

    // --- Utility --- 
    
    /** @private */
    _formatMoney(value, currencyCode) {
        if (value === undefined || value === null || isNaN(value)) {
            this.logger?.warn('UIManager', '_formatMoney called with invalid value:', value);
            value = 0;
        }
        // Use default currency from settings if code is missing (e.g., initial rollup text)
        const codeToUse = currencyCode || CURRENCY.USD; 
        const currency = CURRENCY[codeToUse];
        if (!currency) {
            this.logger?.error('UIManager', `Currency format not found for ${codeToUse}`);
            return String(value); // Fallback
        }
        return currency.format(value);
    }

    // --- Public Methods (Now accept newState) ---

    updateDisplays(currentState) { // Accept state
        if (!this.balanceText || !this.betText || !this.winText || !this.winLabel) {
            this.logger?.warn("UIManager", "Cannot update displays - text elements not initialized.");
            return;
        }
        // Use passed state
        this.balanceText.text = this._formatMoney(currentState.balance, currentState.currentCurrency);
        this.betText.text = this._formatMoney(currentState.currentTotalBet, currentState.currentCurrency);
        
        const winDisplayThreshold = 0.01;
        const showWin = currentState.lastTotalWin >= winDisplayThreshold;
        this.winText.visible = showWin;
        this.winLabel.visible = showWin;
        if (showWin && this.winText) { // Update win text only if visible
             this.winText.text = this._formatMoney(currentState.lastTotalWin, currentState.currentCurrency);
        }
        if (this.winRollupText) this.winRollupText.visible = false;
    }

    setButtonsEnabled(currentState) { // Accept state
        // Determine enabled state based on the overall game state
        const enabled = !currentState.isSpinning && !currentState.isTransitioning;

        const alpha = enabled ? 1.0 : 0.5;
        const eventMode = enabled ? 'static' : 'none';
        const cursor = enabled ? 'pointer' : 'default';

        const buttonsToToggle = [
            this.spinButton,
            this.betDecreaseButton,
            this.betIncreaseButton,
        ];

        // Keep Autoplay & Turbo always interactive 
        if (this.autoplayButton) {
            this.autoplayButton.eventMode = 'static';
            this.autoplayButton.alpha = 1.0;
            this.autoplayButton.cursor = 'pointer';
        }
        if (this.turboButton) {
            this.turboButton.eventMode = 'static';
            this.turboButton.alpha = 1.0;
            this.turboButton.cursor = 'pointer';
        }

        buttonsToToggle.forEach(button => {
            if (!button) return;
            const isBetButton = button === this.betDecreaseButton || button === this.betIncreaseButton;
            // Disable bet buttons during FS and Autoplay, otherwise use general 'enabled' state
            const finalEnabled = enabled && !(isBetButton && (currentState.isInFreeSpins || currentState.isAutoplaying));

            button.eventMode = finalEnabled ? 'static' : 'none';
            button.alpha = finalEnabled ? 1.0 : 0.5;
            button.cursor = finalEnabled ? 'pointer' : 'default';
        });
    }

    animateSpinButtonRotation() {
        if (!this.spinButton || !this.spinButton.buttonIcon) {
            this.logger?.warn('UIManager', 'Cannot animate spin button - button or icon missing.');
            return;
        }
        const iconElement = this.spinButton.buttonIcon;
        gsap.killTweensOf(iconElement);
        iconElement.angle = 0;
        gsap.to(iconElement, { angle: 360, duration: 1.2, ease: "power1.inOut" });
    }

    stopSpinButtonRotation() {
        if (!this.spinButton || !this.spinButton.buttonIcon) {
            this.logger?.warn('UIManager', 'Cannot stop spin button animation - button or icon missing.');
            return;
        }
        const iconElement = this.spinButton.buttonIcon;
        gsap.killTweensOf(iconElement);
        gsap.to(iconElement, { angle: 0, duration: 0.2, ease: "power1.out" });
    }

    updateAutoplayButtonState(currentState) { // Accept state
        if (!this.autoplayButton || !this.featureManager) return;
        // TODO: Check feature flag featureManager.isEnabled('autoplay')
        const isAutoplaying = currentState.isAutoplaying; // Use passed state
        this.autoplayButton.updateIcon(isAutoplaying ? 'autoplay-active' : 'autoplay');
        this.autoplayButton.setActiveState(isAutoplaying);
    }

    updateTurboButtonState(currentState) { // Accept state
        if (!this.turboButton || !this.featureManager) return;
        // TODO: Check feature flag featureManager.isEnabled('turboMode')
        const isTurbo = currentState.isTurboMode; // Use passed state
        this.turboButton.updateIcon(isTurbo ? 'turbo-active' : 'turbo');
        this.turboButton.setActiveState(isTurbo);
    }

    /**
     * Animates the win amount display (rollup).
     * Triggered via AnimationController.playAnimation('winRollup', { amount: ... })
     * @param {object} data - Data payload from AnimationController.
     * @param {number} data.amount - The final win amount to display.
     */
    animateWin(data) {
        if (!data || typeof data.amount !== 'number') {
            this.logger?.error("UIManager", "animateWin called with invalid data", data);
            return;
        }
        const winAmount = data.amount;
        this.logger?.debug('UIManager', `Animating win rollup to ${winAmount}`);

        if (!this.winText || !this.winLabel) {
            this.logger?.error("UIManager", "winText or winLabel element not found for animation.");
            return;
        }
        if (winAmount <= 0) {
            // Ensure text elements exist before modification
            if (this.winText) this.winText.text = this._formatMoney(0);
            this.winText.visible = false;
            if (this.winLabel) this.winLabel.visible = false;
            if (this.winRollupText) this.winRollupText.visible = false;
            return;
        }
        this.winText.visible = true;
        if (this.winLabel) this.winLabel.visible = true;
        if (this.winRollupText) this.winRollupText.visible = false;

        const animationDuration = 1.5; // TODO: Get duration from config/animationSettings?
        const animationValues = { currentValue: 0 };

        gsap.killTweensOf(animationValues);
        gsap.killTweensOf(this.winText); // Kill tweens on the text object itself
        if (this.winText) { // Check if winText exists before manipulating
            this.winText.alpha = 1;
            this.winText.text = this._formatMoney(0);
        }

        gsap.to(animationValues, {
            currentValue: winAmount,
            duration: animationDuration,
            ease: "power2.out",
            onUpdate: () => {
                if (this.winText) { // Add null check inside tween
                    this.winText.text = this._formatMoney(animationValues.currentValue);
                }
            },
            onComplete: () => {
                if (this.winText) { // Add null check inside tween
                     this.winText.text = this._formatMoney(winAmount);
                     this.logger?.debug('UIManager', 'Win rollup animation complete.');
                     // No need to emit here, AnimationController might handle sequence completion
                }
            }
        });
    }
}
