import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { state } from '../core/GameState.js'; // Import state for checking isInFreeSpins etc.
import * as SETTINGS from '../config/gameSettings.js';
// Import types for JSDoc
import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';

export class FreeSpinsUIManager {
    /** @type {PIXI.Container | null} */
    freeSpinsIndicator = null;
    /** @type {PIXI.Text | null} */
    freeSpinsCountText = null;
    /** @type {PIXI.Text | null} */
    freeSpinsTotalWinText = null;
    /** @type {PIXI.Graphics | null} */
    freeSpinsGlow = null;
    /** @type {PIXI.Container | null} */
    parentContainer = null;
    /** @type {import('../utils/Logger.js').Logger | null} */
    logger = null;
    /** @type {import('../utils/EventBus.js').EventBus | null} */
    eventBus = null;

    /** 
     * @param {PIXI.Container | null} parentContainer 
     * @param {import('../utils/Logger.js').Logger} loggerInstance
     * @param {import('../utils/EventBus.js').EventBus} eventBusInstance
     */
    constructor(parentContainer, loggerInstance, eventBusInstance) {
        this.logger = loggerInstance;
        this.eventBus = eventBusInstance; // Store eventBus

        if (!parentContainer) {
            this.logger?.error('FreeSpinsUIManager', 'Parent container is required!');
            return;
        }
        if (!this.logger) { 
            console.error("FreeSpinsUIManager: Logger instance is required!");
        }
        if (!this.eventBus) { // Check for eventBus
            this.logger?.warn('FreeSpinsUIManager', 'EventBus instance was not provided.');
        }

        this.parentContainer = parentContainer;
        this._createIndicator();
        this.logger?.info('FreeSpinsUIManager', 'Initialized.');
        // TODO (Phase 2+): Subscribe to relevant events (e.g., 'freeSpins:updated', 'game:stateChanged') using this.eventBus
        // this.eventBus?.on('game:stateChanged', this._handleStateChange.bind(this));
    }

