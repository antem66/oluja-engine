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

// Define plugin interfaces
/**
 * Describes the static properties expected on a Plugin Class Constructor.
 * @typedef {object} IPluginStatics
 * @property {string} pluginName - Unique name for the plugin.
 * @property {string} [pluginVersion] - Optional version string.
 */

/**
 * Describes the instance methods expected on a Plugin Instance.
 * @typedef {object} IPluginInstance
 * @property {Function} init - Initialization function.
 * @property {Function} [destroy] - Optional cleanup function.
 */

/**
 * Represents the Plugin Class Constructor type, combining statics and constructor signature.
 * @typedef {IPluginStatics & { new(dependencies: object): IPluginInstance }} PluginClassConstructor
 */

export class PluginSystem {
    /** @type {import('../utils/Logger.js').Logger | null} */
    logger = null;
    /** @type {import('../utils/EventBus.js').EventBus | null} */
    eventBus = null;

    // Store constructors and active instances separately
    /** @type {Map<string, PluginClassConstructor>} */
    registeredPluginConstructors = new Map();
    /** @type {Map<string, IPluginInstance>} */
    activePluginInstances = new Map();

    /** @type {object | null} */
    coreDependencies = null; // To store dependencies to pass to plugins

    /**
     * @param {object} dependencies - Core dependencies from Game.js
     */
    constructor(dependencies) {
        this.logger = dependencies.logger;
        this.eventBus = dependencies.eventBus;
        this.coreDependencies = dependencies;

        if (!this.logger || !this.eventBus) {
            console.error("PluginSystem: Logger and EventBus are required dependencies.");
        }
        this.logger?.info('PluginSystem', 'Instance created.');
    }

    /**
     * Registers a plugin class constructor with the system.
     * The class MUST have a static `pluginName` property.
     * @param {PluginClassConstructor} PluginClass - The plugin class constructor.
     */
    registerPlugin(PluginClass) {
        if (!PluginClass || typeof PluginClass !== 'function') {
            this.logger?.error('PluginSystem', 'Failed to register plugin: Invalid class provided.', { constructor: PluginClass });
            return;
        }

        // @ts-ignore - Accessing static properties
        const pluginName = PluginClass.pluginName;
        // @ts-ignore - Accessing static properties
        const pluginVersion = PluginClass.pluginVersion;

        if (!pluginName || typeof pluginName !== 'string') {
            this.logger?.error('PluginSystem', 'Failed to register plugin: Class is missing static \'pluginName\' string property.', { constructor: PluginClass });
            return;
        }

        if (this.registeredPluginConstructors.has(pluginName)) {
            this.logger?.warn('PluginSystem', `Plugin class \"${pluginName}\" already registered. Overwriting.`);
        }

        this.registeredPluginConstructors.set(pluginName, PluginClass);
        this.logger?.info('PluginSystem', `Plugin class \"${pluginName}\" registered successfully${pluginVersion ? ' (v' + pluginVersion + ')' : ''}.`);
    }

    /**
     * Unregisters a plugin class by its name.
     * Also destroys the active instance if it exists.
     * @param {string} pluginName - The name of the plugin to unregister.
     */
    unregisterPlugin(pluginName) {
        const constructorExists = this.registeredPluginConstructors.has(pluginName);
        const instance = this.activePluginInstances.get(pluginName);

        // Destroy instance first if it exists
        if (instance) {
            if (typeof instance.destroy === 'function') {
                try {
                    instance.destroy();
                    this.logger?.info('PluginSystem', `Active plugin instance \"${pluginName}\" destroy method called.`);
                } catch (error) {
                    this.logger?.error('PluginSystem', `Error destroying active plugin instance \"${pluginName}\":`, error);
                }
            }
            this.activePluginInstances.delete(pluginName);
            this.logger?.info('PluginSystem', `Active plugin instance \"${pluginName}\" removed.`);
        }

        // Then remove the constructor registration
        if (constructorExists) {
            this.registeredPluginConstructors.delete(pluginName);
            this.logger?.info('PluginSystem', `Plugin class \"${pluginName}\" unregistered.`);
        } else if (!instance) {
            this.logger?.warn('PluginSystem', `Attempted to unregister non-existent plugin \"${pluginName}\".`);
        }
    }

    /**
     * Instantiates and calls the init method on all registered plugin classes.
     */
    initializePlugins() {
        if (!this.coreDependencies) {
            this.logger?.error('PluginSystem', 'Cannot initialize plugins: Core dependencies missing for PluginSystem itself.');
            return;
        }
        this.logger?.info('PluginSystem', `Initializing ${this.registeredPluginConstructors.size} registered plugin classes...`);

        this.registeredPluginConstructors.forEach((PluginClass, name) => {
            if (this.activePluginInstances.has(name)) {
                this.logger?.warn('PluginSystem', `Plugin \"${name}\" instance already exists. Skipping initialization.`);
                return;
            }

            try {
                this.logger?.debug('PluginSystem', `Instantiating and initializing plugin \"${name}\"...`);
                // Instantiate using the stored constructor and core dependencies
                const instance = new PluginClass(this.coreDependencies);

                // Call init on the new instance
                if (typeof instance.init === 'function') {
                    instance.init();
                } else {
                    this.logger?.warn('PluginSystem', `Plugin \"${name}\" instance created but lacks an init() method.`);
                }
                // Store the active instance
                this.activePluginInstances.set(name, instance);

            } catch (error) {
                this.logger?.error('PluginSystem', `Error instantiating or initializing plugin \"${name}\":`, error);
            }
        });
        this.logger?.info('PluginSystem', 'Plugin initialization complete.');
    }

    /**
     * Calls the destroy method on all active plugin instances.
     */
    destroyPlugins() {
        this.logger?.info('PluginSystem', `Destroying ${this.activePluginInstances.size} active plugin instances...`);

        this.activePluginInstances.forEach((instance, name) => {
             if (typeof instance.destroy === 'function') {
                 try {
                     instance.destroy();
                     this.logger?.debug('PluginSystem', `Plugin \"${name}\" destroy method called.`);
                 } catch (error) {
                      this.logger?.error('PluginSystem', `Error destroying plugin \"${name}\":`, error);
                 }
             }
        });

        // Clear the maps after destroying
        this.activePluginInstances.clear();
        this.registeredPluginConstructors.clear();
        this.logger?.info('PluginSystem', 'All plugins destroyed and system cleaned up.');

        // Nullify core dependencies reference
        this.coreDependencies = null;
        this.logger = null;
        this.eventBus = null;
    }
}