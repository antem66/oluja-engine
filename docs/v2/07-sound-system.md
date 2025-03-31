# V2 Slot Engine: Sound System

This document describes the approach for managing and playing audio within the V2 engine.

## 1. Goals

*   Allow easy configuration of sounds per game.
*   Support different sound types (SFX, music, ambient).
*   Enable control over volume and looping.
*   Provide a simple API for triggering sounds from game logic and animations.
*   Ensure efficient loading and management of audio assets.

## 2. Technology Choice

While PixiJS has `pixi-sound`, a dedicated and widely used library like **Howler.js** is recommended due to its robustness, cross-browser compatibility, spatial audio features (if ever needed), and explicit focus on game audio challenges.

## 3. Configuration (`game-configs` & `games/*`)

1.  **`game-configs/src/types.ts`:**
    *   Defines the `SoundDefinition` interface:
        ```typescript
        export interface SoundDefinition {
            key: string;        // Unique sound ID (e.g., 'spinClick', 'winSmall', 'fsMusic')
            assetKey: string;   // Key matching an audio asset in the AssetManifest
            volume?: number;   // Default volume (0.0 to 1.0)
            loop?: boolean;    // Should the sound loop by default?
            type?: 'sfx' | 'music' | 'ambient'; // Optional category for group control
        }
        ```
    *   Defines the `SoundConfig` type:
        ```typescript
        export type SoundConfig = Record<string, SoundDefinition>; // Map sound ID to its definition
        ```
    *   The main `GameSettings` interface includes `soundConfig?: SoundConfig;`.

2.  **`games/[game-name]/src/config/sounds.ts`:**
    *   This file exports a `soundConfig: SoundConfig` object.
    *   It defines all sounds used by the game, implementing the `SoundDefinition` interface for each and mapping them by their `key`.
    *   Ensures `assetKey` correctly references audio files defined in the game's `assets.ts` (`AssetManifest`).

## 4. Implementation (`engine-core`)

1.  **Asset Loading (`hooks/useAssets.ts`):**
    *   The asset loader hook is responsible for loading audio files (flagged with `type: 'sound'` in the `AssetManifest`) using `PIXI.Assets`. Howler.js can often work directly with the browser's AudioContext or loaded audio buffers/URLs, so direct loading via Howler might also be an option within the SoundManager if preferred over relying solely on Pixi Assets for audio.

2.  **Sound Service (`services/SoundManager.ts`):**
    *   This service encapsulates the interaction with the chosen audio library (e.g., Howler.js).
    *   **Initialization:** Takes the `SoundConfig` and potentially loaded audio data/URLs.
    *   **Core Methods:**
        *   `loadSounds()`: Preloads sounds if needed (Howler often handles this).
        *   `playSound(key: string, options?: { volume?: number; loop?: boolean; /* other overrides */ }): number | null`: Plays the sound identified by `key`, returning an ID for potential control.
        *   `stopSound(soundId: number): void`: Stops a specific instance of a sound.
        *   `stopAllSounds(type?: 'sfx' | 'music'): void`: Stops all sounds or sounds of a specific type.
        *   `setVolume(key: string, volume: number): void` or `setGlobalVolume(volume: number, type?: 'sfx' | 'music'): void`: Adjusts volume.
        *   `fade(soundId: number, fromVolume: number, toVolume: number, duration: number): void`: Volume fading.
        *   `setMusic(key: string, options?: { /* volume, loop, fadeDuration */ }): void`: Helper specifically for handling background music (stopping previous, starting new, fading).
    *   Manages instances of playing sounds (using Howler's internal handling).

3.  **Sound Hook (`hooks/useSound.ts`):**
    *   The primary interface for React components and other hooks to interact with the sound system.
    *   **Initialization:** Gets the `SoundManager` instance (potentially created once and provided via Context or a singleton pattern).
    *   **Exports Functions:** Wraps the `SoundManager` methods in stable functions:
        *   `playSound(key: string)`
        *   `stopSound(soundId: number)`
        *   `stopAllSounds(type?: 'sfx' | 'music')`
        *   `setMusic(key: string)`
        *   `setGlobalVolume(volume: number)`
    *   May also access global sound settings (e.g., master volume, mute state) from the Zustand store (`useGameState`) and pass them to the `SoundManager`.

## 5. Usage

*   **Triggering SFX:**
    *   In UI components: `const { playSound } = useSound(); <Button onClick={() => playSound('spinClick')} />`
    *   In animation callbacks: `gsap.timeline({ onComplete: () => playSound('reelStop') })`
    *   In feature logic hooks: `useEffect(() => { if (didWin) playSound('winSmall'); }, [didWin]);`
*   **Managing Music:**
    *   Call `setMusic('fsMusic')` when entering Free Spins state.
    *   Call `setMusic('baseGameMusic')` when returning to the base game.
*   **Global Controls:** A settings UI could use `setGlobalVolume` based on user input stored in Zustand.

## 6. Considerations

*   **Audio Sprites:** For numerous short SFX, consider using audio sprites (multiple sounds in one file with timing data) if supported by the library, to reduce requests and improve loading.
*   **Performance:** Be mindful of the number of sounds playing simultaneously, especially on mobile.
*   **User Experience:** Provide clear user controls for muting or adjusting volume.
*   **Loading:** Decide on a strategy for loading sounds (preload all, load per bundle, stream music).
