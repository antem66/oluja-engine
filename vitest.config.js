import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Environment setup (jsdom is common for web projects needing DOM APIs)
    // You might switch to 'happy-dom' for faster performance if needed
    environment: 'jsdom',
    // Enable globals like describe, it, expect, etc.
    globals: true,
    // Optional: Include setup files if needed later
    // setupFiles: './test/setup.js',
  },
}) 