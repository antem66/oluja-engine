import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],
  // Optional: Define the public directory if it's not 'public'
  // publicDir: 'public',
  build: {
    outDir: 'dist', // Specify the output directory for the build
    sourcemap: true, // Generate source maps for debugging
  },
  server: {
    open: true, // Automatically open the app in the browser
  },
});
