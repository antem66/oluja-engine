/**
 * @module UIPanelLayout
 * @description Configuration for the main UI control panel buttons.
 * Defines the properties, positioning, and actions for each button.
 * UIManager uses this configuration to dynamically build the panel.
 */

// TODO: Refine positioning/layout system later (e.g., relative, grid)
// TODO: Define icon/activeIcon names consistently with assets
import { GAME_WIDTH, GAME_HEIGHT } from './gameSettings.js';

// --- Layout Constants (centralize positioning logic here) ---
const panelHeight = 80;
const panelY = GAME_HEIGHT - panelHeight;
const panelCenterY = panelY + panelHeight / 2;
const btnSize = 40;
const spinBtnSize = 110; // Keep specific size for spin button
const sideMargin = 35;
const buttonSpacing = 10;
const textButtonGap = 20; // Gap between button groups and text areas
const standardButtonY = panelCenterY - btnSize / 2;
const spinButtonY = panelCenterY - spinBtnSize / 2 - 25; // Adjusted spin button Y

// Calculated Positions
const turboX = sideMargin;
const autoplayX = turboX + btnSize + buttonSpacing;

const spinX = GAME_WIDTH - sideMargin - spinBtnSize;

// Estimate Bet area position to place buttons relative to it
const spinButtonLeftEdge = spinX; // Use spin button's left edge
const betAreaRightMargin = spinButtonLeftEdge - textButtonGap; // Margin right of bet area
// Rough estimate for now, ideally calculate based on text width later
const estimatedBetTextWidth = 100; 
const betButtonInternalSpacing = 15;
// Adjust calculation for bet group center based on placing buttons relative to text
const betGroupCenterX = betAreaRightMargin - (btnSize + betButtonInternalSpacing + estimatedBetTextWidth / 2);

const betDecreaseX = betGroupCenterX - (estimatedBetTextWidth / 2) - betButtonInternalSpacing;
const betIncreaseX = betGroupCenterX + (estimatedBetTextWidth / 2) + betButtonInternalSpacing;


// --- Button Definitions ---
export const UI_PANEL_LAYOUT = [
    {
        name: 'turbo',
        featureFlag: 'turboMode', // Optional: Only show if Turbo Mode feature is enabled
        position: { x: turboX, y: standardButtonY },
        size: { width: btnSize, height: btnSize },
        icon: 'turbo',
        activeIcon: 'turbo-active',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'turbo' } }
    },
    {
        name: 'autoplay',
        featureFlag: 'autoplay', // Optional: Only show if Autoplay feature is enabled
        position: { x: autoplayX, y: standardButtonY },
        size: { width: btnSize, height: btnSize },
        icon: 'autoplay',
        activeIcon: 'autoplay-active',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'autoplay' } }
    },
    {
        name: 'spin',
        // No feature flag - always shown
        position: { x: spinX, y: spinButtonY },
        size: { width: spinBtnSize, height: spinBtnSize },
        icon: 'spin',
        // activeIcon: 'spin-active', // Does spin have an active state visual? Maybe spinning animation handled differently
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'spin' } }
    },
    {
        name: 'betDecrease',
        position: { x: betDecreaseX, y: standardButtonY },
        size: { width: btnSize, height: btnSize },
        icon: 'minus',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'betDecrease' } }
    },
    {
        name: 'betIncrease',
        position: { x: betIncreaseX, y: standardButtonY },
        size: { width: btnSize, height: btnSize },
        icon: 'plus',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'betIncrease' } }
    },
    // --- Future Examples ---
    /*
    {
        name: 'settings',
        position: { x: someX, y: someY },
        size: { width: btnSize, height: btnSize },
        icon: 'settings',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'settings' } }
    },
    {
        name: 'featureBuy',
        featureFlag: 'featureBuy',
        position: { x: anotherX, y: anotherY },
        size: { width: 80, height: btnSize }, // Different size maybe
        icon: 'feature-buy',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'featureBuy' } }
    }
    */
];
