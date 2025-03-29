import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResultHandler } from '../src/core/ResultHandler.js';

// Mock dependencies
let mockEventBus;
let mockLogger;
let mockReelManager;
let mockUnsubscribe;

// Helper to create mock reels
const createMockReels = (count) => {
    const reels = [];
    for (let i = 0; i < count; i++) {
        reels.push({ finalStopPosition: -1 }); // Mock reel object
    }
    return reels;
};

describe('ResultHandler', () => {
    beforeEach(() => {
        // Reset mocks before each test
        vi.restoreAllMocks();

        mockUnsubscribe = vi.fn();
        mockEventBus = {
            on: vi.fn(() => mockUnsubscribe), // Return the mock unsubscribe function
            off: vi.fn(),
            emit: vi.fn(),
        };
        mockLogger = {
            info: vi.fn(),
            debug: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };
        mockReelManager = {
            reels: createMockReels(5), // Default to 5 mock reels
        };
    });

    it('constructor should store dependencies and log info', () => {
        const handler = new ResultHandler({
            eventBus: mockEventBus,
            logger: mockLogger,
            reelManager: mockReelManager
        });
        expect(handler.eventBus).toBe(mockEventBus);
        expect(handler.logger).toBe(mockLogger);
        expect(handler.reelManager).toBe(mockReelManager);
        expect(mockLogger.info).toHaveBeenCalledWith('ResultHandler', 'Instance created.');
    });

    it('constructor should log error via console if dependencies are missing', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        // @ts-ignore - Intentionally missing deps
        new ResultHandler({ logger: mockLogger }); // Missing eventBus and reelManager
        expect(consoleErrorSpy).toHaveBeenCalledWith('ResultHandler: Missing dependencies (eventBus, logger, reelManager).');
        consoleErrorSpy.mockRestore();
    });

    it('init should subscribe to server:spinResultReceived and log info', () => {
        const handler = new ResultHandler({ eventBus: mockEventBus, logger: mockLogger, reelManager: mockReelManager });
        handler.init();
        expect(mockEventBus.on).toHaveBeenCalledWith('server:spinResultReceived', expect.any(Function));
        expect(handler._unsubscribeSpinResult).toBe(mockUnsubscribe);
        expect(mockLogger.info).toHaveBeenCalledWith('ResultHandler', 'Initialized and subscribed to server:spinResultReceived.');
    });

    it('init should log error if EventBus is missing', () => {
         // @ts-ignore - Intentionally missing EventBus
         const handler = new ResultHandler({ eventBus: null, logger: mockLogger, reelManager: mockReelManager });
         handler.init();
         expect(mockLogger.error).toHaveBeenCalledWith('ResultHandler', 'Cannot init - EventBus is missing.');
         expect(mockEventBus.on).not.toHaveBeenCalled();
    });

    it('destroy should call unsubscribe function and log info if initialized', () => {
        const handler = new ResultHandler({ eventBus: mockEventBus, logger: mockLogger, reelManager: mockReelManager });
        handler.init(); // Initialize to get the unsubscribe function
        handler.destroy();
        expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
        expect(handler._unsubscribeSpinResult).toBeNull();
        expect(mockLogger.info).toHaveBeenCalledWith('ResultHandler', 'Unsubscribed from server:spinResultReceived.');
    });

    it('destroy should not throw or log if called before init or multiple times', () => {
        const handler = new ResultHandler({ eventBus: mockEventBus, logger: mockLogger, reelManager: mockReelManager });
        expect(() => {
            handler.destroy(); // Called before init
            handler.destroy(); // Called again
        }).not.toThrow();
        expect(mockUnsubscribe).not.toHaveBeenCalled();
        // Check specific log message isn't present
        const unsubscribeLogCall = mockLogger.info.mock.calls.find(call => call[1] === 'Unsubscribed from server:spinResultReceived.');
        expect(unsubscribeLogCall).toBeUndefined();
    });

    describe('_handleSpinResultReceived', () => {
        let handler;
        let handlerCallback;

        beforeEach(() => {
            // Create handler and capture the callback passed to eventBus.on
            handler = new ResultHandler({ eventBus: mockEventBus, logger: mockLogger, reelManager: mockReelManager });
            handler.init();
            // Get the actual callback function passed to eventBus.on
            handlerCallback = mockEventBus.on.mock.calls[0][1];
        });

        it('should log error if eventData or eventData.data is missing', () => {
            handlerCallback(null); // Missing eventData
            handlerCallback({});   // Missing eventData.data
            expect(mockLogger.error).toHaveBeenCalledWith('ResultHandler', 'Received spin result event with invalid data.', null);
            expect(mockLogger.error).toHaveBeenCalledWith('ResultHandler', 'Received spin result event with invalid data.', {});
            expect(mockReelManager.reels[0].finalStopPosition).toBe(-1); // Ensure reels not modified
        });

        it('should log error if stopPositions is invalid (not array or wrong length)', () => {
            handlerCallback({ data: { stopPositions: null } });
            expect(mockLogger.error).toHaveBeenCalledWith('ResultHandler', 'Received invalid stopPositions data.', null);

            handlerCallback({ data: { stopPositions: [0, 1, 2] } }); // Wrong length (expected 5)
            expect(mockLogger.error).toHaveBeenCalledWith('ResultHandler', 'Received invalid stopPositions data.', [0, 1, 2]);

            expect(mockReelManager.reels[0].finalStopPosition).toBe(-1);
        });

        it('should log error if ReelManager is missing during handling', () => {
            handler.reelManager = null; // Simulate ReelManager becoming unavailable
            const validData = { data: { stopPositions: [10, 20, 30, 40, 50] } };
            handlerCallback(validData);
            expect(mockLogger.error).toHaveBeenCalledWith('ResultHandler', 'Cannot handle spin result - ReelManager is missing.');
        });

        it('should set finalStopPosition on each reel and emit reels:stopsSet', () => {
            const stops = [10, 20, 30, 40, 50];
            const eventData = { data: { stopPositions: stops } };

            handlerCallback(eventData);

            expect(mockLogger.info).toHaveBeenCalledWith('ResultHandler', 'Received spin result. Setting reel stop positions:', stops);
            stops.forEach((pos, index) => {
                expect(mockReelManager.reels[index].finalStopPosition).toBe(pos);
                expect(mockLogger.debug).toHaveBeenCalledWith('ResultHandler', `Set stop position ${pos} for reel ${index}`);
            });
            expect(mockEventBus.emit).toHaveBeenCalledWith('reels:stopsSet', { stopPositions: stops });
        });

        it('should handle case where a reel is missing in reelManager.reels', () => {
            mockReelManager.reels[2] = null; // Simulate a missing reel
            const stops = [10, 20, 30, 40, 50];
            const eventData = { data: { stopPositions: stops } };

            handlerCallback(eventData);

            expect(mockReelManager.reels[0].finalStopPosition).toBe(10);
            expect(mockReelManager.reels[1].finalStopPosition).toBe(20);
            // Reel 2 was null
            expect(mockReelManager.reels[3].finalStopPosition).toBe(40);
            expect(mockReelManager.reels[4].finalStopPosition).toBe(50);
            expect(mockLogger.warn).toHaveBeenCalledWith('ResultHandler', 'Reel not found at index 2 when setting stop position.');
            expect(mockEventBus.emit).toHaveBeenCalledWith('reels:stopsSet', { stopPositions: stops }); // Event should still emit
        });
    });
});
