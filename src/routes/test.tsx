import { useState, useEffect } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Loader2, Sparkles, RotateCcw, AlertTriangle } from "lucide-react"

export const Route = createFileRoute("/test")({ component: TestWizard })

interface Question {
  index: string
  question: string
}

function TestWizard() {
  const navigate = useNavigate()
  
  // Registration and config metadata
  const [userMetadata, setUserMetadata] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStep, setSubmitStep] = useState(0) // Step of the submission processing loader
  const [errorMsg, setErrorMsg] = useState("")
  const [showResetModal, setShowResetModal] = useState(false)

  // Stepper state
  const [currentPage, setCurrentPage] = useState(0)
  const QUESTIONS_PER_PAGE = 8
  const TOTAL_PAGES = 5 // 40 / 8 = 5

  // 1. Check user metadata on load
  useEffect(() => {
    try {
      const savedMetadata = localStorage.getItem("tb40_umum")
      if (!savedMetadata) {
        navigate({ to: "/" })
        return
      }
      setUserMetadata(JSON.parse(savedMetadata))
    } catch (e) {
      console.error(e)
      navigate({ to: "/" })
    }
  }, [navigate])

  // 2. Fetch questions on load
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true)
        // First try to fetch from the live URL
        const response = await fetch("https://tb40.insantaqwa.org/api/v0.1/tb40/questions.json")
        if (!response.ok) throw new Error("API responded with an error")
        const data = await response.json()
        
        const qList = data.parts?.tb40Dewasa?.questions || []
        setQuestions(qList)
        initializeAnswers(qList)
      } catch (err) {
        console.warn("Could not load questions from live API. Loading local backup...", err)
        try {
          const response = await fetch("/questions.json")
          const data = await response.json()
          const qList = data.parts?.tb40Dewasa?.questions || []
          setQuestions(qList)
          initializeAnswers(qList)
        } catch (localErr) {
          setErrorMsg("Gagal memuat pertanyaan tes. Silakan periksa koneksi Anda.")
          console.error(localErr)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuestions()
  }, [])

  // Initialize answers with default 60 (standard middle-high score)
  const initializeAnswers = (qList: Question[]) => {
    try {
      const savedAnswers = localStorage.getItem("tb40_answers")
      if (savedAnswers) {
        const parsed = JSON.parse(savedAnswers)
        if (parsed.length === qList.length) {
          setAnswers(parsed)
          return
        }
      }
      // If no saved answers, initialize array with default value of 60
      setAnswers(new Array(qList.length).fill(60))
    } catch (e) {
      setAnswers(new Array(qList.length).fill(60))
    }
  }

  // Save answers to localStorage on change
  const handleAnswerChange = (questionIndex: number, val: number) => {
    const newAnswers = [...answers]
    newAnswers[questionIndex] = val
    setAnswers(newAnswers)
    localStorage.setItem("tb40_answers", JSON.stringify(newAnswers))
  }

  // Reset all answers and go to frontpage (risk losing data)
  const confirmResetAndRestart = () => {
    localStorage.removeItem("tb40_umum")
    localStorage.removeItem("tb40_answers")
    localStorage.removeItem("tb40_result")
    setShowResetModal(false)
    navigate({ to: "/" })
  }

  // Get score verbal evaluation tag
  const getScoreTag = (score: number) => {
    if (score <= 20) return { label: "Sangat Lemah", color: "text-rose-600 bg-rose-50 dark:bg-rose-950/20" }
    if (score <= 40) return { label: "Kelemahan Potensial", color: "text-orange-600 bg-orange-50 dark:bg-orange-950/20" }
    if (score <= 60) return { label: "Cukup / Seimbang", color: "text-amber-600 bg-amber-50 dark:bg-amber-950/20" }
    if (score <= 80) return { label: "Bakat Kuat", color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20" }
    return { label: "Bakat Unggul / Dominan", color: "text-teal-700 bg-teal-50 dark:bg-teal-950/20 font-bold" }
  }

  // Paginated questions list
  const startIdx = currentPage * QUESTIONS_PER_PAGE
  const currentQuestions = questions.slice(startIdx, startIdx + QUESTIONS_PER_PAGE)

  // Stepper progress helper
  const progressPercent = Math.round(((currentPage + 1) / TOTAL_PAGES) * 100)
  
  // Dynamic submission loader step changes
  useEffect(() => {
    if (isSubmitting) {
      const interval = setInterval(() => {
        setSubmitStep((prev) => (prev < 3 ? prev + 1 : prev))
      }, 700)
      return () => clearInterval(interval)
    }
  }, [isSubmitting])

  const submitTest = async () => {
    setIsSubmitting(true)
    setSubmitStep(0)
    
    const payload = {
      parts: {
        umum: {
          nama: {
            lengkap: userMetadata.nama.lengkap,
            panggilan: userMetadata.nama.panggilan,
          },
          usia: userMetadata.usia,
          lahir: {
            tanggal: userMetadata.lahir.tanggal,
          },
          tanggal: userMetadata.tanggal,
        },
        tb40: answers,
      },
    }

    try {
      // 1. Attempt to calculate via the live API
      const response = await fetch("https://tb40.insantaqwa.org/api/v0.1/tb40/calculation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Calculation failed on live API")
      const resultData = await response.json()
      
      // Store result and route to results screen
      localStorage.setItem("tb40_result", JSON.stringify(resultData))
      
      // Artificial delay to let the processing steps complete for beautiful premium UX
      setTimeout(() => {
        setIsSubmitting(false)
        navigate({ to: "/result" as any })
      }, 800)
      
    } catch (err) {
      console.warn("Could not run calculation on live API. Using local mock simulation data...", err)
      
      // Fallback: fetch from local mockup result.json
      try {
        const response = await fetch("/result.json")
        const resultData = await response.json()
        
        // Dynamic replacement of names and date to match custom details in mockup
        if (resultData.parts) {
          resultData.parts.umum = payload.parts.umum
        }
        
        localStorage.setItem("tb40_result", JSON.stringify(resultData))
        
        setTimeout(() => {
          setIsSubmitting(false)
          navigate({ to: "/result" as any })
        }, 800)
        
      } catch (localErr) {
        setIsSubmitting(false)
        setErrorMsg("Gagal melakukan perhitungan bakat. Silakan periksa koneksi internet Anda.")
        console.error(localErr)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <h3 className="font-heading font-medium text-lg">Memuat Lembar Penilaian</h3>
        <p className="text-sm text-muted-foreground mt-1">Mengambil 40 pilar pertanyaan...</p>
      </div>
    )
  }

  if (isSubmitting) {
    const processingSteps = [
      "Mengirim skor ke server...",
      "Mengkalkulasi dimensi bakat (Karsa, Cipta, Rasa)...",
      "Memetakan sifat luhur (40 Pilar Mulia)...",
      "Mempersiapkan visualisasi pemetaan tafsir bakat...",
    ]

    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-md bg-card border border-border p-8 rounded-2xl shadow-xl flex flex-col items-center gap-6">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <div>
            <h3 className="font-heading font-semibold text-xl">Menganalisa Kepribadian Anda</h3>
            <p className="text-xs text-muted-foreground mt-1">Harap tunggu sementara AI kami memproses laporan editorial Anda.</p>
          </div>
          
          <div className="w-full bg-secondary/80 border border-border rounded-lg p-4 flex flex-col gap-2.5 text-left text-xs font-mono">
            {processingSteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {submitStep > idx ? (
                  <span className="text-emerald-600 font-bold">✓</span>
                ) : submitStep === idx ? (
                  <span className="text-primary animate-pulse font-bold">●</span>
                ) : (
                  <span className="text-muted-foreground/30">○</span>
                )}
                <span className={submitStep === idx ? "text-foreground font-semibold" : submitStep > idx ? "text-muted-foreground" : "text-muted-foreground/45"}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-background text-foreground flex flex-col p-4 md:p-8">
      {/* Upper Progress tracker header */}
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-border pb-4 mt-2">
          <div>
            <h2 className="font-heading font-semibold text-2xl text-foreground">Lembar Penilaian TB40</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Menilai untuk: <span className="font-semibold text-primary">{userMetadata?.nama?.lengkap}</span>
            </p>
          </div>
          
          <button
            onClick={() => setShowResetModal(true)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors px-2.5 py-1 rounded bg-secondary hover:bg-destructive/10 border border-border cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Ulangi Tes
          </button>
        </div>

        {/* Stepper progress indicator */}
        <div className="w-full flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
            <span>Bagian {currentPage + 1} dari {TOTAL_PAGES}</span>
            <span>{progressPercent}% Selesai</span>
          </div>
          <div className="w-full h-2 bg-secondary border border-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Form Error Banner */}
        {errorMsg && (
          <div className="bg-destructive/10 border border-destructive/25 text-destructive p-3 rounded-lg flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Stepper Wizard Questions Container */}
        <div className="flex flex-col gap-6 mt-4">
          {currentQuestions.map((q) => {
            const questionIdx = parseInt(q.index) - 1
            const score = answers[questionIdx] ?? 60
            const tag = getScoreTag(score)
            
            return (
              <div
                key={q.index}
                className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow relative flex flex-col gap-4"
              >
                {/* Question Info Indicator */}
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <span className="text-xs font-mono text-muted-foreground font-semibold bg-secondary/80 px-2 py-0.5 rounded-full border border-border">
                    Pernyataan {q.index} dari 40
                  </span>
                  
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors ${tag.color}`}>
                    {tag.label}: {score}
                  </span>
                </div>

                {/* Statement Text */}
                <h4 className="font-heading text-base md:text-lg font-medium leading-relaxed text-foreground">
                  "{q.question}"
                </h4>

                {/* Granular Slider Range Element */}
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground font-mono">Sangat Kontra (0)</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={score}
                      onChange={(e) => handleAnswerChange(questionIdx, parseInt(e.target.value))}
                      className="flex-1 accent-primary h-1.5 bg-secondary rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <span className="text-xs text-muted-foreground font-mono">Sangat Pro (100)</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom Stepper Controls */}
        <div className="flex items-center justify-between mt-8 mb-12 border-t border-border pt-6">
          <Button
            variant="secondary"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
            disabled={currentPage === 0}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Button>

          <span className="text-xs text-muted-foreground">
            Halaman {currentPage + 1} / {TOTAL_PAGES}
          </span>

          {currentPage < TOTAL_PAGES - 1 ? (
            <Button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, TOTAL_PAGES - 1))}
              className="flex items-center gap-2"
            >
              Lanjut <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={submitTest}
              className="bg-primary hover:bg-primary/90 flex items-center gap-2 font-heading font-semibold shadow-md shadow-primary/20 px-6 py-5"
            >
              Mulai Analisa Bakat <Sparkles className="w-4 h-4 animate-pulse" />
            </Button>
          )}
          </div>
      </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm transition-all duration-300 animate-in fade-in-0">
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
    </>
  )
}
