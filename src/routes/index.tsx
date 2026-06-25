import posthog from "posthog-js"
import { useState, useEffect } from "react"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sparkles,
  Activity,
  ShieldCheck,
  Heart,
  User,
  BookOpen,
  Clock,
} from "lucide-react"
import { parseISO, differenceInYears } from "date-fns"

export const Route = createFileRoute("/")({ component: LandingPage })

function LandingPage() {
  const navigate = useNavigate()

  // Registration Form State
  const [fullName, setFullName] = useState("")
  const [nickName, setNickName] = useState("")
  const [age, setAge] = useState<number | "">("")
  const [formError, setFormError] = useState("")

  // Server Status State
  const [serverStatus, setServerStatus] = useState<
    "checking" | "online" | "offline"
  >("checking")
  const [apiType, setApiType] = useState<"live" | "mock">("live")
  const [apiUrl, setApiUrl] = useState("https://tb40.insanmustaqbal.or.id")
  
  // Feature flag for v0.2 assessment
  const showV02 = useFeatureFlagEnabled("v0.2-assessment")
  const [testMode, setTestMode] = useState<"adaptive" | "precision">("precision")

  // Update testMode if feature flag is enabled
  useEffect(() => {
    if (showV02 !== undefined) {
      setTestMode(showV02 ? "adaptive" : "precision")
    }
  }, [showV02])

  // Check connectivity to the live API (probe local API first)
  useEffect(() => {
    const checkServer = async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)

      try {
        // Try local server first
        const localResponse = await fetch("http://localhost:4040/health", {
          signal: controller.signal,
        })
        if (localResponse.ok) {
          clearTimeout(timeoutId)
          setServerStatus("online")
          setApiType("live")
          setApiUrl("http://localhost:4040")
          return
        }
      } catch (err) {
        // Try production server
      }

      try {
        // Try production server
        const prodResponse = await fetch(
          "https://tb40.insanmustaqbal.or.id/api/v0.1/tb40/questions.json",
          {
            signal: controller.signal,
          }
        )
        clearTimeout(timeoutId)
        if (prodResponse.ok) {
          setServerStatus("online")
          setApiType("live")
          setApiUrl("https://tb40.insanmustaqbal.or.id")
        } else {
          throw new Error("Production server returned non-ok status")
        }
      } catch (err) {
        clearTimeout(timeoutId)
        setServerStatus("offline")
        setApiType("mock")
        setApiUrl("")
      }
    }

    checkServer()
  }, [])

  // Auto-fill from localStorage if previously registered
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tb40_umum")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.nama?.lengkap) setFullName(parsed.nama.lengkap)
        if (parsed.nama?.panggilan) setNickName(parsed.nama.panggilan)

        // If we have age directly, use it
        if (typeof parsed.usia === "number") {
          setAge(parsed.usia)
        } else if (parsed.lahir?.tanggal) {
          // Fallback: calculate age from legacy birthDate
          try {
            const birthDate = parseISO(parsed.lahir.tanggal)
            setAge(differenceInYears(new Date(), birthDate))
          } catch (e) {
            console.error("Failed to parse saved date for age calculation", e)
          }
        }
      }
    } catch (e) {
      console.error("Failed to read localStorage data", e)
    }
  }, [])

  // Auto-select first word of full name as default nickname suggestion
  useEffect(() => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean)
    if (parts.length > 0) {
      if (!nickName || !parts.includes(nickName)) {
        setNickName(parts[0])
      }
    } else {
      setNickName("")
    }
  }, [fullName])

  const handleStartTest = (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName.trim() || !nickName.trim() || age === "") {
      setFormError("Silakan isi semua bidang pendaftaran untuk memulai.")
      try {
        posthog.capture("registration_form_error", { reason: "missing_fields" })
      } catch (err) {
        console.warn("PostHog tracking failed", err)
      }
      return
    }

    if (typeof age === "number" && (age < 5 || age > 120)) {
      setFormError("Silakan masukkan usia yang valid (5-120 tahun).")
      try {
        posthog.capture("registration_form_error", {
          reason: "invalid_age",
          age,
        })
      } catch (err) {
        console.warn("PostHog tracking failed", err)
      }
      return
    }

    // Structure metadata to match API requirements
    // For API compatibility, we generate a dummy birth date: Jan 1st of (CurrentYear - Age)
    const currentYear = new Date().getFullYear()
    const dummyBirthDate = `${currentYear - (age as number)}-01-01`

    const umumData = {
      nama: {
        lengkap: fullName.trim(),
        panggilan: nickName.trim(),
      },
      usia: age, // Store age explicitly
      lahir: {
        tanggal: dummyBirthDate,
      },
      tanggal: new Date().toLocaleDateString("id-ID"),
      apiType,
      apiUrl,
      testMode,
    }

    if (typeof window !== "undefined") {
      try {
        posthog.identify(nickName.trim(), {
          name: fullName.trim(),
          age: age,
          testMode: testMode,
        })
        posthog.capture("registration_completed", {
          age: age,
          test_mode: testMode,
          api_type: apiType,
        })
      } catch (err) {
        console.warn("PostHog tracking failed", err)
      }
    }
    localStorage.setItem("tb40_umum", JSON.stringify(umumData))
    navigate({ to: "/test" as any })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground selection:bg-primary/20 selection:text-primary md:p-8">
      {/* Dynamic Background Accents */}
      <div className="pointer-events-none absolute top-0 left-0 -z-10 h-96 w-full bg-gradient-to-b from-primary/5 to-transparent" />

      <div className="z-10 flex w-full max-w-4xl flex-col items-center gap-12 py-8 md:flex-row">
        {/* Editorial Text Area */}
        <div className="flex flex-1 flex-col gap-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 self-center rounded-full border border-border bg-secondary/80 px-3 py-1 text-xs font-medium text-muted-foreground md:self-start">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Metodologi Tafsir Bakat 40
          </div>

          <h1 className="font-heading text-4xl leading-[1.15] font-semibold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Kenali <span className="text-primary italic">Bakat & Karakter</span>{" "}
            Mulia Dirimu
          </h1>

          <p className="max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
            Temukan bakat alami, kelemahan, gaya belajar ideal, dan bahasa hati
            Anda yang diselaraskan dengan 40 sifat luhur bersumber dari
            nilai-nilai salaful ummah.
          </p>

          <div className="flex w-full flex-col gap-3.5 pt-4 text-left">
            <div className="group/item flex items-center gap-4 rounded-2xl border border-border bg-card/45 p-5 shadow-xs transition-all duration-300 hover:border-primary/30 hover:bg-card/85">
              <div className="rounded-xl border border-primary/15 bg-primary/8 p-3 transition-colors group-hover/item:bg-primary/12">
                <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-foreground">
                  Fisik (Bakat)
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Kinerja cara bekerja dan beramal sehari-hari secara disiplin.
                </p>
              </div>
            </div>

            <div className="group/item flex items-center gap-4 rounded-2xl border border-border bg-card/45 p-5 shadow-xs transition-all duration-300 hover:border-primary/30 hover:bg-card/85">
              <div className="rounded-xl border border-primary/15 bg-primary/8 p-3 transition-colors group-hover/item:bg-primary/12">
                <BookOpen className="h-5 w-5 shrink-0 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-foreground">
                  Akal (Gaya Belajar)
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Metode kognitif terbaik dalam menyerap informasi dan keilmuan.
                </p>
              </div>
            </div>

            <div className="group/item flex items-center gap-4 rounded-2xl border border-border bg-card/45 p-5 shadow-xs transition-all duration-300 hover:border-primary/30 hover:bg-card/85">
              <div className="rounded-xl border border-primary/15 bg-primary/8 p-3 transition-colors group-hover/item:bg-primary/12">
                <Heart className="h-5 w-5 shrink-0 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-foreground">
                  Hati (Bahasa Hati)
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Sentuhan emosi, kepekaan rasa, serta wujud kepedulian sosial
                  Anda.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User Registration Form Card */}
        <div className="relative flex w-full max-w-md flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-xl shadow-stone-200/50 md:p-8 dark:shadow-none">
          {/* Server Status Header Indicator */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="font-heading text-lg font-medium">
                Pendaftaran Uji
              </h3>
              <p className="text-xs text-muted-foreground">
                Mulai langkah tafsir bakat Anda
              </p>
            </div>

            <div className="flex flex-col items-end gap-1">
              {serverStatus === "checking" && (
                <span className="inline-flex animate-pulse items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  <Activity className="h-3 w-3" /> Memeriksa server...
                </span>
              )}
              {serverStatus === "online" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />{" "}
                  Live Server Online
                </span>
              )}
              {serverStatus === "offline" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Sandbox
                  Demo Mode
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleStartTest} className="flex flex-col gap-4">
            {/* Full Name input */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="fullName"
                className="flex items-center gap-1.5 text-xs font-medium text-foreground"
              >
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Nama
                Lengkap
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Fulan bin Fulan"
                className="rounded-lg"
                required
              />
            </div>

            {/* Nickname input */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="nickName"
                className="flex items-center gap-1.5 text-xs font-medium text-foreground select-none"
              >
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Nama
                Panggilan
              </Label>
              {fullName.trim() === "" ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3.5 text-center text-xs text-muted-foreground/60">
                  Masukkan Nama Lengkap untuk memilih nama panggilan
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-background p-3">
                  <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Pilih salah satu kata:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {fullName
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean)
                      .map((part, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNickName(part)}
                          className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-all select-none ${
                            nickName === part
                              ? "scale-105 border-primary bg-primary text-primary-foreground shadow-xs"
                              : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-muted/10 hover:text-foreground"
                          }`}
                        >
                          {part}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Age input */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="age"
                className="flex items-center gap-1.5 text-xs font-medium text-foreground"
              >
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Usia
                (Tahun)
              </Label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) =>
                  setAge(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Contoh: 25"
                min="5"
                max="120"
                className="rounded-lg"
                required
              />
            </div>

            {/* Test Mode input */}
            <div className={`mt-1 flex flex-col gap-2 rounded-xl border border-border bg-background p-3 ${showV02 === false ? 'hidden' : ''}`}>
              <Label className="text-xs font-semibold tracking-wider text-foreground uppercase select-none">
                Pilih Metode Penilaian
              </Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTestMode("adaptive")}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-3 py-2.5 text-center text-xs font-medium transition-all select-none ${
                    testMode === "adaptive"
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-muted/10 hover:text-foreground"
                  }`}
                >
                  <span className="text-xs font-semibold">
                    Metode Cepat (v0.2)
                  </span>
                  <span className="text-[10px] opacity-85">~5 Pertanyaan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTestMode("precision")}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-3 py-2.5 text-center text-xs font-medium transition-all select-none ${
                    testMode === "precision"
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-muted/10 hover:text-foreground"
                  }`}
                >
                  <span className="text-xs font-semibold">
                    Metode Lengkap (v0.1)
                  </span>
                  <span className="text-[10px] opacity-85">
                    40 Pertanyaan Penuh
                  </span>
                </button>
              </div>
            </div>

            {formError && (
              <p className="mt-1 text-xs font-medium text-destructive">
                {formError}
              </p>
            )}

            <Button
              type="submit"
              className="mt-4 w-full py-6 font-heading font-medium tracking-wide"
            >
              Mulai Penilaian Bakat
            </Button>
          </form>

          <div className="text-center">
            <p className="text-[10px] leading-normal text-muted-foreground">
              Tes ini membutuhkan waktu kurang lebih 5-10 menit. Seluruh progres
              akan tersimpan otomatis di perangkat Anda.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
