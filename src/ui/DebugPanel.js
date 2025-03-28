import * as PIXI from 'pixi.js';
import { state, updateState } from '../core/GameState.js';

let debugContainer = null;
let debugPanel = null;
let forceWinCheckbox = null;

// Use a Map to store checkbox states instead of properties on containers
const checkboxStates = new Map();

/**
 * Initializes the debug panel
 * @param {PIXI.Application} app - The PIXI application instance
 * @param {PIXI.Container} layerDebug - The layer to add the debug panel to.
 */
export function initDebugPanel(app, layerDebug) { // Added layerDebug parameter
    // Create a new container for debug elements
    debugContainer = new PIXI.Container();
    // debugContainer.visible = false; // Visibility controlled by layerDebug now
    // app.stage.addChild(debugContainer); // Add to layerDebug instead
    if (layerDebug) {
        layerDebug.addChild(debugContainer);
    } else {
        console.error("DebugPanel: layerDebug not provided!");
        // Fallback: Add to stage if layer is missing? Or just fail?
        app.stage.addChild(debugContainer); // Keep original behavior as fallback
    }

    // Position in top-right corner
    debugContainer.x = app.screen.width - 250;
    debugContainer.y = 10;
    
    // Create panel background
    debugPanel = new PIXI.Graphics();
    debugPanel.beginFill(0x222222, 0.85);
    debugPanel.drawRect(0, 0, 240, 280);
    debugPanel.endFill();
    
    // Add currentY tracking property to the panel
    // @ts-ignore - Adding custom property for position tracking
    debugPanel.currentY = 40;
    
    debugContainer.addChild(debugPanel);
    
    // Panel title
    const titleStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'bold',
        fill: 0xffffff
    });
    
    const title = new PIXI.Text("DEBUG PANEL", titleStyle);
    title.x = 10;
    title.y = 10;
    debugContainer.addChild(title);
    
    // Add toggle button in top-left corner of main screen
    const toggleBtn = new PIXI.Graphics();
    toggleBtn.beginFill(0xff0000, 0.7);
    toggleBtn.drawRect(0, 0, 30, 30);
    toggleBtn.endFill();
    
    const toggleTextStyle = new PIXI.TextStyle({
        fontFamily: 'Arial', 
        fontSize: 16, 
        fontWeight: 'bold', 
        fill: 0xffffff 
    });
    
    const toggleText = new PIXI.Text("D", toggleTextStyle);
    toggleText.x = 10;
    toggleText.y = 7;
    toggleBtn.addChild(toggleText);
    
    toggleBtn.x = 10;
    toggleBtn.y = 10;
    toggleBtn.eventMode = 'static';
    toggleBtn.cursor = 'pointer';
    toggleBtn.on('pointerdown', toggleDebugPanel);
    app.stage.addChild(toggleBtn);
    
    // Add debug options
    createDebugOptions();
    
    // Update currentY based on the height of createDebugOptions section
    // @ts-ignore - Using custom property for position tracking
    debugPanel.currentY = 140; // Set appropriate Y position after debug options
    
    // Add background adjustment section
    addBackgroundAdjustmentSection(debugPanel);
}

/**
 * Creates debug option controls
 */
function createDebugOptions() {
    const labelStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xffffff
    });
    
    let yPos = 50;
    
    // Force Win option with checkbox
    const forceWinLabel = new PIXI.Text("Force Win Every Spin", labelStyle);
    forceWinLabel.x = 10;
    forceWinLabel.y = yPos;
    debugContainer.addChild(forceWinLabel);
    
    // Create checkbox
    forceWinCheckbox = createCheckbox(180, yPos, state.forceWin, 'forceWin');
    debugContainer.addChild(forceWinCheckbox);
    
    yPos += 30;
    
    // Additional debug options can be added here
    // Example: Add balance controls
    const balanceLabel = new PIXI.Text("Add Balance:", labelStyle);
    balanceLabel.x = 10;
    balanceLabel.y = yPos;
    debugContainer.addChild(balanceLabel);
    
    // Add +100 button
    const addBalanceBtn = new PIXI.Graphics();
    addBalanceBtn.beginFill(0x4CAF50);
    addBalanceBtn.drawRect(0, 0, 60, 22);
    addBalanceBtn.endFill();
    
    const btnTextStyle = new PIXI.TextStyle({
        fontFamily: 'Arial', 
        fontSize: 12, 
        fill: 0xffffff 
    });
    
    const btnText = new PIXI.Text("+100", btnTextStyle);
    btnText.x = 15;
    btnText.y = 5;
    addBalanceBtn.addChild(btnText);
    
    addBalanceBtn.x = 120;
    addBalanceBtn.y = yPos;
    addBalanceBtn.eventMode = 'static';
    addBalanceBtn.cursor = 'pointer';
    addBalanceBtn.on('pointerdown', () => {
        updateState({ balance: state.balance + 100 });
        console.log("Debug: Added 100 to balance");
    });
    debugContainer.addChild(addBalanceBtn);
    
    // Update the currentY for the panel
    // @ts-ignore - Using custom property for position tracking
    debugPanel.currentY = yPos + 40; // Set for next section
}

