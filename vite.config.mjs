import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: './dist',
    emptyOutDir: true,
  },
  publicDir: 'examples/public',
})