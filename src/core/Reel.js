import * as PIXI from 'pixi.js';
import { gsap } from 'gsap'; // Import GSAP
import { SYMBOL_SIZE, SYMBOLS_PER_REEL_VISIBLE, REEL_WIDTH } from '../config/gameSettings.js';
import {
    spinAcceleration, maxSpinSpeed,
    stopTweenDuration, // Import new setting
    EARLY_STOP_DURATION, // Import early stop duration
    turboReelStopTweenDuration // Import turbo stop duration
} from '../config/animationSettings.js'; // Import animation parameters
import { createSymbolGraphic } from './Symbol.js'; // Restore this import
import { EventBus } from '../utils/EventBus.js'; // Import EventBus type
import { state } from './GameState.js'; // Import state for Turbo check

export class Reel {
    reelIndex;
    strip;
    appTicker;
    /** @type {import('../utils/EventBus.js').EventBus | null} */
    eventBus = null; // Add eventBus dependency
    container;
    symbols = []; // Restore symbols array
    position = 0; // Logical position on the strip (index)
    spinSpeed = 0;
    state = 'idle';
    stopIndex = 0;
    finalStopPosition = 0;
    targetStopTime = 0;
    /** @type {gsap.core.Tween | null} */
    stopTween = null; // Reference to the GSAP tween
    /** @type {PIXI.BlurFilter} */
    motionBlur;
    /** @type {PIXI.ColorMatrixFilter} */
    colorMatrix;
    shimmerContainer;
    lightStreaks;
    /** @type {Function | null} */ // Store unsubscribe function
    _unsubscribeEarlyStop = null;

    constructor(reelIndex, strip, appTicker, eventBus) {
        this.reelIndex = reelIndex;
        this.strip = strip;
        this.appTicker = appTicker;
        this.eventBus = eventBus; // Store eventBus

        this.container = new PIXI.Container();
        this.container.x = reelIndex * REEL_WIDTH;

        this.symbols = []; // Initialize symbols array
        this.position = Math.random() * this.strip.length;
        this.stopIndex = Math.floor(this.position);
        this.finalStopPosition = this.stopIndex;

        this.setupSpinEffects();

        // Create initial symbols
        const numSymbolsToCreate = SYMBOLS_PER_REEL_VISIBLE + 2;
        for (let j = 0; j < numSymbolsToCreate; j++) {
            // Use placeholder initially, alignReelSymbols will fix it
            const symbol = createSymbolGraphic(this.strip[0]);
            this.symbols.push(symbol);
            this.container.addChild(symbol);
        }
        this.alignReelSymbols(); // Position initial symbols correctly

        // Subscribe to early stop request
        if (this.eventBus) {
            this._unsubscribeEarlyStop = this.eventBus.on('spin:requestEarlyStop', this._handleEarlyStopRequest.bind(this));
        } else {
            console.warn(`[Reel ${this.reelIndex}] EventBus not provided, cannot listen for early stop.`);
        }
    }

    /**
     * Set up enhanced visual effects for spinning animation
     */
    setupSpinEffects() {
        // @ts-ignore
        this.motionBlur = new PIXI.BlurFilter();
        this.motionBlur.blurY = 0;
        this.motionBlur.blurX = 0;
        this.motionBlur.quality = 2;
        this.motionBlur.enabled = false;

        // @ts-ignore
        this.colorMatrix = new PIXI.ColorMatrixFilter();
        this.colorMatrix.enabled = false;

        this.container.filters = [this.motionBlur, this.colorMatrix];

        this.setupShimmerEffect();
    }

    /**
     * Create light streak elements for a shimmer effect during spinning
     */
    setupShimmerEffect() {
        this.shimmerContainer = new PIXI.Container();
        this.container.addChild(this.shimmerContainer);
        this.lightStreaks = [];
        const numStreaks = 3;
        for (let i = 0; i < numStreaks; i++) {
            const streak = new PIXI.Graphics();
            streak.alpha = 0;
            streak.beginFill(0xffffff, 1);
            streak.drawRect(-5, -SYMBOL_SIZE * 3, 10, SYMBOL_SIZE * 6);
            streak.endFill();
            streak.pivot.set(0, 0);
            streak.rotation = -Math.PI / 4;
            streak.y = SYMBOL_SIZE * (Math.random() * SYMBOLS_PER_REEL_VISIBLE);
            this.shimmerContainer.addChild(streak);
            this.lightStreaks.push(streak);
        }
        this.shimmerContainer.visible = false;
    }

