import posthog from "posthog-js"
import { useState, useEffect, useRef } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import LZString from "lz-string"
import { QRCodeSVG } from "qrcode.react"
import { BarChart as EBarChart } from "@devstool/shadcn-echarts"
import { Button } from "@/components/ui/button"
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
  X,
  BarChart2
} from "lucide-react"

export const Route = createFileRoute("/result")({ component: ResultPage })

function ResultPage() {
  const navigate = useNavigate()
  
  // Local Data State
  const [umum, setUmum] = useState<any>(null)
  const [tb40Result, setTb40Result] = useState<any>(null)
  const [tb40ResultRanked, setTb40ResultRanked] = useState<any>(null)
  const [tb40Presentation, setTb40Presentation] = useState<any>(null)
  
  // v0.2 States
  const [isV2, setIsV2] = useState(false)
  const [v2Result, setV2Result] = useState<any>(null)
  
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
  const [filterBy, setFilterBy] = useState<"all" | "introvert" | "extrovert" | "muthmainnah" | "lawwamah" | "ammarah">("all")
  const [sortBy, setSortBy] = useState<"highest" | "lowest" | "alphabetical">("highest")
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
            const decompressed = LZString.decompressFromEncodedURIComponent(shareData)
            if (decompressed) {
              const payload = JSON.parse(decompressed)
              setUmum(payload.u)
              
              const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4040"
              const type = payload.t || "tb40"
              const response = await fetch(`${apiUrl}/api/v0.1/${type}/calculation`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ parts: { umum: payload.u, [type]: payload.a } }),
              })
              
              if (!response.ok) throw new Error("Failed to calculate shared result")
              
              const resultData = await response.json()
              const parsedResult = resultData
              
              const tb40Data = parsedResult.parts?.tb40 || parsedResult.parts?.tb40anak || parsedResult
              setTb40Result(tb40Data.tb40Result || tb40Data.result)
              setTb40ResultRanked(tb40Data.tb40ResultRanked || tb40Data.ranked)
              setTb40Presentation(tb40Data.tb40Presentation || tb40Data.presentation)
              setIsV2(false)
              
              localStorage.setItem("tb40_umum", JSON.stringify(payload.u))
              if (typeof window !== "undefined") {
                try {
                  posthog.capture("result_viewed", { shared: true, test_mode: "adaptive" })
                } catch (err) {
                  console.warn("PostHog tracking failed", err)
                }
              }
              localStorage.setItem("tb40_result", JSON.stringify(resultData))
              setIsCalculating(false)
              
              // Remove ?share from URL without refreshing
              window.history.replaceState({}, document.title, window.location.pathname)
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

        if (parsedResult.version === "v0.2" && parsedResult.status === "complete" && parsedResult.result && !parsedResult.parts) {
          setIsV2(true)
          setV2Result(parsedResult.result)
        } else {
          setIsV2(false)
          const tb40Data = parsedResult.parts?.tb40 || parsedResult
          setTb40Result(tb40Data.tb40Result || tb40Data.result)
          setTb40ResultRanked(tb40Data.tb40ResultRanked || tb40Data.ranked)
          setTb40Presentation(tb40Data.tb40Presentation || tb40Data.presentation)
        }

        if (typeof window !== "undefined") {
          try {
            posthog.capture("result_viewed", {
              shared: false,
              test_mode: parsedResult.version === "v0.2" ? "adaptive" : "precision"
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Sparkles className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Menghitung Hasil Penilaian Anda...</p>
      </div>
    )
  }

  if (!umum || (!tb40Result && !v2Result)) return null

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
      const savedAnswers = localStorage.getItem("tb40_answers") || localStorage.getItem("tb40_answers_v2_tier3")
      
      if (!savedUmum || !savedAnswers) return
      
      let parsedAnswers = JSON.parse(savedAnswers)
      if (!Array.isArray(parsedAnswers)) {
        // Ensure it's an array for the API
        parsedAnswers = Array.from({length: 40}).map((_, i) => parsedAnswers[i] || parsedAnswers[`q${i}`] || parsedAnswers[(i+1).toString()] || 60)
      }
      
      const parsedUmum = JSON.parse(savedUmum)
      
      const compactPayload = {
        u: parsedUmum,
        a: parsedAnswers,
        t: "tb40" 
      }
      
      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(compactPayload))
      const url = `${window.location.origin}/result?share=${compressed}`
      
      setShareUrl(url)
      setShowShareModal(true)
    } catch(e) {
      console.error("Share error", e)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  // Confirmation for Reset
  const confirmResetAndRestart = () => {
    localStorage.removeItem("tb40_umum")
    localStorage.removeItem("tb40_answers")
    localStorage.removeItem("tb40_answers_v2")
    localStorage.removeItem("tb40_result")
    navigate({ to: "/" as any })
  }

  if (isV2 && v2Result) {
    const savedAnswersV2 = localStorage.getItem("tb40_answers_v2")
    const answersV2 = savedAnswersV2 ? JSON.parse(savedAnswersV2) : null

    const handleUpgradeToPrecision = () => {
      const updatedUmum = {
        ...umum,
        testMode: "precision",
        requestPrecision: true
      }
      localStorage.setItem("tb40_umum", JSON.stringify(updatedUmum))
      navigate({ to: "/test" as any })
    }

    return (
      <>
        <div className="min-h-screen bg-background text-foreground flex flex-col relative print:bg-white print:text-black">
          <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none" />
          
          <div className="max-w-4xl w-full mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
            
            {/* Header Controls */}
            <div className="flex items-center justify-between border-b border-border pb-4 print:hidden">
              <button
                onClick={() => navigate({ to: "/test" as any })}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" /> Kembali Ke Penilaian
              </button>
              
              <button
                onClick={() => setShowResetModal(true)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Hapus & Ulangi Tes
              </button>
            </div>

            {/* Profile Intro */}
            <div className="flex flex-col gap-4 mt-2">
              <div className="inline-flex items-center self-start gap-1.5 bg-primary/10 px-3 py-1 rounded-full text-xs font-semibold text-primary">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Hasil Penilaian Cepat (v0.2)
              </div>
              <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                Tafsir Bakat <span className="text-primary italic">{umum.nama.panggilan}</span>
              </h1>
              <p className="text-muted-foreground text-sm font-mono">
                Subjek: <span className="font-semibold text-foreground">{umum.nama.lengkap}</span> &bull; 
                Usia: <span className="font-semibold text-foreground">{umum.usia} Tahun</span> &bull; 
                Tanggal: <span className="font-semibold text-foreground">{umum.tanggal}</span>
              </p>
            </div>

            {/* Primary Group Banner */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm border-l-4 border-l-primary relative overflow-hidden flex flex-col gap-2">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold">Klaster Kepribadian Utama</span>
              <h2 className="font-heading font-semibold text-2xl md:text-3xl text-primary mt-1">
                {v2Result.primary_group}
              </h2>
              <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{v2Result.description}</p>
            </div>

            {/* Traits Details */}
            <div className="flex flex-col gap-4">
              <h3 className="font-heading font-semibold text-xl flex items-center gap-2 border-b border-border pb-3">
                <BookOpen className="w-5 h-5 text-primary" /> Rincian Sifat yang Dievaluasi
              </h3>
              
              <div className="flex flex-col gap-4">
                {v2Result.traits.map((p: any) => {
                  const localScore = answersV2?.tier_3?.[`q${p.questionIndex}`] ?? answersV2?.tier_3?.[p.pillar?.no || p.questionIndex]
                  const score = Number(p.score ?? localScore ?? 60)
                  let ratingBg = "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400"
                  let ratingBorder = "border-amber-200 dark:border-amber-950/20"
                  if (score >= 80) {
                    ratingBg = "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400 font-semibold"
                    ratingBorder = "border-teal-200 dark:border-teal-950/20 border-l-teal-600 border-l-4"
                  } else if (score >= 60) {
                    ratingBg = "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400"
                    ratingBorder = "border-emerald-200 dark:border-emerald-950/20 border-l-emerald-600 border-l-4"
                  } else if (score <= 40) {
                    ratingBg = "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400"
                    ratingBorder = "border-rose-200 dark:border-rose-950/20 border-l-rose-600 border-l-4"
                  }

                  return (
                    <div
                      key={p.name}
                      className={`bg-card border rounded-2xl p-5 shadow-xs flex flex-col gap-3 transition-all ${ratingBorder}`}
                    >
                      <div className="flex items-center justify-between border-b border-border/70 pb-2">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-xs font-bold text-primary bg-secondary px-2 py-0.5 rounded border border-border">
                            Pilar {p.pillar?.no || p.questionIndex}
                          </span>
                          <h4 className="font-heading font-semibold text-base text-foreground">
                            {p.data?.nama_lengkap || p.name}
                          </h4>
                        </div>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${ratingBg}`}>
                          Skor: {score}
                        </span>
                      </div>

                      {p.data?.arab && (
                        <div className="text-right -mt-1">
                          <span className="font-heading font-bold text-xl text-primary/80 font-arabic">
                            {p.data.arab}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-mono uppercase text-muted-foreground font-semibold">Definisi Pilar</span>
                        <p className="text-xs text-foreground/90 leading-relaxed">
                          {p.data?.definisi || "Belum ada definisi terperinci."}
                        </p>
                      </div>

                      {(p.data?.lalai_nama_lengkap || p.data?.lebih_nama_lengkap) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 bg-secondary/40 border border-border/60 p-4 rounded-xl text-xs">
                          {p.data?.lalai_nama_lengkap && (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                                ⚠️ Potensi Lalai
                              </span>
                              <h5 className="font-medium text-foreground">{p.data.lalai_nama_lengkap}</h5>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{p.data.lalai_definisi}</p>
                            </div>
                          )}
                          {p.data?.lebih_nama_lengkap && (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                ⚠️ Potensi Berlebihan
                              </span>
                              <h5 className="font-medium text-foreground">{p.data.lebih_nama_lengkap}</h5>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{p.data.lebih_definisi}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Upgrade CTA Section */}
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mt-4 text-center flex flex-col items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10" />
              <div className="p-3 bg-primary/10 rounded-full border border-primary/20 text-primary">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-heading font-semibold text-lg text-foreground">Buka 2 Peta Visual & Laporan Lengkap 40 Pilar</h3>
                <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
                  Penilaian cepat adaptif (v0.2) Anda hanya menguji 3 pilar spesifik. Dapatkan analisis visual premium yang memetakan kepribadian lengkap Anda ke dalam 40 Pilar Mulia dengan melengkapi 37 pertanyaan sisa.
                </p>
              </div>
              <Button
                onClick={handleUpgradeToPrecision}
                className="mt-2 bg-primary hover:bg-primary/90 flex items-center gap-2 font-heading font-semibold shadow-md shadow-primary/25 px-6 py-5 cursor-pointer"
              >
                Lengkapi Penilaian Presisi (Upgrade) <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

          </div>
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all duration-300 animate-in fade-in-0">
            <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-6 relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setShowShareModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col gap-1.5 text-center items-center">
                <div className="p-3 bg-primary/10 rounded-full text-primary mb-2">
                  <Share2 className="w-6 h-6" />
                </div>
                <h3 className="font-heading font-semibold text-xl text-foreground">
                  Bagikan Hasil Penilaian
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Scan QR Code atau salin tautan di bawah untuk membagikan hasil penilaian Anda secara langsung.
                </p>
              </div>

              <div className="flex justify-center p-4 bg-white rounded-xl border border-border mx-auto">
                <QRCodeSVG value={shareUrl} size={180} />
              </div>
              
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono uppercase font-semibold text-muted-foreground ml-1">Tautan Publik</span>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={shareUrl} 
                    className="flex-1 bg-secondary text-xs rounded-md px-3 py-2.5 border border-border outline-none text-muted-foreground font-mono truncate"
                  />
                  <Button onClick={copyToClipboard} size="sm" className="shrink-0 flex items-center gap-1.5 cursor-pointer">
                    {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {isCopied ? "Tersalin" : "Salin"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reset / Restart Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all duration-300 animate-in fade-in-0">
            <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive mt-0.5 animate-bounce">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <h3 className="font-heading font-semibold text-lg text-foreground">
                    Hapus Data & Mulai Ulang?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Tindakan ini akan **menghapus semua hasil analisis cepat Anda secara permanen** dari perangkat ini.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-2.5 mt-2 border-t border-border pt-4">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="text-xs py-1.5 cursor-pointer shadow-none border-none hover:bg-muted"
                >
                  Batal
                </Button>
                <Button
                  variant="destructive"
                  type="button"
                  onClick={confirmResetAndRestart}
                  className="text-xs py-1.5 px-4 cursor-pointer bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
                >
                  Ya, Hapus & Ulangi
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }



  const scoreToColor = (score: number): string => {
    score = Math.max(0, Math.min(100, score));
    let startColor: number[] = [];
    let endColor: number[] = [];
    let interpolationFactor = 0;
    
    if (score <= 50) {
      startColor = [191, 64, 64]; // Red (#bf4040)
      endColor = [64, 191, 64];   // Green (#40bf40)
      interpolationFactor = score / 50;
    } else {
      startColor = [64, 191, 64]; // Green (#40bf40)
      endColor = [64, 64, 191];   // Blue (#4040bf)
      interpolationFactor = (score - 50) / 50;
    }
    
    const interpolatedColor = startColor.map((channel, i) => 
      Math.round(channel + (endColor[i] - channel) * interpolationFactor)
    );
    
    return `#${interpolatedColor.map(c => c.toString(16).padStart(2, '0')).join('')}`;
  }

  const rankToColor = (rank: number, lowestRank: number): string => {
    rank = Math.max(1, Math.min(rank, lowestRank));
    const score = ((lowestRank - rank) / (lowestRank - 1)) * 100;
    return scoreToColor(score);
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
                finalColor = rankToColor(Number(pillar.rank), groupResult.length)
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
      
      const el18 = tb40Result["18"]?.find((p: any) => p.pillar.no === parent18No)
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
      
      const el18 = tb40Result["18"]?.find((p: any) => p.pillar.no === parent18No)
      if (!el18) return false
      
      const parent6No = el18.parents?.[0]?.no
      if (!parent6No) return false
      
      const el6 = tb40Result["6"]?.find((p: any) => p.pillar.no === parent6No)
      if (!el6) return false
      
      const parent2No = el6.parents?.find((parent: any) => parent.group === "2")?.no
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
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.data?.nama && p.data.nama.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.data?.definisi && p.data.definisi.toLowerCase().includes(searchTerm.toLowerCase()))
      
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
        return Number(b.score) - Number(a.score) || Number(a.rank) - Number(b.rank)
      }
      if (sortBy === "lowest") {
        return Number(a.score) - Number(b.score) || Number(b.rank) - Number(a.rank)
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
    return chart2Mode === "score" ? Number(item.score ?? 0) : 7 - Number(item.rank ?? 0)
  }

  return (
    <>
      <div className="min-h-screen bg-background text-foreground flex flex-col relative print:bg-white print:text-black">
      
      {/* Dynamic Background Styling */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none print:hidden" />
      
      {/* FLOATING OUTLINE NAVIGATION DOCK */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-4 z-40 bg-card/65 backdrop-blur-md border border-border p-4 rounded-2xl shadow-lg shadow-stone-200/40 select-none print:hidden">
        <h5 className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground uppercase pb-1 border-b border-border/80">LAPORAN</h5>
        
        <button
          onClick={() => scrollTo(ringkasanRef)}
          className={`flex items-center gap-2 text-xs text-left font-medium transition-all ${
            activeSection === "ringkasan" ? "text-primary translate-x-1" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeSection === "ringkasan" ? "bg-primary" : "bg-transparent"}`} />
          Ringkasan Profil
        </button>

        <button
          onClick={() => scrollTo(pemetaanRef)}
          className={`flex items-center gap-2 text-xs text-left font-medium transition-all ${
            activeSection === "pemetaan" ? "text-primary translate-x-1" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeSection === "pemetaan" ? "bg-primary" : "bg-transparent"}`} />
          Pemetaan Bakat (SVG)
        </button>

        <button
          onClick={() => scrollTo(chartsRef)}
          className={`flex items-center gap-2 text-xs text-left font-medium transition-all ${
            activeSection === "charts" ? "text-primary translate-x-1" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeSection === "charts" ? "bg-primary" : "bg-transparent"}`} />
          Grafik Data
        </button>

        <button
          onClick={() => scrollTo(gayaRef)}
          className={`flex items-center gap-2 text-xs text-left font-medium transition-all ${
            activeSection === "gaya" ? "text-primary translate-x-1" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeSection === "gaya" ? "bg-primary" : "bg-transparent"}`} />
          Belajar & Komunikasi
        </button>

        <button
          onClick={() => scrollTo(rincianRef)}
          className={`flex items-center gap-2 text-xs text-left font-medium transition-all ${
            activeSection === "rincian" ? "text-primary translate-x-1" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeSection === "rincian" ? "bg-primary" : "bg-transparent"}`} />
          Rincian 40 Pilar Sifat
        </button>
        
        <hr className="border-border/80 my-1" />
        
        <div className="flex flex-col gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm" className="flex items-center gap-1.5 text-xs py-1.5 cursor-pointer">
            <Printer className="w-3.5 h-3.5" /> Cetak PDF
          </Button>
          <Button onClick={handleShare} variant="default" size="sm" className="flex items-center gap-1.5 text-xs py-1.5 cursor-pointer shadow-sm">
            <Share2 className="w-3.5 h-3.5" /> Bagikan Hasil
          </Button>
        </div>
      </div>

      {/* CORE CONTENT LAYOUT */}
      <div className="max-w-4xl w-full mx-auto px-4 md:px-8 py-8 flex flex-col gap-12 print:px-0 print:py-0">
        
        {/* Lapor Header Controls */}
        <div className="flex items-center justify-between border-b border-border pb-4 print:hidden">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate({ to: "/test" as any })}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" /> Kembali Ke Penilaian
            </button>
            <span className="text-border">|</span>
            <button
              onClick={() => setShowResetModal(true)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Ulangi Tes Dari Awal
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded dark:bg-emerald-950/20 dark:text-emerald-400">
              Perhitungan Selesai
            </span>
            <Button onClick={handlePrint} variant="outline" size="sm" className="flex items-center gap-1.5 font-heading cursor-pointer">
              <Printer className="w-4 h-4" /> Cetak PDF
            </Button>
            <Button onClick={handleShare} size="sm" className="flex items-center gap-1.5 font-heading cursor-pointer shadow-sm">
              <Share2 className="w-4 h-4" /> Bagikan
            </Button>
          </div>
        </div>

        {/* HERO AREA & TYPOGRAPHY HEADER */}
        <div className="text-center md:text-left flex flex-col gap-4 mt-4">
          <div className="inline-flex items-center self-center md:self-start gap-1.5 bg-primary/10 px-3 py-1 rounded-full text-xs font-semibold text-primary">
            <Sparkles className="w-3.5 h-3.5" /> Laporan Analisa Editorial
          </div>
          
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
            Tafsir Bakat <span className="text-primary italic">{umum.nama.panggilan}</span>
          </h1>
          
          <p className="text-muted-foreground text-sm font-mono">
            Subjek: <span className="font-semibold text-foreground">{umum.nama.lengkap}</span> &bull; 
            Usia: <span className="font-semibold text-foreground">{umum.usia ?? (umum.lahir?.tanggal ? "Terhitung" : "-")} Tahun</span> &bull; 
            Analisa: <span className="font-semibold text-foreground">{umum.tanggal}</span>
          </p>
          
          {/* Main Character Title Quote Box (Julukan) */}
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mt-4 shadow-sm border-l-4 border-l-primary relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-semibold">Gelar Kepribadian Anda</span>
            <h2 className="font-heading font-semibold text-2xl md:text-3xl text-foreground mt-2 leading-relaxed">
              "{tb40Presentation.julukan.data}"
            </h2>
          </div>
        </div>

        {/* SECTION 1: DETAILED PERSONALITY REPORT */}
        <div ref={ringkasanRef} className="scroll-mt-12 flex flex-col gap-6">
          <h3 className="font-heading font-semibold text-2xl flex items-center gap-2 border-b border-border pb-3">
            <FileText className="w-5 h-5 text-primary" /> Ringkasan Karakter & Jiwa
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 flex flex-col gap-4 text-justify leading-relaxed text-foreground/90 text-sm md:text-base">
              {tb40Presentation.kepribadian.data.split("\n\n").map((para: string, idx: number) => (
                <p key={idx} className="first-letter:text-3xl first-letter:font-heading first-letter:font-bold first-letter:text-primary first-letter:float-left first-letter:mr-2 leading-[1.7]">
                  {para}
                </p>
              ))}
            </div>
            
            {/* Overview Highlights Cards */}
            <div className="flex flex-col gap-4">
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <h4 className="font-heading font-medium text-sm flex items-center gap-1.5 text-primary border-b border-border pb-2">
                  <Brain className="w-4 h-4" /> Kategori Mental (2 Pilar)
                </h4>
                <div className="flex flex-col gap-3 mt-3">
                  {tb40ResultRanked["2"]?.slice(0, 2).map((p: any) => (
                    <div key={p.name} className="flex justify-between items-center text-xs">
                      <span className="font-medium text-foreground">{p.name}</span>
                      <span className="font-mono bg-secondary px-2 py-0.5 rounded font-semibold border border-border">{p.score}% ({p.rank === 1 ? "Dominan" : "Kondisional"})</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <h4 className="font-heading font-medium text-sm flex items-center gap-1.5 text-primary border-b border-border pb-2">
                  <TrendingUp className="w-4 h-4" /> 3 Kekuatan Utama (6 Pilar)
                </h4>
                <div className="flex flex-col gap-3 mt-3">
                  {tb40ResultRanked["6"]?.slice(0, 3).map((p: any) => (
                    <div key={p.name} className="flex justify-between items-center text-xs">
                      <span className="font-medium text-foreground">{p.data?.label || p.name}</span>
                      <span className="font-mono bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded font-bold dark:bg-emerald-950/20 dark:text-emerald-400">{p.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: INTERACTIVE SVG MAPS */}
        <div ref={pemetaanRef} className="scroll-mt-12 flex flex-col gap-6 print:break-before-page">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-3 gap-4">
            <h3 className="font-heading font-semibold text-2xl flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Visualisasi Pemetaan Tafsir Bakat
            </h3>
            
            {/* Elegant Tab Selector */}
            <div className="flex bg-secondary/80 border border-border p-1 rounded-full self-start md:self-auto print:hidden shadow-inner">
              <button
                type="button"
                onClick={() => setMapTab("score")}
                className={`px-4 py-1.5 rounded-full text-xs font-heading font-medium transition-all cursor-pointer ${
                  mapTab === "score" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Skor Saja
              </button>
              <button
                type="button"
                onClick={() => setMapTab("rank")}
                className={`px-4 py-1.5 rounded-full text-xs font-heading font-medium transition-all cursor-pointer ${
                  mapTab === "rank" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Rangka Saja
              </button>
              <button
                type="button"
                onClick={() => setMapTab("both")}
                className={`px-4 py-1.5 rounded-full text-xs font-heading font-medium transition-all cursor-pointer ${
                  mapTab === "both" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Kedua Peta
              </button>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground leading-relaxed -mt-2">
            Grafik di bawah ini memetakan kepribadian Anda dalam klaster-klaster khusus. Arahkan kursor / sentuh bagian-bagian grafik untuk melihat representasi visual bakat secara mendalam.
          </p>

          {/* Conditional Layouts based on mapTab */}
          <div className="mt-2">
            
            {/* SCORE ONLY VIEW */}
            {mapTab === "score" && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-md flex flex-col gap-4 relative max-w-2xl mx-auto transition-all duration-300">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h4 className="font-heading font-semibold text-base">Pemetaan Warna Berdasar Skor</h4>
                  <span className="text-[10px] font-mono uppercase bg-secondary px-2 py-0.5 rounded font-bold text-muted-foreground">SKOR</span>
                </div>
                <div
                  className="tb40-svg-container overflow-hidden rounded-lg bg-[#faf9f6] dark:bg-[#FAF8F5] p-2"
                  dangerouslySetInnerHTML={{ __html: getCleanSVG(tb40Presentation.pemetaan_tafsir_bakat.file, "score") }}
                />
                <p className="text-[11px] text-muted-foreground leading-normal mt-1 text-center">
                  *Warna mewakili tingkat penguasaan: Hijau (Unggul), Kuning (Seimbang), Merah (Kelemahan).
                </p>
              </div>
            )}

            {/* RANK ONLY VIEW */}
            {mapTab === "rank" && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-md flex flex-col gap-4 relative max-w-2xl mx-auto transition-all duration-300">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h4 className="font-heading font-semibold text-base">Pemetaan Berdasar Rangka (Rank)</h4>
                  <span className="text-[10px] font-mono uppercase bg-secondary px-2 py-0.5 rounded font-bold text-muted-foreground">RANK</span>
                </div>
                <div
                  className="tb40-svg-container overflow-hidden rounded-lg bg-[#faf9f6] dark:bg-[#FAF8F5] p-2"
                  dangerouslySetInnerHTML={{ __html: getCleanSVG(tb40Presentation.pemetaan_tafsir_bakat_byRank.file, "rank") }}
                />
                <p className="text-[11px] text-muted-foreground leading-normal mt-1 text-center">
                  *Warna mewakili posisi relatif bakat tersebut dibandingkan dengan kekuatan bakat Anda yang lain.
                </p>
              </div>
            )}

            {/* BOTH SIDE-BY-SIDE VIEW (Exactly as before) */}
            {mapTab === "both" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-300">
                
                {/* Dynamic Map 1: Score Map */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-md flex flex-col gap-4 relative">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h4 className="font-heading font-semibold text-sm">Pemetaan Warna Berdasar Skor</h4>
                    <span className="text-[10px] font-mono uppercase bg-secondary px-2 py-0.5 rounded font-bold text-muted-foreground">SKOR</span>
                  </div>
                  <div
                    className="tb40-svg-container overflow-hidden rounded-lg bg-[#faf9f6] dark:bg-[#FAF8F5]"
                    dangerouslySetInnerHTML={{ __html: getCleanSVG(tb40Presentation.pemetaan_tafsir_bakat.file, "score") }}
                  />
                  <p className="text-[10px] text-muted-foreground leading-normal mt-1">
                    *Warna mewakili tingkat penguasaan: Hijau (Unggul), Kuning (Seimbang), Merah (Kelemahan).
                  </p>
                </div>

                {/* Dynamic Map 2: Rank Map */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-md flex flex-col gap-4 relative">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h4 className="font-heading font-semibold text-sm">Pemetaan Berdasar Rangka (Rank)</h4>
                    <span className="text-[10px] font-mono uppercase bg-secondary px-2 py-0.5 rounded font-bold text-muted-foreground">RANK</span>
                  </div>
                  <div
                    className="tb40-svg-container overflow-hidden rounded-lg bg-[#faf9f6] dark:bg-[#FAF8F5]"
                    dangerouslySetInnerHTML={{ __html: getCleanSVG(tb40Presentation.pemetaan_tafsir_bakat_byRank.file, "rank") }}
                  />
                  <p className="text-[10px] text-muted-foreground leading-normal mt-1">
                    *Warna mewakili posisi relatif bakat tersebut dibandingkan dengan kekuatan bakat Anda yang lain.
                  </p>
                </div>

              </div>
            )}

          </div>
        </div>

        {/* SECTION 2.5: INTERACTIVE ECHARTS */}
        <div ref={chartsRef} id="charts" className="scroll-mt-12 flex flex-col gap-6 print:break-before-page">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-3 gap-4">
            <h3 className="font-heading font-semibold text-2xl flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" /> Grafik Data Interaktif
            </h3>
          </div>
          
          <div className="flex flex-col gap-8">

            {/* Chart 2: 6 Strengths */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-md flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="font-heading font-semibold text-base">6 Kekuatan Utama</h4>
                <div className="flex bg-secondary/80 border border-border p-0.5 rounded-md shadow-inner">
                  <button onClick={() => setChart2Mode("score")} className={`px-2 py-1 rounded text-[10px] font-mono uppercase font-bold transition-all ${chart2Mode === "score" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Skor</button>
                  <button onClick={() => setChart2Mode("rank")} className={`px-2 py-1 rounded text-[10px] font-mono uppercase font-bold transition-all ${chart2Mode === "rank" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Rank</button>
                </div>
              </div>
              <div className="w-full">
                <EBarChart
                  height={400}
                  option={{
                    title: [
                      { text: "Introvert", left: "20%", textStyle: { fontSize: 13, fontWeight: "bold", fontFamily: "Inter, sans-serif", color: "#4b5563" } },
                      { text: "Extrovert", right: "20%", textStyle: { fontSize: 13, fontWeight: "bold", fontFamily: "Inter, sans-serif", color: "#4b5563" } }
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
                          const item = strengthsList.find((s: any) => s.pillar?.no === no)
                          if (item) {
                            res += `<b>${p.seriesName} - ${item.name}</b>: ${Number(item.score).toFixed(1)} (Rank ${item.rank})<br/>`
                          }
                        })
                        return res
                      }
                    },
                    grid: [
                      { left: "5%", width: "42%", bottom: "5%", top: "18%", containLabel: true },
                      { right: "5%", width: "42%", bottom: "5%", top: "18%", containLabel: true }
                    ],
                    xAxis: [
                      { gridIndex: 0, type: "value", inverse: true, show: false, max: chart2Mode === "score" ? 100 : 6, min: 0 },
                      { gridIndex: 1, type: "value", inverse: false, show: false, max: chart2Mode === "score" ? 100 : 6, min: 0 }
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
                          color: "#6b7280"
                        },
                        data: ["Rasa", "Cipta", "Karsa"]
                      },
                      {
                        gridIndex: 1,
                        type: "category",
                        position: "left",
                        axisLine: { show: false },
                        axisTick: { show: false },
                        axisLabel: { show: false },
                        data: ["Rasa", "Cipta", "Karsa"]
                      }
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
                          label: { formatter: "{b}", position: "end", fontSize: 9, fontFamily: "Inter, sans-serif" },
                          lineStyle: { type: "dashed", width: 1 },
                          data: chart2Mode === "score"
                            ? [
                                { xAxis: 80, name: "Kuat", lineStyle: { color: "#10b981" } },
                                { xAxis: 60, name: "Cukup", lineStyle: { color: "#f59e0b" } }
                              ]
                            : [
                                { xAxis: 5, name: "Top 2", lineStyle: { color: "#10b981" } },
                                { xAxis: 3, name: "Top 4", lineStyle: { color: "#f59e0b" } }
                              ]
                        },
                        data: [
                          {
                            value: getVal("3"),
                            itemStyle: {
                              color: getVal("3") >= 80 
                                ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#059669' }] }
                                : getVal("3") >= 60
                                  ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#fbbf24' }, { offset: 1, color: '#d97706' }] }
                                  : { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#f87171' }, { offset: 1, color: '#dc2626' }] }
                            },
                            label: {
                              show: true,
                              position: "left",
                              formatter: () => {
                                const item = strengthsList.find((s: any) => s.pillar?.no === "3")
                                return item ? `${item.name}\n${chart2Mode === "score" ? Number(item.score).toFixed(0) : "Rank " + item.rank}` : ""
                              },
                              fontFamily: "Inter, sans-serif",
                              fontSize: 10,
                              color: "#374151"
                            }
                          },
                          {
                            value: getVal("2"),
                            itemStyle: {
                              color: getVal("2") >= 80
                                ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#059669' }] }
                                : getVal("2") >= 60
                                  ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#fbbf24' }, { offset: 1, color: '#d97706' }] }
                                  : { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#f87171' }, { offset: 1, color: '#dc2626' }] }
                            },
                            label: {
                              show: true,
                              position: "left",
                              formatter: () => {
                                const item = strengthsList.find((s: any) => s.pillar?.no === "2")
                                return item ? `${item.name}\n${chart2Mode === "score" ? Number(item.score).toFixed(0) : "Rank " + item.rank}` : ""
                              },
                              fontFamily: "Inter, sans-serif",
                              fontSize: 10,
                              color: "#374151"
                            }
                          },
                          {
                            value: getVal("1"),
                            itemStyle: {
                              color: getVal("1") >= 80
                                ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#059669' }] }
                                : getVal("1") >= 60
                                  ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#fbbf24' }, { offset: 1, color: '#d97706' }] }
                                  : { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#f87171' }, { offset: 1, color: '#dc2626' }] }
                            },
                            label: {
                              show: true,
                              position: "left",
                              formatter: () => {
                                const item = strengthsList.find((s: any) => s.pillar?.no === "1")
                                return item ? `${item.name}\n${chart2Mode === "score" ? Number(item.score).toFixed(0) : "Rank " + item.rank}` : ""
                              },
                              fontFamily: "Inter, sans-serif",
                              fontSize: 10,
                              color: "#374151"
                            }
                          }
                        ]
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
                          label: { formatter: "{b}", position: "end", fontSize: 9, fontFamily: "Inter, sans-serif" },
                          lineStyle: { type: "dashed", width: 1 },
                          data: chart2Mode === "score"
                            ? [
                                { xAxis: 80, name: "Kuat", lineStyle: { color: "#10b981" } },
                                { xAxis: 60, name: "Cukup", lineStyle: { color: "#f59e0b" } }
                              ]
                            : [
                                { xAxis: 5, name: "Top 2", lineStyle: { color: "#10b981" } },
                                { xAxis: 3, name: "Top 4", lineStyle: { color: "#f59e0b" } }
                              ]
                        },
                        data: [
                          {
                            value: getVal("6"),
                            itemStyle: {
                              color: getVal("6") >= 80
                                ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#059669' }, { offset: 1, color: '#34d399' }] }
                                : getVal("6") >= 60
                                  ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#d97706' }, { offset: 1, color: '#fbbf24' }] }
                                  : { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#dc2626' }, { offset: 1, color: '#f87171' }] }
                            },
                            label: {
                              show: true,
                              position: "right",
                              formatter: () => {
                                const item = strengthsList.find((s: any) => s.pillar?.no === "6")
                                return item ? `${item.name}\n${chart2Mode === "score" ? Number(item.score).toFixed(0) : "Rank " + item.rank}` : ""
                              },
                              fontFamily: "Inter, sans-serif",
                              fontSize: 10,
                              color: "#374151"
                            }
                          },
                          {
                            value: getVal("5"),
                            itemStyle: {
                              color: getVal("5") >= 80
                                ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#059669' }, { offset: 1, color: '#34d399' }] }
                                : getVal("5") >= 60
                                  ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#d97706' }, { offset: 1, color: '#fbbf24' }] }
                                  : { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#dc2626' }, { offset: 1, color: '#f87171' }] }
                            },
                            label: {
                              show: true,
                              position: "right",
                              formatter: () => {
                                const item = strengthsList.find((s: any) => s.pillar?.no === "5")
                                return item ? `${item.name}\n${chart2Mode === "score" ? Number(item.score).toFixed(0) : "Rank " + item.rank}` : ""
                              },
                              fontFamily: "Inter, sans-serif",
                              fontSize: 10,
                              color: "#374151"
                            }
                          },
                          {
                            value: getVal("4"),
                            itemStyle: {
                              color: getVal("4") >= 80
                                ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#059669' }, { offset: 1, color: '#34d399' }] }
                                : getVal("4") >= 60
                                  ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#d97706' }, { offset: 1, color: '#fbbf24' }] }
                                  : { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#dc2626' }, { offset: 1, color: '#f87171' }] }
                            },
                            label: {
                              show: true,
                              position: "right",
                              formatter: () => {
                                const item = strengthsList.find((s: any) => s.pillar?.no === "4")
                                return item ? `${item.name}\n${chart2Mode === "score" ? Number(item.score).toFixed(0) : "Rank " + item.rank}` : ""
                              },
                              fontFamily: "Inter, sans-serif",
                              fontSize: 10,
                              color: "#374151"
                            }
                          }
                        ]
                      }
                    ]
                  }}
                />
              </div>
            </div>

            {/* Chart 1: 40 Pillars */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-md flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h4 className="font-heading font-semibold text-base">40 Pilar Sifat</h4>
                <div className="flex bg-secondary/80 border border-border p-0.5 rounded-md shadow-inner">
                  <button onClick={() => setChart1Mode("score")} className={`px-2 py-1 rounded text-[10px] font-mono uppercase font-bold transition-all ${chart1Mode === "score" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Skor</button>
                  <button onClick={() => setChart1Mode("rank")} className={`px-2 py-1 rounded text-[10px] font-mono uppercase font-bold transition-all ${chart1Mode === "rank" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Rank</button>
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
                        const sortedData = chart1Mode === "score" 
                          ? [...(tb40Result["40"] || [])].sort((a, b) => b.score - a.score)
                          : [...(tb40Result["40"] || [])].sort((a, b) => a.rank - b.rank)
                        const item = sortedData[dataIndex]
                        return `<b>${item.name}</b><br/>Score: ${item.score}<br/>Rank: ${item.rank}`
                      }
                    },
                    grid: { left: "1%", right: "1%", bottom: "15%", top: "8%", containLabel: true },
                    xAxis: {
                      type: "category",
                      data: chart1Mode === "score" 
                        ? [...(tb40Result["40"] || [])].sort((a, b) => b.score - a.score).map((d: any) => d.name)
                        : [...(tb40Result["40"] || [])].sort((a, b) => a.rank - b.rank).map((d: any) => d.name),
                      axisLabel: { interval: 0, rotate: 45, fontSize: 9, fontFamily: "Inter, sans-serif" }
                    },
                    yAxis: { type: "value", show: false },
                    series: [
                      {
                        type: "bar",
                        data: chart1Mode === "score"
                          ? [...(tb40Result["40"] || [])].sort((a, b) => b.score - a.score).map((d: any) => ({
                              value: d.score,
                              itemStyle: {
                                color: d.score >= 80
                                  ? { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#059669' }] }
                                  : d.score >= 60
                                    ? { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#fbbf24' }, { offset: 1, color: '#d97706' }] }
                                    : { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#f87171' }, { offset: 1, color: '#dc2626' }] }
                              }
                            }))
                          : [...(tb40Result["40"] || [])].sort((a, b) => a.rank - b.rank).map((d: any) => ({
                              value: 41 - d.rank,
                              itemStyle: {
                                color: d.rank <= 10
                                  ? { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#059669' }] }
                                  : d.rank <= 30
                                    ? { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#fbbf24' }, { offset: 1, color: '#d97706' }] }
                                    : { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#f87171' }, { offset: 1, color: '#dc2626' }] }
                              }
                            })),
                        markLine: {
                          silent: true,
                          symbol: "none",
                          label: { formatter: "{b}", position: "end", fontSize: 9, fontFamily: "Inter, sans-serif" },
                          lineStyle: { type: "dashed", width: 1 },
                          data: chart1Mode === "score"
                            ? [
                                { yAxis: 80, name: "Kuat", lineStyle: { color: "#10b981" } },
                                { yAxis: 60, name: "Cukup", lineStyle: { color: "#f59e0b" } }
                              ]
                            : [
                                { yAxis: 31, name: "Top 10", lineStyle: { color: "#10b981" } },
                                { yAxis: 11, name: "Top 30", lineStyle: { color: "#f59e0b" } }
                              ]
                        }
                      }
                    ]
                  }}
                />
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 3: LEARNING STYLE & HEART LANGUAGE */}
        <div ref={gayaRef} className="scroll-mt-12 flex flex-col gap-6 print:break-before-page">
          <h3 className="font-heading font-semibold text-2xl flex items-center gap-2 border-b border-border pb-3">
            <Brain className="w-5 h-5 text-primary" /> Gaya Belajar & Bahasa Hati
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Learning Style Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col gap-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">AKAL & METODOLOGI</span>
                  <h4 className="font-heading font-semibold text-lg text-foreground">Gaya Belajar Ideal</h4>
                </div>
              </div>
              
              <div className="text-sm font-heading font-medium bg-secondary/80 border border-border p-3 rounded-lg leading-relaxed text-foreground">
                "{tb40Presentation.ringkasan_gaya_belajar.data}"
              </div>
              
              {/* Detailed Cognitive description parsed from ranked first pillar */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                Metode belajar dominan Anda sangat dipengaruhi oleh kekuatan struktur mental utama Anda ({tb40ResultRanked["3"]?.[0]?.name}). Pendekatan ini meningkatkan kecepatan retensi informasi, pemahaman teoritis, dan kenyamanan visual/kinestetik di lingkungan belajar Anda.
              </p>
            </div>

            {/* Heart Language Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col gap-4">
              <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="bg-destructive/10 p-2.5 rounded-xl border border-destructive/20">
                  <Heart className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">EMOSIONAL & SOSIAL</span>
                  <h4 className="font-heading font-semibold text-lg text-foreground">Bahasa Hati & Sentuhan Rasa</h4>
                </div>
              </div>
              
              <div className="text-sm font-heading font-medium bg-secondary/80 border border-border p-3 rounded-lg leading-relaxed text-foreground">
                "{tb40Presentation.ringkasan_bahasa_hati.data}"
              </div>
              
              <p className="text-xs text-muted-foreground leading-relaxed">
                Perasaan dan hubungan interaksi sosial Anda beresonansi paling kuat ketika tersentuh melalui cara ini. Memahami bahasa hati ini berguna untuk membangun kemitraan tim yang sehat, memelihara keluarga, dan menjalin silaturahmi yang harmonis.
              </p>
            </div>

          </div>
        </div>

        {/* SECTION 4: FULL DETAILED LIST OF 40 NOBLE CHARACTERISTICS */}
        <div ref={rincianRef} className="scroll-mt-12 flex flex-col gap-6 print:break-before-page">
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-border pb-3 gap-4">
            <h3 className="font-heading font-semibold text-2xl flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Rincian Sifat 40 Pilar Mulia
            </h3>
            
            {/* Search Input Filter */}
            <div className="relative max-w-xs w-full print:hidden">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="text"
                placeholder="Cari pilar sifat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-card border border-input rounded-full pl-9 pr-4 py-1.5 text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed -mt-2">
            Di bawah ini adalah rincian lengkap 40 pilar kepribadian mulia Anda. Setiap sifat dilengkapi dengan definisi, sifat tercela yang mungkin timbul bila berlebihan (atau kurang), serta rekomendasi perbaikan karakter. Gunakan filter di bawah ini untuk menjelajahi profil Anda secara mendalam.
          </p>

          {/* Premium UI Filter and Sort Controls */}
          <div className="flex flex-col gap-4 bg-card/45 border border-border p-4 rounded-2xl print:hidden shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Filter Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase mr-1">Klaster:</span>
                {[
                  { value: "all", label: "Semua" },
                  { value: "introvert", label: "Introvert" },
                  { value: "extrovert", label: "Ekstrovert" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFilterBy(opt.value as any)}
                    className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${
                      filterBy === opt.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                
                <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase ml-2 mr-1">Nafs (Jiwa):</span>
                {[
                  { value: "muthmainnah", label: "Muthmainnah (Rasa)" },
                  { value: "lawwamah", label: "Lawwamah (Akal)" },
                  { value: "ammarah", label: "Ammarah (Karsa)" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFilterBy(opt.value as any)}
                    className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${
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
              <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
                <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">Urutan:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-card border border-input rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-muted-foreground cursor-pointer font-medium"
                >
                  <option value="highest">Skor Tertinggi</option>
                  <option value="lowest">Skor Terendah</option>
                  <option value="alphabetical">Abjad (Nama A-Z)</option>
                </select>
              </div>
              
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {filteredPillars.map((p: any) => {
              const score = p.score
              const rootNo = getPillarRoot(p)
              
              // Determine Nafs Classification based on Root Lineage
              let nafsLabel = "Nafs Lawwamah"
              if (rootNo === "1") nafsLabel = "Nafs Ammarah"
              if (rootNo === "2") nafsLabel = "Nafs Lawwamah"
              if (rootNo === "3") nafsLabel = "Nafs Muthmainnah"

              // Rating styles based on Score (Visual cues)
              let ratingBorderColor = "border-amber-200 dark:border-amber-950/20"
              let ratingBgColor = "bg-amber-50/70 dark:bg-amber-950/10 text-amber-800 dark:text-amber-300"
              
              if (score >= 80) {
                ratingBorderColor = "border-teal-200 dark:border-teal-950/20 border-l-teal-600 border-l-4"
                ratingBgColor = "bg-teal-50 dark:bg-teal-950/20 text-teal-800 dark:text-teal-400 font-semibold"
              } else if (score >= 60) {
                ratingBorderColor = "border-emerald-200 dark:border-emerald-950/20 border-l-emerald-600 border-l-4"
                ratingBgColor = "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400"
              } else if (score <= 40) {
                ratingBorderColor = "border-rose-200 dark:border-rose-950/20 border-l-rose-600 border-l-4"
                ratingBgColor = "bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400"
              }

              return (
                <div
                  key={p.name}
                  className={`bg-card border rounded-2xl p-5 shadow-sm flex flex-col gap-4 transition-shadow hover:shadow-md ${ratingBorderColor}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/70 pb-3 gap-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-xs font-bold text-primary bg-secondary border border-border px-2 py-0.5 rounded">
                        Pilar {p.pillar.no}
                      </span>
                      <h4 className="font-heading font-semibold text-lg text-foreground">
                        {p.data?.nama_lengkap || p.name}
                      </h4>
                    </div>
                    
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${ratingBgColor}`}>
                        {nafsLabel}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-secondary text-muted-foreground border border-border">
                        Skor: {score} &bull; Rangka: {p.rank}
                      </span>
                    </div>
                  </div>

                  {/* Pillar Arabic Calligraphy if exists */}
                  {p.data?.arab && (
                    <div className="text-right -mt-2">
                      <span className="font-heading font-bold text-2xl text-primary/80 tracking-wide font-arabic">
                        {p.data.arab}
                      </span>
                    </div>
                  )}

                  {/* Trait Definition */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">DEFINISI PILAR</span>
                    <p className="text-sm text-foreground/90 leading-relaxed font-sans">{p.data?.definisi || "Belum ada definisi terperinci."}</p>
                  </div>

                  {/* Lalai & Lebih Attributes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1 bg-secondary/50 border border-border/80 p-4 rounded-xl">
                    {p.data?.lalai_nama_lengkap && (
                      <div className="flex flex-col gap-1 border-r border-border/40 pr-2 print:border-none">
                        <span className="text-[10px] font-mono uppercase text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1">
                          ⚠️ Potensi Lalai / Kurang
                        </span>
                        <h5 className="font-heading font-medium text-xs text-foreground">{p.data.lalai_nama_lengkap}</h5>
                        <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">{p.data.lalai_definisi}</p>
                      </div>
                    )}
                    {p.data?.lebih_nama_lengkap && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono uppercase text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                          ⚠️ Potensi Berlebihan
                        </span>
                        <h5 className="font-heading font-medium text-xs text-foreground">{p.data.lebih_nama_lengkap}</h5>
                        <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">{p.data.lebih_definisi}</p>
                      </div>
                    )}
                  </div>

                  {/* Recommendation Actions if available */}
                  {p.data?.profesi && (
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">💼 Rekomendasi Profesi & Peran</span>
                      <p className="text-xs text-muted-foreground leading-relaxed">{p.data.profesi}</p>
                    </div>
                  )}

                  {p.data?.jurusan && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">🎓 Jurusan Pendidikan Terkait</span>
                      <p className="text-xs text-muted-foreground leading-relaxed">{p.data.jurusan}</p>
                    </div>
                  )}
                </div>
              )
            })}

            {filteredPillars.length === 0 && (
              <div className="text-center py-12 bg-card border border-border border-dashed rounded-2xl">
                <HelpCircle className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Tidak menemukan pilar sifat yang cocok dengan pencarian Anda.</p>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER & ACCREDITATION STATEMENT */}
        <div className="text-center border-t border-border pt-8 pb-12 print:mt-12 print:border-t-2 print:border-black">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Metode Tafsir Bakat 40 (TB40) diselaraskan oleh Lembaga Insan Taqwa. Laporan ini bersifat personal dan dimaksudkan sebagai referensi bimbingan pengembangan karakter dan akhlak mulia.
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
            ID Laporan: {umum.nama.panggilan.toLowerCase()}-{(umum.usia || "00").toString()}-{Math.floor(Math.random() * 1000)}
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

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all duration-300 animate-in fade-in-0 print:hidden">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive mt-0.5 animate-bounce">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <h3 className="font-heading font-semibold text-lg text-foreground">
                  Ulangi Tes & Hapus Data?
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Apakah Anda yakin ingin mengulangi tes dari awal? Tindakan ini akan **menghapus semua data pendaftaran, jawaban, dan hasil analisis Anda secara permanen** dari perangkat ini.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2.5 mt-2 border-t border-border pt-4">
              <Button
                variant="ghost"
                type="button"
                onClick={() => setShowResetModal(false)}
                className="text-xs py-1.5 cursor-pointer shadow-none border-none hover:bg-muted"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                type="button"
                onClick={confirmResetAndRestart}
                className="text-xs py-1.5 px-4 cursor-pointer bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
              >
                Ya, Ulangi & Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all duration-300 animate-in fade-in-0">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-6 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col gap-1.5 text-center items-center">
              <div className="p-3 bg-primary/10 rounded-full text-primary mb-2">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-semibold text-xl text-foreground">
                Bagikan Hasil Penilaian
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Scan QR Code atau salin tautan di bawah untuk membagikan hasil penilaian Anda secara langsung.
              </p>
            </div>

            <div className="flex justify-center p-4 bg-white rounded-xl border border-border mx-auto">
              <QRCodeSVG value={shareUrl} size={180} />
            </div>
            
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-mono uppercase font-semibold text-muted-foreground ml-1">Tautan Publik</span>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={shareUrl} 
                  className="flex-1 bg-secondary text-xs rounded-md px-3 py-2.5 border border-border outline-none text-muted-foreground font-mono truncate"
                />
                <Button onClick={copyToClipboard} size="sm" className="shrink-0 flex items-center gap-1.5 cursor-pointer">
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {isCopied ? "Tersalin" : "Salin"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
