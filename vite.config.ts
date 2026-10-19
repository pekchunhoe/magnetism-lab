import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig(({mode})=>({ cacheDir:mode==='test'?'node_modules/.vite-test':'node_modules/.vite', optimizeDeps:{include:['three','@react-three/fiber','@react-three/drei/core/OrbitControls','@react-three/drei/core/RoundedBox']}, plugins: [react()], test: { include:['src/**/*.test.{ts,tsx}'], environment: 'jsdom', setupFiles: ['./src/test-setup.ts'] } }));
