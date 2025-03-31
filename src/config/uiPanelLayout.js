/**
 * @module UIPanelLayout
 * @description Configuration for the main UI control panel elements.
 * Defines the properties, positioning, visibility, and actions for each element
 * across different layout modes (Wide/Narrow).
 * UIManager uses this configuration to dynamically build the panel.
 */

// TODO: Refine positioning/layout system later (e.g., relative, grid)
// TODO: Define icon/activeIcon names consistently with assets

// --- Layout Constants (Shared across layouts) ---
const panelHeight = 80; // Assumed base height influence for vertical positioning
const btnSize = 40;     // Standard button diameter
const spinBtnSizeWide = 110; // Spin button size in wide mode
const spinBtnSizeNarrow = 130; // Spin button size in narrow mode
const sideMargin = 35;
const bottomMargin = 20; // Margin from the absolute bottom edge
const buttonSpacing = 10; // Horizontal spacing between adjacent buttons
const textButtonGap = 20; // Gap between button groups and text areas
const textVerticalOffset = 25; // How far text is above the button baseline
const estimatedBetTextWidth = 100; // Rough width for bet text layout
const betButtonInternalSpacing = 15; // Space around bet text
const topMargin = 15; // Margin from the top edge
const topButtonSize = 50; // Size for top-right buttons

// --- Helper Functions (Optional, can be inlined if simple) ---
const calculatePanelCenterY = (screenHeight) => screenHeight - bottomMargin - (panelHeight / 2); // Center based on bottom margin

