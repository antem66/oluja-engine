/**
 * @module Game
 * @description Main game class, orchestrator, and update loop.
 * Initializes PixiJS, loads assets, creates layers and managers,
 * and manages the main game update cycle.
 * 
 * Dependencies (Injected via constructor):
 * - eventBus: Instance of EventBus for decoupled communication.
 * - featureManager: Instance of FeatureManager for feature flags.
 * - logger: Instance of Logger for logging.
 * - apiService: Instance of ApiService for server communication.
 */

import * as PIXI from 'pixi.js';
import * as SETTINGS from '../config/gameSettings.js';
import { REEL_STRIPS } from '../config/reelStrips.js';
// Import animation settings
import {
    // stopDelayBase, // No longer used directly here
    winAnimDelayMultiplier, // Still used in handleSpinEnd
    REEL_STOP_STAGGER, baseSpinDuration, stopTweenDuration, // Normal settings
    turboBaseSpinDuration, turboReelStopStagger // Turbo settings
} from '../config/animationSettings.js';
import { state, updateState, initGameState, destroyGameState } from './GameState.js';
// Re-add Reel import for JSDoc hints in debug methods temporarily moved to SpinManager
import { Reel } from './Reel.js';
// Removed ButtonFactory import - now handled by UIManager
// import { createButton, loadButtonAssets } from '../ui/ButtonFactory.js';
// Removed handlers import - Button handlers are now internal to UIManager or called via SpinManager
// import * as handlers from '../ui/ButtonHandlers.js';
import { initInfoOverlay, updateInfoOverlay } from '../ui/InfoOverlay.js';
import { initNotifications, showOverlayMessage } from '../ui/Notifications.js'; // init only
import { init as initPaylineGraphics } from './presentation/PaylineGraphics.js'; // Import clearWinLines here
import { initAnimations, updateParticles } from './presentation/Animations.js'; // Import updateParticles here
import { UIManager } from '../ui/UIManager.js'; // Import UIManager class
import { LogoManager } from '../ui/LogoManager.js'; // Corrected path
import { FreeSpinsUIManager } from '../plugins/freespins/FreeSpinsUIManager.js'; // Import FreeSpinsUIManager
import { BackgroundManager } from './BackgroundManager.js'; // Import BackgroundManager
import { ReelManager } from './ReelManager.js'; // Import ReelManager
import { SpinManager } from './SpinManager.js'; // Import SpinManager
import { SYMBOL_DEFINITIONS } from '../config/symbolDefinitions.js'; // Import symbol defs for asset loading
import { initDebugPanel } from '../ui/DebugPanel.js'; // Import debug panel
import { gsap } from 'gsap'; // Import GSAP for animations
import { loadButtonAssets } from '../ui/ButtonFactory.js'; // Keep loadButtonAssets
import { globalEventBus } from '../utils/EventBus.js'; // Keep for type hinting
import { featureManager } from '../utils/FeatureManager.js'; // Keep for type hinting
import { logger } from '../utils/Logger.js'; // Keep for type hinting
import { ResultHandler } from './ResultHandler.js'; // Import ResultHandler
import { AnimationController } from './AnimationController.js'; // Import new controller
import { PluginSystem } from './PluginSystem.js'; // <-- Import PluginSystem
import { AutoplayPlugin } from '../plugins/autoplay/AutoplayPlugin.js'; // <-- Import the new plugin
import { TurboPlugin } from '../plugins/turbo/TurboPlugin.js';
import { FreeSpinsPlugin } from '../plugins/freespins/FreeSpinsPlugin.js';

/**
 * @typedef {object} GameDependencies
 * @property {import('../utils/Logger.js').Logger} logger
 * @property {import('../utils/EventBus.js').EventBus} eventBus
 * @property {import('./ApiService.js').ApiService} apiService
 * @property {import('../utils/FeatureManager.js').FeatureManager} featureManager
 * @property {object} initialState // Add initial state type
 */

// --- Module-level variables ---
let app = null; // Pixi Application instance
// let reels = []; // Array of Reel instances - Now managed by ReelManager
let infoOverlayElement; // DOM element for info overlay

// Removed old FS UI variables


