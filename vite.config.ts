import { defineConfig } from "vite"
import viteReact from "@vitejs/plugin-react"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import tailwindcss from "@tailwindcss/vite"

const config = defineConfig(({ command }) => ({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  server: command === 'serve' ? {
    port: 3030,
    host: true,
    allowedHosts: ["tb40.insanmustaqbal.or.id"],
    watch: {
      ignored: ["**/screenshots/**", "**/test-results/**"]
    }
  } : undefined,
}))

export default config
