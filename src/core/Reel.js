import * as PIXI from 'pixi.js';
import { SYMBOL_SIZE, SYMBOLS_PER_REEL_VISIBLE, REEL_WIDTH } from '../config/gameSettings.js';
import {
    spinAcceleration, maxSpinSpeed,
    stopTweenDuration // Import new setting
} from '../config/animationSettings.js'; // Import animation parameters
import { createSymbolGraphic } from './Symbol.js';
import { lerpAngle, easeOutQuad } from '../utils/helpers.js'; // Easing functions

export class Reel {
    constructor(reelIndex, strip, appTicker) {
        this.reelIndex = reelIndex;
        this.strip = strip;
        this.appTicker = appTicker; // Keep ticker reference if needed for 'now'

        this.container = new PIXI.Container();
        this.container.x = reelIndex * REEL_WIDTH;

        this.symbols = []; // Array of PIXI.Container symbol graphics
        this.position = Math.random() * this.strip.length; // Current position on the strip
        this.spinSpeed = 0;
        this.state = 'idle'; // idle, accelerating, spinning, tweeningStop, stopped
        this.stopIndex = 0; // Target index on the strip to stop at

        // Properties for scheduled stop tweening
        this.targetStopTime = 0; // Absolute time when the reel should finish stopping
        this.isTweeningStop = false;
        this.tweenStartTime = 0;
        this.tweenStartPosition = 0;
        this.finalStopPosition = 0; // Store the target stop index as final position

        // Blur filter
        this.blur = new PIXI.BlurFilter({ strength: 0, quality: 1, kernelSize: 5 });
        this.blur.enabled = false;
        this.container.filters = [this.blur];

        // Create initial symbols
        const numSymbolsToCreate = SYMBOLS_PER_REEL_VISIBLE + 2; // +2 for buffer top/bottom
        for (let j = 0; j < numSymbolsToCreate; j++) {
            const symbol = createSymbolGraphic(this.strip[0]); // Start with placeholder
            this.symbols.push(symbol);
            this.container.addChild(symbol);
        }
        this.alignReelSymbols(); // Position initial symbols correctly
    }

    // --- Reel State Control ---

    startSpinning(currentTurbo) {
        this.state = 'accelerating';
        this.spinSpeed = 0; // Start from 0 speed
        this.blur.enabled = true;
        this.blur.strength = 0;
        // Determine random stop index (can be overridden by server/predetermined results later)
        this.stopIndex = Math.floor(Math.random() * this.strip.length);
        this.finalStopPosition = this.stopIndex; // Store the target index
        this.isTweeningStop = false; // Reset tweening state
        this.targetStopTime = 0; // Reset target stop time
        console.log(`Reel ${this.reelIndex}: Starting spin, target stop index: ${this.stopIndex}`);
    }

    // New method to schedule the stop
    scheduleStop(targetStopTime) {
        this.targetStopTime = targetStopTime;
        // The actual transition to tweening will happen in the update loop based on time
    }

    // --- Symbol Alignment ---

    alignReelSymbols() {
        const totalStripSymbols = this.strip.length;
        const numSymbolsInDisplay = this.symbols.length; // Should be SYMBOLS_PER_REEL_VISIBLE + 2

        for (let j = 0; j < numSymbolsInDisplay; j++) {
            const symbol = this.symbols[j];
            if (!symbol) continue;

            const currentTopSymbolIndex = Math.floor(this.position) % totalStripSymbols;
            const symbolOffset = this.position - Math.floor(this.position);
            const targetStripIndex = (currentTopSymbolIndex + (j - 1) + totalStripSymbols) % totalStripSymbols;

            symbol.y = (j - 1 - symbolOffset) * SYMBOL_SIZE + SYMBOL_SIZE / 2;

            const expectedSymbolId = this.strip[targetStripIndex];
            if (!symbol.symbolId || symbol.symbolId !== expectedSymbolId) {
                const oldSymbolY = symbol.y;
                this.container.removeChild(symbol);
                symbol.destroy({ children: true });

                const newSymbol = createSymbolGraphic(expectedSymbolId);
                if (newSymbol) {
                    newSymbol.y = oldSymbolY;
                    newSymbol.scale.set(1);
                    this.symbols[j] = newSymbol;
                    this.container.addChild(newSymbol);
                }
            }
        }
    }

    // --- Update Logic (Called by Game Loop) ---

    update(delta, now) { // 'now' is the current time from the ticker (performance.now() or similar)
        let needsAlign = false;
        let reelIsActive = true; // Assume active unless stopped/idle

        // Check if it's time to start the stop tween
        if ((this.state === 'accelerating' || this.state === 'spinning') && this.targetStopTime > 0 && now >= this.targetStopTime - stopTweenDuration) {
            this.state = 'tweeningStop';
            this.isTweeningStop = true;
            this.tweenStartTime = now;
            // Ensure position is wrapped correctly before starting tween
            this.position = ((this.position % this.strip.length) + this.strip.length) % this.strip.length;
            this.tweenStartPosition = this.position;
            this.spinSpeed = 0; // Stop applying speed changes
            this.blur.strength = 0; // Start reducing blur (or turn off instantly)
            this.blur.enabled = false; // Turn off blur for stop tween
            console.log(`Reel ${this.reelIndex}: Starting stop tween at ${now.toFixed(0)}ms`);
        }

        switch (this.state) {
            case 'accelerating':
                this.spinSpeed = Math.min(maxSpinSpeed, this.spinSpeed + spinAcceleration * delta);
                this.position += this.spinSpeed * delta;
                if (this.spinSpeed >= maxSpinSpeed) {
                    this.state = 'spinning';
                    this.spinSpeed = maxSpinSpeed; // Cap speed
                }
                this.blur.strength = (this.spinSpeed / maxSpinSpeed) * 8;
                needsAlign = true;
                break;

            case 'spinning':
                // Continue spinning at max speed
                this.position += maxSpinSpeed * delta;
                this.blur.strength = 8; // Max blur
                needsAlign = true;
                break;

            case 'tweeningStop':
                if (this.isTweeningStop) {
                    const elapsed = now - this.tweenStartTime;
                    let progress = Math.min(1, elapsed / stopTweenDuration); // Clamp progress 0-1

                    // Apply easing function (e.g., easeOutQuad)
                    progress = easeOutQuad(progress);

                    // Interpolate angle correctly, handling wrap-around
                    this.position = lerpAngle(this.tweenStartPosition, this.finalStopPosition, progress, this.strip.length);
                    needsAlign = true;

                    if (progress === 1) { // Tween completed
                        this.isTweeningStop = false;
                        this.position = this.finalStopPosition; // Ensure exact final position
                        this.state = 'stopped';
                        needsAlign = true; // Final alignment
                        reelIsActive = false; // Mark as stopped
                        console.log(`Reel ${this.reelIndex}: Stopped at ${now.toFixed(0)}ms`);
                    }
                }
                break;

            // Remove old 'stopping' and 'BOUNCING' states

            case 'stopped':
            case 'idle':
                reelIsActive = false;
                // Ensure blur is off
                if (this.blur.enabled) {
                    this.blur.enabled = false;
                    this.blur.strength = 0;
                }
                break;
        } // End Switch

        // Normalize position and align symbols if needed
        if (needsAlign) {
            // Wrap position around strip length
            this.position = ((this.position % this.strip.length) + this.strip.length) % this.strip.length;
            this.alignReelSymbols();
        }

        return reelIsActive; // Return whether the reel is still considered moving/active
    }
}