    // Renamed from createFreeSpinsIndicator and made private
    _createIndicator() {
        // Create container for free spins UI elements
        this.freeSpinsIndicator = new PIXI.Container();
        this.freeSpinsIndicator.visible = false; // Hide initially

        // Position at the top center of the screen
        this.freeSpinsIndicator.x = SETTINGS.GAME_WIDTH / 2;
        this.freeSpinsIndicator.y = 60; // Adjusted Y position to be below title

        // Create background panel (Task 3.3 Enhancement)
        const panel = new PIXI.Graphics();
        panel.beginFill(0x8A2BE2, 0.9); // Slightly brighter BlueViolet, less transparent
        panel.lineStyle(4, 0xFFFF00, 1); // Thicker Yellow border
        panel.drawRoundedRect(-150, 0, 300, 80, 15); // More rounded corners
        panel.endFill();

        // Add glow filter (Task 3.3 Enhancement)
        this.freeSpinsGlow = new PIXI.Graphics();
        this.freeSpinsGlow.beginFill(0xFFFF00, 0.4); // Brighter yellow glow
        this.freeSpinsGlow.drawRoundedRect(-160, -8, 320, 96, 17); // Slightly larger glow area
        this.freeSpinsGlow.endFill();
        this.freeSpinsGlow.alpha = 0; // Starts hidden

        // Create title text (Task 3.3 Enhancement - slightly larger)
        const titleStyle = new PIXI.TextStyle({
            fontFamily: 'Impact, Charcoal, sans-serif',
            fontSize: 26, // Slightly larger
            fontWeight: 'bold',
            fill: 0xFFD700, // Gold
            stroke: { color: 0x000000, width: 3 },
            dropShadow: { color: 0x000000, alpha: 0.6, blur: 3, distance: 3 }, // Slightly stronger shadow
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

        this.freeSpinsCountText = new PIXI.Text("Remaining: 10", countStyle);
        this.freeSpinsCountText.anchor.set(0.5, 0);
        this.freeSpinsCountText.y = 45;

        // Create total win text
        this.freeSpinsTotalWinText = new PIXI.Text("Total Win: €0.00", countStyle);
        this.freeSpinsTotalWinText.anchor.set(0.5, 0);
        this.freeSpinsTotalWinText.y = 45;
        this.freeSpinsTotalWinText.x = 180; // Position to the right of spins count

        // Add elements to container - Restored
        if (this.freeSpinsIndicator) {
             this.freeSpinsIndicator.addChild(this.freeSpinsGlow);
             this.freeSpinsIndicator.addChild(panel);
             this.freeSpinsIndicator.addChild(title);
             this.freeSpinsIndicator.addChild(this.freeSpinsCountText);
             this.freeSpinsIndicator.addChild(this.freeSpinsTotalWinText);
        }

        // Add to the specified parent layer
        if (this.parentContainer && this.freeSpinsIndicator) {
            this.parentContainer.addChild(this.freeSpinsIndicator);
            console.log("[Trace] FreeSpinsUIManager: Added freeSpinsIndicator container to parentContainer.", this.parentContainer.name);
        } else {
            this.logger?.error('FreeSpinsUIManager', '_createIndicator called but parentContainer is null.');
        }
    }

    // Renamed from updateFreeSpinsIndicator
    update() {
        // Ensure indicator itself exists
        if (!this.freeSpinsIndicator) {
            return;
        }

        // Only log if something interesting might happen (entering/exiting FS or indicator visible)
        if (state.isInFreeSpins || this.freeSpinsIndicator?.visible) {
            // console.log(`[Trace] FreeSpinsUIManager.update called. isInFreeSpins: ${state.isInFreeSpins}, indicator visible: ${this.freeSpinsIndicator?.visible}`);
        }

        // Show/hide based on free spins state
        const inFreeSpin = state.isInFreeSpins;
        if (inFreeSpin) {
            // Update text content only if text elements exist
            if (this.freeSpinsCountText) {
                this.freeSpinsCountText.text = `Remaining: ${state.freeSpinsRemaining}`;
            }
            if (this.freeSpinsTotalWinText) {
                this.freeSpinsTotalWinText.text = `Win: €${state.totalFreeSpinsWin.toFixed(2)}`;
            }

            // Show indicator if not already visible
            if (!this.freeSpinsIndicator.visible) {
                console.log("[Trace] FS Indicator not visible - Animating in.");
                this.freeSpinsIndicator.visible = true;
                this.freeSpinsIndicator.alpha = 0;     // Start transparent
                this.freeSpinsIndicator.y = 60;      // Start at final Y position
                this.freeSpinsIndicator.rotation = 0; // Ensure rotation is 0

                // Animate it in - SIMPLIFIED
                gsap.to(this.freeSpinsIndicator, {
                    // y: 60, // Removed Y animation
                    alpha: 1, // Fade in only
                    // rotation: 0.05, // Removed rotation
                    duration: 0.5, // Slightly faster fade
                    ease: "power1.inOut" // Simple ease
                });

                // Start pulsing glow animation (has internal null check)
                this._startGlowAnimation();
            }

            // Flash count text only if it exists and count changed
            // @ts-ignore - _lastCount is dynamic
            if (this.freeSpinsCountText && this.freeSpinsIndicator._lastCount !== undefined && this.freeSpinsIndicator._lastCount !== state.freeSpinsRemaining) {
                gsap.to(this.freeSpinsCountText.scale, {
                    x: 1.2, y: 1.2,
                    duration: 0.2,
                    repeat: 1,
                    yoyo: true,
                    ease: "power1.inOut"
                });
            }

            // Store current count for comparison on next update
            // @ts-ignore - _lastCount is dynamic
            this.freeSpinsIndicator._lastCount = state.freeSpinsRemaining;

        } else if (this.freeSpinsIndicator.visible && !state.isTransitioning) {
            console.log("[Trace] Not in Free Spins & FS indicator visible - Animating out.");
            // Animate it out
            gsap.to(this.freeSpinsIndicator, {
                y: -50,
                alpha: 0,
                rotation: 0, // Return rotation to 0 on exit
                duration: 0.5,
                ease: "back.in(1.7)",
                onComplete: () => {
                    if (this.freeSpinsIndicator) { // Check if it still exists
                        this.freeSpinsIndicator.visible = false;
                        // Stop glow animation (has internal null check)
                        this._stopGlowAnimation();
                        // @ts-ignore - _lastCount is dynamic
                        delete this.freeSpinsIndicator._lastCount; // Clean up temporary property
                    }
                }
            });
        }
    }

    // Renamed from startGlowAnimation and made private
    _startGlowAnimation() {
        // Added null check for glow element
        if (!this.freeSpinsGlow) return;

        // Kill any existing animations
        gsap.killTweensOf(this.freeSpinsGlow);

        // Create pulsing animation (Task 3.3 Enhancement - faster pulse)
        gsap.to(this.freeSpinsGlow, {
            alpha: 0.8, // Slightly more visible glow
            duration: 0.7, // Faster pulse
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }

    // Renamed from stopGlowAnimation and made private
    _stopGlowAnimation() {
        if (!this.freeSpinsGlow) return;

        // Kill animation and reset
        gsap.killTweensOf(this.freeSpinsGlow);
        this.freeSpinsGlow.alpha = 0;
    }
    
    /**
     * Cleans up resources used by the FreeSpinsUIManager.
     */
    destroy() {
        this.logger?.info('FreeSpinsUIManager', 'Destroying...');
        
        // Stop animations
        this._stopGlowAnimation();
        if (this.freeSpinsIndicator) {
            gsap.killTweensOf(this.freeSpinsIndicator);
        }
        if (this.freeSpinsCountText?.scale) {
             gsap.killTweensOf(this.freeSpinsCountText.scale);
        }
        
        // Destroy PIXI objects
        // Destroying the main container should handle children
        if (this.freeSpinsIndicator) {
            this.freeSpinsIndicator.destroy({ children: true });
            // this.freeSpinsIndicator = null; // Optional
        }
        
        // Nullify references
        this.parentContainer = null;
        this.logger = null;
        this.eventBus = null; 
        this.freeSpinsIndicator = null;
        this.freeSpinsCountText = null;
        this.freeSpinsTotalWinText = null;
        this.freeSpinsGlow = null;
        // TODO: Unsubscribe from any eventBus listeners if added later
    }
}
