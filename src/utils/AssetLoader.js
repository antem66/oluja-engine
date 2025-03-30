import * as PIXI from 'pixi.js';
import { logger } from './Logger.js'; // Corrected casing

/**
 * A utility class for loading assets using PIXI.Assets.
 */
export class AssetLoader {

    /**
     * Loads assets defined in a manifest.
     * @param {string | string[] | { alias: string, src: string }[]} manifest - The asset(s) to load. Can be a single URL, an array of URLs, or an array of asset objects with alias and src properties.
     * @param {(progress: number) => void} [onProgress] - Optional callback function to report loading progress (0 to 1).
     * @returns {Promise<Record<string, any>>} A promise that resolves with the loaded asset resources or rejects on error.
     */
    static async load(manifest, onProgress) {
        logger.info('AssetLoader', 'Starting asset load...');
        if (!manifest || (Array.isArray(manifest) && manifest.length === 0)) {
            logger.warn('AssetLoader', 'Load called with empty or invalid manifest.');
            return Promise.resolve({}); // Resolve immediately if nothing to load
        }

        try {
            const resources = await PIXI.Assets.load(manifest, (progress) => {
                logger.debug('AssetLoader', `Loading progress: ${progress.toFixed(2)}`);
                if (onProgress && typeof onProgress === 'function') {
                    onProgress(progress);
                }
            });
            logger.info('AssetLoader', 'Asset load complete.');
            return resources;
        } catch (error) {
            logger.error('AssetLoader', 'Asset loading failed:', error);
            // Propagate the error so the caller can handle it
            return Promise.reject(error);
        }
    }

    /**
     * Unloads assets previously loaded by PIXI.Assets.
     * @param {string | string[]} assetsToUnload - The alias(es) or URL(s) of the assets to unload.
     * @returns {Promise<void>} A promise that resolves when unloading is complete.
     */
    static async unload(assetsToUnload) {
        if (!assetsToUnload || (Array.isArray(assetsToUnload) && assetsToUnload.length === 0)) {
            logger.warn('AssetLoader', 'Unload called with empty or invalid asset list.');
            return Promise.resolve();
        }
        logger.info('AssetLoader', 'Unloading assets:', assetsToUnload);
        try {
            await PIXI.Assets.unload(assetsToUnload);
            logger.info('AssetLoader', 'Assets unloaded successfully.');
        } catch (error) {
            logger.error('AssetLoader', 'Failed to unload assets:', error);
            // Decide if unload errors should be propagated or just logged
            // return Promise.reject(error);
        }
    }

     /**
      * Retrieves a previously loaded asset from the PIXI.Assets cache.
      * @param {string} alias - The alias or URL of the asset to retrieve.
      * @returns {any | undefined} The loaded asset resource, or undefined if not found.
      */
     static get(alias) {
         try {
             const resource = PIXI.Assets.get(alias);
             if (!resource) {
                 logger.warn('AssetLoader', `Asset with alias '${alias}' not found in cache.`);
             }
             return resource;
         } catch (error) {
             // This might happen if PIXI.Assets hasn't been initialized properly, though unlikely
             logger.error('AssetLoader', `Error retrieving asset '${alias}':`, error);
             return undefined;
         }
     }
}
