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
 */
export function initDebugPanel(app) {
    // Create a new container for debug elements
    debugContainer = new PIXI.Container();
    debugContainer.visible = false; // Hidden by default
    app.stage.addChild(debugContainer);
    
    // Position in top-right corner
    debugContainer.x = app.screen.width - 250;
    debugContainer.y = 10;
    
    // Create panel background
    debugPanel = new PIXI.Graphics();
    debugPanel.beginFill(0x222222, 0.85);
    debugPanel.drawRect(0, 0, 240, 280);
    debugPanel.endFill();
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
 * Toggles the visibility of the debug panel
 */
function toggleDebugPanel() {
    debugContainer.visible = !debugContainer.visible;
    // Also set master debug flag
    updateState({ isDebugMode: debugContainer.visible });
    console.log(`Debug Panel: Toggled panel visibility to ${debugContainer.visible}`);
    console.log(`Debug Panel: isDebugMode=${state.isDebugMode}, forceWin=${state.forceWin}`);
    
    // Update the state of debug controls to match the game state
    if (debugContainer.visible) {
        if (forceWinCheckbox) {
            checkboxStates.set('forceWin', state.forceWin);
            forceWinCheckbox.getChildAt(1).visible = state.forceWin;
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