// --- Game Class ---
export class Game {
    /** @type {PIXI.Container | null} */
    layerBackground = null;
    /** @type {PIXI.Container | null} */
    layerReels = null;
    /** @type {PIXI.Container | null} */
    layerWinLines = null;
    /** @type {PIXI.Container | null} */
    layerUI = null;
    /** @type {PIXI.Container | null} */
    layerLogo = null;
    /** @type {PIXI.Container | null} */
    layerOverlays = null; // Main container for sub-overlays
    /** @type {PIXI.Container | null} */
    layerParticles = null;
    /** @type {PIXI.Container | null} */
    layerDebug = null;
    /** @type {PIXI.Container | null} */ // New Layer Property
    layerFullScreenEffects = null;

    // Dedicated Sub-containers for overlays
    /** @type {PIXI.Container | null} */
    fsIndicatorContainer = null;
    /** @type {PIXI.Container | null} */
    notificationsContainer = null;
    /** @type {PIXI.Container | null} */
    winAnnouncementsContainer = null;

    /** @type {PIXI.Sprite | null} */
    backgroundSprite = null;
    /** @type {FreeSpinsUIManager | null} */
    freeSpinsUIManager = null;
    /** @type {BackgroundManager | null} */
    backgroundManager = null;
    /** @type {ReelManager | null} */
    reelManager = null;
    /** @type {SpinManager | null} */
    spinManager = null;
    /** @type {ResultHandler | null} */
    resultHandler = null; // Add ResultHandler instance
    /** @type {UIManager | null} */ // Add UIManager instance property
    uiManager = null;
    /** @type {AnimationController | null} */ // Add property for the instance
    animationController = null;
    /** @type {PluginSystem | null} */ // <-- Add PluginSystem instance property
    pluginSystem = null;

    /** @type {object | null} */ // Changed type annotation
    deps = null; // To store injected dependencies

    /** @type {HTMLElement | null} */
    canvasContainer = null;

    /** @type {object | null} */
    initialState = null; // Add property to store initial state
    wasSpinning = false; // Add flag to track previous spin state

    /**
     * @property {UIManager} uiManager
     * @property {ResultHandler} resultHandler
     * @property {AnimationController} animationController // Add new dependency type
     */

    /**
     * @param {string} canvasContainerId - ID of the DOM element to contain the canvas.
     * @param {GameDependencies} dependencies - Core services + initial state.
     */
    constructor(canvasContainerId, /** @type {GameDependencies} */ dependencies) {
        this.canvasContainer = document.getElementById(canvasContainerId);
        if (!this.canvasContainer) {
            console.error(`Game: Constructor - Canvas container #${canvasContainerId} not found.`);
            return;
        }
        let errorFound = false;
        if (!dependencies) {
            console.error('Game: Constructor - Dependencies object is missing!');
            errorFound = true;
        } else {
            if (!dependencies.logger) {
                console.error('Game: Constructor - Logger dependency is missing!');
                errorFound = true;
            }
            if (!dependencies.eventBus) {
                (dependencies.logger || console).error('Game: Constructor - EventBus dependency is missing!');
                errorFound = true;
            }
            if (!dependencies.apiService) {
                (dependencies.logger || console).error('Game: Constructor - ApiService dependency is missing!');
                errorFound = true;
            }
            if (!dependencies.featureManager) {
                (dependencies.logger || console).error('Game: Constructor - FeatureManager dependency is missing!');
                errorFound = true;
            }
            if (!dependencies.initialState) {
                 (dependencies.logger || console).error('Game: Constructor - InitialState dependency is missing!');
                 errorFound = true;
            }
        }

        if (errorFound) {
            return;
        }
        this.deps = dependencies;
        this.initialState = dependencies.initialState;

        this.deps.logger.info('Game', 'Game instance created.');
    }

    async init() {
        this.deps.logger.info('Game', 'Initialization started...');
        try {
            this._exposeGlobals();
            await this._setupPixiApp();
            await this._loadAssets();
            this._createLayers();
            this._createManagers(); // Create managers first

            if (!this.backgroundManager || !this.reelManager || !this.animationController || !this.uiManager || !this.spinManager || !this.resultHandler || !this.freeSpinsUIManager) {
                (this.deps.logger || console).error('Game', 'Core manager creation failed. Halting initialization.');
                return;
            }

            const winLineGraphics = new PIXI.Graphics();
            this._createGameElements(winLineGraphics);
            this._initCoreModules(winLineGraphics); // Init modules, passing managers

            this._finalizeSetup();
            console.log("Game Initialized Successfully");

        } catch (err) {
            console.error("PixiJS or Game Init Failed:", err);
            if (this.canvasContainer) {
                this.canvasContainer.innerHTML = `Error initializing graphics: ${err.message}. Check console.`;
            }
        }
    }

