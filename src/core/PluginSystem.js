/**
 * @module PluginSystem
 * @description Manages the lifecycle and registration of game feature plugins.
 * Allows for modular addition of features like Autoplay, Free Spins, etc.
 *
 * Dependencies (Injected):
 * - logger: For logging system events.
 * - eventBus: Potentially for plugins to subscribe to core events or emit their own.
 * - Other core dependencies might be passed down as needed (e.g., configService).
 */

// Import types for JSDoc
import { Logger } from '../utils/Logger.js';
import { EventBus } from '../utils/EventBus.js';

// Define a basic plugin interface structure (for documentation/guidance)
/**
 * @typedef {object} IPlugin
 * @property {string} name - Unique name for the plugin.
 * @property {string} [version] - Optional version string.
 * @property {Function} init - Initialization function, receives core dependencies.
 * @property {Function} [destroy] - Optional cleanup function.
 * // Add other potential lifecycle hooks as needed (e.g., onGameReady, onSpinStart)
 */

export class PluginSystem {
    /** @type {import('../utils/Logger.js').Logger | null} */
    logger = null;
    /** @type {import('../utils/EventBus.js').EventBus | null} */
    eventBus = null;
    /** @type {Map<string, IPlugin>} */
    plugins = new Map();
    /** @type {object | null} */
    coreDependencies = null; // To store dependencies to pass to plugins

    /**
     * @param {object} dependencies
     * @param {import('../utils/Logger.js').Logger} dependencies.logger
     * @param {import('../utils/EventBus.js').EventBus} dependencies.eventBus
     * // Add other core dependencies needed by plugins here
     */
    constructor(dependencies) {
        this.logger = dependencies.logger;
        this.eventBus = dependencies.eventBus;
        // Store all dependencies for potential use by plugins
        this.coreDependencies = dependencies;

        if (!this.logger || !this.eventBus) {
            console.error("PluginSystem: Logger and EventBus are required dependencies.");
            // Handle error appropriately
        }
        this.logger?.info('PluginSystem', 'Instance created.');
    }

    /**
     * Registers a plugin instance with the system.
     * @param {IPlugin} pluginInstance - An instance of a class/object conforming to IPlugin.
     */
    registerPlugin(pluginInstance) {
        if (!pluginInstance || typeof pluginInstance !== 'object' || !pluginInstance.name) {
            this.logger?.error('PluginSystem', 'Failed to register plugin: Invalid instance or missing/empty name.', pluginInstance);
            return;
        }

        const pluginName = pluginInstance.name;
        if (this.plugins.has(pluginName)) {
            this.logger?.warn('PluginSystem', `Plugin \"${pluginName}\" already registered. Overwriting.`);
        }

        // Basic validation of required methods (can be expanded)
        if (typeof pluginInstance.init !== 'function') {
             this.logger?.warn('PluginSystem', `Plugin \"${pluginName}\" registered without an init method.`);
             // Decide if this is an error or just a warning
        }
         if (typeof pluginInstance.destroy !== 'function') {
             this.logger?.warn('PluginSystem', `Plugin \"${pluginName}\" registered without a destroy method.`);
         }

        this.plugins.set(pluginName, pluginInstance);
        this.logger?.info('PluginSystem', `Plugin \"${pluginName}\" registered successfully${pluginInstance.version ? ' (v' + pluginInstance.version + ')' : ''}.`);
    }

    /**
     * Unregisters a plugin by its name.
     * @param {string} pluginName - The name of the plugin to unregister.
     */
    unregisterPlugin(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (plugin) {
            // Attempt to destroy before unregistering
            if (typeof plugin.destroy === 'function') {
                try {
                    plugin.destroy();
                    this.logger?.info('PluginSystem', `Plugin \"${pluginName}\" destroy method called.`);
                } catch (error) {
                     this.logger?.error('PluginSystem', `Error destroying plugin \"${pluginName}\":`, error);
                }
            }
            this.plugins.delete(pluginName);
            this.logger?.info('PluginSystem', `Plugin \"${pluginName}\" unregistered.`);
        } else {
            this.logger?.warn('PluginSystem', `Attempted to unregister non-existent plugin \"${pluginName}\".`);
        }
    }

    /**
     * Calls the init method on all registered plugins, passing core dependencies.
     */
    initializePlugins() {
        if (!this.coreDependencies) {
            this.logger?.error('PluginSystem', 'Cannot initialize plugins: Core dependencies missing for PluginSystem itself.');
            return;
        }
        this.logger?.info('PluginSystem', `Initializing ${this.plugins.size} registered plugins...`);

        this.plugins.forEach((plugin, name) => {
            if (typeof plugin.init === 'function') {
                try {
                    this.logger?.debug('PluginSystem', `Initializing plugin \"${name}\"...`);
                    plugin.init(this.coreDependencies);
                } catch (error) {
                    this.logger?.error('PluginSystem', `Error initializing plugin \"${name}\":`, error);
                    // Optionally unregister problematic plugins?
                }
            }
        });
        this.logger?.info('PluginSystem', 'Plugin initialization complete.');
    }

    /**
     * Calls the destroy method on all registered plugins.
     */
    destroyPlugins() {
        this.logger?.info('PluginSystem', `Destroying ${this.plugins.size} registered plugins...`);

        this.plugins.forEach((plugin, name) => {
             if (typeof plugin.destroy === 'function') {
                 try {
                     plugin.destroy();
                     this.logger?.debug('PluginSystem', `Plugin \"${name}\" destroy method called.`);
                 } catch (error) {
                      this.logger?.error('PluginSystem', `Error destroying plugin \"${name}\":`, error);
                 }
             }
        });

        // Clear the map after destroying
        this.plugins.clear();
        this.logger?.info('PluginSystem', 'All plugins destroyed and system cleaned up.');

        // Nullify core dependencies reference
        this.coreDependencies = null;
        this.logger = null;
        this.eventBus = null;
    }

    // --- Add methods for other lifecycle hooks if needed ---
    // e.g., broadcastEvent(eventName, payload) to specific plugins
    // e.g., executeHook(hookName, ...args)
}