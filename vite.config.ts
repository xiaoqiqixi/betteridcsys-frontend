import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

// The dev server proxies the API to a local finance backend (API_PROXY_TARGET).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.API_PROXY_TARGET || 'http://127.0.0.1:8080'
  const https =
    env.LOCAL_HTTPS === '1'
      ? { key: readFileSync('artifacts/tls/key.pem'), cert: readFileSync('artifacts/tls/cert.pem') }
      : undefined
  const proxy = {
    '/api': { target, headers: env.API_PROXY_HOST ? { host: env.API_PROXY_HOST } : undefined },
    '/healthz': { target },
  }
  return {
    plugins: [
      vue(),
      tailwindcss(),
      mode !== 'test' &&
        VueI18nPlugin({
          include: fileURLToPath(new URL('./src/shared/i18n/{en,zh-CN}{,-private}.ts', import.meta.url)),
          compositionOnly: true,
          dropMessageCompiler: true,
        }),
    ],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      https,
      proxy,
    },
    preview: { https, proxy },
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 700,
      modulePreload: { polyfill: false },
    },
  }
})
