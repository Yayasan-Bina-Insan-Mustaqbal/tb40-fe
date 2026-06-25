import posthog from "posthog-js"
import { useState, useEffect, useRef } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import LZString from "lz-string"
import { QRCodeSVG } from "qrcode.react"
import { BarChart as EBarChart } from "@devstool/shadcn-echarts"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sparkles,
  Printer,
  TrendingUp,
  Brain,
  MessageSquare,
  Search,
  BookOpen,
  Heart,
  Undo2,
  FileText,
  HelpCircle,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  Share2,
  Copy,
  Check,
  BarChart2,
} from "lucide-react"

export const Route = createFileRoute("/result")({ component: ResultPage })

function ResultPage() {
  const navigate = useNavigate()

  // Local Data State
  const [umum, setUmum] = useState<any>(null)
  const [tb40Result, setTb40Result] = useState<any>(null)
  const [tb40ResultRanked, setTb40ResultRanked] = useState<any>(null)
  const [tb40Presentation, setTb40Presentation] = useState<any>(null)

  // UI State
  const [activeSection, setActiveSection] = useState("ringkasan")
  const [isCalculating, setIsCalculating] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [isCopied, setIsCopied] = useState(false)

  const [chart1Mode, setChart1Mode] = useState<"score" | "rank">("score")
  const [chart2Mode, setChart2Mode] = useState<"score" | "rank">("score")

  const [mapTab, setMapTab] = useState<"score" | "rank" | "both">("both")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterBy, setFilterBy] = useState<
    "all" | "introvert" | "extrovert" | "muthmainnah" | "lawwamah" | "ammarah"
  >("all")
  const [sortBy, setSortBy] = useState<"highest" | "lowest" | "alphabetical">(
    "highest"
  )
  const [showResetModal, setShowResetModal] = useState(false)

  // Refs for auto-scroll logic
  const ringkasanRef = useRef<HTMLDivElement>(null)
  const pemetaanRef = useRef<HTMLDivElement>(null)
  const chartsRef = useRef<HTMLDivElement>(null)
  const gayaRef = useRef<HTMLDivElement>(null)
  const rincianRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleInitialLoad = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const shareData = urlParams.get("share")

        if (shareData) {
          setIsCalculating(true)
          try {
            const decompressed =
              LZString.decompressFromEncodedURIComponent(shareData)
            if (decompressed) {
              const payload = JSON.parse(decompressed)
              setUmum(payload.u)

              const apiUrl =
                import.meta.env.VITE_API_URL || "http://localhost:4040"
              const type = payload.t || "tb40"
              const response = await fetch(
                `${apiUrl}/api/v0.1/${type}/calculation`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    parts: { umum: payload.u, [type]: payload.a },
                  }),
                }
              )

              if (!response.ok)
                throw new Error("Failed to calculate shared result")

              const resultData = await response.json()
              const parsedResult = resultData

              const tb40Data =
                parsedResult.parts?.tb40 ||
                parsedResult.parts?.tb40anak ||
                parsedResult
              setTb40Result(tb40Data.tb40Result || tb40Data.result)
              setTb40ResultRanked(tb40Data.tb40ResultRanked || tb40Data.ranked)
              setTb40Presentation(
                tb40Data.tb40Presentation || tb40Data.presentation
              )

              localStorage.setItem("tb40_umum", JSON.stringify(payload.u))
              if (typeof window !== "undefined") {
                try {
                  posthog.capture("result_viewed", {
                    shared: true,
                    test_mode: "adaptive",
                  })
                } catch (err) {
                  console.warn("PostHog tracking failed", err)
                }
              }
              localStorage.setItem("tb40_result", JSON.stringify(resultData))
              setIsCalculating(false)

              // Remove ?share from URL without refreshing
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname
              )
              return
            }
          } catch (err) {
            console.error("Failed to parse shared data", err)
            setIsCalculating(false)
          }
        }

        const savedUmum = localStorage.getItem("tb40_umum")
        const savedResult = localStorage.getItem("tb40_result")

        if (!savedUmum || !savedResult) {
          navigate({ to: "/" as any })
          return
        }

        const parsedUmum = JSON.parse(savedUmum)
        const parsedResult = JSON.parse(savedResult)

        setUmum(parsedUmum)

        const tb40Data = parsedResult.parts?.tb40 || parsedResult.parts?.tb40anak || parsedResult
        setTb40Result(tb40Data.tb40Result || tb40Data.result)
        setTb40ResultRanked(tb40Data.tb40ResultRanked || tb40Data.ranked)
        setTb40Presentation(
          tb40Data.tb40Presentation || tb40Data.presentation
        )

        if (typeof window !== "undefined") {
          try {
            posthog.capture("result_viewed", {
              shared: false,
              test_mode:
                parsedResult.version === "v0.2" ? "adaptive" : "precision",
            })
          } catch (err) {
            console.warn("PostHog tracking failed", err)
          }
        }
      } catch (e) {
        console.error("Failed to parse stored results", e)
        navigate({ to: "/" as any })
      }
    }

    handleInitialLoad()
  }, [navigate])

  // Monitor scroll for floating nav highlights
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        { id: "ringkasan", ref: ringkasanRef },
        { id: "pemetaan", ref: pemetaanRef },
        { id: "charts", ref: chartsRef },
        { id: "gaya", ref: gayaRef },
        { id: "rincian", ref: rincianRef },
      ]

      for (const section of sections) {
        if (section.ref.current) {
          const rect = section.ref.current.getBoundingClientRect()
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (isCalculating) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Sparkles className="h-8 w-8 animate-spin text-primary" />
        <p className="animate-pulse font-medium text-muted-foreground">
          Menghitung Hasil Penilaian Anda...
        </p>
      </div>
    )
  }

  if (!umum || !tb40Result) return null

  const handleShare = () => {
    console.log("handleShare called!")
    if (typeof window !== "undefined") {
      try {
        posthog.capture("share_button_clicked")
      } catch (err) {
        console.warn("PostHog tracking failed", err)
      }
    }
    try {
      const savedUmum = localStorage.getItem("tb40_umum")
      const savedAnswers =
        localStorage.getItem("tb40_answers") ||
        localStorage.getItem("tb40_answers_v2_tier3")

      if (!savedUmum || !savedAnswers) return

      let parsedAnswers = JSON.parse(savedAnswers)
      if (!Array.isArray(parsedAnswers)) {
        // Ensure it's an array for the API
        parsedAnswers = Array.from({ length: 40 }).map(
          (_, i) =>
            parsedAnswers[i] ||
            parsedAnswers[`q${i}`] ||
            parsedAnswers[(i + 1).toString()] ||
            60
        )
      }

      const parsedUmum = JSON.parse(savedUmum)

      const compactPayload = {
        u: parsedUmum,
        a: parsedAnswers,
        t: "tb40",
      }

      const compressed = LZString.compressToEncodedURIComponent(
        JSON.stringify(compactPayload)
      )
      const url = `${window.location.origin}/result?share=${compressed}`

      setShareUrl(url)
      setShowShareModal(true)
    } catch (e) {
      console.error("Share error", e)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
    try {
      posthog.capture("share_link_copied")
    } catch (err) {
      console.warn("PostHog tracking failed", err)
    }
  }

  // Confirmation for Reset
  const confirmResetAndRestart = () => {
    localStorage.removeItem("tb40_umum")
    localStorage.removeItem("tb40_answers")
    localStorage.removeItem("tb40_answers_v2")
    localStorage.removeItem("tb40_result")
    navigate({ to: "/" as any })
  }

  const scoreToColor = (score: number): string => {
    score = Math.max(0, Math.min(100, score))
    let startColor: number[] = []
    let endColor: number[] = []
    let interpolationFactor = 0

    if (score <= 50) {
      startColor = [191, 64, 64] // Red (#bf4040)
      endColor = [64, 191, 64] // Green (#40bf40)
      interpolationFactor = score / 50
    } else {
      startColor = [64, 191, 64] // Green (#40bf40)
      endColor = [64, 64, 191] // Blue (#4040bf)
      interpolationFactor = (score - 50) / 50
    }

    const interpolatedColor = startColor.map((channel, i) =>
      Math.round(channel + (endColor[i] - channel) * interpolationFactor)
    )

    return `#${interpolatedColor.map((c) => c.toString(16).padStart(2, "0")).join("")}`
  }

  const rankToColor = (rank: number, lowestRank: number): string => {
    rank = Math.max(1, Math.min(rank, lowestRank))
    const score = ((lowestRank - rank) / (lowestRank - 1)) * 100
    return scoreToColor(score)
  }

  // Parse inline SVGs and clean up style tags for Tailwind isolation
  const getCleanSVG = (svgContent: string, mapType: "score" | "rank") => {
    if (!svgContent) return ""

    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(svgContent, "image/svg+xml")

      const elements = doc.querySelectorAll("rect, path")
      elements.forEach((el) => {
        const id = el.getAttribute("id")
        if (id && id.includes(".")) {
          const [group, no] = id.split(".")
          const groupResult = tb40Result[group]
          if (groupResult) {
            const pillar = groupResult.find((p: any) => p.pillar.no === no)
            if (pillar) {
              let finalColor = ""
              if (mapType === "score") {
                finalColor = scoreToColor(Number(pillar.score))
              } else {
                finalColor = rankToColor(
                  Number(pillar.rank),
                  groupResult.length
                )
              }

              if (group === "2") {
                finalColor += "aa" // Mapped alpha transparency
              }

              el.setAttribute("fill", finalColor)
            }
          }
        }
      })

      // Make all IDs in this SVG unique to prevent page-level ID collisions
      const allWithId = doc.querySelectorAll("[id]")
      allWithId.forEach((el) => {
        const originalId = el.getAttribute("id")
        if (originalId) {
          el.setAttribute("id", `${originalId}-${mapType}`)
        }
      })

      const serializer = new XMLSerializer()
      const cleanSvgStr = serializer.serializeToString(doc)

      return cleanSvgStr
        .replace("<svg", '<svg class="tb40-interactive-svg w-full h-auto" ')
        .replace(/font-family="[^"]*"/g, 'font-family="inherit"')
    } catch (e) {
      console.error("Failed to parse and patch SVG colors", e)
      return svgContent
        .replace("<svg", '<svg class="tb40-interactive-svg w-full h-auto" ')
        .replace(/font-family="[^"]*"/g, 'font-family="inherit"')
    }
  }

  // Quick link to smooth scroll
  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  // Handle printing/PDF rendering
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      try {
        posthog.capture("pdf_printed")
      } catch (err) {
        console.warn("PostHog tracking failed", err)
      }
    }
    window.print()
  }

  // Helper to trace the root category (Group 3) of a pilar
  const getPillarRoot = (pillar: any): string => {
    try {
      const parent18No = pillar.parents?.[0]?.no
      if (!parent18No) return ""

      const el18 = tb40Result["18"]?.find(
        (p: any) => p.pillar.no === parent18No
      )
      if (!el18) return ""

      const parent6No = el18.parents?.[0]?.no
      if (!parent6No) return ""

      const el6 = tb40Result["6"]?.find((p: any) => p.pillar.no === parent6No)
      if (!el6) return ""

      return el6.parents?.find((parent: any) => parent.group === "3")?.no || ""
    } catch (e) {
      return ""
    }
  }

  // Helper to trace if a pilar in group 40 belongs to Introvert or Extrovert
  const isIntrovert = (pillar: any): boolean => {
    try {
      const parent18No = pillar.parents?.[0]?.no
      if (!parent18No) return false

      const el18 = tb40Result["18"]?.find(
        (p: any) => p.pillar.no === parent18No
      )
      if (!el18) return false

      const parent6No = el18.parents?.[0]?.no
      if (!parent6No) return false

      const el6 = tb40Result["6"]?.find((p: any) => p.pillar.no === parent6No)
      if (!el6) return false

      const parent2No = el6.parents?.find(
        (parent: any) => parent.group === "2"
      )?.no
      return parent2No === "1" // 1 is Introvert, 2 is Extrovert
    } catch (e) {
      return false
    }
  }

  // Filter and Sort 40 pillars for detailed list
  const all40Pillars = tb40Result["40"] || []
  const filteredPillars = all40Pillars
    .filter((p: any) => {
      // 1. Search term match
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.data?.nama &&
          p.data.nama.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.data?.definisi &&
          p.data.definisi.toLowerCase().includes(searchTerm.toLowerCase()))

      if (!matchesSearch) return false

      // 2. Filter match
      const rootNo = getPillarRoot(p)

      if (filterBy === "introvert") return isIntrovert(p)
      if (filterBy === "extrovert") return !isIntrovert(p)

      // Lineage mapping: 1: Karsa (Ammarah), 2: Cipta/Akal (Lawwamah), 3: Rasa (Muthmainnah)
      if (filterBy === "ammarah") return rootNo === "1"
      if (filterBy === "lawwamah") return rootNo === "2"
      if (filterBy === "muthmainnah") return rootNo === "3"

      return true
    })
    .sort((a: any, b: any) => {
      if (sortBy === "highest") {
        return (
          Number(b.score) - Number(a.score) || Number(a.rank) - Number(b.rank)
        )
      }
      if (sortBy === "lowest") {
        return (
          Number(a.score) - Number(b.score) || Number(b.rank) - Number(a.rank)
        )
      }
      if (sortBy === "alphabetical") {
        const nameA = a.data?.nama_lengkap || a.name
        const nameB = b.data?.nama_lengkap || b.name
        return nameA.localeCompare(nameB)
      }
      return 0
    })

  const strengthsList = (tb40Result && tb40Result["6"]) || []
  const getVal = (no: string) => {
    const item = strengthsList.find((s: any) => s.pillar?.no === no)
    if (!item) return 0
    return chart2Mode === "score"
      ? Number(item.score ?? 0)
      : 7 - Number(item.rank ?? 0)
  }

  return (
    <>
      <div className="relative flex min-h-screen flex-col bg-background text-foreground print:bg-white print:text-black">
        {/* Dynamic Background Styling */}
        <div className="pointer-events-none absolute top-0 left-0 -z-10 h-[600px] w-full bg-gradient-to-b from-primary/5 to-transparent print:hidden" />

        {/* FLOATING OUTLINE NAVIGATION DOCK */}
        <div className="fixed top-1/2 left-6 z-40 hidden -translate-y-1/2 flex-col gap-4 rounded-2xl border border-border bg-card/65 p-4 shadow-lg shadow-stone-200/40 backdrop-blur-md select-none xl:flex print:hidden">
          <h5 className="border-b border-border/80 pb-1 font-mono text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
            LAPORAN
          </h5>

          <button
            onClick={() => scrollTo(ringkasanRef)}
            className={`flex items-center gap-2 text-left text-xs font-medium transition-all ${
              activeSection === "ringkasan"
                ? "translate-x-1 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${activeSection === "ringkasan" ? "bg-primary" : "bg-transparent"}`}
            />
            Ringkasan Profil
          </button>

          <button
            onClick={() => scrollTo(pemetaanRef)}
            className={`flex items-center gap-2 text-left text-xs font-medium transition-all ${
              activeSection === "pemetaan"
                ? "translate-x-1 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${activeSection === "pemetaan" ? "bg-primary" : "bg-transparent"}`}
            />
            Pemetaan Bakat (SVG)
          </button>

          <button
            onClick={() => scrollTo(chartsRef)}
            className={`flex items-center gap-2 text-left text-xs font-medium transition-all ${
              activeSection === "charts"
                ? "translate-x-1 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${activeSection === "charts" ? "bg-primary" : "bg-transparent"}`}
            />
            Grafik Data
          </button>

          <button
            onClick={() => scrollTo(gayaRef)}
            className={`flex items-center gap-2 text-left text-xs font-medium transition-all ${
              activeSection === "gaya"
                ? "translate-x-1 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${activeSection === "gaya" ? "bg-primary" : "bg-transparent"}`}
            />
            Belajar & Komunikasi
          </button>

          <button
            onClick={() => scrollTo(rincianRef)}
            className={`flex items-center gap-2 text-left text-xs font-medium transition-all ${
              activeSection === "rincian"
                ? "translate-x-1 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${activeSection === "rincian" ? "bg-primary" : "bg-transparent"}`}
            />
            Rincian 40 Pilar Sifat
          </button>

          <hr className="my-1 border-border/80" />

          <div className="flex flex-col gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="flex cursor-pointer items-center gap-1.5 py-1.5 text-xs"
            >
              <Printer className="h-3.5 w-3.5" /> Cetak PDF
            </Button>
            <Button
              onClick={handleShare}
              variant="default"
              size="sm"
              className="flex cursor-pointer items-center gap-1.5 py-1.5 text-xs shadow-sm"
            >
              <Share2 className="h-3.5 w-3.5" /> Bagikan Hasil
            </Button>
          </div>
        </div>

        {/* CORE CONTENT LAYOUT */}
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-4 py-8 md:px-8 print:px-0 print:py-0">
          {/* Lapor Header Controls */}
          <div className="flex items-center justify-between border-b border-border pb-4 print:hidden">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate({ to: "/test" as any })}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Undo2 className="h-3.5 w-3.5" /> Kembali Ke Penilaian
              </button>
              <span className="text-border">|</span>
              <button
                onClick={() => setShowResetModal(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Ulangi Tes Dari Awal
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                Perhitungan Selesai
              </span>
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="flex cursor-pointer items-center gap-1.5 font-heading"
              >
                <Printer className="h-4 w-4" /> Cetak PDF
              </Button>
              <Button
                onClick={handleShare}
                size="sm"
                className="flex cursor-pointer items-center gap-1.5 font-heading shadow-sm"
              >
                <Share2 className="h-4 w-4" /> Bagikan
              </Button>
            </div>
          </div>

          {/* HERO AREA & TYPOGRAPHY HEADER */}
          <div className="mt-4 flex flex-col gap-4 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 self-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary md:self-start">
              <Sparkles className="h-3.5 w-3.5" /> Laporan Analisa Editorial
            </div>

            <h1 className="font-heading text-4xl leading-tight font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Tafsir Bakat{" "}
              <span className="text-primary italic">{umum.nama.panggilan}</span>
            </h1>

            <p className="font-mono text-sm text-muted-foreground">
              Subjek:{" "}
              <span className="font-semibold text-foreground">
                {umum.nama.lengkap}
              </span>{" "}
              &bull; Usia:{" "}
              <span className="font-semibold text-foreground">
                {umum.usia ?? (umum.lahir?.tanggal ? "Terhitung" : "-")} Tahun
              </span>{" "}
              &bull; Analisa:{" "}
              <span className="font-semibold text-foreground">
                {umum.tanggal}
              </span>
            </p>

            {/* Main Character Title Quote Box (Julukan) */}
            <div className="relative mt-4 overflow-hidden rounded-2xl border border-l-4 border-border border-l-primary bg-card p-6 shadow-sm md:p-8">
              <div className="absolute top-0 right-0 -z-10 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
              <span className="font-mono text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Gelar Kepribadian Anda
              </span>
              <h2 className="mt-2 font-heading text-2xl leading-relaxed font-semibold text-foreground md:text-3xl">
                "{tb40Presentation.julukan.data}"
              </h2>
            </div>
          </div>

          {/* SECTION 1: DETAILED PERSONALITY REPORT */}
          <div ref={ringkasanRef} className="flex scroll-mt-12 flex-col gap-6">
            <h3 className="flex items-center gap-2 border-b border-border pb-3 font-heading text-2xl font-semibold">
              <FileText className="h-5 w-5 text-primary" /> Ringkasan Karakter &
              Jiwa
            </h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex flex-col gap-4 text-justify text-sm leading-relaxed text-foreground/90 md:col-span-2 md:text-base">
                {tb40Presentation.kepribadian.data
                  .split("\n\n")
                  .map((para: string, idx: number) => (
                    <p
                      key={idx}
                      className="leading-[1.7] first-letter:float-left first-letter:mr-2 first-letter:font-heading first-letter:text-3xl first-letter:font-bold first-letter:text-primary"
                    >
                      {para}
                    </p>
                  ))}
              </div>

              {/* Overview Highlights Cards */}
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h4 className="flex items-center gap-1.5 border-b border-border pb-2 font-heading text-sm font-medium text-primary">
                    <Brain className="h-4 w-4" /> Kategori Mental (2 Pilar)
                  </h4>
                  <div className="mt-3 flex flex-col gap-3">
                    {tb40ResultRanked["2"]?.slice(0, 2).map((p: any) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-foreground">
                          {p.name}
                        </span>
                        <span className="rounded border border-border bg-secondary px-2 py-0.5 font-mono font-semibold">
                          {p.score}% ({p.rank === 1 ? "Dominan" : "Kondisional"}
                          )
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <h4 className="flex items-center gap-1.5 border-b border-border pb-2 font-heading text-sm font-medium text-primary">
                    <TrendingUp className="h-4 w-4" /> 3 Kekuatan Utama (6
                    Pilar)
                  </h4>
                  <div className="mt-3 flex flex-col gap-3">
                    {tb40ResultRanked["6"]?.slice(0, 3).map((p: any) => (
                      <div
                        key={p.name}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-foreground">
                          {p.data?.label || p.name}
                        </span>
                        <span className="rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 font-mono font-bold text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">
                          {p.score}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: INTERACTIVE SVG MAPS */}
          <div
            ref={pemetaanRef}
            className="flex scroll-mt-12 flex-col gap-6 print:break-before-page"
          >
            <div className="flex flex-col justify-between gap-4 border-b border-border pb-3 md:flex-row md:items-center">
              <h3 className="flex items-center gap-2 font-heading text-2xl font-semibold">
                <TrendingUp className="h-5 w-5 text-primary" /> Visualisasi
                Pemetaan Tafsir Bakat
              </h3>

              {/* Elegant Tab Selector */}
              <div className="flex self-start rounded-full border border-border bg-secondary/80 p-1 shadow-inner md:self-auto print:hidden">
                <button
                  type="button"
                  onClick={() => setMapTab("score")}
                  className={`cursor-pointer rounded-full px-4 py-1.5 font-heading text-xs font-medium transition-all ${
                    mapTab === "score"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Skor Saja
                </button>
                <button
                  type="button"
                  onClick={() => setMapTab("rank")}
                  className={`cursor-pointer rounded-full px-4 py-1.5 font-heading text-xs font-medium transition-all ${
                    mapTab === "rank"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Rangka Saja
                </button>
                <button
                  type="button"
                  onClick={() => setMapTab("both")}
                  className={`cursor-pointer rounded-full px-4 py-1.5 font-heading text-xs font-medium transition-all ${
                    mapTab === "both"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Kedua Peta
                </button>
              </div>
            </div>

            <p className="-mt-2 text-sm leading-relaxed text-muted-foreground">
              Grafik di bawah ini memetakan kepribadian Anda dalam
              klaster-klaster khusus. Arahkan kursor / sentuh bagian-bagian
              grafik untuk melihat representasi visual bakat secara mendalam.
            </p>

            {/* Conditional Layouts based on mapTab */}
            <div className="mt-2">
              {/* SCORE ONLY VIEW */}
              {mapTab === "score" && (
                <div className="relative mx-auto flex max-w-2xl flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h4 className="font-heading text-base font-semibold">
                      Pemetaan Warna Berdasar Skor
                    </h4>
                    <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground uppercase">
                      SKOR
                    </span>
                  </div>
                  <div
                    className="tb40-svg-container overflow-hidden rounded-lg bg-[#faf9f6] p-2 dark:bg-[#FAF8F5]"
                    dangerouslySetInnerHTML={{
                      __html: getCleanSVG(
                        tb40Presentation.pemetaan_tafsir_bakat.file,
                        "score"
                      ),
                    }}
                  />
                  <p className="mt-1 text-center text-[11px] leading-normal text-muted-foreground">
                    *Warna mewakili tingkat penguasaan: Hijau (Unggul), Kuning
                    (Seimbang), Merah (Kelemahan).
                  </p>
                </div>
              )}

              {/* RANK ONLY VIEW */}
              {mapTab === "rank" && (
                <div className="relative mx-auto flex max-w-2xl flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h4 className="font-heading text-base font-semibold">
                      Pemetaan Berdasar Rangka (Rank)
                    </h4>
                    <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground uppercase">
                      RANK
                    </span>
                  </div>
                  <div
                    className="tb40-svg-container overflow-hidden rounded-lg bg-[#faf9f6] p-2 dark:bg-[#FAF8F5]"
                    dangerouslySetInnerHTML={{
                      __html: getCleanSVG(
                        tb40Presentation.pemetaan_tafsir_bakat_byRank.file,
                        "rank"
                      ),
                    }}
                  />
                  <p className="mt-1 text-center text-[11px] leading-normal text-muted-foreground">
                    *Warna mewakili posisi relatif bakat tersebut dibandingkan
                    dengan kekuatan bakat Anda yang lain.
                  </p>
                </div>
              )}

              {/* BOTH SIDE-BY-SIDE VIEW (Exactly as before) */}
              {mapTab === "both" && (
                <div className="grid grid-cols-1 gap-8 transition-all duration-300 md:grid-cols-2">
                  {/* Dynamic Map 1: Score Map */}
                  <div className="relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-md">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h4 className="font-heading text-sm font-semibold">
                        Pemetaan Warna Berdasar Skor
                      </h4>
                      <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground uppercase">
                        SKOR
                      </span>
                    </div>
                    <div
                      className="tb40-svg-container overflow-hidden rounded-lg bg-[#faf9f6] dark:bg-[#FAF8F5]"
                      dangerouslySetInnerHTML={{
                        __html: getCleanSVG(
                          tb40Presentation.pemetaan_tafsir_bakat.file,
                          "score"
                        ),
                      }}
                    />
                    <p className="mt-1 text-[10px] leading-normal text-muted-foreground">
                      *Warna mewakili tingkat penguasaan: Hijau (Unggul), Kuning
                      (Seimbang), Merah (Kelemahan).
                    </p>
                  </div>

                  {/* Dynamic Map 2: Rank Map */}
                  <div className="relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-md">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <h4 className="font-heading text-sm font-semibold">
                        Pemetaan Berdasar Rangka (Rank)
                      </h4>
                      <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground uppercase">
                        RANK
                      </span>
                    </div>
                    <div
                      className="tb40-svg-container overflow-hidden rounded-lg bg-[#faf9f6] dark:bg-[#FAF8F5]"
                      dangerouslySetInnerHTML={{
                        __html: getCleanSVG(
                          tb40Presentation.pemetaan_tafsir_bakat_byRank.file,
                          "rank"
                        ),
                      }}
                    />
                    <p className="mt-1 text-[10px] leading-normal text-muted-foreground">
                      *Warna mewakili posisi relatif bakat tersebut dibandingkan
                      dengan kekuatan bakat Anda yang lain.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2.5: INTERACTIVE ECHARTS */}
          <div
            ref={chartsRef}
            id="charts"
            className="flex scroll-mt-12 flex-col gap-6 print:break-before-page"
          >
            <div className="flex flex-col justify-between gap-4 border-b border-border pb-3 md:flex-row md:items-center">
              <h3 className="flex items-center gap-2 font-heading text-2xl font-semibold">
                <BarChart2 className="h-5 w-5 text-primary" /> Grafik Data
                Interaktif
              </h3>
            </div>

            <div className="flex flex-col gap-8">
              {/* Chart 2: 6 Strengths */}
              <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-md">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h4 className="font-heading text-base font-semibold">
                    6 Kekuatan Utama
                  </h4>
                  <div className="flex rounded-md border border-border bg-secondary/80 p-0.5 shadow-inner">
                    <button
                      onClick={() => setChart2Mode("score")}
                      className={`rounded px-2 py-1 font-mono text-[10px] font-bold uppercase transition-all ${chart2Mode === "score" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Skor
                    </button>
                    <button
                      onClick={() => setChart2Mode("rank")}
                      className={`rounded px-2 py-1 font-mono text-[10px] font-bold uppercase transition-all ${chart2Mode === "rank" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Rank
                    </button>
                  </div>
                </div>
                <div className="w-full">
                  <EBarChart
                    height={400}
                    option={{
                      title: [
                        {
                          text: "Introvert",
                          left: "20%",
                          textStyle: {
                            fontSize: 13,
                            fontWeight: "bold",
                            fontFamily: "Inter, sans-serif",
                            color: "#4b5563",
                          },
                        },
                        {
                          text: "Extrovert",
                          right: "20%",
                          textStyle: {
                            fontSize: 13,
                            fontWeight: "bold",
                            fontFamily: "Inter, sans-serif",
                            color: "#4b5563",
                          },
                        },
                      ],
                      tooltip: {
                        trigger: "axis",
                        axisPointer: { type: "shadow" },
                        formatter: (params: any) => {
                          let res = ""
                          params.forEach((p: any) => {
                            let no = ""
                            if (p.seriesName === "Introvert") {
                              if (p.name === "Rasa") no = "3"
                              else if (p.name === "Cipta") no = "2"
                              else if (p.name === "Karsa") no = "1"
                            } else {
                              if (p.name === "Rasa") no = "6"
                              else if (p.name === "Cipta") no = "5"
                              else if (p.name === "Karsa") no = "4"
                            }
                            const item = strengthsList.find(
                              (s: any) => s.pillar?.no === no
                            )
                            if (item) {
                              res += `<b>${p.seriesName} - ${item.name}</b>: ${Number(item.score).toFixed(1)} (Rank ${item.rank})<br/>`
                            }
                          })
                          return res
                        },
                      },
                      grid: [
                        {
                          left: "5%",
                          width: "42%",
                          bottom: "5%",
                          top: "18%",
                          containLabel: true,
                        },
                        {
                          right: "5%",
                          width: "42%",
                          bottom: "5%",
                          top: "18%",
                          containLabel: true,
                        },
                      ],
                      xAxis: [
                        {
                          gridIndex: 0,
                          type: "value",
                          inverse: true,
                          show: false,
                          max: chart2Mode === "score" ? 100 : 6,
                          min: 0,
                        },
                        {
                          gridIndex: 1,
                          type: "value",
                          inverse: false,
                          show: false,
                          max: chart2Mode === "score" ? 100 : 6,
                          min: 0,
                        },
                      ],
                      yAxis: [
                        {
                          gridIndex: 0,
                          type: "category",
                          position: "right",
                          axisLine: { show: false },
                          axisTick: { show: false },
                          axisLabel: {
                            show: true,
                            fontSize: 12,
                            fontWeight: "bold",
                            fontFamily: "Inter, sans-serif",
                            color: "#6b7280",
                          },
                          data: ["Rasa", "Cipta", "Karsa"],
                        },
                        {
                          gridIndex: 1,
                          type: "category",
                          position: "left",
                          axisLine: { show: false },
                          axisTick: { show: false },
                          axisLabel: { show: false },
                          data: ["Rasa", "Cipta", "Karsa"],
                        },
                      ],
                      series: [
                        {
                          name: "Introvert",
                          type: "bar",
                          xAxisIndex: 0,
                          yAxisIndex: 0,
                          barWidth: 22,
                          markLine: {
                            silent: true,
                            symbol: "none",
                            label: {
                              formatter: "{b}",
                              position: "end",
                              fontSize: 9,
                              fontFamily: "Inter, sans-serif",
                            },
                            lineStyle: { type: "dashed", width: 1 },
                            data:
                              chart2Mode === "score"
                                ? [
                                    {
                                      xAxis: 80,
                                      name: "Kuat",
                                      lineStyle: { color: "#10b981" },
                                    },
                                    {
                                      xAxis: 60,
                                      name: "Cukup",
                                      lineStyle: { color: "#f59e0b" },
                                    },
                                  ]
                                : [
                                    {
                                      xAxis: 5,
                                      name: "Top 2",
                                      lineStyle: { color: "#10b981" },
                                    },
                                    {
                                      xAxis: 3,
                                      name: "Top 4",
                                      lineStyle: { color: "#f59e0b" },
                                    },
                                  ],
                          },
                          data: [
                            {
                              value: getVal("3"),
                              itemStyle: {
                                color:
                                  getVal("3") >= 80
                                    ? {
                                        type: "linear",
                                        x: 0,
                                        y: 0,
                                        x2: 1,
                                        y2: 0,
                                        colorStops: [
                                          { offset: 0, color: "#34d399" },
                                          { offset: 1, color: "#059669" },
                                        ],
                                      }
                                    : getVal("3") >= 60
                                      ? {
                                          type: "linear",
                                          x: 0,
                                          y: 0,
                                          x2: 1,
                                          y2: 0,
                                          colorStops: [
                                            { offset: 0, color: "#fbbf24" },
                                            { offset: 1, color: "#d97706" },
                                          ],
                                        }
                                      : {
                                          type: "linear",
                                          x: 0,
                                          y: 0,
                                          x2: 1,
                                          y2: 0,
                                          colorStops: [
                                            { offset: 0, color: "#f87171" },
                                            { offset: 1, color: "#dc2626" },
                                          ],
                                        },
                              },
                              label: {
                                show: true,
                                position: "left",
                                formatter: () => {
                                  const item = strengthsList.find(
                                    (s: any) => s.pillar?.no === "3"
                                  )
                                  return item
                                    ? `${item.name}\n${chart2Mode === "score" ? Number(item.score).toFixed(0) : "Rank " + item.rank}`
                                    : ""
                                },
                                fontFamily: "Inter, sans-serif",
                                fontSize: 10,
                                color: "#374151",
                              },
                            },
                            {
                              value: getVal("2"),
                              itemStyle: {
                                color:
                                  getVal("2") >= 80
                                    ? {
                                        type: "linear",
                                        x: 0,
                                        y: 0,
                                        x2: 1,
                                        y2: 0,
                                        colorStops: [
                                          { offset: 0, color: "#34d399" },
                                          { offset: 1, color: "#059669" },
                                        ],
                                      }
                                    : getVal("2") >= 60
                                      ? {
                                          type: "linear",
                                          x: 0,
                                          y: 0,
                                          x2: 1,
                                          y2: 0,
                                          colorStops: [
                                            { offset: 0, color: "#fbbf24" },
                                            { offset: 1, color: "#d97706" },
                                          ],
                                        }
                                      : {
                                          type: "linear",
                                          x: 0,
                                          y: 0,
                                          x2: 1,
                                          y2: 0,
                                          colorStops: [
                                            { offset: 0, color: "#f87171" },
                                            { offset: 1, color: "#dc2626" },
                                          ],
                                        },
                              },
                              label: {
                                show: true,
                                position: "left",
                                formatter: () => {
                                  const item = strengthsList.find(
                                    (s: any) => s.pillar?.no === "2"
                                  )
                                  return item
                                    ? `${item.name}\n${chart2Mode === "score" ? Number(item.score).toFixed(0) : "Rank " + item.rank}`
                                    : ""
                                },
                                fontFamily: "Inter, sans-serif",
                                fontSize: 10,
                                color: "#374151",
                              },
                            },
                            {
                              value: getVal("1"),
                              itemStyle: {
                                color:
                                  getVal("1") >= 80
                                    ? {
                                        type: "linear",
                                        x: 0,
                                        y: 0,
                                        x2: 1,
                                        y2: 0,
                                        colorStops: [
                                          { offset: 0, color: "#34d399" },
                                          { offset: 1, color: "#059669" },
                                        ],
                                      }
                                    : getVal("1") >= 60
                                      ? {
                                          type: "linear",
                                          x: 0,
                                          y: 0,
                                          x2: 1,
                                          y2: 0,
                                          colorStops: [
                                            { offset: 0, color: "#fbbf24" },
                                            { offset: 1, color: "#d97706" },
                                          ],
                                        }
                                      : {
                                          type: "linear",
                                          x: 0,
                                          y: 0,
                                          x2: 1,
                                          y2: 0,
                                          colorStops: [
                                            { offset: 0, color: "#f87171" },
                                            { offset: 1, color: "#dc2626" },
                                          ],
                                        },
                              },
                              label: {
                                show: true,
                                position: "left",
                                formatter: () => {
                                  const item = strengthsList.find(
                                    (s: any) => s.pillar?.no === "1"
                                  )
                                  return item
                                    ? `${item.name}\n${chart2Mode === "score" ? Number(item.score).toFixed(0) : "Rank " + item.rank}`
                                    : ""
                                },
                                fontFamily: "Inter, sans-serif",
                                fontSize: 10,
                                color: "#374151",
                              },
                            },
                          ],
                        },
                        {
                          name: "Extrovert",
                          type: "bar",
                          xAxisIndex: 1,
                          yAxisIndex: 1,
                          barWidth: 22,
                          markLine: {
                            silent: true,
                            symbol: "none",
                            label: {
                              formatter: "{b}",
                              position: "end",
                              fontSize: 9,
                              fontFamily: "Inter, sans-serif",
                            },
                            lineStyle: { type: "dashed", width: 1 },
                            data:
                              chart2Mode === "score"
                                ? [
                                    {
                                      xAxis: 80,
                                      name: "Kuat",
                                      lineStyle: { color: "#10b981" },
                                    },
                                    {
                                      xAxis: 60,
                                      name: "Cukup",
                                      lineStyle: { color: "#f59e0b" },
                                    },
                                  ]
                                : [
                                    {
                                      xAxis: 5,
                                      name: "Top 2",
                                      lineStyle: { color: "#10b981" },
                                    },
                                    {
                                      xAxis: 3,
                                      name: "Top 4",
                                      lineStyle: { color: "#f59e0b" },
                                    },
                                  ],
                          },
                          data: [
                            {
                              value: getVal("6"),
                              itemStyle: {
                                color:
                                  getVal("6") >= 80
                                    ? {
                                        type: "linear",
                                        x: 0,
                                        y: 0,
                                        x2: 1,
                                        y2: 0,
                                        colorStops: [
                                          { offset: 0, color: "#059669" },
                                          { offset: 1, color: "#34d399" },
                                        ],
                                      }
                                    : getVal("6") >= 60
                                      ? {
                                          type: "linear",
                                          x: 0,
                                          y: 0,
                                          x2: 1,
                                          y2: 0,
                                          colorStops: [
                                            { offset: 0, color: "#d97706" },
                                            { offset: 1, color: "#fbbf24" },
                                          ],
                                        }
                                      : {
                                          type: "linear",
                                          x: 0,
                                          y: 0,
                                          x2: 1,
                                          y2: 0,
                                          colorStops: [
                                            { offset: 0, color: "#dc2626" },
                                            { offset: 1, color: "#f87171" },
                                          ],
                                        },
                              },
                              label: {
                                show: true,
                                position: "right",
                                formatter: () => {
                                  const item = strengthsList.find(
                                    (s: any) => s.pillar?.no === "6"
                                  )
                                  return item
                                    ? `${item.name}\n${chart2Mode === "score" ? Number(item.score).toFixed(0) : "Rank " + item.rank}`
                                    : ""
                                },
                                fontFamily: "Inter, sans-serif",
                                fontSize: 10,
                                color: "#374151",
                              },
                            },
                            {
                              value: getVal("5"),
                              itemStyle: {
                                color:
                                  getVal("5") >= 80
                                    ? {
                                        type: "linear",
                                        x: 0,
                                        y: 0,
                                        x2: 1,
                                        y2: 0,
                                        colorStops: [
                                          { offset: 0, color: "#059669" },
                                          { offset: 1, color: "#34d399" },
                                        ],
                                      }
                                    : getVal("5") >= 60
                                      ? {
                                          type: "linear",
                                          x: 0,
                                          y: 0,
                                          x2: 1,
                                          y2: 0,
                                          colorStops: [
                                            { offset: 0, color: "#d97706" },
                                            { offset: 1, color: "#fbbf24" },
                                          ],
                                        }
                                      : {
                                          type: "linear",
                                          x: 0,
                                          y: 0,
                                          x2: 1,
                                          y2: 0,
                                          colorStops: [
                                            { offset: 0, color: "#dc2626" },
                                            { offset: 1, color: "#f87171" },
                                          ],
                                        },
                              },
                              label: {
                                show: true,
                                position: "right",
                                formatter: () => {
                                  const item = strengthsList.find(
                                    (s: any) => s.pillar?.no === "5"
                                  )
                                  return item
                                    ? `${item.name}\n${chart2Mode === "score" ? Number(item.score).toFixed(0) : "Rank " + item.rank}`
                                    : ""
                                },
                                fontFamily: "Inter, sans-serif",
                                fontSize: 10,
                                color: "#374151",
                              },
                            },
                            {
                              value: getVal("4"),
                              itemStyle: {
                                color:
                                  getVal("4") >= 80
                                    ? {
                                        type: "linear",
                                        x: 0,
                                        y: 0,
                                        x2: 1,
                                        y2: 0,
                                        colorStops: [
                                          { offset: 0, color: "#059669" },
                                          { offset: 1, color: "#34d399" },
                                        ],
                                      }
                                    : getVal("4") >= 60
                                      ? {
                                          type: "linear",
                                          x: 0,
                                          y: 0,
                                          x2: 1,
                                          y2: 0,
                                          colorStops: [
                                            { offset: 0, color: "#d97706" },
                                            { offset: 1, color: "#fbbf24" },
                                          ],
                                        }
                                      : {
                                          type: "linear",
                                          x: 0,
                                          y: 0,
                                          x2: 1,
                                          y2: 0,
                                          colorStops: [
                                            { offset: 0, color: "#dc2626" },
                                            { offset: 1, color: "#f87171" },
                                          ],
                                        },
                              },
                              label: {
                                show: true,
                                position: "right",
                                formatter: () => {
                                  const item = strengthsList.find(
                                    (s: any) => s.pillar?.no === "4"
                                  )
                                  return item
                                    ? `${item.name}\n${chart2Mode === "score" ? Number(item.score).toFixed(0) : "Rank " + item.rank}`
                                    : ""
                                },
                                fontFamily: "Inter, sans-serif",
                                fontSize: 10,
                                color: "#374151",
                              },
                            },
                          ],
                        },
                      ],
                    }}
                  />
                </div>
              </div>

              {/* Chart 1: 40 Pillars */}
              <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-md">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h4 className="font-heading text-base font-semibold">
                    40 Pilar Sifat
                  </h4>
                  <div className="flex rounded-md border border-border bg-secondary/80 p-0.5 shadow-inner">
                    <button
                      onClick={() => setChart1Mode("score")}
                      className={`rounded px-2 py-1 font-mono text-[10px] font-bold uppercase transition-all ${chart1Mode === "score" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Skor
                    </button>
                    <button
                      onClick={() => setChart1Mode("rank")}
                      className={`rounded px-2 py-1 font-mono text-[10px] font-bold uppercase transition-all ${chart1Mode === "rank" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Rank
                    </button>
                  </div>
                </div>
                <div className="w-full">
                  <EBarChart
                    height={500}
                    option={{
                      tooltip: {
                        trigger: "axis",
                        axisPointer: { type: "shadow" },
                        formatter: (params: any) => {
                          const dataIndex = params[0].dataIndex
                          const sortedData =
                            chart1Mode === "score"
                              ? [...(tb40Result["40"] || [])].sort(
                                  (a, b) => b.score - a.score
                                )
                              : [...(tb40Result["40"] || [])].sort(
                                  (a, b) => a.rank - b.rank
                                )
                          const item = sortedData[dataIndex]
                          return `<b>${item.name}</b><br/>Score: ${item.score}<br/>Rank: ${item.rank}`
                        },
                      },
                      grid: {
                        left: "1%",
                        right: "1%",
                        bottom: "15%",
                        top: "8%",
                        containLabel: true,
                      },
                      xAxis: {
                        type: "category",
                        data:
                          chart1Mode === "score"
                            ? [...(tb40Result["40"] || [])]
                                .sort((a, b) => b.score - a.score)
                                .map((d: any) => d.name)
                            : [...(tb40Result["40"] || [])]
                                .sort((a, b) => a.rank - b.rank)
                                .map((d: any) => d.name),
                        axisLabel: {
                          interval: 0,
                          rotate: 45,
                          fontSize: 9,
                          fontFamily: "Inter, sans-serif",
                        },
                      },
                      yAxis: { type: "value", show: false },
                      series: [
                        {
                          type: "bar",
                          data:
                            chart1Mode === "score"
                              ? [...(tb40Result["40"] || [])]
                                  .sort((a, b) => b.score - a.score)
                                  .map((d: any) => ({
                                    value: d.score,
                                    itemStyle: {
                                      color:
                                        d.score >= 80
                                          ? {
                                              type: "linear",
                                              x: 0,
                                              y: 0,
                                              x2: 0,
                                              y2: 1,
                                              colorStops: [
                                                { offset: 0, color: "#34d399" },
                                                { offset: 1, color: "#059669" },
                                              ],
                                            }
                                          : d.score >= 60
                                            ? {
                                                type: "linear",
                                                x: 0,
                                                y: 0,
                                                x2: 0,
                                                y2: 1,
                                                colorStops: [
                                                  {
                                                    offset: 0,
                                                    color: "#fbbf24",
                                                  },
                                                  {
                                                    offset: 1,
                                                    color: "#d97706",
                                                  },
                                                ],
                                              }
                                            : {
                                                type: "linear",
                                                x: 0,
                                                y: 0,
                                                x2: 0,
                                                y2: 1,
                                                colorStops: [
                                                  {
                                                    offset: 0,
                                                    color: "#f87171",
                                                  },
                                                  {
                                                    offset: 1,
                                                    color: "#dc2626",
                                                  },
                                                ],
                                              },
                                    },
                                  }))
                              : [...(tb40Result["40"] || [])]
                                  .sort((a, b) => a.rank - b.rank)
                                  .map((d: any) => ({
                                    value: 41 - d.rank,
                                    itemStyle: {
                                      color:
                                        d.rank <= 10
                                          ? {
                                              type: "linear",
                                              x: 0,
                                              y: 0,
                                              x2: 0,
                                              y2: 1,
                                              colorStops: [
                                                { offset: 0, color: "#34d399" },
                                                { offset: 1, color: "#059669" },
                                              ],
                                            }
                                          : d.rank <= 30
                                            ? {
                                                type: "linear",
                                                x: 0,
                                                y: 0,
                                                x2: 0,
                                                y2: 1,
                                                colorStops: [
                                                  {
                                                    offset: 0,
                                                    color: "#fbbf24",
                                                  },
                                                  {
                                                    offset: 1,
                                                    color: "#d97706",
                                                  },
                                                ],
                                              }
                                            : {
                                                type: "linear",
                                                x: 0,
                                                y: 0,
                                                x2: 0,
                                                y2: 1,
                                                colorStops: [
                                                  {
                                                    offset: 0,
                                                    color: "#f87171",
                                                  },
                                                  {
                                                    offset: 1,
                                                    color: "#dc2626",
                                                  },
                                                ],
                                              },
                                    },
                                  })),
                          markLine: {
                            silent: true,
                            symbol: "none",
                            label: {
                              formatter: "{b}",
                              position: "end",
                              fontSize: 9,
                              fontFamily: "Inter, sans-serif",
                            },
                            lineStyle: { type: "dashed", width: 1 },
                            data:
                              chart1Mode === "score"
                                ? [
                                    {
                                      yAxis: 80,
                                      name: "Kuat",
                                      lineStyle: { color: "#10b981" },
                                    },
                                    {
                                      yAxis: 60,
                                      name: "Cukup",
                                      lineStyle: { color: "#f59e0b" },
                                    },
                                  ]
                                : [
                                    {
                                      yAxis: 31,
                                      name: "Top 10",
                                      lineStyle: { color: "#10b981" },
                                    },
                                    {
                                      yAxis: 11,
                                      name: "Top 30",
                                      lineStyle: { color: "#f59e0b" },
                                    },
                                  ],
                          },
                        },
                      ],
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: LEARNING STYLE & HEART LANGUAGE */}
          <div
            ref={gayaRef}
            className="flex scroll-mt-12 flex-col gap-6 print:break-before-page"
          >
            <h3 className="flex items-center gap-2 border-b border-border pb-3 font-heading text-2xl font-semibold">
              <Brain className="h-5 w-5 text-primary" /> Gaya Belajar & Bahasa
              Hati
            </h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Learning Style Card */}
              <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-md">
                <div className="pointer-events-none absolute top-0 right-0 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                      AKAL & METODOLOGI
                    </span>
                    <h4 className="font-heading text-lg font-semibold text-foreground">
                      Gaya Belajar Ideal
                    </h4>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-secondary/80 p-3 font-heading text-sm leading-relaxed font-medium text-foreground">
                  "{tb40Presentation.ringkasan_gaya_belajar.data}"
                </div>

                {/* Detailed Cognitive description parsed from ranked first pillar */}
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Metode belajar dominan Anda sangat dipengaruhi oleh kekuatan
                  struktur mental utama Anda ({tb40ResultRanked["3"]?.[0]?.name}
                  ). Pendekatan ini meningkatkan kecepatan retensi informasi,
                  pemahaman teoritis, dan kenyamanan visual/kinestetik di
                  lingkungan belajar Anda.
                </p>
              </div>

              {/* Heart Language Card */}
              <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-md">
                <div className="pointer-events-none absolute top-0 right-0 h-24 w-24 rounded-full bg-destructive/5 blur-2xl" />
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-2.5">
                    <Heart className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                      EMOSIONAL & SOSIAL
                    </span>
                    <h4 className="font-heading text-lg font-semibold text-foreground">
                      Bahasa Hati & Sentuhan Rasa
                    </h4>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-secondary/80 p-3 font-heading text-sm leading-relaxed font-medium text-foreground">
                  "{tb40Presentation.ringkasan_bahasa_hati.data}"
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">
                  Perasaan dan hubungan interaksi sosial Anda beresonansi paling
                  kuat ketika tersentuh melalui cara ini. Memahami bahasa hati
                  ini berguna untuk membangun kemitraan tim yang sehat,
                  memelihara keluarga, dan menjalin silaturahmi yang harmonis.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 4: FULL DETAILED LIST OF 40 NOBLE CHARACTERISTICS */}
          <div
            ref={rincianRef}
            className="flex scroll-mt-12 flex-col gap-6 print:break-before-page"
          >
            <div className="flex flex-col gap-4 border-b border-border pb-3 md:flex-row md:items-center md:justify-between">
              <h3 className="flex items-center gap-2 font-heading text-2xl font-semibold">
                <MessageSquare className="h-5 w-5 text-primary" /> Rincian Sifat
                40 Pilar Mulia
              </h3>

              {/* Search Input Filter */}
              <div className="relative w-full max-w-xs print:hidden">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="Cari pilar sifat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-full border border-input bg-card py-1.5 pr-4 pl-9 text-xs transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <p className="-mt-2 text-sm leading-relaxed text-muted-foreground">
              Di bawah ini adalah rincian lengkap 40 pilar kepribadian mulia
              Anda. Setiap sifat dilengkapi dengan definisi, sifat tercela yang
              mungkin timbul bila berlebihan (atau kurang), serta rekomendasi
              perbaikan karakter. Gunakan filter di bawah ini untuk menjelajahi
              profil Anda secara mendalam.
            </p>

            {/* Premium UI Filter and Sort Controls */}
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/45 p-4 shadow-xs print:hidden">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                {/* Filter Chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Klaster:
                  </span>
                  {[
                    { value: "all", label: "Semua" },
                    { value: "introvert", label: "Introvert" },
                    { value: "extrovert", label: "Ekstrovert" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFilterBy(opt.value as any)}
                      className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        filterBy === opt.value
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}

                  <span className="mr-1 ml-2 font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Nafs (Jiwa):
                  </span>
                  {[
                    { value: "muthmainnah", label: "Muthmainnah (Rasa)" },
                    { value: "lawwamah", label: "Lawwamah (Akal)" },
                    { value: "ammarah", label: "Ammarah (Karsa)" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFilterBy(opt.value as any)}
                      className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        filterBy === opt.value
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Sort Selector */}
                <div className="flex shrink-0 items-center gap-2 self-start lg:self-auto">
                  <span className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Urutan:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="cursor-pointer rounded-lg border border-input bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="highest">Skor Tertinggi</option>
                    <option value="lowest">Skor Terendah</option>
                    <option value="alphabetical">Abjad (Nama A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {filteredPillars.map((p: any, pIdx: number) => {
                const score = p.score
                const rootNo = getPillarRoot(p)

                // Determine Nafs Classification based on Root Lineage
                let nafsLabel = "Nafs Lawwamah"
                if (rootNo === "1") nafsLabel = "Nafs Ammarah"
                if (rootNo === "2") nafsLabel = "Nafs Lawwamah"
                if (rootNo === "3") nafsLabel = "Nafs Muthmainnah"

                // Rating styles based on Score (Visual cues)
                let ratingBorderColor =
                  "border-amber-200 dark:border-amber-950/20"
                let ratingBgColor =
                  "bg-amber-50/70 dark:bg-amber-950/10 text-amber-800 dark:text-amber-300"

                if (score >= 80) {
                  ratingBorderColor =
                    "border-teal-200 dark:border-teal-950/20 border-l-teal-600 border-l-4"
                  ratingBgColor =
                    "bg-teal-50 dark:bg-teal-950/20 text-teal-800 dark:text-teal-400 font-semibold"
                } else if (score >= 60) {
                  ratingBorderColor =
                    "border-emerald-200 dark:border-emerald-950/20 border-l-emerald-600 border-l-4"
                  ratingBgColor =
                    "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400"
                } else if (score <= 40) {
                  ratingBorderColor =
                    "border-rose-200 dark:border-rose-950/20 border-l-rose-600 border-l-4"
                  ratingBgColor =
                    "bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400"
                }

                return (
                  <div
                    key={p.name}
                    className={`flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md ${ratingBorderColor} ${(pIdx + 1) % 2 === 0 ? "print:break-after-page" : ""}`}
                  >
                    <div className="flex flex-col justify-between gap-2 border-b border-border/70 pb-3 sm:flex-row sm:items-center">
                      <div className="flex items-baseline gap-2">
                        <span className="rounded border border-border bg-secondary px-2 py-0.5 font-mono text-xs font-bold text-primary">
                          Pilar {p.pillar.no}
                        </span>
                        <h4 className="font-heading text-lg font-semibold text-foreground">
                          {p.data?.nama_lengkap || p.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ratingBgColor}`}
                        >
                          {nafsLabel}
                        </span>
                        <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          Skor: {score} &bull; Rangka: {p.rank}
                        </span>
                      </div>
                    </div>

                    {/* Pillar Arabic Calligraphy if exists */}
                    {p.data?.arab && (
                      <div className="-mt-2 text-right">
                        <span className="font-arabic font-heading text-2xl font-bold tracking-wide text-primary/80">
                          {p.data.arab}
                        </span>
                      </div>
                    )}

                    {/* Trait Definition */}
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                        DEFINISI PILAR
                      </span>
                      <p className="font-sans text-sm leading-relaxed text-foreground/90">
                        {p.data?.definisi || "Belum ada definisi terperinci."}
                      </p>
                    </div>

                    {/* Lalai & Lebih Attributes */}
                    <div className="mt-1 grid grid-cols-1 gap-4 rounded-xl border border-border/80 bg-secondary/50 p-4 sm:grid-cols-2">
                      {p.data?.lalai_nama_lengkap && (
                        <div className="flex flex-col gap-1 border-r border-border/40 pr-2 print:border-none">
                          <span className="flex items-center gap-1 font-mono text-[10px] font-semibold text-rose-700 uppercase dark:text-rose-400">
                            ⚠️ Potensi Lalai / Kurang
                          </span>
                          <h5 className="font-heading text-xs font-medium text-foreground">
                            {p.data.lalai_nama_lengkap}
                          </h5>
                          <p className="mt-0.5 text-[11px] leading-normal text-muted-foreground">
                            {p.data.lalai_definisi}
                          </p>
                        </div>
                      )}
                      {p.data?.lebih_nama_lengkap && (
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1 font-mono text-[10px] font-semibold text-amber-700 uppercase dark:text-amber-400">
                            ⚠️ Potensi Berlebihan
                          </span>
                          <h5 className="font-heading text-xs font-medium text-foreground">
                            {p.data.lebih_nama_lengkap}
                          </h5>
                          <p className="mt-0.5 text-[11px] leading-normal text-muted-foreground">
                            {p.data.lebih_definisi}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Recommendation Actions if available */}
                    {p.data?.profesi && (
                      <div className="mt-1 flex flex-col gap-1">
                        <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                          💼 Rekomendasi Profesi & Peran
                        </span>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {p.data.profesi}
                        </p>
                      </div>
                    )}

                    {p.data?.jurusan && (
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                          🎓 Jurusan Pendidikan Terkait
                        </span>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {p.data.jurusan}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}

              {filteredPillars.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-card py-12 text-center">
                  <HelpCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">
                    Tidak menemukan pilar sifat yang cocok dengan pencarian
                    Anda.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* FOOTER & ACCREDITATION STATEMENT */}
          <div className="border-t border-border pt-8 pb-12 text-center print:mt-12 print:border-t-2 print:border-black">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Metode Tafsir Bakat 40 (TB40) diselaraskan oleh Lembaga Insan
              Taqwa. Laporan ini bersifat personal dan dimaksudkan sebagai
              referensi bimbingan pengembangan karakter dan akhlak mulia.
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">
              ID Laporan: {umum.nama.panggilan.toLowerCase()}-
              {(umum.usia || "00").toString()}-
              {Math.floor(Math.random() * 1000)}
            </p>
          </div>
        </div>

        {/* Dynamic Printing-specific CSS directly injected for gorgeous PDF styling */}
        <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            font-size: 12pt;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:text-black {
            color: black !important;
          }
          .bg-card, .bg-secondary, .bg-primary\\/10 {
            background-color: #faf9f6 !important;
            border-color: #e5e5e5 !important;
          }
          .border-l-primary {
            border-left-color: #6E8268 !important;
            border-left-width: 4px !important;
          }
          .tb40-interactive-svg {
            max-width: 100% !important;
            height: auto !important;
          }
          .print\\:break-before-page {
            break-before: page !important;
          }
          .print\\:break-inside-avoid {
            break-inside: avoid !important;
          }
        }
      `}</style>
      </div>

      {/* Reset Modal */}
      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent className="max-w-md print:hidden">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 animate-bounce rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <DialogTitle className="font-heading text-lg font-semibold">
                  Ulangi Tes & Hapus Data?
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  Apakah Anda yakin ingin mengulangi tes dari awal? Tindakan ini
                  akan menghapus semua data pendaftaran, jawaban, dan hasil
                  analisis Anda secara permanen dari perangkat ini.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-2 flex items-center justify-end gap-2.5 border-t border-border pt-4">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setShowResetModal(false)}
              className="cursor-pointer border-none py-1.5 text-xs shadow-none hover:bg-muted"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              type="button"
              onClick={confirmResetAndRestart}
              className="text-destructive-foreground cursor-pointer bg-destructive px-4 py-1.5 text-xs font-semibold hover:bg-destructive/90"
            >
              Ya, Ulangi & Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <div className="mb-2 rounded-full bg-primary/10 p-3 text-primary">
                <Share2 className="h-6 w-6" />
              </div>
              <DialogTitle className="font-heading text-xl font-semibold">
                Bagikan Hasil Penilaian
              </DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">
                Scan QR Code atau salin tautan di bawah untuk membagikan hasil
                penilaian Anda secara langsung.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="mx-auto flex justify-center rounded-xl border border-border bg-white p-4">
            <QRCodeSVG value={shareUrl} size={180} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="ml-1 font-mono text-[10px] font-semibold text-muted-foreground uppercase">
              Tautan Publik
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 truncate rounded-md border border-border bg-secondary px-3 py-2.5 font-mono text-xs text-muted-foreground outline-none"
              />
              <Button
                onClick={copyToClipboard}
                size="sm"
                className="flex shrink-0 cursor-pointer items-center gap-1.5"
              >
                {isCopied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {isCopied ? "Tersalin" : "Salin"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
