import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/shared/vitest.config.ts',
  'packages/core/vitest.config.ts',
  'packages/chat/vitest.config.ts',
  'packages/gateway/vitest.config.ts',
])
