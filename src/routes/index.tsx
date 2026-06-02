import { useState, useEffect } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Sparkles, Activity, ShieldCheck, Heart, User, BookOpen, Clock } from "lucide-react"
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
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking")
  const [apiType, setApiType] = useState<"live" | "mock">("live")

  // Check connectivity to the live API
  useEffect(() => {
    const checkServer = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 4000)
        
        const response = await fetch("https://tb40.insantaqwa.org/api/v0.1/tb40/questions.json", {
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        if (response.ok) {
          setServerStatus("online")
          setApiType("live")
        } else {
          throw new Error("Server returned non-ok status")
        }
      } catch (err) {
        console.warn("Failed to reach live API server. Falling back to local mockup sandbox.", err)
        setServerStatus("offline")
        setApiType("mock")
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
      return
    }

    if (typeof age === "number" && (age < 5 || age > 120)) {
        setFormError("Silakan masukkan usia yang valid (5-120 tahun).")
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
    }
    
    localStorage.setItem("tb40_umum", JSON.stringify(umumData))
    navigate({ to: "/test" as any })
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 md:p-8 selection:bg-primary/20 selection:text-primary">
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none" />
      
      <div className="max-w-4xl w-full flex flex-col md:flex-row items-center gap-12 py-8 z-10">
        
        {/* Editorial Text Area */}
        <div className="flex-1 flex flex-col gap-6 text-center md:text-left">
          <div className="inline-flex items-center self-center md:self-start gap-2 bg-secondary/80 border border-border px-3 py-1 rounded-full text-xs font-medium text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Metodologi Tafsir Bakat 40
          </div>
          
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground leading-[1.15]">
            Kenali <span className="text-primary italic">Bakat & Karakter</span> Mulia Dirimu
          </h1>
          
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-lg">
            Temukan bakat alami, kelemahan, gaya belajar ideal, dan bahasa hati Anda yang diselaraskan dengan 40 sifat luhur bersumber dari nilai-nilai salaful ummah.
          </p>

          <div className="flex flex-col gap-3.5 pt-4 text-left w-full">
            <div className="bg-card/45 hover:bg-card/85 hover:border-primary/30 border border-border p-5 rounded-2xl flex items-center gap-4 shadow-xs transition-all duration-300 group/item">
              <div className="bg-primary/8 border border-primary/15 p-3 rounded-xl group-hover/item:bg-primary/12 transition-colors">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-foreground">Fisik (Bakat)</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Kinerja cara bekerja dan beramal sehari-hari secara disiplin.</p>
              </div>
            </div>

            <div className="bg-card/45 hover:bg-card/85 hover:border-primary/30 border border-border p-5 rounded-2xl flex items-center gap-4 shadow-xs transition-all duration-300 group/item">
              <div className="bg-primary/8 border border-primary/15 p-3 rounded-xl group-hover/item:bg-primary/12 transition-colors">
                <BookOpen className="w-5 h-5 text-primary shrink-0" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-foreground">Akal (Gaya Belajar)</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Metode kognitif terbaik dalam menyerap informasi dan keilmuan.</p>
              </div>
            </div>

            <div className="bg-card/45 hover:bg-card/85 hover:border-primary/30 border border-border p-5 rounded-2xl flex items-center gap-4 shadow-xs transition-all duration-300 group/item">
              <div className="bg-primary/8 border border-primary/15 p-3 rounded-xl group-hover/item:bg-primary/12 transition-colors">
                <Heart className="w-5 h-5 text-primary shrink-0" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-foreground">Hati (Bahasa Hati)</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Sentuhan emosi, kepekaan rasa, serta wujud kepedulian sosial Anda.</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Registration Form Card */}
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl shadow-stone-200/50 dark:shadow-none flex flex-col gap-6 relative">
          
          {/* Server Status Header Indicator */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="font-heading font-medium text-lg">Pendaftaran Uji</h3>
              <p className="text-xs text-muted-foreground">Mulai langkah tafsir bakat Anda</p>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              {serverStatus === "checking" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground animate-pulse">
                  <Activity className="w-3 h-3" /> Memeriksa server...
                </span>
              )}
              {serverStatus === "online" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Live Server Online
                </span>
              )}
              {serverStatus === "offline" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Sandbox Demo Mode
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleStartTest} className="flex flex-col gap-4">
            
            {/* Full Name input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" /> Nama Lengkap
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Fulan bin Fulan"
                className="bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50 transition-all"
                required
              />
            </div>

            {/* Nickname input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nickName" className="text-xs font-medium text-foreground flex items-center gap-1.5 select-none">
                <User className="w-3.5 h-3.5 text-muted-foreground" /> Nama Panggilan
              </label>
              {fullName.trim() === "" ? (
                <div className="text-xs text-muted-foreground/60 bg-muted/30 border border-dashed border-border rounded-xl p-3.5 text-center">
                  Masukkan Nama Lengkap untuk memilih nama panggilan
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 bg-background border border-border rounded-xl p-3">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Pilih salah satu kata:</span>
                  <div className="flex flex-wrap gap-2">
                    {fullName.trim().split(/\s+/).filter(Boolean).map((part, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNickName(part)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer select-none ${
                          nickName === part
                            ? "bg-primary text-primary-foreground border-primary shadow-xs scale-105"
                            : "bg-background border-border text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-muted/10"
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
              <label htmlFor="age" className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Usia (Tahun)
              </label>
              <input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Contoh: 25"
                min="5"
                max="120"
                className="bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50 transition-all"
                required
              />
            </div>

            {formError && (
              <p className="text-xs text-destructive font-medium mt-1">{formError}</p>
            )}

            <Button type="submit" className="mt-4 w-full py-6 font-heading font-medium tracking-wide">
              Mulai Penilaian Bakat
            </Button>
          </form>
          
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground leading-normal">
              Tes ini membutuhkan waktu kurang lebih 5-10 menit. Seluruh progres akan tersimpan otomatis di perangkat Anda.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
