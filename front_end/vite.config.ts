import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 后端真实地址（dev 时通过 vite proxy 转发到本地后端）
const BACKEND = process.env.VITE_API_BASE || 'http://localhost:8083'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 业务 API
      '/api': {
        target: BACKEND,
        changeOrigin: true,
      },
      // 上传文件（身份证 / 收款码 / 支付截图 / 仲裁证据 / 证书等）
      '/files': {
        target: BACKEND,
        changeOrigin: true,
      },
    },
  },
})