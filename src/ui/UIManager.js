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
import { WIDE_LAYOUT_CONFIG, NARROW_LAYOUT_CONFIG } from '../config/uiPanelLayout.js'; // Import the new layout configs
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
    /** @type {Map<string, PIXI.DisplayObject>} */ // Revert to PIXI.DisplayObject
    uiElements = new Map();
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

    // --- Add Property for Background Sprite ---
    /** @type {PIXI.Sprite | null} */
    _backgroundPanel = null; 
    // -----------------------------------------

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
    _boundResizeHandler = null; // Store the bound resize handler

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

        // --- Create Gradient Background Sprite ---
        const panelHeight = 140; // Assuming fixed height for now
        const gradientTexture = this._createGradientTexture(panelHeight, 'rgba(0,0,0,1)', 'rgba(0,0,0,0)');
        this._backgroundPanel = new PIXI.Sprite(gradientTexture);
        // --- Make gradient very wide and center it horizontally ---
        const gradientWidth = 4000; // Sufficiently large width
        this._backgroundPanel.width = gradientWidth;
        this._backgroundPanel.height = panelHeight;
        this._backgroundPanel.x = (GAME_WIDTH - gradientWidth) / 2; // Center within logical GAME_WIDTH
        this._backgroundPanel.y = GAME_HEIGHT - panelHeight;
        this._backgroundPanel.name = "UIManagerBackgroundPanel";
        this.internalContainer.addChild(this._backgroundPanel); // Add gradient first
        this.logger?.debug("UIManager", "Created centered, wide gradient background panel sprite.");
        // ------------------------------------------

        this._createAllUIElements(initialState); // Create ALL elements based on combined configs
        
        // Set initial state visually using initialState
        // Visual state should now be set by listeners/plugins reacting to initial state event
        // this.setButtonsEnabled(initialState); // Button state might be handled by plugins now

        // Setup resize handling
        this._setupLayoutUpdates();

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
        this.logger?.info("UIManager", `Initialized and created ${this.uiElements.size} UI elements.`);
    }

    /**
     * Creates all manageable UI elements based on combined layout configurations.
     * @private
     * @param {object} initialState
     */
    _createAllUIElements(initialState) {
        if (!this.internalContainer || !this.buttonFactory || !this.featureManager || !this.eventBus || !this.uiStyles) {
            this.logger?.error('UIManager', 'Cannot create UI elements: Missing dependencies (internalContainer, factory, featureManager, eventBus, uiStyles).');
            return;
        }
        const factory = this.buttonFactory;

        // Combine configs to get all unique element names
        const allElementNames = new Set([
            ...WIDE_LAYOUT_CONFIG.map(e => e.name),
            ...NARROW_LAYOUT_CONFIG.map(e => e.name)
        ]);

        allElementNames.forEach(name => {
            // Find the config (prefer WIDE for creation properties like type, icon, action, size, anchor)
            const config = WIDE_LAYOUT_CONFIG.find(e => e.name === name) || NARROW_LAYOUT_CONFIG.find(e => e.name === name);
            if (!config) {
                this.logger?.warn('UIManager', `Could not find config for element named "${name}" during creation.`);
                return; // Skip if config missing (should not happen)
            }

            let element = null;
            try {
                if (config.type === 'button') {
                    // Check feature flag before creating button
                    if (config.featureFlag && !this.featureManager?.isEnabled(config.featureFlag)) {
                        this.logger?.debug('UIManager', `Skipping button creation "${config.name}" due to feature flag "${config.featureFlag}".`);
                        return; // Don't create or add to map if feature-flagged out
                    }

                    let onClickHandler = () => { };
                    if (config.action && config.action.type === 'emitEvent') {
                        onClickHandler = () => {
                            this.logger?.debug('UIManager', `Button "${config.name}" clicked, emitting: ${config.action.eventName}`);
                            this.eventBus?.emit(config.action.eventName, config.action.payload);
                        };
                    } else {
                        this.logger?.warn('UIManager', `Button "${config.name}" has missing or unsupported action type.`);
                    }

                    element = factory(
                        "", // text label - not used for icon buttons
                        0, 0, // Initial position (will be set by layout update)
                        onClickHandler,
                        {}, // textStyle
                        this.internalContainer, // parent
                        config.size?.width || 50, // Use configured size or default
                        config.size?.height || 50,
                        true, // circular
                        config.icon // icon name
                    );
                    if (element) element.name = `${config.name}_Button`; // Set PIXI name

                } else if (config.type === 'text') {
                    let textStyle = this.uiStyles[config.name] || this.uiStyles['default'] || {}; // Get specific style or default
                    let initialText = '';
                    // Determine initial text based on name (can be improved)
                    if (name === 'balanceValue') initialText = CURRENCY[initialState.currentCurrency]?.format(initialState.balance) || `${initialState.balance.toFixed(2)}`;
                    if (name === 'winValue') initialText = CURRENCY[initialState.currentCurrency]?.format(0) || '0.00';
                    if (name === 'betValue') initialText = CURRENCY[initialState.currentCurrency]?.format(initialState.currentTotalBet) || `${initialState.currentTotalBet.toFixed(2)}`;
                    if (name === 'welcomeText') initialText = 'WELCOME TO HEAVENS TEMPLE'; // Example
                    if (name === 'winRollupText') initialText = ''; // Starts empty

                    element = new PIXI.Text({ text: initialText, style: textStyle });
                    element.name = `${config.name}_Text`;
                    // Assign to legacy properties if needed, but use map primarily
                    if (name === 'balanceValue') this.balanceText = element;
                    if (name === 'winValue') this.winText = element;
                    if (name === 'betValue') this.betText = element;
                    if (name === 'winRollupText') this.winRollupText = element;
                    // Add other text elements (e.g., welcomeText) if needed

                } else if (config.type === 'decoration') {
                    // Example: Create a simple sprite or container for decorations
                    // This part needs specific logic based on what 'tvScreen' or 'bigWinBanner' are
                    if (name === 'tvScreen') {
                        // element = new PIXI.Sprite(PIXI.Texture.WHITE); // Placeholder
                        // element.tint = 0x333333;
                        // TODO: Replace with actual asset/graphic loading for TV
                        element = new PIXI.Graphics().rect(0, 0, 100, 80).fill(0x111111); // TEMP Placeholder graphic
                    } else if (name === 'bigWinBanner') {
                        element = new PIXI.Container(); // Example: Container for banner elements
                        // element.addChild(new PIXI.Sprite(PIXI.Assets.get('bigWinBg'))); // Example
                        // element.addChild(new PIXI.Text('BIG WIN!')); // Example
                    }
                    if (element) element.name = `${config.name}_Decoration`;
                } else {
                    this.logger?.warn('UIManager', `Unrecognized UI element type "${config.type}" for element "${name}".`);
                    return; // Skip unknown types
                }

                if (element) {
                    // Set anchor/pivot based on config (only if property exists in config)
                    if (config.anchor && (element instanceof PIXI.Text || element instanceof PIXI.Sprite)) {
                        element.anchor.set(config.anchor.x ?? 0.5, config.anchor.y ?? 0.5);
                    }
                    // Note: Button pivot is handled internally by ButtonFactory

                    // Initially hide elements that might depend on layout visibility
                    element.visible = false;
                    if (element) {
                        this.internalContainer.addChild(element);
                        this.uiElements.set(name, element);
                        this.logger?.debug('UIManager', `Created UI element "${name}" of type "${config.type}".`);
                    } else {
                        this.logger?.warn('UIManager', `Skipping add/store for null element "${name}".`);
                    }
                } else {
                    this.logger?.warn('UIManager', `Failed to create PIXI object for UI element "${name}".`);
                }

            } catch (error) {
                this.logger?.error('UIManager', `Error creating UI element "${name}":`, error);
            }
        });
    }

    /**
     * Formats a number as currency based on the current state.
     * @param {number} value - The number to format.
     * @param {string} [currencyCode=state.currentCurrency] - The currency code.
     * @returns {string} The formatted currency string.
     * @private
     */
    _formatMoney(value, currencyCode = state.currentCurrency) {
        const numericValue = typeof value === 'number' ? value : 0;
        return CURRENCY[currencyCode]?.format(numericValue) ?? `${numericValue.toFixed(2)}`;
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
        this.logger?.info('UIManager', 'Destroying...');

        // Remove resize listener
        if (this._boundResizeHandler) {
            // @ts-ignore - Suppress persistent linter error about listener type mismatch
            window.removeEventListener('resize', this._boundResizeHandler);
            this._boundResizeHandler = null;
            this.logger?.debug('UIManager', 'Removed resize listener.');
        }

        // Kill tweens
        if (this._winRollupTween) {
            this._winRollupTween.kill();
            this._winRollupTween = null;
        }
        gsap.killTweensOf(this._balanceRollupValues); 
        const spinButton = this.uiElements.get('spin'); // Kill spin button tween
        if (spinButton?.buttonIcon) {
            gsap.killTweensOf(spinButton.buttonIcon);
        }
        
        // Unsubscribe from events
        this._listeners.forEach(unsubscribe => unsubscribe());
        this._listeners = [];

        // Unregister animations
        if (this._unregisterWinRollup) {
            this._unregisterWinRollup();
            this._unregisterWinRollup = null;
        }
        // Correctly unregister balance animation
        if (this.animationController?.unregisterAnimation) { 
            this.animationController.unregisterAnimation('balanceRollup', this.animateBalance.bind(this)); 
        }

        // Destroy background panel 
        this._backgroundPanel?.destroy();
        this._backgroundPanel = null;

        // Destroy buttons
        this.uiElements.forEach(element => {
            if (element instanceof PIXI.Container) {
                element.destroy({ children: true });
            }
        });
        this.uiElements.clear();

        // Destroy the internal container and its children (text elements)
        this.internalContainer?.destroy({ children: true }); 

        // Nullify references
        this.internalContainer = null; // Important to nullify after destroy
        this.balanceText = null;
        this.winText = null;
        this.betText = null;
        this.winRollupText = null;
        this.balanceLabel = null;
        this.betLabel = null;
        this.winLabel = null;
        this.parentLayer = null;
        this.eventBus = null;
        this.featureManager = null;
        // Log before nullifying logger
        this.logger?.info('UIManager', 'Destroy complete.');
        this.logger = null;
        this.animationController = null; 
        this.buttonFactory = null;
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
        if (!eventData || !eventData.newState || !eventData.updatedProps) {
            this.logger?.warn("UIManager", "_handleStateChange received invalid event data.", eventData);
            return;
        }

        const { newState, updatedProps } = eventData;
        this.logger?.debug('UIManager', '_handleStateChange triggered', { updatedProps, newState });

        let needsDisplayUpdate = false;
        let needsButtonUpdate = false;

        // --- BEGIN EDIT: Spin/Stop Button Icon Swap Logic ---
        if (updatedProps.includes('isSpinning')) {
            needsButtonUpdate = true; 
            const targetIcon = newState.isSpinning ? 'stop' : 'spin';
            const buttonName = 'spin'; 
            this.logger?.debug('UIManager', `Spinning state changed to ${newState.isSpinning}. Transitioning button "${buttonName}" to icon "${targetIcon}".`);
            this._transitionButtonIcon(buttonName, targetIcon, 0.2); 
        }
        // --- END EDIT ---

        // --- BEGIN EDIT: Correct property name check for bet updates ---
        if (updatedProps.includes('currentTotalBet') || updatedProps.includes('win')) { // Changed 'bet' to 'currentTotalBet'
            needsDisplayUpdate = true;
        }
        // --- END EDIT ---

        // Check properties that affect button enabled/disabled states or visual cues
        const buttonRelevantProps = ['canSpin', 'isAutoplayActive', 'isTurboMode', 'freeSpinsRemaining'];
         if (updatedProps.some(prop => buttonRelevantProps.includes(prop))) { 
             needsButtonUpdate = true;
         }

        // Update displays if relevant state changed
        if (needsDisplayUpdate) {
            this.updateOtherDisplays(newState);
        }

        // Update button states if relevant state changed
        if (needsButtonUpdate) {
            this.setButtonsEnabled(newState); // This handles enable/disable and potentially active states
            if (updatedProps.includes('isAutoplayActive')) {
                 this.setButtonVisualState('autoplay', newState.isAutoplayActive, 'autoplayStop', 'autoplay');
            }
            if (updatedProps.includes('isTurboMode')) {
                 this.setButtonVisualState('turbo', newState.isTurboMode, 'turboActive', 'turbo');
            }
        }
    }

    _handleInterruptAnimations() {
        this.logger?.debug('UIManager', 'Received spin:interruptAnimations, stopping animations.');
        gsap.killTweensOf(this._winRollupValues);
        gsap.killTweensOf(this._balanceRollupValues); // Kill balance tween
        if (this.winText) this.winText.visible = false; 
        if (this.winLabel) this.winLabel.visible = false;
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
        // --- BEGIN EDIT: Early Stop - Keep Spin button enabled during spin ---
        const generalEnabled = !currentState.isTransitioning; // Remove isSpinning check here
        const isSpinning = currentState.isSpinning; // Keep track of spinning state

        const alpha = generalEnabled ? 1.0 : 0.5;
        const eventMode = generalEnabled ? 'static' : 'none';
        const cursor = generalEnabled ? 'pointer' : 'default';

        const buttonsToToggle = [
            // Remove spin button from this list
            // this.buttons.get('spin'), 
            this.uiElements.get('betDecrease'),
            this.uiElements.get('betIncrease'),
        ];
        // --- END EDIT: Early Stop - Keep Spin button enabled during spin ---

        // Keep Autoplay & Turbo always interactive 
        // --- BEGIN EDIT (Add checks for buttons from map) ---\
        const autoplayButtonRef = this.uiElements.get('autoplay');
        if (autoplayButtonRef) {
            autoplayButtonRef.eventMode = 'static';
            autoplayButtonRef.alpha = 1.0;
            autoplayButtonRef.cursor = 'pointer';
        }
        const turboButtonRef = this.uiElements.get('turbo');
        if (turboButtonRef) {
            turboButtonRef.eventMode = 'static';
            turboButtonRef.alpha = 1.0;
            turboButtonRef.cursor = 'pointer';
        }
        // --- END EDIT (Add checks for buttons from map) ---

        buttonsToToggle.forEach(button => {
            if (!button) return; // Already checks if the button itself exists in the array
            // --- BEGIN EDIT (Add checks for buttons from map for comparison) ---
            const isBetButton = button === this.uiElements.get('betDecrease') || button === this.uiElements.get('betIncrease');
            // --- END EDIT ---
            // Disable bet buttons during FS and Autoplay, otherwise use general 'enabled' state
            // --- BEGIN EDIT: Early Stop - Use generalEnabled ---
            const finalEnabled = generalEnabled && !(isBetButton && (currentState.isInFreeSpins || currentState.isAutoplaying));
            // --- END EDIT: Early Stop - Use generalEnabled ---

            button.eventMode = finalEnabled ? 'static' : 'none';
            button.alpha = finalEnabled ? 1.0 : 0.5;
            button.cursor = finalEnabled ? 'pointer' : 'default';
        });
        
        // --- BEGIN EDIT: Early Stop - Handle Spin button separately ---
        const spinButtonRef = this.uiElements.get('spin');
        if (spinButtonRef) {
            // Spin button is enabled if game is not transitioning, regardless of spinning state
            const spinEnabled = generalEnabled; 
            spinButtonRef.eventMode = spinEnabled ? 'static' : 'none';
            spinButtonRef.alpha = spinEnabled ? 1.0 : 0.5;
            spinButtonRef.cursor = spinEnabled ? 'pointer' : 'default';
        }
        // --- END EDIT: Early Stop - Handle Spin button separately ---
    }

    animateSpinButtonRotation() {
        // --- BEGIN EDIT (Add checks for button from map) ---
        const spinButtonRef = this.uiElements.get('spin');
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
        const spinButtonRef = this.uiElements.get('spin');
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
        const button = this.uiElements.get(buttonName);
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

    /**
     * Animates the transition between icons for a specified button.
     * @param {string} buttonName The name of the button (e.g., 'spin').
     * @param {string} targetIconAlias The asset alias of the target icon (e.g., 'btn_stop').
     * @param {number} [duration=0.3] The duration of the transition in seconds.
     * @private
     */
    _transitionButtonIcon(buttonName, targetIconAlias, duration = 0.3) {
        const button = this.getButton(buttonName);
        const icon = button?.buttonIcon instanceof PIXI.Sprite ? button.buttonIcon : null;

        if (!button || !icon) {
            this.logger?.warn('UIManager', `Cannot transition icon for button \"${buttonName}\" - button or icon sprite not found.`);
            if (typeof button?.updateIcon === 'function') {
                button.updateIcon(targetIconAlias);
            }
            return;
        }

        gsap.killTweensOf(icon);

        // --- BEGIN REVISED ANIMATION LOGIC with Rotation ---
        const halfDuration = duration / 2;
        const startAngle = icon.angle; // Capture the starting angle

        // 1. Fade out and Rotate (first 180 degrees)
        gsap.to(icon, { 
            alpha: 0, 
            angle: startAngle + 180, // Rotate during fade-out
            duration: halfDuration, 
            ease: 'power1.in', 
            overwrite: true,
            onComplete: () => {
                // 2. Update the icon texture
                button.updateIcon(targetIconAlias);
                
                // 3. Set the new icon's state (invisible and at the end angle of the first rotation)
                const newStartAngle = startAngle + 180;
                gsap.set(icon, { alpha: 0, angle: newStartAngle }); 
                
                // 4. Fade in and Rotate (remaining 180 degrees)
                gsap.to(icon, { 
                    alpha: 1, 
                    angle: newStartAngle + 180, // Complete the 360 rotation
                    duration: halfDuration, 
                    ease: 'power1.out',
                    overwrite: true,
                    // Optional: Ensure final angle is clean (modulo 360)
                    onComplete: () => {
                        gsap.set(icon, { angle: (startAngle + 360) % 360 });
                    }
                });
            }
        });
        // --- END REVISED ANIMATION LOGIC with Rotation ---
    }

    // --- Add Gradient Texture Helper ---
    /**
     * Creates a vertical gradient texture.
     * @param {number} height - The height of the gradient texture.
     * @param {string} colorBottom - CSS color string for the bottom (e.g., 'rgba(0,0,0,1)').
     * @param {string} colorTop - CSS color string for the top (e.g., 'rgba(0,0,0,0)').
     * @returns {PIXI.Texture} The generated gradient texture.
     * @private
     */
    _createGradientTexture(height, colorBottom, colorTop) {
        const canvas = document.createElement('canvas');
        // Width can be 1px as it will be stretched
        canvas.width = 1; 
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            this.logger?.error("UIManager", "Failed to get 2D context for gradient canvas.");
            return PIXI.Texture.WHITE; // Return fallback texture
        }

        // Create gradient (from bottom to top)
        const gradient = ctx.createLinearGradient(0, height, 0, 0); 
        gradient.addColorStop(0, colorBottom); // Bottom color stop
        gradient.addColorStop(1, colorTop);   // Top color stop

        // Draw the gradient
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1, height);

        return PIXI.Texture.from(canvas);
    }
    // ---------------------------------

    /**
     * Sets up the window resize listener and triggers initial layout update.
     * @private
     */
    _setupLayoutUpdates() {
        if (!this._updateUILayout) { // Check for the renamed method
            this.logger?.error('UIManager', 'Cannot setup layout updates: _updateUILayout method missing.');
            return;
        }
        this._boundResizeHandler = this._updateUILayout.bind(this); // Bind the renamed method
        if (this._boundResizeHandler) {
            window.addEventListener('resize', this._boundResizeHandler);
        } else {
            this.logger?.error('UIManager', 'Failed to bind resize handler, cannot add listener.');
            return;
        }

        // Initial layout calculation and application
        this._updateUILayout();
        this.logger?.info('UIManager', 'Layout update handler attached and initial layout applied.');
    }

    /**
     * Handles window resize by selecting the appropriate layout config and applying it.
     * @private
     */
    _updateUILayout() {
        if (!this.uiElements || this.uiElements.size === 0) {
            // No elements created yet, or called during destruction
            return;
        }
        this.logger?.debug('UIManager', 'Updating UI layout...');

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // Determine breakpoint and select config
        const isPortrait = screenHeight > screenWidth;
        const activeLayoutConfig = isPortrait ? NARROW_LAYOUT_CONFIG : WIDE_LAYOUT_CONFIG;
        const activeLayoutName = isPortrait ? 'Narrow' : 'Wide';
        this.logger?.debug('UIManager', `Applying layout: ${activeLayoutName}`);

        const processedElements = new Set();

        // Apply positions/visibility based on the active layout
        activeLayoutConfig.forEach(elementConfig => {
            const elementName = elementConfig.name;
            const element = this.uiElements.get(elementName);
            processedElements.add(elementName); // Mark as processed

            if (!element) {
                this.logger?.warn('UIManager', `_updateUILayout: Could not find managed UI element "${elementName}" for layout ${activeLayoutName}.`);
                return;
            }

            // 1. Apply Visibility
            let isVisible = true; // Default to visible
            if (typeof elementConfig.visible === 'function') {
                isVisible = elementConfig.visible(isPortrait);
            } else if (typeof elementConfig.visible === 'boolean') {
                isVisible = elementConfig.visible;
            }
            element.visible = isVisible;

            // 2. Apply Position, Scale, Anchor (if visible)
            if (isVisible) {
                // Position
                if (typeof elementConfig.position === 'function') {
                    const pos = elementConfig.position(screenWidth, screenHeight);

                    // Apply position considering pivot/anchor
                    if (element instanceof PIXI.Text || (element instanceof PIXI.Sprite && elementConfig.anchor)) {
                        // For Text or Sprites with defined anchor
                        if (elementConfig.anchor) {
                            element.anchor.set(elementConfig.anchor.x ?? 0.5, elementConfig.anchor.y ?? 0.5);
                        }
                        element.x = pos.x;
                        element.y = pos.y;
                    } else if (element.pivot && typeof element.pivot.x === 'number') {
                        // For elements with a pivot (like our Buttons)
                        // ButtonFactory sets pivot to center (radius, radius)
                        // Config position is top-left, so add pivot offset
                        element.x = pos.x + element.pivot.x;
                        element.y = pos.y + element.pivot.y;
                    } else {
                        // Default for elements with no specific anchor/pivot rule
                        element.x = pos.x;
                        element.y = pos.y;
                    }
                    // this.logger?.debug('UIManager', `Element "${elementName}" positioned to x=${element.x.toFixed(1)}, y=${element.y.toFixed(1)}`);

                } else {
                    this.logger?.warn('UIManager', `Position config for element "${elementName}" is not a function in ${activeLayoutName} layout.`);
                }

                // Scale (Optional)
                if (elementConfig.scale && (element instanceof PIXI.Container || element instanceof PIXI.Sprite || element instanceof PIXI.Text)) {
                    let scaleVal = { x: 1, y: 1 };
                    if (typeof elementConfig.scale === 'function') {
                        scaleVal = elementConfig.scale(screenWidth, screenHeight, {}, isPortrait); // Pass relevant args
                    } else {
                        scaleVal = elementConfig.scale; // Assume static object {x, y}
                    }
                    element.scale.set(scaleVal.x, scaleVal.y);
                    // this.logger?.debug('UIManager', `Element "${elementName}" scaled to x=${scaleVal.x}, y=${scaleVal.y}`);
                }
            }
        });

        // Hide elements that are managed but NOT in the active layout config
        this.uiElements.forEach((element, name) => {
            if (!processedElements.has(name)) {
                element.visible = false;
                // this.logger?.debug('UIManager', `Hiding element "${name}" as it's not in ${activeLayoutName} layout.`);
            }
        });
    }
}
