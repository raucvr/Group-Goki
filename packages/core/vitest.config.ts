import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/index.ts',
        'src/**/prompts.ts',
        'src/**/default-models.ts',
        'src/db/**',
        'src/battle-royale/orchestrator.ts',
        'src/battle-royale/parallel-runner.ts',
        'src/router/model-router.ts',
        'src/router/provider-adapter.ts',
        'src/router/providers/**',
        'src/task-analyzer/analyzer.ts',
      ],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
})
