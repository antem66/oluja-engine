import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { state } from '../core/GameState.js'; // Import state for checking isInFreeSpins etc.
import * as SETTINGS from '../config/gameSettings.js';

export class FreeSpinsUIManager {
    freeSpinsIndicator = null;
    freeSpinsCountText = null;
    freeSpinsTotalWinText = null;
    freeSpinsGlow = null;
    parentLayer = null;

    constructor(parentLayer) {
        if (!parentLayer) {
            console.error("FreeSpinsUIManager: Parent layer is required!");
            return;
        }
        this.parentLayer = parentLayer;
        this._createIndicator();
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

        // Add all elements to container
        this.freeSpinsIndicator.addChild(this.freeSpinsGlow);
        this.freeSpinsIndicator.addChild(panel);
        this.freeSpinsIndicator.addChild(title);
        this.freeSpinsIndicator.addChild(this.freeSpinsCountText);
        this.freeSpinsIndicator.addChild(this.freeSpinsTotalWinText);

        // Add to the specified parent layer
        this.parentLayer.addChild(this.freeSpinsIndicator);
    }

    // Renamed from updateFreeSpinsIndicator
    update() {
        // Only log if something interesting might happen (entering/exiting FS or indicator visible)
        if (state.isInFreeSpins || this.freeSpinsIndicator?.visible) {
            // console.log(`[Trace] FreeSpinsUIManager.update called. isInFreeSpins: ${state.isInFreeSpins}, indicator visible: ${this.freeSpinsIndicator?.visible}`);
        }

        if (!this.freeSpinsIndicator || !this.freeSpinsCountText || !this.freeSpinsTotalWinText) {
            return;
        }

        // Show/hide based on free spins state
        const inFreeSpin = state.isInFreeSpins;
        if (inFreeSpin) {
            // Update text content
            this.freeSpinsCountText.text = `Remaining: ${state.freeSpinsRemaining}`;
            this.freeSpinsTotalWinText.text = `Win: €${state.totalFreeSpinsWin.toFixed(2)}`;

            // Show indicator if not already visible
            if (!this.freeSpinsIndicator.visible) {
                console.log("[Trace] FS Indicator not visible - Animating in.");
                this.freeSpinsIndicator.visible = true;
                this.freeSpinsIndicator.alpha = 0;
                this.freeSpinsIndicator.y = -50; // Start above screen
                this.freeSpinsIndicator.rotation = 0; // Ensure rotation starts at 0

                // Animate it in (Task 3.2 Enhancement)
                gsap.to(this.freeSpinsIndicator, {
                    y: 60, // Target Y position (below title)
                    alpha: 1,
                    rotation: 0.05, // Add slight rotation on entry
                    duration: 0.7, // Slightly longer duration
                    ease: "elastic.out(1, 0.8)" // More dynamic ease
                });

                // Start pulsing glow animation
                this._startGlowAnimation();
            }

            // Flash when spins count changes (using a temporary property to track last count)
            // Only flash if the count has actually changed and is defined
            // @ts-ignore - Using dynamic property
            if (this.freeSpinsIndicator._lastCount !== undefined && this.freeSpinsIndicator._lastCount !== state.freeSpinsRemaining) {
                gsap.to(this.freeSpinsCountText.scale, {
                    x: 1.2, y: 1.2,
                    duration: 0.2,
                    repeat: 1,
                    yoyo: true,
                    ease: "power1.inOut"
                });
            }

            // Store current count for comparison on next update
            // @ts-ignore - Using dynamic property
            this.freeSpinsIndicator._lastCount = state.freeSpinsRemaining;

        } else if (this.freeSpinsIndicator.visible) {
            console.log("[Trace] Not in Free Spins & FS indicator visible - Animating out.");
            // Animate it out (Task 3.2 Enhancement - return rotation to 0)
            gsap.to(this.freeSpinsIndicator, {
                y: -50,
                alpha: 0,
                rotation: 0, // Return rotation to 0 on exit
                duration: 0.5,
                ease: "back.in(1.7)",
                onComplete: () => {
                    if (this.freeSpinsIndicator) { // Check if it still exists
                        this.freeSpinsIndicator.visible = false;
                        this._stopGlowAnimation();
                        // @ts-ignore - Using dynamic property
                        delete this.freeSpinsIndicator._lastCount; // Clean up temporary property
                    }
                }
            });
        }
    }

    // Renamed from startGlowAnimation and made private
    _startGlowAnimation() {
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
}
