import * as PIXI from 'pixi.js';
import { gsap } from 'gsap'; // Import GSAP

/**
 * Creates a reusable PixiJS button component with improved visuals.
 * @param {string} text - The text label for the button (ignored if iconType is provided).
 * @param {number} x - The x-coordinate position.
 * @param {number} y - The y-coordinate position.
 * @param {function} callback - The function to call when the button is pressed.
 * @param {object} textStyleObject - PIXI.TextStyle properties (used only if no iconType).
 * @param {PIXI.Container} parentContainer - The container to add this button to. Required.
 * @param {number} [width=100] - The width of the button (used for radius if circular).
 * @param {number} [height=40] - The height of the button (used for radius if circular).
 * @param {boolean} [circular=false] - Whether the button should be circular.
 * @param {string} [iconType=undefined] - Optional: Type of icon ('spin', 'turbo', etc.).
 * @returns {Button} The Button instance.
 */
export function createButton(
  text, x, y,
  callback,
  textStyleObject, // Still needed for potential non-icon buttons
  parentContainer,
  width = 100,
  height = 40,
  circular = false,
  iconType = undefined
) {
   // Ensure callback is a function, provide a no-op default if not
   if (typeof callback !== "function") {
     console.warn("createButton: Callback provided is not a function. Using no-op.");
     callback = () => {};
   }

  // Pass iconType to the Button constructor
  const button = new Button(text, x, y, callback, textStyleObject, parentContainer, width, height, circular, iconType);

  // Add the button to the specified parent container
  if (parentContainer) {
      parentContainer.addChild(button);
  } else {
      console.warn("createButton: No parent container provided. Button not added to stage.");
  }

  return button; // Return the created button instance
}

// Load SVG assets for button icons
export async function loadButtonAssets() {
  // Define the SVG assets we need for buttons
  const buttonAssets = [
    { alias: 'btn_spin', src: 'assets/control/spin.svg' },
    { alias: 'btn_turbo', src: 'assets/control/turbo.svg' },
    { alias: 'btn_autoplay', src: 'assets/control/autoplay.svg' },
    { alias: 'btn_plus', src: 'assets/control/plus.svg' },
    { alias: 'btn_minus', src: 'assets/control/minus.svg' }
  ];
  
  try {
    await PIXI.Assets.load(buttonAssets);
    console.log("Button SVG assets loaded successfully");
    return true;
  } catch (error) {
    console.error("Failed to load button SVG assets, falling back to drawn icons:", error);
    return false;
  }
}

/**
 * Represents a custom Button class extending PIXI.Container
 */
class Button extends PIXI.Container {
    /** @type {PIXI.Text | undefined} */
    buttonLabel;
    /** @type {PIXI.Graphics | PIXI.Sprite | undefined} */
    buttonIcon;
    /** @type {PIXI.Graphics | undefined} */
    bgIdle;
    /** @type {PIXI.Graphics | undefined} */
    bgHover;
    /** @type {PIXI.Graphics | undefined} */
    bgDown;
    /** @type {PIXI.Graphics | undefined} */
    bgActive;
    /** @type {gsap.core.Tween | null} */
    currentTween = null;
    /** @type {Function | null} */
    _callback = null;
    _isCircular = false; // Store circular flag
    _width = 0;
    _height = 0;
    _iconType = ""; // Store icon type
    _isActive = false; // Track active state for toggles
    _usingSVG = false; // Whether using SVG icon

