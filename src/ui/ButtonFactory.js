import * as PIXI from 'pixi.js';
// Removed EventMode import

/**
 * Creates a reusable PixiJS button component.
 * @param {string} text - The text label for the button.
 * @param {number} x - The x-coordinate position.
 * @param {number} y - The y-coordinate position.
 * @param {function} callback - The function to call when the button is pressed.
 * @param {object} textStyleObject - PIXI.TextStyle properties for the label.
 * @param {number} [width=100] - The width of the button.
 * @param {number} [height=40] - The height of the button.
 * @param {boolean} [circular=false] - Whether the button should be circular.
 * @param {PIXI.Container} parentContainer - The container to add this button to. Required.
 * @returns {Button} The Button instance.
 */
export function createButton(
  text,
  x,
  y,
  callback,
  textStyleObject,
  parentContainer, // Moved before optional parameters
  width = 100,
  height = 40,
  circular = false
) {
   // Ensure callback is a function, provide a no-op default if not
   if (typeof callback !== "function") {
    console.warn("createButton: Callback provided is not a function. Using no-op.");
    callback = () => {};
  }

  const button = new Button(text, x, y, callback, textStyleObject, parentContainer, width, height, circular);

  // Add the button to the specified parent container
  if (parentContainer) {
      parentContainer.addChild(button);
  } else {
      console.warn("createButton: No parent container provided. Button not added to stage.");
  }

  return button;
}


/**
 * Represents a custom Button class extending PIXI.Container
 */
class Button extends PIXI.Container {
    buttonLabel; // Reference to the PIXI.Text label
    bgIdle;      // Reference to idle background PIXI.Graphics
    bgHover;     // Reference to hover background PIXI.Graphics
    bgDown;      // Reference to down background PIXI.Graphics
    /** @type {import('pixi.js').EventMode} */ // Explicitly type eventMode using JSDoc
    eventMode;

    constructor(
        text,
        x,
        y,
        callback,
        textStyleObject,
        parentContainer, // Keep for potential use, though adding happens outside now
        width = 100,
        height = 40,
        circular = false
    ) {
        super(); // Call PIXI.Container constructor

        this.pivot.set(width / 2, height / 2);
        this.x = x;
        this.y = y;
        this.eventMode = 'static'; // Reverted to string literal
        this.cursor = "pointer"; // Show pointer cursor on hover

        // Ensure width and height are numbers
  width = Number(width) || 100;
  height = Number(height) || 40;

  const radius = circular ? Math.min(width, height) / 2 : 10; // Use radius for circular or rounded corners

  // --- Button Shapes ---
  const shape = new PIXI.Graphics(); // Template shape

  // Helper to draw the button shape
  const drawShape = (graphics, color, strokeColor) => {
    graphics
      .clear()
      .roundRect(0, 0, width, height, radius)
      .fill({ color: color })
      .stroke({ width: 2, color: strokeColor, alignment: 0.5 }); // Center stroke
  };

  // Idle state background
  const bgIdle = shape.clone();
  drawShape(bgIdle, 0x555555, 0xaaaaaa);

  // Hover state background
  const bgHover = shape.clone();
  drawShape(bgHover, 0x777777, 0xcccccc);
  bgHover.visible = false; // Initially hidden

  // Down state background
  const bgDown = shape.clone();
  drawShape(bgDown, 0x333333, 0x888888);
  bgDown.visible = false; // Initially hidden

  // --- Button Text ---
  const buttonText = new PIXI.Text({
    text: text,
    style: textStyleObject,
  });
  buttonText.anchor.set(0.5); // Center anchor
  buttonText.x = width / 2;
        buttonText.y = height / 2;

        // Store label for potential updates later
        this.buttonLabel = buttonText;

        // Add elements to the button container ('this')
        this.addChild(bgIdle, bgHover, bgDown, buttonText);

        // Store references to background states
        this.bgIdle = bgIdle;
        this.bgHover = bgHover;
        this.bgDown = bgDown;

        // --- Interaction Logic ---
        this.on("pointerdown", () => {
            if (this.eventMode !== 'none') { // Reverted to string literal
                this.bgDown.visible = true;
                this.bgIdle.visible = false;
                this.bgHover.visible = false;
                callback(); // Execute the provided callback
            }
        });

        this.on("pointerup", () => {
            if (this.eventMode !== 'none') { // Reverted to string literal
                this.bgDown.visible = false;
                this.bgIdle.visible = true; // Return to idle state
                this.bgHover.visible = false;
            }
        });

        this.on("pointerupoutside", () => {
            if (this.eventMode !== 'none') { // Reverted to string literal
                this.bgDown.visible = false;
                this.bgIdle.visible = true; // Return to idle state
                this.bgHover.visible = false;
            }
        });

        this.on("pointerover", () => {
            if (this.eventMode !== 'none' && !this.bgDown.visible) { // Reverted to string literal
                this.bgHover.visible = true;
                this.bgIdle.visible = false;
            }
        });

        this.on("pointerout", () => {
            if (this.eventMode !== 'none' && !this.bgDown.visible) { // Reverted to string literal
                this.bgHover.visible = false;
                this.bgIdle.visible = true;
            }
        });
    }
}
