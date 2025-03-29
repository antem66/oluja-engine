import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../src/utils/EventBus.js';

describe('EventBus', () => {
  it('should register and emit events', () => {
    const eventBus = new EventBus();
    const callback = vi.fn(); // Vitest mock function
    const eventData = { message: 'Hello' };

    // Register listener
    eventBus.on('test-event', callback);

    // Emit event
    eventBus.emit('test-event', eventData);

    // Assertions
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(eventData);
  });

  it('should handle multiple listeners for the same event', () => {
    const eventBus = new EventBus();
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const eventData = { value: 42 };

    eventBus.on('multi-event', callback1);
    eventBus.on('multi-event', callback2);

    eventBus.emit('multi-event', eventData);

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback1).toHaveBeenCalledWith(eventData);
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledWith(eventData);
  });

  it('should unregister listeners using the returned function', () => {
    const eventBus = new EventBus();
    const callback = vi.fn();
    const eventData = { status: 'unregister' };

    // Register and immediately get the unregister function
    const off = eventBus.on('unregister-event', callback);

    // Unregister
    off();

    // Emit event after unregistering
    eventBus.emit('unregister-event', eventData);

    // Callback should not have been called
    expect(callback).not.toHaveBeenCalled();
  });

  it('should unregister specific listeners using off method', () => {
    const eventBus = new EventBus();
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const eventData = { name: 'specific off' };

    eventBus.on('specific-off-event', callback1);
    eventBus.on('specific-off-event', callback2);

    // Unregister only callback1
    eventBus.off('specific-off-event', callback1);

    // Emit event
    eventBus.emit('specific-off-event', eventData);

    // Assertions
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledWith(eventData);
  });

  it('should handle emitting events with no listeners', () => {
    const eventBus = new EventBus();
    
    // Expect no errors when emitting to an event with no listeners
    expect(() => eventBus.emit('no-listeners-event', { data: 'test' })).not.toThrow();
  });

  it('should handle errors within listeners without stopping others', () => {
    const eventBus = new EventBus();
    const errorCallback = vi.fn(() => { throw new Error('Listener error'); });
    const successCallback = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console error output during test

    eventBus.on('error-test', errorCallback);
    eventBus.on('error-test', successCallback);

    // Emit event
    eventBus.emit('error-test', { info: 'data' });

    // Assertions
    expect(errorCallback).toHaveBeenCalledTimes(1);
    expect(successCallback).toHaveBeenCalledTimes(1); // Ensure the second callback still runs
    expect(consoleErrorSpy).toHaveBeenCalled(); // Check if the error was logged

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
}); 