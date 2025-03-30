export class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) {
        return;
    }
    this.listeners[event].forEach(callback => {
        try {
            callback(data);
        } catch (error) {
            console.error(`EventBus: Error in listener for event '${event}':`, error);
        }
    });
  }
}

export const globalEventBus = new EventBus(); 