    // --- Helper function to create a layer ---
    /**
     * Creates a named PIXI Container with a specific zIndex.
     * @param {string} name - The name for the layer (for debugging).
     * @param {number} zIndex - The z-index for sorting.
     * @returns {PIXI.Container} The created layer container.
     * @private
     */
    _createLayer(name, zIndex) {
        const layer = new PIXI.Container();
        layer.name = name;
        layer.zIndex = zIndex;
        return layer;
    }
    // --- End helper function ---

    _exposeGlobals() {
        if (typeof window !== 'undefined') {
            // @ts-ignore - Dynamically adding properties
            window.gameApp = this; // Expose Game instance
            // Managers will be added later
        }
    }

    async _setupPixiApp() {
        app = new PIXI.Application();
        globalThis.__PIXI_APP__ = app;
        await app.init({
            width: SETTINGS.GAME_WIDTH,
            height: SETTINGS.GAME_HEIGHT,
            backgroundColor: SETTINGS.normalBgColor,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });
        if (app?.canvas && this.canvasContainer) {
            this.canvasContainer.appendChild(app.canvas);
        } else {
            throw new Error("Pixi Application or canvas could not be initialized.");
        }
    }

    async _loadAssets() {
        const symbolAssets = SYMBOL_DEFINITIONS.map(def => ({
            alias: def.id,
            src: `assets/images/${def.id}.png`
        }));
        symbolAssets.push({ alias: 'BG_IMAGE', src: 'assets/images/background/bg.png' });

        console.log("Loading symbol assets:", symbolAssets);
        await PIXI.Assets.load(symbolAssets);
        console.log("Symbol assets loaded.");

        console.log("Loading button assets...");
        await loadButtonAssets(); // Keep this call
    }

    _createLayers() {
        this.layerBackground = this._createLayer("Layer: Background", 0);
        this.layerReels = this._createLayer("Layer: Reels", 10);
        this.layerWinLines = this._createLayer("Layer: Win Lines", 20);
        this.layerUI = this._createLayer("Layer: UI", 30);
        this.layerLogo = this._createLayer("Layer: Logo", 40);
        this.layerFullScreenEffects = this._createLayer("Layer: Full Screen Effects", 45); // Above Logo, below Overlays
        this.layerOverlays = this._createLayer("Layer: Overlays", 50);
        this.layerParticles = this._createLayer("Layer: Particles", 60);
        this.layerDebug = this._createLayer("Layer: Debug", 100);
        this.layerDebug.visible = false; // Specific property for Debug layer

        this.fsIndicatorContainer = new PIXI.Container();
        this.fsIndicatorContainer.name = "OverlaySub: FS Indicator";

        this.notificationsContainer = new PIXI.Container();
        this.notificationsContainer.name = "OverlaySub: Notifications";

        this.winAnnouncementsContainer = new PIXI.Container();
        this.winAnnouncementsContainer.name = "OverlaySub: Win Announcements";

        if (this.layerOverlays && this.fsIndicatorContainer && this.notificationsContainer && this.winAnnouncementsContainer) {
            this.layerOverlays.addChild(this.fsIndicatorContainer);
            this.layerOverlays.addChild(this.notificationsContainer);
            this.layerOverlays.addChild(this.winAnnouncementsContainer);
        } else {
            console.error("Game Init Error: Failed to create overlay sub-containers.");
        }

        if (app?.stage && this.layerBackground && this.layerReels && this.layerWinLines && this.layerUI && this.layerLogo && this.layerFullScreenEffects && this.layerOverlays && this.layerParticles && this.layerDebug) {
            app.stage.addChild(this.layerBackground, this.layerReels, this.layerWinLines, this.layerUI, this.layerLogo, this.layerFullScreenEffects, this.layerOverlays, this.layerParticles, this.layerDebug);
        } else {
            console.error("Game Init Error: One or more layers failed to initialize before adding to stage.");
        }

        if (this.layerWinLines) {
            this.layerWinLines.position.set(SETTINGS.reelAreaX, SETTINGS.reelAreaY);
            logger?.debug('Game', `Positioned layerWinLines at (${SETTINGS.reelAreaX}, ${SETTINGS.reelAreaY})`);
        }
    }

