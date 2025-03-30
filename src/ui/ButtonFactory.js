import * as PIXI from 'pixi.js';
import { gsap } from 'gsap'; // Import GSAP

// Define button textures map (will be populated during init)
let buttonTextures = {};

/**
 * Initializes button textures
 * @param {Object} resources - The PIXI resources
 */
export function initButtonTextures(resources) {
    buttonTextures = {
        'spin': resources['spin.svg'].texture,
        'stop': resources['stop.svg'].texture,
        'plus': resources['plus.svg'].texture,
        'minus': resources['minus.svg'].texture,
        'turbo': resources['turbo.svg'].texture,
        'autoplay': resources['autoplay.svg'].texture,
        'paytable': resources['paytable.svg'].texture,
        'settings': resources['settings.svg'].texture,
        'money': resources['money.svg'].texture,
        // Add more button textures as needed
    };

    // Check that we got all the textures
    for (const key in buttonTextures) {
        if (!buttonTextures[key]) {
            console.error(`ButtonFactory: Missing texture for ${key}`);
        }
    }
    
    console.log("ButtonFactory: Button textures initialized");
}

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
    { alias: 'btn_stop', src: 'assets/control/stop.svg' }, // Add stop icon for autoplay toggling
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
    bgGraphics; // Combined graphics for background and border
    /** @type {gsap.core.Tween | null} */
    currentTween = null;
    /** @type {Function | null} */
    _callback = null;
    _isCircular = false;
    _width = 0;
    _height = 0;
    _iconType = "";
    _isActive = false;
    _usingSVG = false;

    // Store graphic states for efficient updates
    _state = 'idle'; // 'idle', 'hover', 'down', 'active'
    _colors = {
        idle: { bg: 0x000000, border: 0xFFFFFF, alpha: 0.7 },
        hover: { bg: 0x000000, border: 0xAAAAAA, alpha: 0.8 },
        down: { bg: 0x000000, border: 0xFFFFFF, alpha: 0.9 },
        active: { bg: 0x111133, border: 0x8888FF, alpha: 0.75 } // Example active state
    };
    _radius = 0;
    _borderThickness = 2.5;
    _borderOffset = 6; // Pixels between border and edge

    constructor(
        text, x, y,
        callback,
        textStyleObject, // Keep for potential future text buttons
        parentContainer,
        width = 100,
        height = 40,
        circular = false,
        iconType
    ) {
        super();
        this._callback = callback;
        this._isCircular = circular;
        this._iconType = iconType || "";
        this._width = Number(width) || 100;
        this._height = Number(height) || 40;
        
        // Use the smaller dimension for circle radius
        this._radius = Math.min(this._width, this._height) / 2;
        const actualSize = this._radius * 2;

        // Set position based on top-left, not center pivot
        this.x = x;
        this.y = y;
        
        /** @type {PIXI.EventMode} */
        this.eventMode = 'static';
        this.cursor = "pointer";

        // --- Button Graphics ---
        this.bgGraphics = new PIXI.Graphics();
        this.addChild(this.bgGraphics);
        this._updateGraphics(); // Initial draw

        // --- Button Content (Icon) ---
        if (iconType) {
            const svgTexture = PIXI.Assets.get(`btn_${iconType}`);
            if (svgTexture) {
                this._usingSVG = true;
                const icon = new PIXI.Sprite(svgTexture);
                icon.anchor.set(0.5);
                // Position icon in the center of the button
                icon.x = this._radius; 
                icon.y = this._radius;
                
                // Apply different scale factors based on icon type
                let iconScale = 0.5; // Default smaller scale (was 0.6)
                
                // Custom scaling for specific icons
                if (iconType === 'autoplay' || iconType === 'turbo') {
                    iconScale = 0.45; // Even smaller for these buttons
                } else if (iconType === 'plus' || iconType === 'minus') {
                    iconScale = 0.4; // Smallest for plus/minus
                } else if (iconType === 'spin') {
                    iconScale = 0.55; // Slightly larger for spin
                }
                
                // Scale icon appropriately within the button
                icon.width = actualSize * iconScale;
                icon.height = actualSize * iconScale;
                icon.tint = 0xFFFFFF; // White icon
                this.buttonIcon = icon;
                this.addChild(icon);
            } else {
                console.warn(`ButtonFactory: SVG asset btn_${iconType} not found. Button will lack icon.`);
                this._usingSVG = false;
                // Optionally draw a fallback placeholder
            }
        } else if (text) {
             // Fallback for text buttons (though not used in current UI)
             const style = new PIXI.TextStyle(textStyleObject || {});
             const buttonText = new PIXI.Text({ text: text, style: style });
             buttonText.anchor.set(0.5);
             buttonText.x = this._radius;
             buttonText.y = this._radius;
             this.buttonLabel = buttonText;
             this.addChild(buttonText);
        }

        // --- Define Hit Area --- 
        if (this._isCircular) {
            this.hitArea = new PIXI.Circle(this._radius, this._radius, this._radius);
        } else {
            // Keep rectangular hitArea if needed in future
            this.hitArea = new PIXI.Rectangle(0, 0, this._width, this._height);
        }

        // --- Interaction Logic ---
        // Binding remains the same
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

    // --- Update Graphics based on state ---
    _updateGraphics() {
        if (!this.bgGraphics) return;

        const stateColors = this._isActive ? this._colors.active : this._colors[this._state];
        const bgColor = stateColors.bg;
        const borderColor = stateColors.border;
        const bgAlpha = stateColors.alpha;

        this.bgGraphics.clear();

        // Draw outer background circle
        this.bgGraphics
            .circle(this._radius, this._radius, this._radius)
            .fill({ color: bgColor, alpha: bgAlpha });

        // Draw inset border circle
        if (this._borderThickness > 0 && this._borderOffset > 0) {
            this.bgGraphics
                .circle(this._radius, this._radius, this._radius - this._borderOffset)
                .stroke({ 
                    width: this._borderThickness, 
                    color: borderColor, 
                    alignment: 0.5 // Center align stroke
                }); 
        }
    }

    // --- Helper methods for drawing (Keep _drawArrowHead if used by fallback icons) ---
    // Remove _drawShape and _drawIcon as graphics are now consolidated

    // --- Animation Logic (Keep if needed) ---
    _animate(targetProps) {
        if (this.currentTween) {
            this.currentTween.kill();
        }
        this.currentTween = gsap.to(this, { ...targetProps, duration: 0.15, ease: "sine.out" });
    }

    // --- Interaction Handlers --- 
    _onPointerDown(event) {
        if (!this.interactive) return;
        this._state = 'down';
        this._updateGraphics();
        // Optional: Animate scale down
        // this._animate({ scaleX: 0.95, scaleY: 0.95 }); 
    }

    _onPointerUp(event) {
        if (!this.interactive) return;
        const previousState = this._state;
        this._state = this._isActive ? 'active' : 'hover'; // Go to hover or active after click up
        this._updateGraphics();
        // Optional: Animate scale back
        // this._animate({ scaleX: 1.0, scaleY: 1.0 });

        // Execute callback only if pointer was released *inside* after being pressed down *inside*
        if (previousState === 'down') {
            // Add a small delay to allow visual feedback before action
            setTimeout(() => {
                 if (this._callback) {
                    try {
                        this._callback();
                    } catch (e) {
                        console.error("Error executing button callback:", e);
                    }
                 }
            }, 50); // 50ms delay
        }
    }

    _onPointerUpOutside(event) {
        if (!this.interactive) return;
        this._state = this._isActive ? 'active' : 'idle'; // Return to idle or active state
        this._updateGraphics();
        // Optional: Animate scale back if scale down was used
        // this._animate({ scaleX: 1.0, scaleY: 1.0 });
    }

    _onPointerOver(event) {
        if (!this.interactive) return;
        // Only change to hover if not already pressed down
        if (this._state !== 'down') { 
            this._state = this._isActive ? 'active' : 'hover'; // Go to hover or active
            this._updateGraphics();
             // Optional: Subtle scale up on hover
            // this._animate({ scaleX: 1.02, scaleY: 1.02 });
        }
    }

    _onPointerOut(event) {
        if (!this.interactive) return;
        // Return to idle or active state unless pressed down
        if (this._state !== 'down') { 
            this._state = this._isActive ? 'active' : 'idle';
            this._updateGraphics();
            // Optional: Animate scale back
            // this._animate({ scaleX: 1.0, scaleY: 1.0 });
        }
    }

    // Method to toggle active state (e.g., for Turbo/Autoplay)
    setActiveState(isActive) {
        if (!this.bgGraphics) return; // Safety check
        
        // If the active state isn't changing, no need to update
        if (this._isActive === isActive) return;
        
        this._isActive = isActive;
        
        // Determine the correct visual state based on whether it's currently hovered/down or just idle
        if (this._state === 'hover' || this._state === 'down') {
            this._state = this._isActive ? 'active' : 'hover'; // Stay hover if deactivated while hovering
        } else {
            this._state = this._isActive ? 'active' : 'idle';
        }
        
        // Force immediate visual update
        this._updateGraphics();
    }

    // Optional: Method to update icon dynamically if needed later
    updateIcon(newIconType) {
        if (this.buttonIcon && this._usingSVG && this.buttonIcon instanceof PIXI.Sprite) {
             const svgTexture = PIXI.Assets.get(`btn_${newIconType}`);
             if (svgTexture) {
                 this.buttonIcon.texture = svgTexture;
                 this._iconType = newIconType;
                 // Ensure tint is still white
                 this.buttonIcon.tint = 0xFFFFFF;
             } else {
                 console.warn(`updateIcon: SVG asset btn_${newIconType} not found.`);
             }
        }
        // Add fallback logic here if needed for drawn icons
    }
}