    // --- Reel State Control ---

    startSpinning(currentTurbo) {
        // No check for reelSprite needed now
        this.state = 'accelerating';
        this.spinSpeed = 0;

        if (this.motionBlur) this.motionBlur.enabled = true;
        if (this.colorMatrix) this.colorMatrix.enabled = true;
        if (this.shimmerContainer) this.shimmerContainer.visible = true;

        // Stop index determination is not strictly needed for infinite spin test
        // this.stopIndex = Math.floor(Math.random() * this.strip.length);
        // this.finalStopPosition = this.stopIndex;
        this.targetStopTime = 0; // Ensure no stop is scheduled
        if (this.stopTween) {
            this.stopTween.kill();
            this.stopTween = null;
        }
        //console.log(`Reel ${this.reelIndex}: Starting spin (infinite test)`);
    }

    scheduleStop(targetStopTime) {
        this.targetStopTime = targetStopTime; // Uncommented to store stop time
        //console.log(`Reel ${this.reelIndex}: Scheduled to stop near time ${targetStopTime.toFixed(0)}`);
    }

    // --- Symbol Alignment --- (Restored)

    alignReelSymbols() {
        const totalStripSymbols = this.strip.length;
        const numSymbolsInDisplay = this.symbols.length;
        const currentPosition = this.position;

        const topVisibleStripIndex = Math.floor(currentPosition) % totalStripSymbols;

        for (let i = 0; i < numSymbolsInDisplay; i++) {
            const symbolSprite = this.symbols[i];
            if (!symbolSprite) continue;

            const relativeIndex = i - 1;
            const targetStripIndex = (topVisibleStripIndex + relativeIndex + totalStripSymbols) % totalStripSymbols;

            const symbolOffset = currentPosition - Math.floor(currentPosition);
            symbolSprite.y = (relativeIndex - symbolOffset) * SYMBOL_SIZE + (SYMBOL_SIZE / 2);

            // --- Uncommented Symbol Replacement Logic ---
            const expectedSymbolId = this.strip[targetStripIndex];

            // *** ADDED CHECK ***: Ensure expectedSymbolId is valid before proceeding
            if (typeof expectedSymbolId !== 'string' || expectedSymbolId === '') {
                console.error(`[Reel ${this.reelIndex}] Invalid expectedSymbolId at index ${targetStripIndex}. Skipping replacement for symbol ${i}.`);
                // Ensure the current symbol is not null before skipping
                if (!symbolSprite) this.symbols[i] = null; // Keep it null if it was already
                continue; // Skip to the next symbol in the loop
            }

            // Performance: Only update texture if needed
            if (symbolSprite && symbolSprite.symbolId !== expectedSymbolId) {
                const newTexture = PIXI.Assets.get(expectedSymbolId);
                if (newTexture) {
                    symbolSprite.texture = newTexture;
                    symbolSprite.symbolId = expectedSymbolId; // Keep internal ID consistent
                    // Ensure visibility if it was previously hidden (though unlikely here)
                    symbolSprite.visible = true; 
                } else {
                     console.error(`[Reel ${this.reelIndex}] Texture not found for symbol ID: ${expectedSymbolId} during align.`);
                     // Hide the sprite if texture is missing?
                     symbolSprite.visible = false;
                }
            } else if (!symbolSprite) {
                // This case should ideally not happen if constructor is correct,
                // but handle defensively: try to create the symbol if missing.
                console.warn(`[Reel ${this.reelIndex}] Symbol missing at index ${i} in alignReelSymbols. Attempting creation.`);
                const newSymbol = createSymbolGraphic(expectedSymbolId);
                 if (newSymbol) {
                     this.symbols[i] = newSymbol;
                     this.container.addChildAt(newSymbol, i);
                     // Need to set Y position here as well
                     newSymbol.y = (relativeIndex - symbolOffset) * SYMBOL_SIZE + (SYMBOL_SIZE / 2);
                 } else {
                      console.error(`[Reel ${this.reelIndex}] Failed to create fallback symbol for ${expectedSymbolId}`);
                 }
            }
        }
    }

