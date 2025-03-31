# V2 Slot Engine: Testing Strategy

This document outlines a recommended testing strategy for the V2 Slot Engine monorepo, aiming for confidence in correctness, maintainability, and regression prevention.

## 1. Goals of Testing

*   Verify the correctness of core engine logic (state management, feature controllers, utility functions).
*   Ensure reusable React components (`engine-core`) render and behave as expected.
*   Validate game-specific logic and components (`games/*`).
*   Prevent regressions when refactoring or adding new features.
*   Provide fast feedback during development.

## 2. Testing Pyramid

We aim for a balanced testing pyramid:

*   **Unit Tests (Largest Base):** Focus on testing small, isolated units of code (functions, hooks, utility methods, simple components) in isolation. Fast to run, easy to write.
*   **Integration Tests (Middle Layer):** Test the interaction between several units (e.g., a feature hook interacting with Zustand actions, multiple components working together). Slower than unit tests, but verify collaboration.
*   **End-to-End (E2E) Tests (Smallest Top):** Test the entire application flow from a user's perspective, interacting with the UI and potentially the backend. Slowest and most brittle, used sparingly for critical user flows.

## 3. Tools

*   **Test Runner:** **Vitest** (recommended) or Jest. Vitest is modern, fast, and has excellent TypeScript/ESM support, integrating well with Vite.
*   **Assertion Library:** Built into Vitest/Jest (e.g., `expect`).
*   **React Component Testing:** **React Testing Library (RTL)**. Focuses on testing component behavior from a user's perspective (querying elements, simulating events) rather than implementation details.
*   **Mocking/Spying:** Built into Vitest/Jest (e.g., `vi.fn()`, `vi.spyOn`).
*   **E2E Testing Framework:** Playwright (recommended) or Cypress. Playwright offers robust cross-browser testing.
*   **Code Coverage:** Vitest/Jest can generate coverage reports (e.g., using `v8` or `istanbul`).

## 4. Testing Strategies per Package

*   **`packages/shared-utils`:**
    *   **Focus:** Primarily **Unit Tests**. Verify the correctness of each utility function with various inputs.
    *   **Tools:** Vitest/Jest.

*   **`packages/game-configs`:**
    *   **Focus:** Minimal runtime testing needed as it's mostly types. Potentially **Schema Validation Tests** if using Zod/Yup to validate example configuration objects against the defined schemas.
    *   **Tools:** Vitest/Jest (for schema tests).

*   **`packages/engine-core`:**
    *   **Unit Tests:**
        *   Test individual helper functions.
        *   Test Zustand action logic (mocking `setState`).
        *   Test Zustand selectors with mock state.
        *   Test simple/pure React hooks in isolation.
    *   **Integration Tests:**
        *   Test feature logic hooks (`useFreeSpinsController`, etc.) integrated with a mock Zustand store to verify state transitions and interactions.
        *   Test React components using **React Testing Library (RTL)**.
            *   **Challenge:** RTL doesn't directly interact with PixiJS canvas rendering. Testing focuses on:
                *   Rendering without errors.
                *   Ensuring components react correctly to prop changes.
                *   Verifying that callbacks (like button `onClick`) are called when expected.
                *   Testing accessibility attributes if applicable (less relevant for canvas).
            *   **Pixi-Specific RTL Adaptation:** May require helper functions or custom renderers for RTL that can provide *some* bridge to the underlying Pixi structure or emitted events, but visual output testing is limited.
            *   Focus on testing the *React logic* driving the Pixi components, rather than the pixel output itself.
    *   **Tools:** Vitest/Jest, RTL.

*   **`packages/games/[game-name]`:**
    *   **Unit Tests:**
        *   Test game-specific utility functions.
        *   Test game-specific feature logic hooks in isolation (mocking engine state/actions).
    *   **Integration Tests:**
        *   Test game-specific React components (bonus screens, custom symbols) using RTL, verifying their interaction with engine state/props.
        *   Test the integration of game-specific feature hooks with the engine's state and components.
    *   **Configuration Validation:** Test that the exported `gameConfiguration` object adheres to the types/schemas from `game-configs`.
    *   **Tools:** Vitest/Jest, RTL.

*   **`packages/game-server`:**
    *   **Focus:** Standard backend testing practices. Unit tests for business logic, RNG modules (if custom), configuration loading. Integration tests for API endpoints (using tools like `supertest`).
    *   **Tools:** Vitest/Jest, Supertest.

## 5. End-to-End (E2E) Testing

*   **Focus:** Cover critical user flows for a few representative games.
    *   Game loads successfully.
    *   Player can place a bet and spin.
    *   Basic win presentation occurs.
    *   Entering and playing a core feature (like Free Spins).
*   **Implementation:** Use Playwright/Cypress to script interactions.
    *   **Challenge:** Interacting directly with Canvas elements is difficult. Strategies include:
        *   Adding `data-testid` attributes or accessible names to key `@pixi/react` components where possible (may require customization).
        *   Exposing game state or specific events to the `window` object *during test runs only* for verification.
        *   Using visual regression testing tools (like Percy, Applitools, or Playwright's visual comparison) to detect unexpected visual changes (can be brittle).
        *   Focus E2E tests on verifying the *state changes* resulting from UI interactions, rather than pixel-perfect rendering.
*   **Run Sparingly:** E2E tests are slow and flaky; reserve them for the most critical paths.

## 6. Running Tests

*   **Turborepo:** Use `turbo run test` to run tests across all changed packages efficiently.
*   **CI/CD:** Integrate test runs (unit, integration, potentially a subset of E2E) into the Continuous Integration pipeline to catch regressions before merging.
*   **Coverage:** Regularly check code coverage reports to identify untested areas, aiming for high coverage on core logic and utilities.

By implementing this multi-layered strategy, focusing unit tests on logic, integration/RTL tests on component behavior, and E2E tests on critical flows, the project can achieve a high degree of confidence and maintainability.
