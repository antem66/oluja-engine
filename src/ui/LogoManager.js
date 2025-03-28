import { gsap } from 'gsap';
import { Container, Sprite, Assets } from 'pixi.js';
import { GAME_WIDTH } from '../config/gameSettings.js';

export class LogoManager {
    constructor(game) {
        this.game = game;
        this.container = new Container();
        this.container.zIndex = 5;
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
            
            if (this.game?.app?.stage) {
                this.game.app.stage.addChild(this.container);
                this.game.app.stage.sortChildren();
            } else {
                console.error('Game app stage not available');
                return;
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

        gsap.from(this.logo, {
            pixi: {
                scale: 0,
                alpha: 0,
                rotation: -0.5
            },
            duration: 1.2,
            ease: "elastic.out(1, 0.75)"
        });

        gsap.to(this.logo, {
            pixi: {
                y: "+=5"
            },
            duration: 2,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });

        gsap.to(this.logo.scale, {
            x: "*=1.05",
            y: "*=1.05",
            duration: 1.5,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });

        gsap.to(this.logo, {
            pixi: {
                rotation: 0.03
            },
            duration: 3,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });
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