/**
 * Creates a checkbox control
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {boolean} initialState - Initial checked state
 * @param {string} id - Unique ID for this checkbox
 * @returns {PIXI.Container} - The checkbox container with event handlers
 */
function createCheckbox(x, y, initialState = false, id) {
    const container = new PIXI.Container();
    container.x = x;
    container.y = y;
    
    // Checkbox background
    const box = new PIXI.Graphics();
    box.lineStyle(1, 0xaaaaaa);
    box.beginFill(0x444444);
    box.drawRect(0, 0, 20, 20);
    box.endFill();
    
    // Checkmark (initially visible based on state)
    const checkmark = new PIXI.Graphics();
    checkmark.beginFill(0x00ff00, 0.8);
    checkmark.drawRect(3, 3, 14, 14);
    checkmark.endFill();
    checkmark.visible = initialState;
    
    container.addChild(box);
    container.addChild(checkmark);
    
    // Set up interactivity
    container.eventMode = 'static';
    container.cursor = 'pointer';
    
    // Store initial state in the Map
    checkboxStates.set(id, initialState);
    
    // Add click handler
    container.on('pointerdown', () => {
        const currentState = checkboxStates.get(id);
        const newState = !currentState;
        
        checkboxStates.set(id, newState);
        checkmark.visible = newState;
        
        // Handle specific checkbox actions
        if (id === 'forceWin') {
            console.log(`Debug Panel: Setting forceWin to ${newState}`);
            updateState({ forceWin: newState });
            console.log(`Debug Panel: State after update: isDebugMode=${state.isDebugMode}, forceWin=${state.forceWin}`);
        }
    });
    
    return container;
}

/**
 * Toggles the visibility of the debug panel layer
 */
function toggleDebugPanel() {
    // Find the layerDebug container (assuming it's a direct child of stage for now)
    // A better approach might be to pass layerDebug to this function or store it globally.
    // @ts-ignore - Accessing potentially null property
    const layerDebug = window.gameApp?.layerDebug;

    if (layerDebug) {
        layerDebug.visible = !layerDebug.visible;
        // Also set master debug flag
        updateState({ isDebugMode: layerDebug.visible });
        console.log(`Debug Panel: Toggled layer visibility to ${layerDebug.visible}`);
        console.log(`Debug Panel: isDebugMode=${state.isDebugMode}, forceWin=${state.forceWin}`);

        // Update the state of debug controls to match the game state when panel becomes visible
        if (layerDebug.visible) {
            if (forceWinCheckbox) {
                checkboxStates.set('forceWin', state.forceWin);
                forceWinCheckbox.getChildAt(1).visible = state.forceWin;
            }
        }
    }
}

/**
 * Updates debug controls to reflect current state
 */
export function updateDebugControls() {
    if (debugContainer && debugContainer.visible) {
        if (forceWinCheckbox) {
            checkboxStates.set('forceWin', state.forceWin);
            forceWinCheckbox.getChildAt(1).visible = state.forceWin;
        }
    }
}

