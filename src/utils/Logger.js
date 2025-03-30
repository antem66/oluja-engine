const LOG_LEVELS = {
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  NONE: 5, // Level to disable logging
};

export class Logger {
  constructor() {
    // Configuration will be loaded here later (Task 4.6)
    this.config = {
      // Default log level - Show INFO and above
      defaultLevel: LOG_LEVELS.INFO, 
      // Example structure for domain-specific levels:
      // domains: {
      //   'ApiService': LOG_LEVELS.DEBUG,
      //   'UIManager': LOG_LEVELS.WARN,
      // }
    };
  }

  // Placeholder for loading config later
  loadConfig(config) {
    this.config = { ...this.config, ...config };
    console.log("[Logger] Configuration loaded:", this.config);
  }

  _log(level, domain, ...args) {
    // TODO (Task 4.6): Implement domain-specific filtering based on this.config.domains
    // --- Basic Level Filtering --- 
    const configuredLevel = this.config.defaultLevel || LOG_LEVELS.DEBUG; // Default to DEBUG if not set
    if (level < configuredLevel) {
        return; // Don't log if level is below configured level
    }
    // --- End Basic Level Filtering ---

    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level) || 'LOG';

    const logMethod = 
        level === LOG_LEVELS.ERROR ? console.error :
        level === LOG_LEVELS.WARN ? console.warn :
        level === LOG_LEVELS.INFO ? console.info :
        console.log; // Default to console.log for DEBUG and others

    logMethod(`[${timestamp}] [${levelName}] [${domain}]`, ...args);
  }

  debug(domain, ...args) {
    this._log(LOG_LEVELS.DEBUG, domain, ...args);
  }

  info(domain, ...args) {
    this._log(LOG_LEVELS.INFO, domain, ...args);
  }

  warn(domain, ...args) {
    this._log(LOG_LEVELS.WARN, domain, ...args);
  }

  error(domain, ...args) {
    this._log(LOG_LEVELS.ERROR, domain, ...args);
  }
}

// Export a global instance for now.
export const logger = new Logger(); 