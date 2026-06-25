import posthog from "posthog-js"
import { PostHogProvider } from "posthog-js/react"
import { useEffect } from "react"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "TB40 - Tafsir Bakat 40",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // PostHog: Identify returning users on app load
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tb40_umum")
      if (saved) {
        const { nama, usia } = JSON.parse(saved)
        if (nama?.panggilan) {
          posthog.identify(nama.panggilan, { name: nama.lengkap, age: usia })
        }
      }
    } catch (e) {
      console.error("Failed to restore returning user for PostHog", e)
    }
  }, [])

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <PostHogProvider
          apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN!}
          options={{
            api_host: "/ingest",
            ui_host:
              import.meta.env.VITE_PUBLIC_POSTHOG_HOST ||
              "https://eu.posthog.com",
            person_profiles: "identified_only",
            capture_exceptions: true,
            debug: false,
          }}
        >
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
          <Toaster richColors position="top-right" />
        </PostHogProvider>
        <Scripts />
      </body>
    </html>
  )
}
