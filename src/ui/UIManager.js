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
import { UI_PANEL_LAYOUT } from '../config/uiPanelLayout.js'; // Import the layout config
// Import types
import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';
import { FeatureManager } from '../utils/FeatureManager.js';
import { AnimationController } from '../core/AnimationController.js'; // Import AnimationController
import { state } from '../core/GameState.js'; // Import state

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
    /** @type {Function | null} */ // Expose the button factory function
    buttonFactory = null;

    // --- BEGIN EDIT ---
    /** @type {Map<string, ReturnType<typeof createButton>>} */ // Store buttons by name
    buttons = new Map();
    // --- END EDIT ---

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

    /** @type {object | null} */
    uiStyles = null; // Store UI styles

    /** @type {gsap.core.Tween | null} */
    _winRollupTween = null; // Store tween reference
    /** @type {object} */
    _winRollupValues = { currentValue: 0 }; // Store tween target object
    /** @type {Array<Function>} */
    _listeners = []; // To store unsubscribe functions
    /** @type {Function | null} */
    _unregisterWinRollup = null; // To store unregister function for winRollup
    /** @type {object} */
    _balanceRollupValues = { currentValue: 0 }; // Store tween target
    /** @type {number} */
    _lastKnownBalance = 0; // Track last displayed balance

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
        this.buttonFactory = createButton; // Store the imported function reference
        
        // Log instance creation FIRST
        if (this.logger) {
             this.logger.info('UIManager', 'Instance created.'); 
        }

        if (!this.parentLayer || !this.logger || !this.eventBus || !this.featureManager || !this.animationController) {
            (this.logger || console).error("UIManager: Missing critical dependencies during construction (parentLayer, logger, eventBus, featureManager, animationController).");
            // TODO: Handle error - throw?
        }
        // this.logger?.info('UIManager', 'Instance created.'); // MOVE Log message
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

        // --- BEGIN EDIT (Call builder instead of creator) ---
        this._buildPanelFromConfig(); // Build buttons from config
        // --- END EDIT ---
        this._createTextDisplays(panelCenterY, labelOffset, valueOffset, sideMargin, btnSize, buttonSpacing, textButtonGap, initialState);
        
        // Set initial state visually using initialState
        // Visual state should now be set by listeners/plugins reacting to initial state event
        this.setButtonsEnabled(initialState); // Keep generic enabled state setting

        // Subscribe to events
        this._subscribeToEvents();

        // Register win animation with the controller
        const unregisterFunc = this.animationController?.registerAnimation('winRollup', this.animateWin.bind(this));
        this._unregisterWinRollup = unregisterFunc || null; // Assign null if undefined
        if (!this._unregisterWinRollup) {
             this.logger?.warn("UIManager", "Failed to register 'winRollup' animation. AnimationController might be missing or registration failed.");
        }

        // Register balance animation
        this.animationController?.registerAnimation('balanceRollup', this.animateBalance.bind(this));

        this.logger?.info("UIManager", "Initialized.");
        this.eventBus?.emit('ui:initialized');

        this._lastKnownBalance = initialState.balance; // Initialize tracked balance
    }

    // --- BEGIN EDIT (Add _buildPanelFromConfig) ---
    /**
     * Builds the UI button panel based on the UI_PANEL_LAYOUT configuration.
     * @private
     */
    _buildPanelFromConfig() {
        if (!this.internalContainer || !this.buttonFactory || !this.featureManager || !this.eventBus) {
            this.logger?.error('UIManager', 'Cannot build panel from config: Missing internalContainer, buttonFactory, featureManager, or eventBus.');
            return;
        }
        const factory = this.buttonFactory;

        UI_PANEL_LAYOUT.forEach(buttonConfig => {
            // Check feature flag if it exists
            if (buttonConfig.featureFlag && !this.featureManager?.isEnabled(buttonConfig.featureFlag)) {
                this.logger?.debug('UIManager', `Skipping button "${buttonConfig.name}" due to feature flag "${buttonConfig.featureFlag}".`);
                return; // Skip this button
            }

            // Define the onClick handler based on config
            let onClickHandler = () => {};
            if (buttonConfig.action?.type === 'emitEvent') {
                onClickHandler = () => {
                    this.logger?.debug('UIManager', `Button "${buttonConfig.name}" clicked, emitting: ${buttonConfig.action.eventName}`);
                    this.eventBus?.emit(buttonConfig.action.eventName, buttonConfig.action.payload);
                };
            } else {
                this.logger?.warn('UIManager', `Button "${buttonConfig.name}" has missing or unsupported action type.`);
                // Default to no-op or potentially log an error
            }

            // Create the button
            const button = factory(
                "", // Label text (if any, most buttons use icons)
                buttonConfig.position.x,
                buttonConfig.position.y,
                onClickHandler, // Use the configured handler
                {}, // Style overrides (optional)
                this.internalContainer, // Parent container
                buttonConfig.size.width,
                buttonConfig.size.height,
                true, // Assume interactive
                buttonConfig.icon // Initial icon
            );

            if (button) {
                button.name = `${buttonConfig.name}Button`; // Set PIXI name for debugging
                this.buttons.set(buttonConfig.name, button); // Store button instance in the map
                this.logger?.debug('UIManager', `Created button "${buttonConfig.name}".`);
            } else {
                this.logger?.error('UIManager', `Failed to create button "${buttonConfig.name}".`);
            }
        });

        this.logger?.info('UIManager', `Built UI panel with ${this.buttons.size} buttons from configuration.`);
    }
    // --- END EDIT ---

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
        this.logger?.info('UIManager._createTextDisplays', 'Initial Bet Data:', { 
            totalBet: initialState.currentTotalBet, 
            currency: initialState.currentCurrency 
        });
        this.betText = createText(this._formatMoney(initialState.currentTotalBet, initialState.currentCurrency), this.uiStyles.betValue, betGroupCenterX, panelCenterY + valueOffset);
        
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
        // Listen for spin interruption
        const unsubscribeInterrupt = this.eventBus?.on('spin:interruptAnimations', this._handleInterruptAnimations.bind(this));

        this._listeners.push(unsubscribeBalance, unsubscribeState, unsubscribeInterrupt);
        this.logger?.info('UIManager', 'Subscribed to events.');
    }

    /**
     * Cleans up event listeners and animation registrations.
     */
    destroy() {
        this.logger?.info('UIManager', 'Destroying...'); // Log start
        
        // 1. Kill GSAP Tweens
        gsap.killTweensOf(this._winRollupValues);
        gsap.killTweensOf(this._balanceRollupValues);
        // --- BEGIN EDIT (Kill tween for button in map) ---
        const spinButton = this.buttons.get('spin');
        if (spinButton?.buttonIcon) {
            gsap.killTweensOf(spinButton.buttonIcon);
        }
        // --- END EDIT ---
        this._winRollupTween = null; // Clear tween reference
        
        // 2. Unregister win animation (Already done)
        if (this._unregisterWinRollup) {
            this._unregisterWinRollup();
            this._unregisterWinRollup = null;
            this.logger?.debug('UIManager', 'Unregistered winRollup animation.');
        }
        
        // 3. Unsubscribe Event Listeners (Already done)
        this._listeners.forEach(unsubscribe => unsubscribe());
        this._listeners = [];
        this.logger?.debug('UIManager', 'Unsubscribed from EventBus events.');

        // 4. Destroy PIXI Objects
        // --- BEGIN EDIT (Destroy buttons from map) ---
        this.buttons.forEach((button, name) => {
            if (button && typeof button.destroy === 'function') {
                button.destroy();
                this.logger?.debug('UIManager', `Destroyed button "${name}".`);
            }
        });
        this.buttons.clear(); // Clear the map
        // --- END EDIT ---
        
        // Now destroy the container and its remaining children (texts, panel)
        if (this.internalContainer) {
            this.internalContainer.destroy({ children: true });
            // this.internalContainer = null; // Optional
        }
        this.logger?.debug('UIManager', 'Destroyed PIXI elements.');

        // Nullify PIXI element references AFTER destroying container
        this.balanceText = null;
        this.winText = null;
        this.betText = null;
        this.winRollupText = null;
        this.balanceLabel = null;
        this.betLabel = null;
        this.winLabel = null;
        this.internalContainer = null; // Set to null here
        
        // 5. Nullify Dependencies
        this.parentLayer = null;
        // --- BEGIN EDIT (Fix logger issue in destroy) ---
        // Log completion BEFORE nullifying the logger itself
        this.logger?.info('UIManager', 'Destroy complete.');
        this.logger = null; // Nullify logger LAST
        // --- END EDIT ---
        this.eventBus = null;
        this.featureManager = null;
        this.animationController = null;
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
        
        // --- Trigger Balance Animation --- 
        const balanceChanged = newState.balance !== this._lastKnownBalance;
        // Animate if change is significant (adjust tolerance if needed)
        const tolerance = 0.001; 
        if (balanceChanged && Math.abs(newState.balance - this._lastKnownBalance) > tolerance) {
            this.logger?.debug('UIManager', 'Balance change detected, triggering animation.');
            // Set the starting point for the animation object
            this._balanceRollupValues.currentValue = this._lastKnownBalance;
            this.animationController?.playAnimation('balanceRollup', { amount: newState.balance });
            // Update last known immediately to prevent re-triggering on same state update
            this._lastKnownBalance = newState.balance;
        } else {
            // If balance didn't change significantly, update text directly
            if (this.balanceText) { 
                 this.balanceText.text = this._formatMoney(newState.balance, newState.currentCurrency);
            }
        }

        // Pass newState to *other* update methods
        this.updateOtherDisplays(newState); // Rename original updateDisplays
        this.setButtonsEnabled(newState); 
        
        // Handle spin button animation based on state change
        if (newState.isSpinning) { 
            this.animateSpinButtonRotation();
        } else {
            // Optional: Stop animation immediately if needed
            this.stopSpinButtonRotation(); 
        }
    }

    _handleInterruptAnimations() {
        this.logger?.debug('UIManager', 'Received spin:interruptAnimations, stopping animations.');
        gsap.killTweensOf(this._winRollupValues);
        gsap.killTweensOf(this._balanceRollupValues); // Kill balance tween
        if (this.winText) this.winText.visible = false; 
        if (this.winLabel) this.winLabel.visible = false;
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

    updateOtherDisplays(currentState) { 
        if (!this.betText || !this.winText || !this.winLabel) { // Remove balanceText check
            this.logger?.warn("UIManager", "Cannot update displays - text elements not initialized.");
            return;
        }
        // Remove balance update from here
        // this.balanceText.text = this._formatMoney(currentState.balance, currentState.currentCurrency);
        this.betText.text = this._formatMoney(currentState.currentTotalBet, currentState.currentCurrency);
        
        const winDisplayThreshold = 0.01;
        const showWin = currentState.lastTotalWin >= winDisplayThreshold;
        this.winText.visible = showWin;
        this.winLabel.visible = showWin;
        let winTextValue = 'N/A'; // Default if not shown/updated
        if (showWin && this.winText) { 
             const formattedWin = this._formatMoney(currentState.lastTotalWin, currentState.currentCurrency);
             this.winText.text = formattedWin;
             winTextValue = formattedWin; // Capture value for logging
        }
        
        // Log win display status
        this.logger?.debug('UIManager.updateOtherDisplays', 'Updating Win Display', {
            lastTotalWin: currentState.lastTotalWin,
            showWin: showWin,
            winTextVisible: this.winText?.visible,
            winLabelVisible: this.winLabel?.visible,
            winTextValue: winTextValue
        });

        if (this.winRollupText) this.winRollupText.visible = false;
    }

    setButtonsEnabled(currentState) { // Accept state
        // Determine enabled state based on the overall game state
        const enabled = !currentState.isSpinning && !currentState.isTransitioning;

        const alpha = enabled ? 1.0 : 0.5;
        const eventMode = enabled ? 'static' : 'none';
        const cursor = enabled ? 'pointer' : 'default';

        const buttonsToToggle = [
            this.buttons.get('spin'),
            this.buttons.get('betDecrease'),
            this.buttons.get('betIncrease'),
        ];

        // Keep Autoplay & Turbo always interactive 
        // --- BEGIN EDIT (Add checks for buttons from map) ---
        const autoplayButtonRef = this.buttons.get('autoplay');
        if (autoplayButtonRef) {
            autoplayButtonRef.eventMode = 'static';
            autoplayButtonRef.alpha = 1.0;
            autoplayButtonRef.cursor = 'pointer';
        }
        const turboButtonRef = this.buttons.get('turbo');
        if (turboButtonRef) {
            turboButtonRef.eventMode = 'static';
            turboButtonRef.alpha = 1.0;
            turboButtonRef.cursor = 'pointer';
        }
        // --- END EDIT ---

        buttonsToToggle.forEach(button => {
            if (!button) return; // Already checks if the button itself exists in the array
            // --- BEGIN EDIT (Add checks for buttons from map for comparison) ---
            const isBetButton = button === this.buttons.get('betDecrease') || button === this.buttons.get('betIncrease');
            // --- END EDIT ---
            // Disable bet buttons during FS and Autoplay, otherwise use general 'enabled' state
            const finalEnabled = enabled && !(isBetButton && (currentState.isInFreeSpins || currentState.isAutoplaying));

            button.eventMode = finalEnabled ? 'static' : 'none';
            button.alpha = finalEnabled ? 1.0 : 0.5;
            button.cursor = finalEnabled ? 'pointer' : 'default';
        });
    }

    animateSpinButtonRotation() {
        // --- BEGIN EDIT (Add checks for button from map) ---
        const spinButtonRef = this.buttons.get('spin');
        if (!spinButtonRef || !spinButtonRef.buttonIcon) {
        // --- END EDIT ---
            this.logger?.warn('UIManager', 'Cannot animate spin button - button or icon missing.');
            return;
        }
        // --- BEGIN EDIT (Use ref) ---
        const iconElement = spinButtonRef.buttonIcon;
        // --- END EDIT ---
        gsap.killTweensOf(iconElement);
        iconElement.angle = 0;
        gsap.to(iconElement, { angle: 360, duration: 1.2, ease: "power1.inOut" });
    }

    stopSpinButtonRotation() {
        // --- BEGIN EDIT (Add checks for button from map) ---
        const spinButtonRef = this.buttons.get('spin');
        if (!spinButtonRef || !spinButtonRef.buttonIcon) {
        // --- END EDIT ---
            this.logger?.warn('UIManager', 'Cannot stop spin button animation - button or icon missing.');
            return;
        }
        // --- BEGIN EDIT (Use ref) ---
        const iconElement = spinButtonRef.buttonIcon;
        // --- END EDIT ---
        gsap.killTweensOf(iconElement);
        gsap.to(iconElement, { angle: 0, duration: 0.2, ease: "power1.out" });
    }

    /**
     * Animates the win amount display (rollup).
     * Triggered via AnimationController.playAnimation('winRollup', { amount: ... })
     * @param {object} data - Data payload from AnimationController.
     * @param {number} data.amount - The final win amount to display.
     */
    animateWin(data) {
        // --- Return a Promise --- 
        return new Promise((/** @type {(value?: void) => void} */ resolve) => {
            if (!data || typeof data.amount !== 'number') {
                this.logger?.error("UIManager", "animateWin called with invalid data", data);
                // return; // Resolve promise immediately on error
                resolve(); // Call without args
                return;
            }
            const winAmount = data.amount;
            const currentCurrencyCode = state.currentCurrency;
            // Reset values before tweening
            this._winRollupValues.currentValue = 0;
            if (this.winText) {
                this.winText.text = this._formatMoney(0, currentCurrencyCode);
                this.winText.visible = true; // Ensure visible before animation
            }
            if (this.winLabel) this.winLabel.visible = true;

            gsap.killTweensOf(this._winRollupValues); // Kill previous tween on the same object

            this._winRollupTween = gsap.to(this._winRollupValues, {
                currentValue: winAmount,
                duration: 1.5, // TODO: Get duration from config/animationSettings?
                ease: "power2.out",
                onUpdate: () => {
                    if (this.winText) { 
                        this.winText.text = this._formatMoney(this._winRollupValues.currentValue, currentCurrencyCode);
                    }
                },
                onComplete: () => {
                    if (this.winText) { 
                         this.winText.text = this._formatMoney(winAmount, currentCurrencyCode);
                         this.logger?.debug('UIManager', 'Win rollup animation complete.');
                    }
                    this._winRollupTween = null; // Clear reference on completion
                    resolve(); // Resolve the promise on completion - Call without args
                }
            });
        }); // --- End Promise --- 
    }

    /**
     * Animates the balance display.
     * @param {object} data
     * @param {number} data.amount - The target balance amount.
     */
    animateBalance(data) {
        return new Promise((/** @type {(value?: void) => void} */ resolve) => {
            if (!this.balanceText) {
                resolve(); // Resolve immediately if no text element
                return;
            }
            const targetBalance = data?.amount;
            if (typeof targetBalance !== 'number') {
                this.logger?.error('UIManager', 'animateBalance called with invalid data', data);
                resolve(); // Resolve on error
                return;
            }
            const currentDisplayValue = this._balanceRollupValues.currentValue;
            const currentCurrencyCode = state.currentCurrency;

            this.logger?.debug('UIManager', `Animating balance rollup from ${currentDisplayValue} to ${targetBalance}`);

            gsap.killTweensOf(this._balanceRollupValues); // Kill previous tween

            gsap.to(this._balanceRollupValues, {
                currentValue: targetBalance,
                duration: 0.5, // Shorter duration for balance usually feels better
                ease: "power1.out",
                onUpdate: () => {
                    if (this.balanceText) {
                        this.balanceText.text = this._formatMoney(this._balanceRollupValues.currentValue, currentCurrencyCode);
                    }
                },
                onComplete: () => {
                    if (this.balanceText) {
                        this.balanceText.text = this._formatMoney(targetBalance, currentCurrencyCode); // Ensure final value is exact
                    }
                    this._lastKnownBalance = targetBalance; // Update tracked balance on complete
                    this.logger?.debug('UIManager', 'Balance rollup complete.');
                    resolve(); // Resolve the promise on completion
                }
            });
        });
    }

    /**
     * Retrieves a button instance managed by the UIManager.
     * @param {string} buttonName - The name used when creating the button (e.g., 'spin', 'autoplay').
     * @returns {ReturnType<typeof createButton> | null} The button instance or null if not found.
     */
    getButton(buttonName) {
        // --- BEGIN EDIT (Use map) ---
        const button = this.buttons.get(buttonName);
        if (!button) {
            this.logger?.warn('UIManager', `getButton called for unknown button: ${buttonName}`);
            return null;
        }
        return button;
        /* REMOVED old logic
        const buttonPropertyName = `${buttonName}Button`;
        if (this.hasOwnProperty(buttonPropertyName)) {
            // @ts-ignore - We know the property should exist based on the name convention
            return this[buttonPropertyName]; 
        }
        this.logger?.warn('UIManager', `getButton called for unknown button: ${buttonName}`);
        return null;
        */
       // --- END EDIT ---
    }
    
    /**
     * Sets the visual state (icon and active state) for a managed button.
     * @param {string} buttonName - The name of the button (e.g., 'autoplay', 'turbo').
     * @param {boolean} isActive - Whether the button should be in its active state.
     * @param {string} activeIcon - The icon alias to use when active.
     * @param {string} inactiveIcon - The icon alias to use when inactive.
     */
    setButtonVisualState(buttonName, isActive, activeIcon, inactiveIcon) {
        const button = this.getButton(buttonName);
        if (!button) {
            this.logger?.warn('UIManager', `setButtonVisualState called for unknown button: ${buttonName}`);
            return;
        }

        // Check if updateIcon and setActiveState methods exist on the button object
        if (typeof button.updateIcon === 'function' && typeof button.setActiveState === 'function') {
            button.updateIcon(isActive ? activeIcon : inactiveIcon);
            button.setActiveState(isActive);
        } else {
            this.logger?.error('UIManager', `Button "${buttonName}\" does not support visual state updates (missing methods).`);
        }
    }
}
