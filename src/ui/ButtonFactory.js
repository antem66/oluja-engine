import * as PIXI from 'pixi.js';
import { gsap } from 'gsap'; // Import GSAP

/**
 * Creates a reusable PixiJS button component drawn with Graphics.
 * @param {string} text - The text label for the button (ignored if iconType is provided).
 * @param {number} x - The x-coordinate position.
 * @param {number} y - The y-coordinate position.
 * @param {function} callback - The function to call when the button is pressed.
 * @param {object} textStyleObject - PIXI.TextStyle properties (used only if no iconType).
 * @param {PIXI.Container} parentContainer - The container to add this button to. Required.
 * @param {number} [width=100] - The width of the button (used for radius if circular).
 * @param {number} [height=40] - The height of the button (used for radius if circular).
 * @param {boolean} [circular=false] - Whether the button should be circular.
 * @param {string} [iconType=undefined] - Optional: Type of icon to draw ('spin', etc.). If provided, text is ignored.
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
  iconType = undefined // Default to undefined
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


/**
 * Represents a custom Button class extending PIXI.Container
 */
class Button extends PIXI.Container {
    /** @type {PIXI.Text | undefined} */
    buttonLabel;
    /** @type {PIXI.Graphics | undefined} */
    buttonIcon;
    /** @type {PIXI.Graphics | undefined} */
    bgIdle;
    /** @type {PIXI.Graphics | undefined} */
    bgHover;
    /** @type {PIXI.Graphics | undefined} */
    bgDown;
    /** @type {gsap.core.Tween | null} */
    currentTween = null;
    /** @type {Function | null} */
    _callback = null;
    _isCircular = false; // Store circular flag
    _width = 0;
    _height = 0;

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

        // --- Button Shapes ---
        this.bgIdle = this._drawShape(this._width, this._height, this._isCircular, radius, 0x555555, 0xaaaaaa);
        this.bgHover = this._drawShape(this._width, this._height, this._isCircular, radius, 0x777777, 0xcccccc);
        this.bgDown = this._drawShape(this._width, this._height, this._isCircular, radius, 0x333333, 0x888888);

        if (this.bgHover) this.bgHover.visible = false;
        if (this.bgDown) this.bgDown.visible = false;

        if (this.bgIdle) this.addChild(this.bgIdle);
        if (this.bgHover) this.addChild(this.bgHover);
        if (this.bgDown) this.addChild(this.bgDown);


        // --- Button Content (Icon or Text) ---
        if (iconType) {
            this.buttonIcon = this._drawIcon(iconType, effectiveWidth, effectiveHeight, radius);
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
     * Draws the icon based on type
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
                // Apply stroke style directly in the drawing commands
                icon.stroke({ width: arrowThickness, color: iconColor, cap: 'round' });
                icon.arc(centerX, centerY, iconRadius, -Math.PI * 0.1, Math.PI * 0.9);
                this._drawArrowHead(icon, centerX, centerY, iconRadius, Math.PI * 0.9, arrowThickness);
                // Need to begin new path for the second arc's stroke
                icon.moveTo(centerX + iconRadius * Math.cos(Math.PI * 0.9), centerY + iconRadius * Math.sin(Math.PI * 0.9)); // Move to end of first arc
                icon.stroke({ width: arrowThickness, color: iconColor, cap: 'round' }); // Re-apply stroke for next segment
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
            case 'autoplay_play': // ▶ Triangle
                icon.moveTo(centerX - size / 3, centerY - size / 2);
                icon.lineTo(centerX + size / 2, centerY);
                icon.lineTo(centerX - size / 3, centerY + size / 2);
                icon.closePath();
                icon.fill({ color: iconColor });
                break;
            case 'autoplay_stop': // ■ Square
                icon.rect(centerX - size / 2.5, centerY - size / 2.5, size / 1.25, size / 1.25).fill({ color: iconColor });
                break;
            case 'turbo': // ⚡ Lightning Bolt
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
        // Draw line segments for the arrowhead
        // Need to ensure the current path is setup correctly before drawing lines
        graphics.moveTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        graphics.lineTo(cx + radius * Math.cos(angle) - headLength * Math.cos(angle + Math.PI / 6), cy + radius * Math.sin(angle) - headLength * Math.sin(angle + Math.PI / 6));
        graphics.moveTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)); // Re-move to the point for the second line segment
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
        if (this.bgDown) this.bgDown.visible = true;
        if (this.bgIdle) this.bgIdle.visible = false;
        if (this.bgHover) this.bgHover.visible = false;
        this._animate({ x: 0.95, y: 0.95 });
        if (typeof this._callback === 'function') {
            this._callback();
        }
    }

    /** @param {PIXI.FederatedPointerEvent} event */
    _onPointerUp(event) {
        if (this.alpha < 0.6) return;
        if (this.bgDown) this.bgDown.visible = false;
        // Check event.global exists and if it's within the button's bounds
        const globalPoint = event.global;
        let isOver = false;
        if (globalPoint) {
            const bounds = this.getBounds(); // Get bounds relative to the world stage
            isOver = globalPoint.x >= bounds.x && globalPoint.x <= bounds.x + bounds.width &&
                     globalPoint.y >= bounds.y && globalPoint.y <= bounds.y + bounds.height;
        }
        if (this.bgHover) this.bgHover.visible = isOver;
        if (this.bgIdle) this.bgIdle.visible = !isOver;
        this._animate({ x: isOver ? 1.05 : 1.0, y: isOver ? 1.05 : 1.0 });
    }

    /** @param {PIXI.FederatedPointerEvent} event */
     _onPointerUpOutside(event) {
        if (this.alpha < 0.6) return;
        if (this.bgDown) this.bgDown.visible = false;
        if (this.bgHover) this.bgHover.visible = false;
        if (this.bgIdle) this.bgIdle.visible = true;
        this._animate({ x: 1.0, y: 1.0 });
    }

    /** @param {PIXI.FederatedPointerEvent} event */
    _onPointerOver(event) {
        // Check bgDown visibility safely
        if (this.alpha < 0.6 || (this.bgDown && this.bgDown.visible)) return;
        if (this.bgHover) this.bgHover.visible = true;
        if (this.bgIdle) this.bgIdle.visible = false;
        this._animate({ x: 1.05, y: 1.05 });
    }

    /** @param {PIXI.FederatedPointerEvent} event */
    _onPointerOut(event) {
        // Check bgDown visibility safely
        if (this.alpha < 0.6 || (this.bgDown && this.bgDown.visible)) return;
        if (this.bgHover) this.bgHover.visible = false;
        if (this.bgIdle) this.bgIdle.visible = true;
        this._animate({ x: 1.0, y: 1.0 });
    }

    /**
     * Method to update icon (needed for autoplay)
     * @param {string} newIconType
     */
    updateIcon(newIconType) {
        if (this.buttonIcon) {
            this.removeChild(this.buttonIcon);
            this.buttonIcon.destroy();
            this.buttonIcon = undefined;
        }

        // Use stored dimensions and circular flag
        const effectiveWidth = this._isCircular ? Math.min(this._width, this._height) : this._width;
        const effectiveHeight = this._isCircular ? Math.min(this._width, this._height) : this._height;
        const radius = effectiveWidth / 2;

        this.buttonIcon = this._drawIcon(newIconType, effectiveWidth, effectiveHeight, radius);
        if (this.buttonIcon) {
            this.addChild(this.buttonIcon);
        }
    }
}
