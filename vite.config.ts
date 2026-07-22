import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import tailwindcss from "@tailwindcss/vite"

const config = defineConfig(({ command }) => ({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart()],
  server: command === 'serve' ? {
    port: 3030,
    host: true,
    allowedHosts: ["tb40.insanmustaqbal.or.id"],
    proxy: {
      "/ingest/static": {
        target: "https://eu-assets.i.posthog.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ingest/, ""),
        secure: false,
      },
      "/ingest/array": {
        target: "https://eu-assets.i.posthog.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ingest/, ""),
        secure: false,
      },
      "/ingest": {
        target: "https://eu.i.posthog.com",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/ingest/, ""),
        secure: false,
      },
    },
    watch: {
      ignored: ["**/screenshots/**", "**/test-results/**"]
    }
  } : undefined,
}))

export default config