// --- WIDE (Landscape) Layout Configuration ---
export const WIDE_LAYOUT_CONFIG = [
    // --- Bottom Bar Elements ---
    {
        name: 'turbo',
        type: 'button',
        featureFlag: 'turboMode',
        position: (sw, sh) => {
            const panelCenterY = calculatePanelCenterY(sh);
            const yPos = panelCenterY - btnSize / 2;
            const xPos = sideMargin;
            return { x: xPos, y: yPos };
        },
        size: { width: btnSize, height: btnSize },
        icon: 'turbo', activeIcon: 'turbo-active',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'turbo' } },
        visible: (isPortrait) => !isPortrait, // Only visible in wide
    },
    {
        name: 'autoplay',
        type: 'button',
        featureFlag: 'autoplay',
        position: (sw, sh) => {
            const panelCenterY = calculatePanelCenterY(sh);
            const yPos = panelCenterY - btnSize / 2;
            const xPos = sideMargin + btnSize + buttonSpacing;
            return { x: xPos, y: yPos };
        },
        size: { width: btnSize, height: btnSize },
        icon: 'autoplay', activeIcon: 'autoplay-active',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'autoplay' } },
        visible: (isPortrait) => !isPortrait, // Only visible in wide
    },
    {
        name: 'spin',
        type: 'button',
        position: (sw, sh) => {
            const panelCenterY = calculatePanelCenterY(sh);
            const yPos = panelCenterY - spinBtnSizeWide / 2 - 5; // Slightly raise spin button
            const xPos = sw - sideMargin - spinBtnSizeWide;
            return { x: xPos, y: yPos };
        },
        size: { width: spinBtnSizeWide, height: spinBtnSizeWide },
        icon: 'spin',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'spin' } },
        visible: (isPortrait) => !isPortrait, // Only visible in wide
    },
    {
        name: 'paytable', // Placeholder for the '$' button
        type: 'button',
        position: (sw, sh) => {
            const panelCenterY = calculatePanelCenterY(sh);
            const spinX = sw - sideMargin - spinBtnSizeWide;
            const yPos = panelCenterY - btnSize / 2;
            const xPos = spinX - btnSize - buttonSpacing;
            return { x: xPos, y: yPos };
        },
        size: { width: btnSize, height: btnSize },
        icon: 'money', // Assuming 'money.svg' exists
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'paytable' } },
        visible: (isPortrait) => !isPortrait, // Only visible in wide
    },
    {
        name: 'betDecrease',
        type: 'button',
        position: (sw, sh) => {
            const panelCenterY = calculatePanelCenterY(sh);
            const yPos = panelCenterY - btnSize / 2;
            // Center bet group roughly between autoplay and paytable
            const leftGroupEndX = sideMargin + btnSize + buttonSpacing + btnSize + textButtonGap;
            const rightGroupStartX = sw - sideMargin - spinBtnSizeWide - buttonSpacing - btnSize - textButtonGap;
            const betAreaWidth = rightGroupStartX - leftGroupEndX;
            const betGroupCenterX = leftGroupEndX + betAreaWidth / 2;
            const xPos = betGroupCenterX - (estimatedBetTextWidth / 2) - betButtonInternalSpacing - (btnSize / 2); // Adjust for center pivot
            return { x: xPos, y: yPos };
        },
        size: { width: btnSize, height: btnSize },
        icon: 'minus',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'betDecrease' } },
        visible: (isPortrait) => !isPortrait, // Only visible in wide
    },
    {
        name: 'betIncrease',
        type: 'button',
        position: (sw, sh) => {
            const panelCenterY = calculatePanelCenterY(sh);
            const yPos = panelCenterY - btnSize / 2;
            const leftGroupEndX = sideMargin + btnSize + buttonSpacing + btnSize + textButtonGap;
            const rightGroupStartX = sw - sideMargin - spinBtnSizeWide - buttonSpacing - btnSize - textButtonGap;
            const betAreaWidth = rightGroupStartX - leftGroupEndX;
            const betGroupCenterX = leftGroupEndX + betAreaWidth / 2;
            const xPos = betGroupCenterX + (estimatedBetTextWidth / 2) + betButtonInternalSpacing + (btnSize / 2); // Adjust for center pivot
            return { x: xPos, y: yPos };
        },
        size: { width: btnSize, height: btnSize },
        icon: 'plus',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'betIncrease' } },
        visible: (isPortrait) => !isPortrait, // Only visible in wide
    },
    // --- Text Displays (Placeholder Positions - needs coordination with UIManager) ---
    {
        name: 'balanceValue',
        type: 'text',
        position: (sw, sh) => ({ x: sw * 0.25, y: sh - bottomMargin - textVerticalOffset }),
        anchor: { x: 0.5, y: 1 }, // Anchor bottom-center
        visible: (isPortrait) => !isPortrait, // Only visible in wide
    },
    {
        name: 'winValue',
        type: 'text',
        position: (sw, sh) => ({ x: sw * 0.5, y: sh - bottomMargin - textVerticalOffset }),
        anchor: { x: 0.5, y: 1 }, // Anchor bottom-center
        visible: (isPortrait) => !isPortrait, // Only visible in wide
    },
    {
        name: 'betValue',
        type: 'text',
        position: (sw, sh) => {
            // Position centered between bet buttons
            const leftGroupEndX = sideMargin + btnSize + buttonSpacing + btnSize + textButtonGap;
            const rightGroupStartX = sw - sideMargin - spinBtnSizeWide - buttonSpacing - btnSize - textButtonGap;
            const betAreaWidth = rightGroupStartX - leftGroupEndX;
            const betGroupCenterX = leftGroupEndX + betAreaWidth / 2;
            return { x: betGroupCenterX, y: sh - bottomMargin - textVerticalOffset };
        },
        anchor: { x: 0.5, y: 1 }, // Anchor bottom-center
        visible: (isPortrait) => !isPortrait, // Only visible in wide
    },

    // --- Top Bar Elements ---
    {
        name: 'soundButton', // Placeholder name
        type: 'button',
        position: (sw, sh) => ({ x: sw - sideMargin - topButtonSize - buttonSpacing - topButtonSize, y: topMargin }),
        size: { width: topButtonSize, height: topButtonSize },
        icon: 'sound', // Assuming 'sound.svg' etc.
        activeIcon: 'sound-off',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'sound' } },
        // visible: always true (or handled internally if needed)
    },
    {
        name: 'menuButton', // Placeholder name
        type: 'button',
        position: (sw, sh) => ({ x: sw - sideMargin - topButtonSize, y: topMargin }),
        size: { width: topButtonSize, height: topButtonSize },
        icon: 'menu', // Assuming 'menu.svg'
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'menu' } },
        // visible: always true
    },
    {
        name: 'welcomeText',
        type: 'text',
        position: (sw, sh) => ({ x: sw / 2, y: topMargin + 10 }),
        anchor: { x: 0.5, y: 0 }, // Anchor top-center
        visible: (isPortrait) => !isPortrait, // Only visible in wide
    },

    // --- Other Elements ---
    {
        name: 'tvScreen',
        type: 'decoration', // Example type
        position: (sw, sh) => ({ x: sw * 0.95, y: sh * 0.2 }), // Rough position
        anchor: { x: 1, y: 0 }, // Anchor top-right perhaps?
        // visible: always true
    },
    // --- Placeholders for Win Presentation ---
    {
        name: 'winRollupText',
        type: 'text',
        // Position likely dynamic based on win amount / big win state - needs logic in UIManager/Animations
        position: (sw, sh) => ({ x: sw / 2, y: sh / 2 }), // Placeholder: center screen
        anchor: { x: 0.5, y: 0.5 },
        visible: false, // Initially hidden
    },
    {
        name: 'bigWinBanner',
        type: 'decoration', // Example type
        position: (sw, sh) => ({ x: sw / 2, y: sh / 2 }), // Placeholder: center screen
        anchor: { x: 0.5, y: 0.5 },
        visible: false, // Initially hidden
        scale: (sw, sh) => ({ x: 1, y: 1 }), // Example scale definition
    },
];

