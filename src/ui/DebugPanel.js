import * as PIXI from 'pixi.js';
import { state, updateState } from '../core/GameState.js';
import { EventBus } from '../utils/EventBus.js';
import { GAME_WIDTH } from '../config/gameSettings.js';

let eventBusInstance = null;
let debugContainer = null;
let debugPanel = null;
let forceWinCheckbox = null;

// Use a Map to store checkbox states instead of properties on containers
const checkboxStates = new Map();

/**
 * Initializes the debug panel
 * @param {PIXI.Application} app - The PIXI application instance
 * @param {PIXI.Container} layerDebug - The layer to add the debug panel to.
 * @param {import('../utils/EventBus.js').EventBus} bus - The global event bus.
 */
export function initDebugPanel(app, layerDebug, bus) {
    eventBusInstance = bus;
    // Create a new container for debug elements
    debugContainer = new PIXI.Container();
    // debugContainer.visible = false; // Visibility controlled by layerDebug now
    if (layerDebug) {
        layerDebug.addChild(debugContainer);
    } else {
        console.error("DebugPanel: layerDebug not provided!");
        // Fallback: Add to stage if layer is missing? Or just fail?
        app.stage.addChild(debugContainer); // Keep original behavior as fallback
    }

    // Position in top-right corner (relative to logical GAME_WIDTH)
    const panelWidth = 240;
    debugContainer.x = GAME_WIDTH - panelWidth - 10; 
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
    
    // Add toggle button relative to the debug panel's container
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
    
    // Position toggle button in top-left corner of the screen
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
    
    const btnTextStyle = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 12,
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
    
    const addBalanceBtnText = new PIXI.Text("+100", btnTextStyle);
    addBalanceBtnText.x = 15;
    addBalanceBtnText.y = 5;
    addBalanceBtn.addChild(addBalanceBtnText);
    
    addBalanceBtn.x = 120;
    addBalanceBtn.y = yPos;
    addBalanceBtn.eventMode = 'static';
    addBalanceBtn.cursor = 'pointer';
    addBalanceBtn.on('pointerdown', () => {
        updateState({ balance: state.balance + 100 });
        console.log("Debug: Added 100 to balance");
    });
    debugContainer.addChild(addBalanceBtn);
    
    yPos += 30; // Increment yPos for the next control

    // --- Force Free Spins Button --- START
    const forceFSLabel = new PIXI.Text("Force Free Spins:", labelStyle);
    forceFSLabel.x = 10;
    forceFSLabel.y = yPos;
    debugContainer.addChild(forceFSLabel);

    const forceFSBtn = new PIXI.Graphics();
    forceFSBtn.beginFill(0x8A2BE2); // Purple color
    forceFSBtn.drawRect(0, 0, 80, 22); // Slightly wider button
    forceFSBtn.endFill();

    const forceFSBtnText = new PIXI.Text("Force FS", btnTextStyle); // Use defined style
    forceFSBtnText.x = 15;
    forceFSBtnText.y = 5;
    forceFSBtn.addChild(forceFSBtnText);

    forceFSBtn.x = 120;
    forceFSBtn.y = yPos;
    forceFSBtn.eventMode = 'static';
    forceFSBtn.cursor = 'pointer';

    // Add the event handler logic
    forceFSBtn.on('pointerdown', () => {
        if (!state.isSpinning && !state.isInFreeSpins && !state.isTransitioning) {
            console.log("Debug: Forcing Free Spins...");
            if (eventBusInstance) {
                eventBusInstance.emit('feature:trigger:freeSpins', { spinsAwarded: 1 }); // Emit event, default 10 spins
            } else {
                console.error("DebugPanel: EventBus not available to trigger Free Spins.");
            }
        } else {
            console.warn("Debug: Cannot force Free Spins now (Game Busy). State:", {
                spinning: state.isSpinning,
                inFS: state.isInFreeSpins,
                transitioning: state.isTransitioning
            });
        }
    });
    // Add the button to the container
    debugContainer.addChild(forceFSBtn);
    // --- Force Free Spins Button --- END

    yPos += 30;

    // --- Force Specific Wins --- START
    const forceMegaBtn = createButtonWithText("Force Mega Win", 10, yPos, 100, 22, () => {
        if (eventBusInstance) {
            console.log("Debug: Requesting MEGA win for next spin...");
            eventBusInstance.emit('debug:forceWinLevel', { level: 'mega' });
        } else {
            console.error("DebugPanel: EventBus not available to force Mega win.");
        }
    });
    debugContainer.addChild(forceMegaBtn);

    const forceEpicBtn = createButtonWithText("Force Epic Win", 120, yPos, 100, 22, () => {
        if (eventBusInstance) {
            console.log("Debug: Requesting EPIC win for next spin...");
            eventBusInstance.emit('debug:forceWinLevel', { level: 'epic' });
        } else {
            console.error("DebugPanel: EventBus not available to force Epic win.");
        }
    });
    debugContainer.addChild(forceEpicBtn);
    // --- Force Specific Wins --- END

    yPos += 30;

    // Update the currentY for the panel (adjust if more controls added)
    // @ts-ignore - Using custom property for position tracking
    debugPanel.currentY = yPos + 10; // Set Y for the next section (Background Adjustments)
}

/**
 * Helper to create a button with text (Refactored from balance button)
 * @param {string} text
 * @param {number} x 
 * @param {number} y 
 * @param {number} width 
 * @param {number} height 
 * @param {() => void} onClick 
 * @param {number} [fillColor=0x444444]
 * @returns {PIXI.Graphics}
 */
function createButtonWithText(text, x, y, width, height, onClick, fillColor = 0x444444) {
    const btn = new PIXI.Graphics();
    btn.rect(0, 0, width, height);
    btn.fill({ color: fillColor });
    btn.stroke({ width: 1, color: 0xaaaaaa });

    const btnTextStyle = new PIXI.TextStyle({ // Use a shared style or pass as arg if needed
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xffffff
    });
    const btnText = new PIXI.Text({ text, style: btnTextStyle });
    // Center text
    btnText.anchor.set(0.5);
    btnText.x = width / 2;
    btnText.y = height / 2;
    btn.addChild(btnText);

    btn.x = x;
    btn.y = y;
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', onClick);
    return btn;
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
