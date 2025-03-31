# V2 Slot Engine: Introduction

## 1. Vision & Goals

The primary vision behind the V2 Slot Engine is to establish a **world-class, flexible, and high-performance foundation** for creating a diverse portfolio of cutting-edge, engaging, and visually stunning slot games.

**Core Goals:**

*   **Rapid Game Development:** Enable the efficient creation, configuration, and deployment of multiple unique slot games, significantly reducing time-to-market for new titles.
*   **High Quality & Performance:** Deliver games with smooth animations, crisp graphics, responsive interactions, and robust performance, **especially on target mobile platforms**.
*   **Extensibility & Scalability:** Architect the engine core to be highly extensible, capable of supporting a wide range of game mechanics (standard reels, tumbling/cascading, Megaways, cluster pays, etc.) and features (complex bonuses, collection systems, various wild types) without requiring fundamental rewrites.
*   **Maintainability:** Produce clean, well-structured, typed, and documented code that is easy for the development team to understand, maintain, and extend over the long term.
*   **Production Ready:** Build a foundation suitable for deploying real-money or social casino games, considering aspects like server integration and testability.

## 2. Core Architectural Principles

To achieve these goals, the V2 engine adheres to the following principles:

*   **Mobile-First Design & Performance:** Prioritize efficient rendering, touch interactions, and adaptable layouts suitable for a wide range of mobile devices. Performance optimization is a continuous focus.
*   **React-Centric Frontend:** Leverage the power of React for UI componentization, state management integration, and developer experience, using `@pixi/react` as the bridge to the rendering layer.
*   **Configuration-Driven Design:** The core engine (`engine-core`) is designed to be highly configurable. Specific game behaviors, parameters, assets, and features are primarily defined by configuration files provided by individual game packages, minimizing hardcoding within the engine.
*   **Clear Separation of Concerns:** Maintain a strict separation between the reusable `engine-core`, game-specific packages (`games/*`), shared configuration types (`game-configs`), generic utilities (`shared-utils`), and the backend (`game-server`).
*   **Composition over Inheritance:** Favor building complex features and UIs by composing smaller, focused React components and hooks.
*   **Declarative Approach:** Utilize declarative patterns (React components, Zustand state selectors) where possible to manage UI and state, simplifying logic compared to purely imperative approaches.
*   **Extensibility through Interfaces & Composition:** Design core engine parts anticipating variation. Utilize TypeScript interfaces and potentially strategy patterns or component composition to allow different game mechanics to plug into the engine framework.
*   **TypeScript First:** Employ TypeScript throughout the monorepo for enhanced type safety, improved refactoring capabilities, and clearer code contracts.

## 3. Technology Stack

*   **Language:** TypeScript
*   **Frontend Framework:** React (v18+)
*   **Rendering Engine:** PixiJS (v8+)
*   **React-Pixi Bridge:** `@pixi/react`
*   **Animation:** GSAP (v3+)
*   **State Management:** Zustand
*   **Monorepo Management:** pnpm Workspaces **+ Turborepo** (Recommended for build caching & task orchestration)
*   **Build Tool:** Vite
*   **Styling:** Primarily via PixiJS properties; CSS for `index.html` shell.
*   **Linting/Formatting:** ESLint + Prettier
*   **Testing:** Jest / Vitest (Unit/Integration), React Testing Library (Components)
*   **(Future Potential):** Spine (via `pixi-spine`) for complex skeletal animations.