    _createManagers() {
        this.deps.logger?.info('Game', 'Creating managers...'); 
        const { logger, eventBus, apiService, featureManager, initialState } = this.deps;
        // Assume 'app' is the PIXI.Application instance available in this scope (e.g., from _setupPixiApp)
        // If not, this needs adjustment based on where 'app' is defined.
        // For now, assuming 'app' is in scope.

        if (!logger || !eventBus || !apiService || !featureManager) {
            console.error("Game Init Error: Core dependencies missing in Game instance.");
            return;
        }
        // Use app.ticker directly if 'app' is in scope
        if (!this.layerBackground || !this.layerReels || !app?.ticker || !this.layerLogo || !this.fsIndicatorContainer || !this.layerUI) {
            console.error("Game Init Error: Required layers or ticker not available for manager creation.");
            return;
        }

        this.backgroundManager = new BackgroundManager(this.layerBackground, logger);
        this.reelManager = new ReelManager(
            this.layerReels, 
            app.ticker, // Use app.ticker if 'app' is in scope
            logger,
            eventBus // Inject EventBus
        );
        
        // Corrected AnimationController instantiation
        this.animationController = new AnimationController({
            eventBus: eventBus, 
            logger: logger    
        });
        this.animationController.init();
        
        this.uiManager = new UIManager({
            parentLayer: this.layerUI, logger, eventBus, featureManager,
            animationController: this.animationController
        });
        this.spinManager = new SpinManager(this.reelManager, logger, eventBus, apiService);
        this.resultHandler = new ResultHandler({ eventBus, logger, reelManager: this.reelManager });
        this.resultHandler.init();

        this.freeSpinsUIManager = new FreeSpinsUIManager(this.fsIndicatorContainer, logger, eventBus);
        // Pass 'this' (Game instance) as the first argument to LogoManager
        new LogoManager(this, this.layerLogo, logger, eventBus);

        const pluginDependencies = {
            // Pass specific dependencies, not the whole `this.deps`
            logger,
            eventBus,
            apiService,
            featureManager,
            initialState,
            spinManager: this.spinManager,
            layerUI: this.layerUI,
            uiManager: this.uiManager,
            factories: { 
                createButton: this.uiManager?.buttonFactory
            },
            animationController: this.animationController,
            backgroundManager: this.backgroundManager,
            freeSpinsUIManager: this.freeSpinsUIManager,
            effectsLayer: this.layerFullScreenEffects,
            reelManager: this.reelManager
        };
        this.pluginSystem = new PluginSystem(pluginDependencies);
        this.pluginSystem.registerPlugin(AutoplayPlugin); 
        this.pluginSystem.registerPlugin(TurboPlugin);
        this.pluginSystem.registerPlugin(FreeSpinsPlugin);

        // Keep backgroundSprite assignment
        this.backgroundSprite = this.backgroundManager ? this.backgroundManager.backgroundSprite : null;

        // Keep global exposure for debugging
        if (typeof window !== 'undefined') {
            // @ts-ignore
            window.gameApp = this;
            // @ts-ignore
            window.gameApp.backgroundManager = this.backgroundManager;
            // @ts-ignore
            window.gameApp.freeSpinsUIManager = this.freeSpinsUIManager;
            // @ts-ignore
            window.gameApp.reelManager = this.reelManager;
            // @ts-ignore
            window.gameApp.spinManager = this.spinManager;
            // @ts-ignore
            window.gameApp.resultHandler = this.resultHandler;
            // @ts-ignore
            window.gameApp.uiManager = this.uiManager;
            // @ts-ignore
            window.gameApp.animationController = this.animationController;
        }
        // Use logger from dependencies
        logger.info('Game', 'Core managers created and dependencies injected.');

        // --- Initialize ApiService --- 
        if (apiService) { // Use destructured apiService
            apiService.init(); // Call init here
             // Use logger from dependencies
            logger.info('Game', 'ApiService initialized.');
        } else {
            // Use logger from dependencies
            logger.error('Game', 'ApiService instance missing, cannot initialize.');
        }
    }

    /**
     * @param {PIXI.Graphics} winLineGraphics
     */
    _createGameElements(winLineGraphics) {
        if (this.layerWinLines) {
            this.layerWinLines.addChild(winLineGraphics);
        }
    }

