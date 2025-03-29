/**
 * @module PluginSystem
 * @description Manages the registration, initialization, and lifecycle of game plugins.
 * Plugins extend core engine functionality for specific games or features.
 *
 * Dependencies (Injected):
 * - logger: For logging system actions.
 * - eventBus: Potentially for plugins to interact with core events.
 * - featureManager: For plugins to check feature flags.
 * - (Potentially others like gameInstance, configService, etc. added later)
 *
 * Key Methods:
 * - constructor(dependencies)
 * - registerPlugin(pluginInstance): Adds a plugin.
 * - initializePlugins(): Calls init() on all registered plugins.
 * - destroyPlugins(): Calls destroy() on all registered plugins.
 * - getPlugin(pluginName): Retrieves a registered plugin instance.
 */

import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';
import { FeatureManager } from '../utils/FeatureManager.js';

/**
 * @typedef {object} Plugin
 * @property {string} name - Unique name for the plugin.
 * @property {function(object): void} [init] - Optional initialization method, receives dependencies.
 * @property {function(): void} [destroy] - Optional cleanup method.
 * @property {string} [version] - Optional version string.
 */

/**
 * @typedef {object} PluginSystemDependencies
 * @property {Logger} logger
 * @property {EventBus} eventBus
 * @property {FeatureManager} featureManager
 * // Add other dependencies plugins might need (e.g., configService, animationController, reelManager)
 */

export class PluginSystem {
    /** @type {PluginSystemDependencies | null} */
    dependencies = null;
    /** @type {Map<string, Plugin>} */
    plugins = null;
    /** @type {Logger | Console} */
    logger = console; // Fallback to console if logger missing

    /**
     * @param {PluginSystemDependencies} dependencies
     */
    constructor(dependencies) {
        if (!dependencies || !dependencies.logger || !dependencies.eventBus || !dependencies.featureManager) {
            console.error('PluginSystem Error: Missing core dependencies (logger, eventBus, featureManager).');
            // Allow construction but functionality will be limited
        }
        this.dependencies = dependencies;
        this.logger = dependencies?.logger || console;
        this.plugins = new Map();
        this.logger.info('PluginSystem', 'Instance created.');
    }

    /**
     * Registers a plugin instance.
     * @param {Plugin} pluginInstance - An instance of a plugin adhering to the Plugin interface.
     * @returns {boolean} True if registration was successful, false otherwise.
     */
    registerPlugin(pluginInstance) {
        if (!pluginInstance || typeof pluginInstance.name !== 'string' || !pluginInstance.name) {
            this.logger.error('PluginSystem', 'Failed to register plugin: Invalid instance or missing/empty name.', pluginInstance);
            return false;
        }

        const pluginName = pluginInstance.name;

        if (this.plugins.has(pluginName)) {
            this.logger.warn('PluginSystem', `Plugin "${pluginName}" already registered. Overwriting.`);
        }

        // Basic validation (check for expected methods)
        if (typeof pluginInstance.init !== 'function' && typeof pluginInstance.destroy !== 'function') {
             this.logger.warn('PluginSystem', `Plugin "${pluginName}" registered without an init or destroy method.`);
        }

        this.plugins.set(pluginName, pluginInstance);
        this.logger.info('PluginSystem', `Plugin "${pluginName}" registered successfully${pluginInstance.version ? ' (v' + pluginInstance.version + ')' : ''}.`);
        return true;
    }

    /**
     * Unregisters a plugin by name. Calls destroy() if available.
     * @param {string} pluginName
     */
    unregisterPlugin(pluginName) {
         const plugin = this.plugins.get(pluginName);
         if (plugin) {
             if (typeof plugin.destroy === 'function') {
                 try {
                     plugin.destroy();
                     this.logger.info('PluginSystem', `Plugin \"${pluginName}\" destroy method called.`);
                 } catch (error) {
                     this.logger.error('PluginSystem', `Error destroying plugin \"${pluginName}\":`, error);
                 }
             }
             this.plugins.delete(pluginName);
             this.logger.info('PluginSystem', `Plugin \"${pluginName}\" unregistered.`);
         } else {
             this.logger.warn('PluginSystem', `Attempted to unregister non-existent plugin \"${pluginName}\".`);
         }
    }


    /**
     * Calls the init() method on all registered plugins, passing dependencies.
     */
    initializePlugins() {
        if (!this.dependencies) {
            this.logger.error('PluginSystem', 'Cannot initialize plugins: Core dependencies missing for PluginSystem itself.');
            return;
        }
        this.logger.info('PluginSystem', `Initializing ${this.plugins.size} registered plugins...`);
        this.plugins.forEach((plugin, name) => {
            if (typeof plugin.init === 'function') {
                try {
                    this.logger.debug('PluginSystem', `Initializing plugin \"${name}\"...`);
                    plugin.init(this.dependencies); // Pass core dependencies to plugin
                } catch (error) {
                    this.logger.error('PluginSystem', `Error initializing plugin \"${name}\":`, error);
                    // Optionally unregister faulty plugin?
                    // this.unregisterPlugin(name);
                }
            }
        });
        this.logger.info('PluginSystem', 'Plugin initialization complete.');
    }

    /**
     * Calls the destroy() method on all registered plugins and cleans up the system.
     */
    destroyPlugins() {
        this.logger.info('PluginSystem', `Destroying ${this.plugins.size} registered plugins...`);
        // Iterate using keys to allow safe deletion during iteration if unregisterPlugin is called inside destroy
        const pluginNames = Array.from(this.plugins.keys());
        pluginNames.forEach(name => {
            this.unregisterPlugin(name); // unregisterPlugin handles calling destroy
        });
        this.plugins.clear(); // Ensure map is empty
        this.dependencies = null; // Release references
        this.logger.info('PluginSystem', 'All plugins destroyed and system cleaned up.');
    }

    /**
     * Retrieves a registered plugin instance by name.
     * @param {string} pluginName
     * @returns {Plugin | undefined}
     */
    getPlugin(pluginName) {
        return this.plugins.get(pluginName);
    }

    /**
     * Gets an array of all registered plugin names.
     * @returns {string[]}
     */
    getRegisteredPluginNames() {
        return Array.from(this.plugins.keys());
    }
}