    /**
     * Updates the visual effects based on spin speed
     */
    updateSpinEffects(normalizedSpeed) {
        // Logic remains the same
        if (normalizedSpeed <= 0) {
            if (this.motionBlur) this.motionBlur.enabled = false;
            if (this.colorMatrix) this.colorMatrix.enabled = false;
            if (this.shimmerContainer) this.shimmerContainer.visible = false;
            return;
        }
        if (this.motionBlur) {
            this.motionBlur.enabled = true;
            this.motionBlur.blurY = 12 * normalizedSpeed;
        }
        if (this.colorMatrix) {
            this.colorMatrix.enabled = true;
            this.colorMatrix.reset();
            this.colorMatrix.brightness(1 + 0.2 * normalizedSpeed, false);
            this.colorMatrix.contrast(1 + 0.1 * normalizedSpeed, false);
        }
        this.updateShimmerEffect(normalizedSpeed);
    }

    /**
     * Update shimmer light streaks animation
     */
    updateShimmerEffect(normalizedSpeed) {
        // Logic remains the same
        if (normalizedSpeed < 0.5 || !this.shimmerContainer || !this.lightStreaks) {
             if (this.shimmerContainer) this.shimmerContainer.visible = false;
             return;
        }
        this.shimmerContainer.visible = true;
        const chanceToShow = normalizedSpeed * 0.02;
        this.lightStreaks.forEach(streak => {
            if (!streak) return;
            if (streak.alpha <= 0.1 && Math.random() < chanceToShow) {
                streak.y = SYMBOL_SIZE * (Math.random() * SYMBOLS_PER_REEL_VISIBLE);
                gsap.killTweensOf(streak);
                gsap.to(streak, { alpha: 0.7 * normalizedSpeed, duration: 0.1, onComplete: () => {
                    gsap.to(streak, { alpha: 0, duration: 0.3, ease: "power1.out" });
                }});
            }
        });
    }

    // --- Update Logic (Simplified for Infinite Spin Test) ---

