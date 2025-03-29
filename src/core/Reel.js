import * as PIXI from 'pixi.js';
import { gsap } from 'gsap'; // Import GSAP
import { SYMBOL_SIZE, SYMBOLS_PER_REEL_VISIBLE, REEL_WIDTH } from '../config/gameSettings.js';
import {
    spinAcceleration, maxSpinSpeed,
    stopTweenDuration // Import new setting
} from '../config/animationSettings.js'; // Import animation parameters
import { createSymbolGraphic } from './Symbol.js'; // Restore this import

export class Reel {
    reelIndex;
    strip;
    appTicker;
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

    constructor(reelIndex, strip, appTicker) {
        this.reelIndex = reelIndex;
        this.strip = strip;
        this.appTicker = appTicker;

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
        console.log(`Reel ${this.reelIndex}: Starting spin (infinite test)`);
    }

    // scheduleStop is not needed for infinite spin test, but keep it for now
    scheduleStop(targetStopTime) {
        // this.targetStopTime = targetStopTime;
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

            // --- Temporarily Commented Out Symbol Replacement Logic ---
            /*
            const expectedSymbolId = this.strip[targetStripIndex];
            if (symbolSprite.symbolId !== expectedSymbolId) {
                const oldSymbolY = symbolSprite.y;
                this.container.removeChild(symbolSprite);
                symbolSprite.destroy();

                const newSymbol = createSymbolGraphic(expectedSymbolId);
                if (newSymbol) {
                    this.symbols[i] = newSymbol;
                    this.container.addChildAt(newSymbol, i); // Use addChildAt for order
                    newSymbol.y = oldSymbolY;
                } else {
                    console.error(`Failed to create symbol graphic for ID: ${expectedSymbolId}`);
                }
            }
            */
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

        // --- Simplified State Machine ---
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
                this.position += maxSpinSpeed * delta;
                this.updateSpinEffects(1.0);
                needsAlign = true;
                break;

            // Keep tweeningStop commented out for now
            /*
            case 'tweeningStop':
                // GSAP handles logical position update. onUpdate sets needsAlign.
                if (!this.stopTween || !this.stopTween.isActive()) {
                     this.state = 'stopped';
                     this.position = this.finalStopPosition; // Snap logical position
                     needsAlign = true; // Align one last time
                     // reelIsActive = false; // This is handled by the state switch below
                     this.updateSpinEffects(0);
                     console.warn(`Reel ${this.reelIndex}: Stop tween inactive/failed.`);
                } else {
                    needsAlign = true; // Ensure alignment during tween
                }
                break;
            */
            case 'stopped': // Restore correct stopped/idle behavior
            case 'idle':
                reelIsActive = false; // Reel is not active
                this.updateSpinEffects(0); // Ensure effects are off
                // Do not change position or set needsAlign
                break;
        }

        // Align symbols if needed (and wrap position)
        if (needsAlign) {
             this.position = ((this.position % this.strip.length) + this.strip.length) % this.strip.length;
             this.alignReelSymbols();
        }

        return true; // Always return true to keep Game loop thinking it's active
    }
}
