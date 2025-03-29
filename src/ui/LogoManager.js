import { gsap } from 'gsap';
import { Container, Sprite, Assets } from 'pixi.js';
import { GAME_WIDTH } from '../config/gameSettings.js';
import { Game } from '../core/Game.js';
import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';

export class LogoManager {
    /** @type {Sprite | null} */
    logo = null;
    /** @type {Container | null} */
    container = null;
    /** @type {import('../core/Game.js').Game | null} */
    game = null; // Reference to the main Game instance
    /** @type {Container | null} */
    parentLayer = null;
    /** @type {import('../utils/Logger.js').Logger | null} */
    logger = null;
    /** @type {import('../utils/EventBus.js').EventBus | null} */
    eventBus = null;

    /**
     * @param {import('../core/Game.js').Game} gameInstance 
     * @param {Container} parentLayer
     * @param {import('../utils/Logger.js').Logger} loggerInstance 
     * @param {import('../utils/EventBus.js').EventBus} eventBusInstance 
     */
    constructor(gameInstance, parentLayer, loggerInstance, eventBusInstance) {
        this.game = gameInstance; // Keep game instance if needed for direct access (though eventBus is preferred)
        this.parentLayer = parentLayer;
        this.logger = loggerInstance;
        this.eventBus = eventBusInstance;

        if (!this.parentLayer) {
            this.logger?.error('LogoManager', 'Parent layer is required!');
            return; // Stop initialization if critical dependency is missing
        }
        if (!this.game) {
            this.logger?.error('LogoManager', 'Game instance is required!');
            return; 
        }
        if (!this.logger) {
             console.error("LogoManager: Logger instance is required!");
        }
        if (!this.eventBus) {
             this.logger?.warn("LogoManager", "EventBus instance was not provided.");
        }

        this.container = new Container();
        this.container.name = "LogoContainer"; // Name for debugging
        this.setup();
        this.logger?.info('LogoManager', 'Initialized.');
    }

    async setup() {
        try {
            const texture = await Assets.get('logo');
            if (!texture) {
                this.logger?.warn('LogoManager', 'Logo texture not found via alias logo, trying direct path...');
                const directTexture = await Assets.load('assets/images/ui/logo.png');
                if (!directTexture) {
                     throw new Error('Failed to load logo texture directly.');
                }
                this.logo = new Sprite(directTexture);
            } else {
                this.logo = new Sprite(texture);
            }
            
            if (!this.logo) {
                throw new Error('Failed to create logo sprite instance.');
            }
            
            this.logo.anchor.set(0.5);
            
            this.logo.x = GAME_WIDTH / 2;
            this.logo.y = 60;
            
            this.logo.scale.set(0.2);
            
            if (!this.container) {
                 throw new Error('Logo container is null during setup.');
            }
            this.container.addChild(this.logo);

            if (!this.parentLayer) {
                throw new Error('Parent layer is null during setup.');
            }
            this.parentLayer.addChild(this.container);
            
            // Log only if logo is successfully created
            this.logger?.debug('LogoManager', 'Logo sprite created and added.', {
                position: { x: this.logo.x, y: this.logo.y }, // Use this.logo
                scale: this.logo.scale.x,
                visible: this.logo.visible,
                zIndex: this.container?.zIndex ?? 'N/A' 
            });

            this.initAnimations();
            this.setupFreeSpinsHandler();
            
        } catch (error) {
            this.logger?.error('LogoManager', 'Error during logo setup:', error);
        }
    }

    initAnimations() {
        if (!this.logo) {
            this.logger?.warn('LogoManager', 'initAnimations called but logo is null.');
            return;
        }
        gsap.from(this.logo.scale, { x: 0.1, y: 0.1, duration: 1, ease: "elastic.out(1, 0.3)" });
        this.logger?.debug('LogoManager', 'Initial logo animation started.');
    }

    setupFreeSpinsHandler() {
        if (!this.logo || !this.game) return;

        this.eventBus?.on('feature:freeSpins:started', () => {
            if (!this.logo) return;
            
            this.logger?.debug('LogoManager', 'Handling freeSpins:started event');
            gsap.to(this.logo, {
                pixi: {
                    y: 60,
                    alpha: 1,
                },
                duration: 0.5,
                ease: "back.out(1.7)"
            });
        });

        this.eventBus?.on('feature:freeSpins:ended', () => {
            if (!this.logo) return;
            
            this.logger?.debug('LogoManager', 'Handling freeSpins:ended event');
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