// Add section for background adjustments
function addBackgroundAdjustmentSection(debugPanel) {
    const sectionTitle = new PIXI.Text({
        text: "Background Adjustments",
        style: { 
            fontSize: 14,
            fill: 0xFFFFFF
        }
    });
    sectionTitle.y = debugPanel.currentY;
    debugPanel.addChild(sectionTitle);
    debugPanel.currentY += 20;

    // Add controls for x, y, and scale
    const offsetLabel = new PIXI.Text({
        text: "Offset: X=0, Y=0, Scale=1",
        style: { 
            fontSize: 12,
            fill: 0xCCCCCC
        }
    });
    offsetLabel.y = debugPanel.currentY;
    debugPanel.addChild(offsetLabel);
    debugPanel.currentY += 20;
    
    // Create button with proper fill syntax for Pixi.js v8
    function createButton(x, y, width, height) {
        const btn = new PIXI.Graphics();
        btn.rect(0, 0, width, height);
        btn.fill({ color: 0x444444 });
        btn.stroke({ color: 0x666666, width: 1 });
        btn.x = x;
        btn.y = y;
        return btn;
    }
    
    // X adjustment buttons
    const btnXMinus = createButton(0, debugPanel.currentY, 30, 20);
    const xMinusText = new PIXI.Text({
        text: "X-",
        style: { 
            fontSize: 12,
            fill: 0xFFFFFF
        }
    });
    xMinusText.x = 8;
    xMinusText.y = 4;
    btnXMinus.addChild(xMinusText);
    
    const btnXPlus = createButton(35, debugPanel.currentY, 30, 20);
    const xPlusText = new PIXI.Text({
        text: "X+",
        style: { 
            fontSize: 12,
            fill: 0xFFFFFF
        }
    });
    xPlusText.x = 8;
    xPlusText.y = 4;
    btnXPlus.addChild(xPlusText);
    
    // Y adjustment buttons
    const btnYMinus = createButton(70, debugPanel.currentY, 30, 20);
    const yMinusText = new PIXI.Text({
        text: "Y-",
        style: { 
            fontSize: 12,
            fill: 0xFFFFFF
        }
    });
    yMinusText.x = 8;
    yMinusText.y = 4;
    btnYMinus.addChild(yMinusText);
    
    const btnYPlus = createButton(105, debugPanel.currentY, 30, 20);
    const yPlusText = new PIXI.Text({
        text: "Y+",
        style: { 
            fontSize: 12,
            fill: 0xFFFFFF
        }
    });
    yPlusText.x = 8;
    yPlusText.y = 4;
    btnYPlus.addChild(yPlusText);
    
    // Scale adjustment buttons
    const btnScaleMinus = createButton(140, debugPanel.currentY, 40, 20);
    const scaleMinusText = new PIXI.Text({
        text: "S-",
        style: { 
            fontSize: 12,
            fill: 0xFFFFFF
        }
    });
    scaleMinusText.x = 14;
    scaleMinusText.y = 4;
    btnScaleMinus.addChild(scaleMinusText);
    
    const btnScalePlus = createButton(185, debugPanel.currentY, 40, 20);
    const scalePlusText = new PIXI.Text({
        text: "S+",
        style: { 
            fontSize: 12,
            fill: 0xFFFFFF
        }
    });
    scalePlusText.x = 14;
    scalePlusText.y = 4;
    btnScalePlus.addChild(scalePlusText);
    
    // Add all buttons
    debugPanel.addChild(btnXMinus);
    debugPanel.addChild(btnXPlus);
    debugPanel.addChild(btnYMinus);
    debugPanel.addChild(btnYPlus);
    debugPanel.addChild(btnScaleMinus);
    debugPanel.addChild(btnScalePlus);
    
    // Track adjustment values
    let offsetX = 0;
    let offsetY = 0;
    let scale = 1;
    
    // Set up button interactions
    btnXMinus.eventMode = 'static';
    btnXMinus.cursor = 'pointer';
    btnXMinus.on('pointerdown', () => {
        offsetX -= 5;
        updateBackground();
    });
    
    btnXPlus.eventMode = 'static';
    btnXPlus.cursor = 'pointer';
    btnXPlus.on('pointerdown', () => {
        offsetX += 5;
        updateBackground();
    });
    
    btnYMinus.eventMode = 'static';
    btnYMinus.cursor = 'pointer';
    btnYMinus.on('pointerdown', () => {
        offsetY -= 5;
        updateBackground();
    });
    
    btnYPlus.eventMode = 'static';
    btnYPlus.cursor = 'pointer';
    btnYPlus.on('pointerdown', () => {
        offsetY += 5;
        updateBackground();
    });
    
    btnScaleMinus.eventMode = 'static';
    btnScaleMinus.cursor = 'pointer';
    btnScaleMinus.on('pointerdown', () => {
        scale -= 0.01;
        updateBackground();
    });
    
    btnScalePlus.eventMode = 'static';
    btnScalePlus.cursor = 'pointer';
    btnScalePlus.on('pointerdown', () => {
        scale += 0.01;
        updateBackground();
    });
    
    // Function to update background and label
    function updateBackground() {
        // Update the label
        offsetLabel.text = `Offset: X=${offsetX}, Y=${offsetY}, Scale=${scale.toFixed(2)}`;
        
        // Access game instance using @ts-ignore to bypass type checking
        // @ts-ignore - Accessing dynamically added gameApp property
        if (window.gameApp && typeof window.gameApp.adjustBackground === 'function') {
            // @ts-ignore - Call dynamically available method
            window.gameApp.adjustBackground(offsetX, offsetY, scale);
        }
    }
    
    debugPanel.currentY += 30;
}
