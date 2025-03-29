# API Interfaces

This document defines the expected data structures for communication between different modules, particularly for events and API service responses.

## Event: `server:spinResultReceived`

Payload Type: `SpinResult`

Emitted by `ApiService` upon receiving a successful spin result from the backend (or generating a mock one). Consumed by `Game` (or a future `SpinController`) to process the spin outcome.

### `SpinResult` Interface

```typescript
interface SpinResult {
  stopPositions: number[]; // Array of stop indices [reel0, reel1, ...] length === NUM_REELS. Represents the final symbol index at the center payline (or reference line) for each reel.
  finalSymbolGrid?: string[][]; // Optional: The complete symbol grid [reelIdx][rowIdx] as determined by the server. Used for validation and potentially bypassing client-side grid reconstruction.
  winningLines: WinningLineInfo[]; // Array of all winning line details for this spin. Empty array if no win.
  totalWin: number; // The total combined win amount for this spin.
  finalBalance: number; // The player's definitive balance AFTER the spin completes (includes the win, accounts for the bet). The server is the source of truth.
  featureTriggers: FeatureTriggerInfo[]; // Array detailing any special features triggered by this spin (e.g., free spins, bonus games). Empty array if no features triggered.
}
```

### `WinningLineInfo` Interface

Defines the details of a single winning payline.

```typescript
interface WinningLineInfo {
  lineIndex: number; // Index of the payline definition (from `config/paylines.js`) that triggered the win.
  symbolId: string; // The ID (from `config/symbolDefinitions.js`) of the winning symbol.
  count: number; // Number of consecutive matching symbols on the payline (starting from the left).
  winAmount: number; // Amount won for this specific line.
  positions?: number[][]; // Optional: Precise coordinates [reelIndex, rowIndex] of each symbol instance contributing to this win. Useful for highlighting specific symbols.
}
```

### `FeatureTriggerInfo` Interface

Defines the details of a triggered game feature.

```typescript
interface FeatureTriggerInfo {
  type: 'FreeSpins' | 'BonusGameX' | string; // A unique identifier for the type of feature triggered (e.g., 'FreeSpins', 'PickMeBonus', 'JackpotWheel').
  // Additional data specific to the feature type:
  count?: number; // Example: Number of free spins awarded.
  multiplier?: number; // Example: Initial multiplier for the feature round.
  entryData?: any; // Example: Data needed to initialize a specific bonus game state.
  // ... other potential feature-specific data properties.
}
``` 