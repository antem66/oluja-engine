# V2 Slot Engine: Configuration System

## 1. Introduction

The configuration system is the cornerstone of the V2 engine's flexibility and extensibility. It allows defining the specific characteristics, mechanics, assets, and parameters of each individual slot game without modifying the core engine code. This is achieved through a combination of the `packages/game-configs` package (defining the *structure* and *types*) and the specific configuration files within each `packages/games/*` package (providing the *values*).

## 2. `game-configs` Package

*   **Purpose:** To define the canonical TypeScript interfaces, types, and potentially validation schemas for *all* possible game configurations.
*   **Contents:** This package contains **only type definitions** (`.ts` files exporting interfaces/types) and possibly schema definitions (e.g., using Zod for runtime validation if needed). It contains **no implementation logic or default values**.
*   **Consumers:**
    *   `engine-core`: Relies on these types to understand the shape of the configuration object it receives and operates upon.
    *   `games/*`: Implements these interfaces when defining the specific configuration values for a game.
    *   `game-server` (Potentially): Can use these types for validating game configurations it uses for calculations or for defining API payload structures.

## 3. Core Configuration Interfaces (Examples - Needs Full Definition)

The following are examples of key interfaces expected within `packages/game-configs/src/types.ts`. These need to be fully fleshed out during development.

```typescript
// packages/game-configs/src/types.ts (Illustrative Snippets)

// --- General Game Settings --- 

export type ReelMechanism = 'standard' | 'megaways' | 'cluster' | 'tumbling';
export type WinEvaluationMechanism = 'lines' | 'ways' | 'cluster' | 'scatterPays';

export interface GameSettings {
    gameId: string;                  // Unique identifier for the game
    displayName: string;
    stage: {
        width: number;
        height: number;
        backgroundColor?: number; // Hex color
    };
    reels: {
        count: number;
        positions: { x: number; y: number }[]; // Position for each reel container
        mechanism: ReelMechanism;
        // Mechanism-specific options (defined later)
        standardReelConfig?: StandardReelSettings;
        megawaysReelConfig?: MegawaysReelSettings;
    };
    winEvaluation: {
        mechanism: WinEvaluationMechanism;
    };
    features: {
        // Flags to enable/disable core engine features for this game
        hasFreeSpins?: boolean;
        hasAutoplay?: boolean;
        hasTurboMode?: boolean;
        hasFeatureBuy?: boolean;
        // Game-specific feature flags can be added here
        [key: string]: any; // Allow extending with game-specific flags
    };
    assets: AssetManifest;
    soundConfig?: SoundConfig;
    animationTimings?: AnimationTimings;
    // Add RTP, volatility info etc. as needed
}

// --- Symbols --- 

export interface PayoutEntry {
    count: number;  // Number of symbols needed
    multiplier: number; // Payout multiplier (times bet or coin value)
}

export interface SymbolDefinition {
    id: string;             // Unique ID (e.g., 'HL1', 'WILD', 'SCATTER')
    textureId: string;      // Key mapping to the texture in the AssetManifest
    isWild?: boolean;
    isScatter?: boolean;
    isMultiplier?: boolean; // e.g., for multiplier wilds
    isMoneySymbol?: boolean;
    payouts?: PayoutEntry[]; // For line/ways/cluster wins
    scatterPaysValue?: number; // For scatter wins (value per symbol)
    moneyValue?: number | number[]; // Fixed or range of values for money symbols
    // Add other properties: isExpanding, animation keys, Spine skin name, etc.
}

export type Paytable = Record<string, SymbolDefinition>; // Map symbol ID to its definition

// --- Reel Configurations --- 

export interface StandardReelSettings {
    rows: number;
    symbolHeight: number;
    spinSpeed?: number; // Configurable speeds
    stopSequence?: number[]; // Reel stop order
}

export interface MegawaysReelSettings {
    minHeight: number;
    maxHeight: number;
    // Add specific Megaways calculation parameters if needed
}

export type ReelStrip = string[]; // Array of Symbol IDs
export interface ReelStripSet {
    baseGame: ReelStrip[];
    freeSpins?: ReelStrip[]; // Optional different strips for FS
}

// --- Win Lines / Ways --- 

export type Payline = number[][]; // Array of [reelIndex, rowIndex] pairs
export interface PaylineSet {
    lines: Payline[];
}

// (Ways/Cluster config TBD based on evaluation logic)

// --- Assets & Sound --- 

export interface AssetDefinition {
    key: string;    // Unique key (e.g., textureId)
    url: string;    // Path to the asset (relative to game package)
    type: 'texture' | 'spritesheet' | 'sound' | 'spine' | 'font' | 'json';
    // Optional metadata (e.g., frame dimensions for spritesheet)
}

export interface AssetManifest {
    bundles: {
        name: string; // e.g., 'preload', 'gameplay', 'bonus'
        assets: AssetDefinition[];
    }[];
}

export interface SoundDefinition {
    key: string;    // Unique sound ID (e.g., 'spinClick', 'winSmall')
    assetKey: string; // Key matching an asset in the manifest
    volume?: number;
    loop?: boolean;
}

export type SoundConfig = Record<string, SoundDefinition>;

// --- Animations --- 

export interface AnimationTimings {
    spinStartDelay?: number;
    reelSpinDuration?: number;
    reelStopDuration?: number; // GSAP tween duration
    reelStopDelayBetween?: number; // Stagger
    winPresentationDelay?: number;
    symbolWinAnimation?: { duration: number; ease?: string };
    // Add timings for features, transitions, turbo mode variations
}

// --- Features --- 

export interface FreeSpinsParameters {
    triggerSymbolId: string;
    minTriggerCount: number;
    spinsAwarded: number[] | Record<number, number>; // Spins per trigger count
    retriggerPossible?: boolean;
    // Add configs for multipliers, special symbols, collection mechanics etc.
}

export interface FeatureBuyOption {
    id: string;
    costMultiplier: number; // Times current bet
    triggersFeature: string; // e.g., 'freeSpins'
    description?: string;
}

export interface FeatureParameters {
    freeSpins?: FreeSpinsParameters;
    featureBuy?: FeatureBuyOption[];
    // Add parameters for other engine-supported features
}

// --- Main Game Configuration Structure --- 

export interface GameConfiguration {
    settings: GameSettings;
    paytable: Paytable;
    reelStrips: ReelStripSet;
    paylines?: PaylineSet; // Optional if not a line game
    // Add other top-level configs (ways, cluster definitions)
    featureParameters?: FeatureParameters;
}

// --- Strategy Interfaces (Example) ---

// Interface for a win evaluator strategy
export interface IWinEvaluationInput { /* reel results, config, state */ }
export interface IWinEvaluationOutput { /* winning lines info */ }
export interface IWinEvaluator {
    evaluate(input: IWinEvaluationInput): IWinEvaluationOutput;
}

// Interface for spin cycle reaction logic
export interface ISpinReactionInput { /* reel results, config, state */ }
export interface ISpinReactionOutput { /* next state/actions */ }
export interface ISpinReactor {
    react(input: ISpinReactionInput): ISpinReactionOutput;
}

```

