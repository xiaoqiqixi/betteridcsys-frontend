import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
      restoreMocks: true,
    },
  }),
)