    /**
     * @param {PIXI.Graphics} winLineGraphics
     */
    _initCoreModules(winLineGraphics) {
        const { logger, eventBus, featureManager, apiService } = this.deps;
        if (!logger || !eventBus || !featureManager || !apiService || !app || !this.notificationsContainer || !this.winAnnouncementsContainer || !this.layerDebug || !this.layerFullScreenEffects || !this.spinManager || !this.animationController || !this.backgroundManager || !this.reelManager || !this.uiManager) {
            (logger || console).error('Game', '_initCoreModules: Missing dependencies, managers, layers, or app instance.');
            return;
        }

        if (!this.initialState) {
            (this.deps.logger || console).error('Game', '_initCoreModules: Initial state missing.');
            return;
        }

        const uiStyles = {
            label: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 14, fill: 0xAAAAAA }),
            balanceValue: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 20, fontWeight: 'bold', fill: 0xFFFFFF }),
            betValue: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 20, fontWeight: 'bold', fill: 0xFFFFFF }),
            winValue: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 20, fontWeight: 'bold', fill: 0xFFFF00 }),
            winRollup: new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: 24, fontWeight: 'bold', fill: 0xFFFF00, stroke: { color: 0x000000, width: 2 } }),
        };

        this.uiManager.init(uiStyles, this.initialState);

        const moduleDeps = {
            logger, eventBus, featureManager, apiService,
            reelManager: this.reelManager, uiManager: this.uiManager, app: app,
            spinManager: this.spinManager, animationController: this.animationController,
            backgroundManager: this.backgroundManager,
            initialState: this.initialState,
        };

        initPaylineGraphics({ ...moduleDeps, graphics: winLineGraphics });

        if (this.notificationsContainer) {
            initNotifications(this.notificationsContainer);
        } else { logger.error('Game', 'Cannot init Notifications, container missing.'); }

        const infoOverlayElement = document.getElementById('info-overlay');
        if (infoOverlayElement) {
            initInfoOverlay(infoOverlayElement);
        } else { logger.warn('Game', 'InfoOverlay element #info-overlay not found in DOM.'); }

        if (this.layerDebug) {
            initDebugPanel(app, this.layerDebug, eventBus);
        } else { logger.error('Game', 'Cannot init DebugPanel, layer missing.'); }

        updateParticles(0);

        if (this.winAnnouncementsContainer && this.layerParticles) {
            initAnimations({
                logger: logger,
                eventBus: eventBus,
                animationController: this.animationController,
                overlayContainer: this.winAnnouncementsContainer,
                particleContainer: this.layerParticles,
                reelManager: this.reelManager
            });
        } else {
            logger.error('Game', 'Cannot initialize Animations: Missing required layers.');
        }

        logger.info('Game', 'Core modules initialized.');
    }

    _finalizeSetup() {
        if (app?.stage) {
            app.stage.sortChildren();
            console.log("Stage children sorted by zIndex:", app.stage.children.map(c => ({ name: c.name, zIndex: c.zIndex })));
        } else {
            console.error("Finalize Setup Error: Pixi stage not available for sorting.");
        }

        if (app?.ticker) {
            app.ticker.add(this.update.bind(this));
        } else {
            throw new Error("Pixi ticker not available after init.");
        }
        
        this.pluginSystem?.initializePlugins();

        // --- Add Listener for Notifications ---
        this.deps.eventBus?.on('notification:show', (eventData) => {
            this.deps.logger?.debug('Game', 'Received notification:show event', eventData);
            if (eventData && eventData.message && typeof eventData.duration === 'number') {
                showOverlayMessage(eventData.message, eventData.duration, eventData.onComplete);
            } else {
                this.deps.logger?.error('Game', 'Invalid data received for notification:show event', eventData);
            }
        });
        this.deps.logger?.info('Game', 'Subscribed to notification:show events.');
        // --- End Listener ---
    }

    /**
     * @param {PIXI.Ticker} ticker
     */
    update(ticker) {
        const delta = ticker.deltaTime;
        const now = ticker.lastTime;
        let anyReelMoving = false;

        try {
            if (this.reelManager) {
                anyReelMoving = this.reelManager.update(delta, now);
            }

            updateParticles(delta);

            this.wasSpinning = state.isSpinning; 

            const conditionMet = this.wasSpinning && !anyReelMoving;
            if (conditionMet) {
                 logger?.info('Game.update', '>>> Spin End IF Block ENTERED <<<'); 
                 logger?.info('Game.update', 'Spin end condition MET (wasSpinning && !anyReelMoving)!'); 
                 
                 this.wasSpinning = false; 
                 
                 if (this.spinManager) {
                     logger?.debug('Game.update', 'Calling spinManager.handleSpinEnd() directly.');
                     this.spinManager.handleSpinEnd();
                 } else {
                     console.error("Game.update Error: Spin ended but SpinManager is not available.");
                     updateState({ isSpinning: false, isTransitioning: false }); 
                 }
            }
        } catch (err) {
            console.error("Error in game loop:", err);
            if (app?.ticker) {
                app.ticker.stop();
            }
            alert("Game loop critical error. Check console.");
        }
    }

    /**
     * Generate a random winning pattern
     * NOTE: Kept here temporarily for SpinManager dependency. Should move later.
     * @returns {{symbol: string, positions: number[]}} A winning pattern with symbol and positions
     */
    generateRandomWinPattern() {
        const highValueSymbols = ["FACE1", "FACE2", "FACE3", "KNIFE", "CUP", "PATCH"];
        const winSymbol = highValueSymbols[Math.floor(Math.random() * highValueSymbols.length)];
        const rowIndex = 1;
        const winLength = Math.floor(Math.random() * 3) + 3;
        const positions = [];
        for (let i = 0; i < SETTINGS.NUM_REELS; i++) {
            if (i < winLength) {
                positions.push(rowIndex);
            } else {
                positions.push(Math.floor(Math.random() * SETTINGS.SYMBOLS_PER_REEL_VISIBLE));
            }
        }
        return { symbol: winSymbol, positions: positions };
    }

    /**
     * Find the stop index that will show the target symbol in the target position
     * NOTE: Kept here temporarily for SpinManager dependency. Should move later.
     * @param {Reel} reel - The reel object
     * @param {string} targetSymbol - The symbol we want to show
     * @param {number} targetPosition - The position where we want the symbol (0=top, 1=middle, 2=bottom)
     * @returns {number} The stop index that will show the target symbol in position
     */
    findStopIndexForSymbol(reel, targetSymbol, targetPosition) {
        const symbols = reel.strip;
        if (!symbols) return Math.floor(Math.random() * (reel.strip?.length || 1));

        for (let i = 0; i < symbols.length; i++) {
            if (symbols[i] === targetSymbol) {
                let stopIndex = (i - targetPosition + symbols.length) % symbols.length;
                return stopIndex;
            }
        }
        console.log(`Could not find symbol ${targetSymbol} on reel ${reel.reelIndex} - using random position`);
        return Math.floor(Math.random() * symbols.length);
    }

    destroy() {
        this.deps.logger?.info('Game', 'Destroying game instance...');
        this.pluginSystem?.destroyPlugins();

        this.resultHandler?.destroy();
        this.uiManager?.destroy();
        this.animationController?.destroy();
        this.spinManager?.destroy();
        this.reelManager?.destroy();
        this.backgroundManager?.destroy();
        this.freeSpinsUIManager?.destroy();

        app?.ticker?.stop();

        if (app?.stage) {
            app.stage.destroy({ children: true });
        }
        if (app) {
            app.destroy(true, { children: true });
            app = null;
            globalThis.__PIXI_APP__ = undefined;
        }

        destroyGameState();

        if (typeof window !== 'undefined') {
            // @ts-ignore
            delete window.gameApp;
        }

        this.deps.logger?.info('Game', 'Destroyed game instance.');

        this.layerBackground = null;
        this.layerReels = null;
        this.layerWinLines = null;
        this.layerUI = null;
        this.layerLogo = null;
        this.layerOverlays = null;
        this.layerParticles = null;
        this.layerDebug = null;
        this.layerFullScreenEffects = null;
        this.fsIndicatorContainer = null;
        this.notificationsContainer = null;
        this.winAnnouncementsContainer = null;
        this.backgroundSprite = null;
        this.freeSpinsUIManager = null;
        this.backgroundManager = null;
        this.reelManager = null;
        this.spinManager = null;
        this.resultHandler = null;
        this.uiManager = null;
        this.animationController = null;
        this.canvasContainer = null;
        this.deps = null;
        this.pluginSystem = null;
    }
}

// Removed old FS UI functions (createFreeSpinsIndicator, updateFreeSpinsIndicator, startGlowAnimation, stopGlowAnimation)


// --- Global Functions used by other modules ---
