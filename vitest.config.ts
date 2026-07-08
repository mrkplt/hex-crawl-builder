import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vitest configuration. Kept separate from vite.config.ts (the build config)
// so the test toolchain is self-describing. Vitest 4 always reports every file
// matched by `coverage.include`, so untested source counts against thresholds.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Only measure our own source; exclude entrypoints, config, and
      // type-only / generated files that carry no testable logic.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/**/*.d.ts',
        'src/setupTests.ts',
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
