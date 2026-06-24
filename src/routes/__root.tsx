import { useEffect } from "react"
import posthog from "posthog-js"
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"

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
  useEffect(() => {
    if (typeof window !== "undefined") {
      const posthogKey = import.meta.env.VITE_POSTHOG_KEY || "phc_mock_key_for_dev_tb40"
      const posthogHost = import.meta.env.VITE_POSTHOG_HOST || "http://localhost:4000"
      
      posthog.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: 'identified_only',
        loaded: (ph) => {
          if (import.meta.env.DEV) ph.debug()
        }
      })
    }
  }, [])

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
