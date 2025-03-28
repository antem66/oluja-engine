import { gsap } from 'gsap';
import { Container, Sprite, Assets } from 'pixi.js';
import { GAME_WIDTH } from '../config/gameSettings.js';

export class LogoManager {
    // Modified constructor to accept parentLayer
    constructor(game, parentLayer) {
        this.game = game;
        this.parentLayer = parentLayer; // Store the parent layer
        this.container = new Container();
        // Removed: this.container.zIndex = 5;
        this.logo = null;
        this.setup();
    }

    async setup() {
        try {
            const texture = await Assets.get('logo');
            if (!texture) {
                console.error('Logo texture not found, trying to load it directly');
                const directTexture = await Assets.load('assets/images/ui/logo.png');
                this.logo = new Sprite(directTexture);
            } else {
                this.logo = new Sprite(texture);
            }
            
            if (!this.logo) {
                console.error('Failed to create logo sprite');
                return;
            }
            
            this.logo.anchor.set(0.5);
            
            this.logo.x = GAME_WIDTH / 2;
            this.logo.y = 60;
            
            this.logo.scale.set(0.2);
            
            this.container.addChild(this.logo);

            // Add container to the provided parent layer instead of the stage
            if (this.parentLayer) {
                this.parentLayer.addChild(this.container);
                // Removed: this.game.app.stage.sortChildren();
            } else {
                console.error('LogoManager: Parent layer not provided');
                // Fallback or error handling if needed, e.g., add to stage directly?
                // For now, just log the error.
            }

            this.initAnimations();
            this.setupFreeSpinsHandler();
            
            console.log('Logo loaded and added to stage', {
                position: { x: this.logo.x, y: this.logo.y },
                scale: this.logo.scale,
                visible: this.logo.visible,
                zIndex: this.container.zIndex
            });
        } catch (error) {
            console.error('Error loading logo:', error);
        }
    }

    initAnimations() {
        if (!this.logo) return;

        // Kill existing tweens just in case
        gsap.killTweensOf(this.logo);
        gsap.killTweensOf(this.logo.scale);

        // Initial entrance animation
        gsap.from(this.logo, {
            pixi: {
                scale: 0,
                alpha: 0,
                rotation: -0.5
            },
            duration: 1.2,
            ease: "elastic.out(1, 0.75)",
            delay: 0.2 // Small delay after setup
        });

        // Task 3.4: Combined Idle Animation Timeline
        const idleTimeline = gsap.timeline({ repeat: -1, yoyo: true });

        idleTimeline
            .to(this.logo, { // Bobbing up/down
                pixi: { y: "+=4" }, // Slightly less bob
                duration: 2.5, // Slower bob
                ease: "sine.inOut"
            }, 0) // Start at time 0
            .to(this.logo.scale, { // Subtle scale pulse
                x: "*=1.03", // Less intense pulse
                y: "*=1.03",
                duration: 2.5, // Match bob duration
                ease: "sine.inOut"
            }, 0) // Start at time 0, runs concurrently with bob
            .to(this.logo, { // Gentle rotation wobble
                pixi: { rotation: 0.02 }, // Less rotation
                duration: 3.5, // Slower wobble
                ease: "sine.inOut"
            }, 0.5); // Start slightly after bob/scale starts
    }

    setupFreeSpinsHandler() {
        if (!this.logo || !this.game) return;

        this.game.on('freeSpinsStarted', () => {
            if (!this.logo) return;
            
            gsap.to(this.logo, {
                pixi: {
                    y: 60,
                    alpha: 1,
                },
                duration: 0.5,
                ease: "back.out(1.7)"
            });
        });

        this.game.on('freeSpinsEnded', () => {
            if (!this.logo) return;
            
            gsap.to(this.logo, {
                pixi: {
                    y: 60,
                    alpha: 1,
                    scale: 0.2
                },
                duration: 0.8,
                ease: "back.out(1.7)"
            });
        });
    }

    resize() {
        if (!this.logo) return;
        this.logo.x = GAME_WIDTH / 2;
        const scale = Math.min(GAME_WIDTH / 1920, 1) * 0.2;
        this.logo.scale.set(scale);
    }
}