    constructor(
        text, x, y,
        callback,
        textStyleObject,
        parentContainer,
        width = 100,
        height = 40,
        circular = false,
        iconType
    ) {
        super();
        this._callback = callback;
        this._isCircular = circular; // Store flag
        this._iconType = iconType || ""; // Store icon type

        // Ensure width and height are numbers
        this._width = Number(width) || 100;
        this._height = Number(height) || 40;
        const effectiveWidth = this._isCircular ? Math.min(this._width, this._height) : this._width;
        const effectiveHeight = this._isCircular ? Math.min(this._width, this._height) : this._height;
        const radius = effectiveWidth / 2;

        this.pivot.set(effectiveWidth / 2, effectiveHeight / 2);
        this.x = x;
        this.y = y;
        /** @type {PIXI.EventMode} */
        this.eventMode = 'static'; // Explicitly set valid EventMode
        this.cursor = "pointer";

        // --- Button Shapes - Enhanced colors ---
        const idleColor = iconType === 'spin' ? 0xEA3323 : 0x555555; // Red for spin, dark gray for others
        const hoverColor = iconType === 'spin' ? 0xFF5544 : 0x777777;
        const downColor = iconType === 'spin' ? 0xCC2211 : 0x3A3A3A;
        const activeColor = 0x224488; // Blue highlight for active state

        // Create backgrounds for different states
        this.bgIdle = this._drawShape(this._width, this._height, this._isCircular, radius, idleColor, 0xaaaaaa);
        this.bgHover = this._drawShape(this._width, this._height, this._isCircular, radius, hoverColor, 0xffffff);
        this.bgDown = this._drawShape(this._width, this._height, this._isCircular, radius, downColor, 0x777777);
        this.bgActive = this._drawShape(this._width, this._height, this._isCircular, radius, activeColor, 0xffffff);

        this.bgHover.visible = false;
        this.bgDown.visible = false;
        this.bgActive.visible = false;

        this.addChild(this.bgIdle);
        this.addChild(this.bgHover);
        this.addChild(this.bgDown);
        this.addChild(this.bgActive);

        // --- Button Content (Icon or Text) ---
        if (iconType) {
            // Try to use SVG icon first, if available
            const svgTexture = PIXI.Assets.get(`btn_${iconType}`);
            if (svgTexture) {
                // Using SVG icon
                this._usingSVG = true;
                const icon = new PIXI.Sprite(svgTexture);
                icon.anchor.set(0.5);
                icon.x = effectiveWidth / 2;
                icon.y = effectiveHeight / 2;
                icon.width = effectiveWidth * 0.6;
                icon.height = effectiveHeight * 0.6;
                icon.tint = 0xFFFFFF; // Set the tint to white to match drawn icons
                this.buttonIcon = icon;
            } else {
                // Fallback to drawn icon
                this._usingSVG = false;
                this.buttonIcon = this._drawIcon(iconType, effectiveWidth, effectiveHeight, radius);
            }
            
            if (this.buttonIcon) {
                this.addChild(this.buttonIcon);
            }
        } else if (text) {
            const style = new PIXI.TextStyle(textStyleObject || {});
            const buttonText = new PIXI.Text({ text: text, style: style });
            buttonText.anchor.set(0.5);
            buttonText.x = effectiveWidth / 2;
            buttonText.y = effectiveHeight / 2;
            this.buttonLabel = buttonText;
            this.addChild(buttonText);
        }

        // Add glow effect for spin button
        if (iconType === 'spin') {
            const glow = new PIXI.Graphics()
                .circle(effectiveWidth / 2, effectiveHeight / 2, radius + 3)
                .fill({ color: 0xFFFFFF, alpha: 0 });
            this.addChildAt(glow, 0); // Add behind everything
            
            gsap.to(glow, {
                alpha: 0.3,
                duration: 1.2,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
        }

        // --- Interaction Logic ---
        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
        this._onPointerUpOutside = this._onPointerUpOutside.bind(this);
        this._onPointerOver = this._onPointerOver.bind(this);
        this._onPointerOut = this._onPointerOut.bind(this);

        this.on("pointerdown", this._onPointerDown);
        this.on("pointerup", this._onPointerUp);
        this.on("pointerupoutside", this._onPointerUpOutside);
        this.on("pointerover", this._onPointerOver);
        this.on("pointerout", this._onPointerOut);
    }

    // --- Helper methods for drawing ---

    /**
     * Draws the basic button shape
     * @param {number} width
     * @param {number} height
     * @param {boolean} circular
     * @param {number} radius
     * @param {number} fillColor
     * @param {number} strokeColor
     * @returns {PIXI.Graphics}
     */
    _drawShape(width, height, circular, radius, fillColor, strokeColor) {
        const shape = new PIXI.Graphics();
        if (circular) {
            shape
                .circle(radius, radius, radius)
                .fill({ color: fillColor })
                .stroke({ width: 2, color: strokeColor, alignment: 0.5 });
        } else {
            shape
                .roundRect(0, 0, width, height, 10)
                .fill({ color: fillColor })
                .stroke({ width: 2, color: strokeColor, alignment: 0.5 });
        }
        return shape;
    }

    /**
     * Draws the icon based on type (fallback if SVG not available)
     * @param {string} iconType
     * @param {number} width
     * @param {number} height
     * @param {number} radius - Radius of the button (or half its size)
     * @returns {PIXI.Graphics | undefined} // Return undefined on failure
     */
    _drawIcon(iconType, width, height, radius) {
        const icon = new PIXI.Graphics();
        const iconColor = 0xffffff;
        const centerX = width / 2;
        const centerY = height / 2;
        const size = Math.min(width, height) * 0.5; // Base size for icons
        const strokeWidth = Math.max(2, radius * 0.1);

        switch (iconType) {
            case 'spin':
                const iconRadius = size * 0.8;
                const arrowThickness = Math.max(2, radius * 0.15);
                icon.stroke({ width: arrowThickness, color: iconColor, cap: 'round' });
                icon.arc(centerX, centerY, iconRadius, -Math.PI * 0.1, Math.PI * 0.9);
                this._drawArrowHead(icon, centerX, centerY, iconRadius, Math.PI * 0.9, arrowThickness);
                icon.moveTo(centerX + iconRadius * Math.cos(Math.PI * 0.9), centerY + iconRadius * Math.sin(Math.PI * 0.9));
                icon.stroke({ width: arrowThickness, color: iconColor, cap: 'round' });
                icon.arc(centerX, centerY, iconRadius, Math.PI * 0.9, Math.PI * 1.9);
                this._drawArrowHead(icon, centerX, centerY, iconRadius, Math.PI * 1.9, arrowThickness);
                break;
            case 'plus':
                icon.stroke({ width: strokeWidth, color: iconColor, cap: 'round' });
                icon.moveTo(centerX - size / 2, centerY);
                icon.lineTo(centerX + size / 2, centerY);
                icon.moveTo(centerX, centerY - size / 2);
                icon.lineTo(centerX, centerY + size / 2);
                break;
            case 'minus':
                icon.stroke({ width: strokeWidth, color: iconColor, cap: 'round' });
                icon.moveTo(centerX - size / 2, centerY);
                icon.lineTo(centerX + size / 2, centerY);
                break;
            case 'autoplay':
                icon.moveTo(centerX - size / 3, centerY - size / 2);
                icon.lineTo(centerX + size / 2, centerY);
                icon.lineTo(centerX - size / 3, centerY + size / 2);
                icon.closePath();
                icon.fill({ color: iconColor });
                break;
            case 'turbo':
                icon.moveTo(centerX + size / 3, centerY - size / 2);
                icon.lineTo(centerX - size / 3, centerY + size / 10);
                icon.lineTo(centerX, centerY + size / 10);
                icon.lineTo(centerX - size / 3, centerY + size / 2);
                icon.lineTo(centerX + size / 3, centerY - size / 10);
                icon.lineTo(centerX, centerY - size / 10);
                icon.closePath();
                icon.fill({ color: iconColor });
                break;
            default:
                console.warn("ButtonFactory: Unknown iconType:", iconType);
                return undefined;
        }
        return icon;
    }

    /**
     * Helper to draw arrowhead for spin icon
     * @param {PIXI.Graphics} graphics
     * @param {number} cx
     * @param {number} cy
     * @param {number} radius
     * @param {number} angle
     * @param {number} thickness
     */
    _drawArrowHead(graphics, cx, cy, radius, angle, thickness) {
        const headLength = thickness * 1.5;
        graphics.moveTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        graphics.lineTo(cx + radius * Math.cos(angle) - headLength * Math.cos(angle + Math.PI / 6), cy + radius * Math.sin(angle) - headLength * Math.sin(angle + Math.PI / 6));
        graphics.moveTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        graphics.lineTo(cx + radius * Math.cos(angle) - headLength * Math.cos(angle - Math.PI / 6), cy + radius * Math.sin(angle) - headLength * Math.sin(angle - Math.PI / 6));
    }

    // --- Interaction Logic with GSAP ---
    /** @param {object} targetProps */
    _animate(targetProps) {
        // Check if tween exists and is active before killing
        if (this.currentTween && this.currentTween.isActive()) {
            this.currentTween.kill();
        }
        this.currentTween = gsap.to(this.scale, { ...targetProps, duration: 0.1, ease: 'power1.out' });
    }

    /** @param {PIXI.FederatedPointerEvent} event */
    _onPointerDown(event) {
        if (this.alpha < 0.6) return; // Basic enabled check
        
        // If it's a toggle button and already active, don't show 'down' state
        if (this._isActive && (this._iconType === 'turbo' || this._iconType === 'autoplay')) {
            return;
        }
        
        if (this.bgDown) this.bgDown.visible = true;
        if (this.bgIdle) this.bgIdle.visible = false;
        if (this.bgHover) this.bgHover.visible = false;
        if (this.bgActive) this.bgActive.visible = false;
        this._animate({ x: 0.95, y: 0.95 });
    }

    /** @param {PIXI.FederatedPointerEvent} event */
    _onPointerUp(event) {
        if (this.alpha < 0.6) return;
        
        // Call the callback first before changing visual state
        if (typeof this._callback === 'function') {
            this._callback();
        }
        
        // Add spin animation specifically for the spin button
        if (this._iconType === 'spin') {
            // Kill any previous rotation animation
            gsap.killTweensOf(this);
            gsap.killTweensOf(this.scale);
            
            // Also kill any tweens on the button icon
            if (this.buttonIcon) {
                gsap.killTweensOf(this.buttonIcon);
            }
            
            // Create a sequence of animations for a more elaborate effect
            const tl = gsap.timeline();
            
            // Initial quick compression
            tl.to(this.scale, {
                x: 0.9, 
                y: 0.9, 
                duration: 0.15,
                ease: "power1.in"
            });
            
            // Spin with slight expansion
            tl.to(this, {
                rotation: Math.PI * 2, // Full 360-degree rotation
                duration: 0.8,
                ease: "power2.inOut"
            }, 0.1);
            
            // Add a flash effect to the icon
            if (this.buttonIcon) {
                // Flash icon bright white (or orange for SVGs)
                const flashColor = this._usingSVG ? 0xFF7700 : 0xFFFFFF;
                const originalTint = this._usingSVG ? 0xFFFFFF : 0xFFFFFF;
                
                tl.to(this.buttonIcon, {
                    tint: flashColor,
                    alpha: 1.5, // Slight overbright
                    duration: 0.2,
                    ease: "sine.in"
                }, 0.2);
                
                // Return to normal
                tl.to(this.buttonIcon, {
                    tint: originalTint,
                    alpha: 1.0,
                    duration: 0.3,
                    ease: "power1.out"
                }, 0.4);
            }
            
            // Expansion with bounce
            tl.to(this.scale, {
                x: 1.1, 
                y: 1.1, 
                duration: 0.3,
                ease: "power2.out"
            }, 0.5);
            
            // Return to normal
            tl.to(this.scale, {
                x: 1.0, 
                y: 1.0, 
                duration: 0.3,
                ease: "elastic.out(1.2, 0.5)"
            }, 0.8);
            
            // Reset rotation when complete
            tl.call(() => {
                this.rotation = 0;
            });
        }
        
        // Reset states - active state will be set by UIManager when state changes
        if (this.bgDown) this.bgDown.visible = false;
        
        // Calculate if pointer is still over the button
        const globalPoint = event.global;
        let isOver = false;
        if (globalPoint) {
            const bounds = this.getBounds();
            isOver = globalPoint.x >= bounds.x && globalPoint.x <= bounds.x + bounds.width &&
                     globalPoint.y >= bounds.y && globalPoint.y <= bounds.y + bounds.height;
        }
        
        // Default to hover or idle state, let UIManager handle active state
        if (this.bgHover) this.bgHover.visible = isOver && !this._isActive;
        if (this.bgIdle) this.bgIdle.visible = !isOver && !this._isActive;
        if (this.bgActive) this.bgActive.visible = this._isActive;
        
        this._animate({ x: isOver ? 1.05 : 1.0, y: isOver ? 1.05 : 1.0 });
    }

    /** @param {PIXI.FederatedPointerEvent} event */
     _onPointerUpOutside(event) {
        if (this.alpha < 0.6) return;
        if (this.bgDown) this.bgDown.visible = false;
        if (this.bgHover) this.bgHover.visible = false;
        
        // If active, show active state, otherwise show idle
        if (this._isActive) {
            if (this.bgActive) this.bgActive.visible = true;
            if (this.bgIdle) this.bgIdle.visible = false;
        } else {
            if (this.bgActive) this.bgActive.visible = false;
            if (this.bgIdle) this.bgIdle.visible = true;
        }
        
        this._animate({ x: 1.0, y: 1.0 });
    }

    /** @param {PIXI.FederatedPointerEvent} event */
    _onPointerOver(event) {
        if (this.alpha < 0.6) return;
        
        // If active, keep showing active state
        if (this._isActive) {
            return;
        }
        
        // Otherwise show hover state
        if (this.bgHover) this.bgHover.visible = true;
        if (this.bgIdle) this.bgIdle.visible = false;
        if (this.bgDown) this.bgDown.visible = false;
        
        this._animate({ x: 1.05, y: 1.05 });
    }

    /** @param {PIXI.FederatedPointerEvent} event */
    _onPointerOut(event) {
        if (this.alpha < 0.6) return;
        
        // If active, continue showing active state
        if (this._isActive) {
            return;
        }
        
        // If currently showing down state, keep that until pointer up/outside
        if (this.bgDown && this.bgDown.visible) {
            return;
        }
        
        // Reset to idle state
        if (this.bgHover) this.bgHover.visible = false;
        if (this.bgIdle) this.bgIdle.visible = true;
        
        this._animate({ x: 1.0, y: 1.0 });
    }

    /**
     * Set active state for buttons like turbo/autoplay
     * @param {boolean} isActive Whether the button should show active state
     */
    setActiveState(isActive) {
        this._isActive = isActive;
        
        // Update visuals
        if (this._isActive) {
            if (this.bgActive) this.bgActive.visible = true;
            if (this.bgIdle) this.bgIdle.visible = false;
            if (this.bgHover) this.bgHover.visible = false;
            if (this.bgDown) this.bgDown.visible = false;
        } else {
            if (this.bgActive) this.bgActive.visible = false;
            if (this.bgIdle) this.bgIdle.visible = true;
            if (this.bgHover) this.bgHover.visible = false;
            if (this.bgDown) this.bgDown.visible = false;
        }
    }

    /**
     * Method to update icon type (needed for autoplay toggle between play/stop)
     * @param {string} newIconType
     */
    updateIcon(newIconType) {
        if (this._iconType === newIconType) return; // No change needed
        
        this._iconType = newIconType;
        
        // Remove existing icon
        if (this.buttonIcon) {
            this.removeChild(this.buttonIcon);
            this.buttonIcon.destroy();
            this.buttonIcon = undefined;
        }

        // Get dimensions for new icon
        const effectiveWidth = this._isCircular ? Math.min(this._width, this._height) : this._width;
        const effectiveHeight = this._isCircular ? Math.min(this._width, this._height) : this._height;
        const radius = effectiveWidth / 2;

        // Try SVG first if we were using it before
        if (this._usingSVG) {
            const svgTexture = PIXI.Assets.get(`btn_${newIconType}`);
            if (svgTexture) {
                const icon = new PIXI.Sprite(svgTexture);
                icon.anchor.set(0.5);
                icon.x = effectiveWidth / 2;
                icon.y = effectiveHeight / 2;
                icon.width = effectiveWidth * 0.6;
                icon.height = effectiveHeight * 0.6;
                icon.tint = 0xFFFFFF; // Set the tint to white
                this.buttonIcon = icon;
                this.addChild(icon);
                return;
            }
        }
        
        // Fallback to drawn icon
        this.buttonIcon = this._drawIcon(newIconType, effectiveWidth, effectiveHeight, radius);
        if (this.buttonIcon) {
            this.addChild(this.buttonIcon);
        }
    }
}