    update(delta, now) {
        let needsAlign = false;
        let reelIsActive = true; // Restore variable declaration

        // --- State Machine with Stop Logic ---
        switch (this.state) {
            case 'accelerating':
                this.spinSpeed = Math.min(maxSpinSpeed, this.spinSpeed + spinAcceleration * delta);
                this.position += this.spinSpeed * delta;
                if (this.spinSpeed >= maxSpinSpeed) {
                    this.state = 'spinning';
                    this.spinSpeed = maxSpinSpeed;
                }
                this.updateSpinEffects(this.spinSpeed / maxSpinSpeed);
                needsAlign = true;
                break;

            case 'spinning':
                // Check if time to stop
                if (this.targetStopTime > 0 && now >= this.targetStopTime - stopTweenDuration) { 
                     this.state = 'stopping';
                     //console.log(`Reel ${this.reelIndex}: Initiating stop tween at time ${now.toFixed(0)}`);

                     // *** DEBUG LOG ***: Check finalStopPosition before tweening - UNCOMMENT
                     // Use logger if available, else console
                     const logFunc = console.error; // Default to console.error for visibility
                     if (isNaN(this.finalStopPosition)) {
                        logFunc(`[Reel ${this.reelIndex}] *** ERROR: finalStopPosition is NaN before tween start!`);
                     } else {
                         // Use console.log or logger.debug for non-errors
                         console.log(`[Reel ${this.reelIndex}] finalStopPosition before tween: ${this.finalStopPosition}`);
                     }

                     // Kill any previous tween just in case
                     if (this.stopTween) {
                         this.stopTween.kill();
                     }

                     // Create the GSAP tween to stop the reel
                     this.stopTween = gsap.to(this, {
                         position: this.finalStopPosition, // Target the final logical position
                         duration: stopTweenDuration / 1000, // GSAP uses seconds
                         ease: 'quad.out', // Smooth deceleration
                         onUpdate: () => {
                             // Update visuals during the tween
                             this.position = ((this.position % this.strip.length) + this.strip.length) % this.strip.length; // Wrap position during tween
                             this.alignReelSymbols();
                             // Gradually reduce spin effects during tween
                             const progress = this.stopTween ? this.stopTween.progress() : 1;
                             this.updateSpinEffects(1 - progress);
                         },
                         onComplete: () => {
                             // ADD CLEAR LOG HERE
                             console.info(`%c[Reel ${this.reelIndex}] Tween ON_COMPLETE FIRING! Setting state to stopped.`, 'color: lime; font-weight: bold;');
                             this.position = this.finalStopPosition; 
                             this.state = 'stopped';
                             this.spinSpeed = 0;
                             this.updateSpinEffects(0); 
                             needsAlign = true; // Set flag for final alignment after switch
                             this.stopTween = null;
                             // console.log(`Reel ${this.reelIndex}: GSAP Stop tween completed. State: ${this.state}`);
                         }
                     });
                     needsAlign = false; // onUpdate will handle alignment
                } else {
                    // Continue spinning normally
                    this.position += maxSpinSpeed * delta;
                    this.updateSpinEffects(1.0);
                    needsAlign = true;
                }
                break;

            case 'stopping':
                // If we are in the stopping state, the tween should be running.
                // Report as active until the state transitions to 'stopped' (via onComplete).
                if (this.stopTween) {
                    needsAlign = true; // Align symbols during tween via onUpdate
                    reelIsActive = true; // Always active while in 'stopping' state
                } else {
                    // Fallback if tween somehow disappeared (shouldn't happen often)
                    console.warn(`Reel ${this.reelIndex}: In stopping state but no stopTween found. Forcing stopped state & inactive.`);
                    this.state = 'stopped'; 
                    this.spinSpeed = 0;
                    this.updateSpinEffects(0);
                    needsAlign = true;
                    reelIsActive = false; // Set to inactive only in fallback
                }
                break;

            case 'stopped': // Restore correct stopped/idle behavior
            case 'idle':
                reelIsActive = false; // Reel is not active
                this.updateSpinEffects(0); // Ensure effects are off
                // Do not change position or set needsAlign
              break;         }

         // Align symbols if needed (and wrap position)
         if (needsAlign) {
              this.position = ((this.position % this.strip.length) + this.strip.length) % this.strip.length;
              this.alignReelSymbols();
         }

         return reelIsActive; // Restore returning the actual state activity
     }
     
    /**
     * Handles the early stop request event.
     * @private
     */
    _handleEarlyStopRequest() {
        // Implementation will be added in the next step (Task 3.3)
        console.log(`[Reel ${this.reelIndex}] Received spin:requestEarlyStop`);
    }

    /**
     * Cleans up resources used by the reel.
     */
    destroy() {
        // 0. Unsubscribe Event Listener
        if (this._unsubscribeEarlyStop) {
            this._unsubscribeEarlyStop();
            this._unsubscribeEarlyStop = null;
        }

        // 1. Kill GSAP Tween
        if (this.stopTween) {
            this.stopTween.kill();
            this.stopTween = null;
        }
        
        // 2. Destroy Symbols
        if (this.symbols && this.container) {
            this.symbols.forEach(symbol => {
                if (symbol) {
                    // Check parent just in case it was already removed elsewhere
                    if (symbol.parent === this.container) {
                         this.container.removeChild(symbol);
                    }
                    symbol.destroy({ children: true });
                }
            });
            this.symbols = []; // Clear array
        }
        
        // 3. Destroy Effects
        if (this.shimmerContainer) {
            // Check parent just in case
            if (this.shimmerContainer.parent === this.container) {
                this.container.removeChild(this.shimmerContainer);
            }
            this.shimmerContainer.destroy({ children: true });
            this.shimmerContainer = null;
            this.lightStreaks = [];
        }
        
        // 4. Destroy Container (Removes filters implicitly)
        if (this.container) {
            this.container.destroy({ children: true });
        }
        
        // 5. Nullify References
        this.appTicker = null;
        this.strip = null;
        // this.motionBlur = null; // REMOVE null assignment
        // this.colorMatrix = null; // REMOVE null assignment
        // No need to nullify primitives like reelIndex, position, etc.
        this.eventBus = null; // Nullify eventBus
    }
 }
