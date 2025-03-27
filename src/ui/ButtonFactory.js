import * as PIXI from 'pixi.js';
// Removed EventMode type import

/**
 * Creates a reusable PixiJS button component.
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
  // Note: Type error on addChild might persist if Button's eventMode type isn't perfectly aligned,
  // but the code should function correctly at runtime.
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
    buttonLabel; // Reference to the PIXI.Text label
    buttonIcon;  // Reference to the PIXI.Graphics icon
    bgIdle;      // Reference to idle background PIXI.Graphics
    bgHover;     // Reference to hover background PIXI.Graphics
    bgDown;      // Reference to down background PIXI.Graphics
    eventMode; // Declare without initializing

    constructor(
        text, x, y,
        callback,
        textStyleObject,
        parentContainer,
        width = 100,
        height = 40,
        circular = false,
        iconType // Remove default from constructor signature
    ) {
        super(); // Call PIXI.Container constructor

        // Ensure width and height are numbers
        width = Number(width) || 100;
        height = Number(height) || 40;
        // For circular buttons, use the smaller dimension to determine radius
        // For non-circular, use width/height as before
        const effectiveWidth = circular ? Math.min(width, height) : width;
        const effectiveHeight = circular ? Math.min(width, height) : height;
        const radius = effectiveWidth / 2; // Radius for circle or corner radius for rect

        // Set pivot to the center of the effective area
        this.pivot.set(effectiveWidth / 2, effectiveHeight / 2);
        this.x = x;
        this.y = y;
        this.eventMode = 'static'; // Initialize here
        this.cursor = "pointer";

        // --- Button Shapes ---
        const shape = new PIXI.Graphics();

        // Helper to draw the button shape
        const drawShape = (graphics, color, strokeColor) => {
            graphics.clear();
            if (circular) {
                graphics
                    .circle(radius, radius, radius) // Draw circle centered
                    .fill({ color: color })
                    .stroke({ width: 2, color: strokeColor, alignment: 0.5 });
            } else {
                // Keep rounded rect for non-circular buttons
                graphics
                    .roundRect(0, 0, width, height, 10) // Use fixed radius for consistency
                    .fill({ color: color })
                    .stroke({ width: 2, color: strokeColor, alignment: 0.5 });
            }
        };

        // Idle state background
        const bgIdle = shape.clone();
        drawShape(bgIdle, 0x555555, 0xaaaaaa);

        // Hover state background
        const bgHover = shape.clone();
        drawShape(bgHover, 0x777777, 0xcccccc);
        bgHover.visible = false;

        // Down state background
        const bgDown = shape.clone();
        drawShape(bgDown, 0x333333, 0x888888);
        bgDown.visible = false;

        // Add backgrounds first
        this.addChild(bgIdle, bgHover, bgDown);

        // --- Button Content (Icon or Text) ---
        if (iconType === 'spin') {
            const icon = new PIXI.Graphics();
            const iconRadius = radius * 0.6; // Make icon smaller than button
            const arrowThickness = radius * 0.15;
            const arrowColor = 0xffffff;

            // Draw two arcs for the spin icon
            icon.stroke({ width: arrowThickness, color: arrowColor, cap: 'round' }); // Use string 'round' for cap
            // Arc 1 (top-right to bottom-left) - Adjust angles for better appearance
            icon.arc(radius, radius, iconRadius, -Math.PI * 0.1, Math.PI * 0.9);
            // Draw arrowhead 1
            const angle1 = Math.PI * 0.9;
            const headLength = arrowThickness * 1.5;
            icon.moveTo(radius + iconRadius * Math.cos(angle1), radius + iconRadius * Math.sin(angle1));
            icon.lineTo(radius + iconRadius * Math.cos(angle1) - headLength * Math.cos(angle1 + Math.PI / 6), radius + iconRadius * Math.sin(angle1) - headLength * Math.sin(angle1 + Math.PI / 6));
            icon.moveTo(radius + iconRadius * Math.cos(angle1), radius + iconRadius * Math.sin(angle1));
            icon.lineTo(radius + iconRadius * Math.cos(angle1) - headLength * Math.cos(angle1 - Math.PI / 6), radius + iconRadius * Math.sin(angle1) - headLength * Math.sin(angle1 - Math.PI / 6));

            // Arc 2 (bottom-left to top-right) - Adjust angles
            icon.arc(radius, radius, iconRadius, Math.PI * 0.9, Math.PI * 1.9);
            // Draw arrowhead 2
            const angle2 = Math.PI * 1.9;
            icon.moveTo(radius + iconRadius * Math.cos(angle2), radius + iconRadius * Math.sin(angle2));
            icon.lineTo(radius + iconRadius * Math.cos(angle2) - headLength * Math.cos(angle2 + Math.PI / 6), radius + iconRadius * Math.sin(angle2) - headLength * Math.sin(angle2 + Math.PI / 6));
            icon.moveTo(radius + iconRadius * Math.cos(angle2), radius + iconRadius * Math.sin(angle2));
            icon.lineTo(radius + iconRadius * Math.cos(angle2) - headLength * Math.cos(angle2 - Math.PI / 6), radius + iconRadius * Math.sin(angle2) - headLength * Math.sin(angle2 - Math.PI / 6));

            this.buttonIcon = icon;
            this.addChild(icon);

        } else if (text) { // Only add text if no icon and text is provided
            const buttonText = new PIXI.Text({
                text: text,
                style: textStyleObject,
            });
            buttonText.anchor.set(0.5);
            buttonText.x = effectiveWidth / 2; // Center in the effective area
            buttonText.y = effectiveHeight / 2;
            this.buttonLabel = buttonText;
            this.addChild(buttonText);
        }

        // Store references to background states
        this.bgIdle = bgIdle;
        this.bgHover = bgHover;
        this.bgDown = bgDown;

        // --- Interaction Logic (Simplified - needs refinement for hover state after pointerup) ---
        this.on("pointerdown", () => {
            if (this.eventMode !== 'none') {
                 this.bgDown.visible = true;
                 this.bgIdle.visible = false;
                 this.bgHover.visible = false;
                 callback(); // Execute the provided callback
             }
         });

        this.on("pointerup", () => {
            if (this.eventMode !== 'none') {
                 this.bgDown.visible = false;
                 // TODO: Check if pointer is still over the button to show hover, otherwise show idle
                 // This requires access to the interaction manager or global pointer position,
                 // which is more complex. For now, just revert to idle.
                 this.bgIdle.visible = true;
                 this.bgHover.visible = false;
             }
         });

        this.on("pointerupoutside", () => {
            if (this.eventMode !== 'none') {
                 this.bgDown.visible = false;
                 this.bgIdle.visible = true;
                 this.bgHover.visible = false;
             }
         });

        this.on("pointerover", () => {
            if (this.eventMode !== 'none' && !this.bgDown.visible) {
                 this.bgHover.visible = true;
                 this.bgIdle.visible = false;
             }
         });

        this.on("pointerout", () => {
            // Only switch to idle if not currently in the down state
            if (this.eventMode !== 'none' && !this.bgDown.visible) {
                 this.bgHover.visible = false;
                 this.bgIdle.visible = true;
             }
         });
    }
}