## 4. Configuration in `games/*` Packages

*   Each game package (e.g., `packages/games/my-awesome-game/`) will have a `src/config/` directory.
*   Inside this directory, files like `settings.ts`, `symbols.ts`, `reels.ts`, `paylines.ts`, `assets.ts`, `sounds.ts`, `features.ts` will export objects that **implement the corresponding interfaces** defined in `game-configs`.
*   A main `src/config/index.ts` file typically imports all these specific configurations and exports a single `gameConfiguration: GameConfiguration` object.
*   This `gameConfiguration` object is what gets passed to the `engine-core`'s main `<GameContainer>` component.

## 5. Extensibility via Configuration

The engine achieves extensibility primarily through these configuration points:

*   **Mechanic Flags:** `GameSettings.reels.mechanism` and `GameSettings.winEvaluation.mechanism` tell the engine core which internal logic paths or components to use (e.g., `StandardReelStrip` vs. `MegawaysReelStrip`, `line-evaluator` vs. `ways-evaluator`).
*   **Feature Flags & Parameters:** `GameSettings.features` and `FeatureParameters` enable/disable and configure engine-supported features (like Free Spins, Feature Buy) on a per-game basis.
*   **Asset Definitions:** By defining all assets (textures, sounds, etc.) externally, each game has complete control over its visual and auditory theme.
*   **Animation Timings:** Allows tuning the pace and feel of each game without changing engine code.
*   **(Advanced) Strategy Injection:** If using the strategy pattern, the game config could potentially specify which implementation of `IWinEvaluator` or `ISpinReactor` to use, allowing for fundamentally different core behaviors defined partly or wholly within the game package itself.

This configuration-driven approach ensures that `engine-core` remains generic and reusable, while individual games have deep control over their specific implementation and characteristics.