// --- NARROW (Portrait) Layout Configuration ---
export const NARROW_LAYOUT_CONFIG = [
    // --- Bottom Bar Elements (Reorganized) ---
    {
        name: 'spin',
        type: 'button',
        position: (sw, sh) => {
            const yPos = sh - bottomMargin - (panelHeight / 2) - (spinBtnSizeNarrow / 2); // Centered vertically in bottom area
            const xPos = sw / 2 - (spinBtnSizeNarrow / 2); // Centered horizontally
            return { x: xPos, y: yPos };
        },
        size: { width: spinBtnSizeNarrow, height: spinBtnSizeNarrow },
        icon: 'spin',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'spin' } },
        visible: (isPortrait) => isPortrait, // Only visible in narrow
    },
    {
        name: 'betDecrease',
        type: 'button',
        position: (sw, sh) => {
            const spinCenterY = sh - bottomMargin - (panelHeight / 2);
            const spinCenterX = sw / 2;
            const yPos = spinCenterY - btnSize / 2;
            const xPos = spinCenterX - (spinBtnSizeNarrow / 2) - buttonSpacing - (btnSize/2); // Left of spin button
            return { x: xPos, y: yPos };
        },
        size: { width: btnSize, height: btnSize },
        icon: 'minus',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'betDecrease' } },
        visible: (isPortrait) => isPortrait, // Only visible in narrow
    },
    {
        name: 'betIncrease',
        type: 'button',
        position: (sw, sh) => {
            const spinCenterY = sh - bottomMargin - (panelHeight / 2);
            const spinCenterX = sw / 2;
            const yPos = spinCenterY - btnSize / 2;
            const xPos = spinCenterX + (spinBtnSizeNarrow / 2) + buttonSpacing + (btnSize/2); // Right of spin button
            return { x: xPos, y: yPos };
        },
        size: { width: btnSize, height: btnSize },
        icon: 'plus',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'betIncrease' } },
        visible: (isPortrait) => isPortrait, // Only visible in narrow
    },
    {
        name: 'autoplay',
        type: 'button',
        featureFlag: 'autoplay',
        position: (sw, sh) => {
            const spinCenterY = sh - bottomMargin - (panelHeight / 2);
            const spinCenterX = sw / 2;
            const betDecreaseLeftEdge = spinCenterX - (spinBtnSizeNarrow / 2) - buttonSpacing - btnSize;
            const yPos = spinCenterY - btnSize / 2;
            const xPos = betDecreaseLeftEdge - buttonSpacing - (btnSize/2);
            return { x: xPos, y: yPos };
        },
        size: { width: btnSize, height: btnSize },
        icon: 'autoplay', activeIcon: 'autoplay-active',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'autoplay' } },
        visible: (isPortrait) => isPortrait, // Only visible in narrow
    },
    {
        name: 'turbo',
        type: 'button',
        featureFlag: 'turboMode',
        position: (sw, sh) => {
            const spinCenterY = sh - bottomMargin - (panelHeight / 2);
             // Position relative to autoplay, on the far left
            const spinCenterX = sw / 2;
            const betDecreaseLeftEdge = spinCenterX - (spinBtnSizeNarrow / 2) - buttonSpacing - btnSize;
            const autoplayLeftEdge = betDecreaseLeftEdge - buttonSpacing - btnSize;
            const yPos = spinCenterY - btnSize / 2;
            const xPos = autoplayLeftEdge - buttonSpacing - (btnSize/2);
            // Fallback or adjust if space is too tight
            const minX = sideMargin;
            return { x: Math.max(minX, xPos), y: yPos };
        },
        size: { width: btnSize, height: btnSize },
        icon: 'turbo', activeIcon: 'turbo-active',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'turbo' } },
        visible: (isPortrait) => isPortrait, // Only visible in narrow
    },
    {
        name: 'paytable', // Placeholder for the '$' button
        type: 'button',
        position: (sw, sh) => {
            const spinCenterY = sh - bottomMargin - (panelHeight / 2);
            const spinCenterX = sw / 2;
            const betIncreaseRightEdge = spinCenterX + (spinBtnSizeNarrow / 2) + buttonSpacing + btnSize;
            const yPos = spinCenterY - btnSize / 2;
            const xPos = betIncreaseRightEdge + buttonSpacing + (btnSize/2);
            // Fallback or adjust if space is too tight
            const maxX = sw - sideMargin - btnSize;
            return { x: Math.min(maxX, xPos), y: yPos };
        },
        size: { width: btnSize, height: btnSize }, // Use standard size
        icon: 'money', // Assuming 'money.svg' exists
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'paytable' } },
        visible: (isPortrait) => isPortrait, // Only visible in narrow
    },
    // --- Text Displays (Positioned above spin cluster) ---
    {
        name: 'balanceValue',
        type: 'text',
        position: (sw, sh) => {
            const spinButtonTop = sh - bottomMargin - (panelHeight / 2) - (spinBtnSizeNarrow / 2);
            return { x: sw * 0.25, y: spinButtonTop - textButtonGap };
        },
        anchor: { x: 0.5, y: 1 }, // Anchor bottom-center
        visible: (isPortrait) => isPortrait, // Only visible in narrow
    },
    {
        name: 'winValue',
        type: 'text',
        position: (sw, sh) => {
            const spinButtonTop = sh - bottomMargin - (panelHeight / 2) - (spinBtnSizeNarrow / 2);
            return { x: sw * 0.5, y: spinButtonTop - textButtonGap };
        },
        anchor: { x: 0.5, y: 1 }, // Anchor bottom-center
        visible: (isPortrait) => isPortrait, // Only visible in narrow
    },
    {
        name: 'betValue',
        type: 'text',
        position: (sw, sh) => {
            const spinButtonTop = sh - bottomMargin - (panelHeight / 2) - (spinBtnSizeNarrow / 2);
            return { x: sw * 0.75, y: spinButtonTop - textButtonGap };
        },
        anchor: { x: 0.5, y: 1 }, // Anchor bottom-center
        visible: (isPortrait) => isPortrait, // Only visible in narrow
    },

    // --- Top Bar Elements (Same as Wide for now) ---
    {
        name: 'soundButton',
        type: 'button',
        position: (sw, sh) => ({ x: sw - sideMargin - topButtonSize - buttonSpacing - topButtonSize, y: topMargin }),
        size: { width: topButtonSize, height: topButtonSize },
        icon: 'sound', activeIcon: 'sound-off',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'sound' } },
    },
    {
        name: 'menuButton',
        type: 'button',
        position: (sw, sh) => ({ x: sw - sideMargin - topButtonSize, y: topMargin }),
        size: { width: topButtonSize, height: topButtonSize },
        icon: 'menu',
        action: { type: 'emitEvent', eventName: 'ui:button:click', payload: { buttonName: 'menu' } },
    },
    {
        name: 'welcomeText',
        type: 'text',
        position: (sw, sh) => ({ x: sw / 2, y: topMargin + 10 }),
        anchor: { x: 0.5, y: 0 },
        visible: (isPortrait) => !isPortrait, // Hidden in narrow
    },

    // --- Other Elements (Same as Wide for now) ---
    {
        name: 'tvScreen',
        type: 'decoration',
        position: (sw, sh) => ({ x: sw * 0.95, y: sh * 0.2 }),
        anchor: { x: 1, y: 0 },
    },
    // --- Win Presentation (Same placeholders, visibility managed by animation logic) ---
    {
        name: 'winRollupText',
        type: 'text',
        position: (sw, sh) => ({ x: sw / 2, y: sh / 2 }),
        anchor: { x: 0.5, y: 0.5 },
        visible: false,
    },
    {
        name: 'bigWinBanner',
        type: 'decoration',
        position: (sw, sh) => ({ x: sw / 2, y: sh / 2 }),
        anchor: { x: 0.5, y: 0.5 },
        visible: false,
        scale: (sw, sh, constants, isPortrait) => {
            // Example: Make banner slightly smaller in portrait
            const scaleFactor = isPortrait ? 0.8 : 1.0;
            return { x: scaleFactor, y: scaleFactor };
        },
    },
];

// --- Remove Old Layout --- 
/*
export const UI_PANEL_LAYOUT = [
    // ... old static definitions ...
];
*/
