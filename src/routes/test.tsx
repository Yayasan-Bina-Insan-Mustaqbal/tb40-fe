import posthog from "posthog-js"
import LZString from "lz-string"
import { useState, useEffect, useCallback, useRef } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  Users,
  User,
  Zap,
  BookOpen,
  Heart,
  TrendingUp,
  Info,
} from "lucide-react"

export const Route = createFileRoute("/test")({ component: TestWizard })

interface Question {
  index: string
  question: string
}

/**
 * G6 → G3 (tier_2 value) + G2 (tier_1 value) mapping.
 * G3: 1=Karsa, 2=Cipta, 3=Rasa
 * G2: 1=Introvert, 2=Extrovert
 * G6: 1=Bekerja keras, 2=Berpikir, 3=Berperasaan, 4=Mempengaruhi, 5=Bekerjasama, 6=Melayani
 */
const G6_PARENT_MAP: Record<number, { g3: number; g2: number; name: string }> =
  {
    1: { g3: 1, g2: 1, name: "Bekerja Keras" }, // Karsa + Introvert
    2: { g3: 2, g2: 1, name: "Berpikir" }, // Cipta + Introvert
    3: { g3: 3, g2: 1, name: "Berperasaan" }, // Rasa  + Introvert
    4: { g3: 1, g2: 2, name: "Mempengaruhi" }, // Karsa + Extrovert
    5: { g3: 2, g2: 2, name: "Bekerjasama" }, // Cipta + Extrovert
    6: { g3: 3, g2: 2, name: "Melayani" }, // Rasa  + Extrovert
  }

/**
 * For each G18 pillar no → which G6 it belongs to.
 * Derived from calculation.json parents.
 */
const G18_TO_G6: Record<number, number> = {
  1: 1,
  2: 1,
  3: 1, // G18 1-3 → G6-1 (Bekerja keras)
  4: 2,
  5: 2,
  6: 2, // G18 4-6 → G6-2 (Berpikir)
  7: 3,
  8: 3,
  9: 3, // G18 7-9 → G6-3 (Berperasaan)
  10: 4,
  11: 4,
  12: 4, // G18 10-12 → G6-4 (Mempengaruhi)
  13: 5,
  14: 5,
  15: 5, // G18 13-15 → G6-5 (Bekerjasama)
  16: 6,
  17: 6,
  18: 6, // G18 16-18 → G6-6 (Melayani)
}

/**
 * For each question index (1-40) → which G18 parent it belongs to.
 * Derived from calculation.json parents.
 */
const Q_TO_G18: Record<number, number> = {
  1: 13,
  2: 18,
  3: 18,
  4: 3,
  5: 14,
  6: 6,
  7: 11,
  8: 4,
  9: 10,
  10: 9,
  11: 6,
  12: 18,
  13: 1,
  14: 5,
  15: 8,
  16: 1,
  17: 16,
  18: 2,
  19: 12,
  20: 17,
  21: 16,
  22: 10,
  23: 14,
  24: 11,
  25: 3,
  26: 4,
  27: 12,
  28: 9,
  29: 15,
  30: 15,
  31: 17,
  32: 9,
  33: 8,
  34: 7,
  35: 10,
  36: 13,
  37: 18,
  38: 13,
  39: 13,
  40: 2,
}

/**
 * Compute default score for a question based on tier_1 (introvert/extrovert)
 * and tier_2 (karsa/cipta/rasa) answers.
 * - Both G3 and G2 match → 90 (primary match)
 * - One dimension matches → 60 (partial match)
 * - Neither matches → 30 (no match)
 */
function computeDefaultScore(
  questionIndex: number,
  tier1: any,
  tier2: any
): number {
  if (!tier1 || !tier2) return 60

  const introvertVal = tier1.introvert ?? 50
  const extrovertVal = tier1.extrovert ?? 50

  const introPct = introvertVal / 100
  const extroPct = extrovertVal / 100

  const tier2ScoreMap: Record<string, number> = {}
  if (Array.isArray(tier2) && tier2.length === 3) {
    tier2ScoreMap[tier2[0]] = 0.7 // 1st
    tier2ScoreMap[tier2[1]] = 0.5 // 2nd
    tier2ScoreMap[tier2[2]] = 0.3 // 3rd
  }

  const karsaPct = tier2ScoreMap["karsa"] || 0
  const ciptaPct = tier2ScoreMap["cipta"] || 0
  const rasaPct = tier2ScoreMap["rasa"] || 0

  const groups = [
    { no: 1, id: "bekerja_keras", score: introPct * karsaPct },
    { no: 2, id: "berpikir", score: introPct * ciptaPct },
    { no: 3, id: "berperasaan", score: introPct * rasaPct },
    { no: 4, id: "mempengaruhi", score: extroPct * karsaPct },
    { no: 5, id: "bekerjasama", score: extroPct * ciptaPct },
    { no: 6, id: "melayani", score: extroPct * rasaPct },
  ]

  // Rank them from highest score to lowest
  groups.sort((a, b) => b.score - a.score)

  const fixedScores = [90, 75, 60, 45, 30, 15]
  const groupFixedScores: Record<number, number> = {}
  groups.forEach((g, index) => {
    groupFixedScores[g.no] = fixedScores[index]
  })

  const g18No = Q_TO_G18[questionIndex]
  if (!g18No) return 60

  const g6No = G18_TO_G6[g18No]
  if (!g6No) return 60

  return groupFixedScores[g6No] || 60
}

/**
 * Get which G6 category a question belongs to.
 */
function getQuestionG6(questionIndex: number): number {
  const g18No = Q_TO_G18[questionIndex]
  if (!g18No) return 0
  return G18_TO_G6[g18No] || 0
}

function TestWizard() {
  const navigate = useNavigate()

  // Registration and config metadata
  const [userMetadata, setUserMetadata] = useState<any>(null)
  const [testMode, setTestMode] = useState<"adaptive" | "precision">(
    "precision"
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStep, setSubmitStep] = useState(0)
  const [errorMsg, setErrorMsg] = useState("")
  const [showResetModal, setShowResetModal] = useState(false)

  // v0.2 Adaptive Mode States
  const [answersV2, setAnswersV2] = useState<any>({})
  const [currentTier, setCurrentTier] = useState<
    "tier_1" | "tier_2" | "tier_3" | null
  >("tier_1")
  // v2Questions removed - Tier 3 now uses v2AllQuestions (all 40 questions)
  const [v2Group, setV2Group] = useState<any>(null)
  // Tier 3: all 40 questions with smart defaults (paginated)
  // Keyed by ORIGINAL question index (1-40), not display position.
  const [v2AllQuestions, setV2AllQuestions] = useState<Question[]>([])
  const [v2Answers, setV2Answers] = useState<Record<number, number>>({}) // { questionIndex: score }
  const [v2Page, setV2Page] = useState(0)
  // Local states for v0.2 UI
  const [introvertVal, setIntrovertVal] = useState(50)
  const [ranking, setRanking] = useState<string[]>([])

  useEffect(() => {
    if (answersV2.tier_1?.introvert !== undefined) {
      setIntrovertVal(answersV2.tier_1.introvert)
    }
    if (Array.isArray(answersV2.tier_2)) {
      setRanking(answersV2.tier_2)
    } else {
      setRanking([])
    }
  }, [answersV2])

  // v0.1 / Precision States
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<number[]>([])
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
      const parsed = JSON.parse(savedMetadata)
      setUserMetadata(parsed)
      setTestMode(parsed.testMode || "precision")
    } catch (e) {
      console.error(e)
      navigate({ to: "/" })
    }
  }, [navigate])

  // Initialize PostHog user identification and fire assessment_started
  const hasStartedRef = useRef(false)
  useEffect(() => {
    if (userMetadata && typeof window !== "undefined") {
      try {
        posthog.identify(posthog.get_distinct_id(), {
          name: userMetadata.nama?.lengkap || userMetadata.nama?.panggilan,
          age: userMetadata.usia,
          testMode: testMode,
        })
        
        if (!hasStartedRef.current) {
          posthog.capture("assessment_started", { test_mode: testMode })
          hasStartedRef.current = true
        }
      } catch (err) {
        console.warn("PostHog tracking failed", err)
      }
    }
  }, [userMetadata, testMode])

  // 2. Fetch questions or v0.2 schema on load
  useEffect(() => {
    if (!userMetadata) return

    const type = userMetadata.usia < 14 ? "tb40anak" : "tb40"
    const mode = userMetadata.testMode || "precision"

    const loadAssessmentData = async () => {
      setIsLoading(true)
      setErrorMsg("")

      if (mode === "adaptive") {
        try {
          // Load saved v2 tier answers
          const savedAnswersV2 = localStorage.getItem("tb40_answers_v2")
          if (savedAnswersV2) {
            const parsed = JSON.parse(savedAnswersV2)
            setAnswersV2(parsed)
            // Restore tier state
            if (parsed.tier_1 && parsed.tier_2) {
              setCurrentTier("tier_3")
              // Load all questions for tier 3
              await loadAllQuestionsForTier3(type, parsed)
            } else if (parsed.tier_1) {
              setCurrentTier("tier_2")
            } else {
              setCurrentTier("tier_1")
            }
          } else {
            setCurrentTier("tier_1")
          }
        } catch (err) {
          console.warn("Failed to load saved answers", err)
          setCurrentTier("tier_1")
        } finally {
          setIsLoading(false)
        }
      }
      // Precision Mode (v0.1)
      else {
        try {
          let qList: Question[] = []
          if (userMetadata.apiType === "live") {
            const response = await fetch(
              `${userMetadata.apiUrl}/api/v0.1/${type}/questions.json`
            )
            if (!response.ok) throw new Error("API responded with an error")
            const data = await response.json()
            qList =
              data.parts?.[type === "tb40anak" ? "tb40anak" : "tb40Dewasa"]
                ?.questions || []
          } else {
            const response = await fetch("/questions.json")
            const data = await response.json()
            qList =
              data.parts?.[type === "tb40anak" ? "tb40anak" : "tb40Dewasa"]
                ?.questions || []
          }
          setQuestions(qList)
          initializeAnswers(qList)
        } catch (err) {
          console.warn(
            "Could not load v0.1 questions. Loading local fallback...",
            err
          )
          try {
            const response = await fetch("/questions.json")
            const data = await response.json()
            const qList =
              data.parts?.[type === "tb40anak" ? "tb40anak" : "tb40Dewasa"]
                ?.questions || []
            setQuestions(qList)
            initializeAnswers(qList)
          } catch (localErr) {
            setErrorMsg("Gagal memuat lembar pertanyaan.")
          }
        } finally {
          setIsLoading(false)
        }
      }
    }

    loadAssessmentData()
  }, [userMetadata])

  // Load all 40 questions for v0.2 Tier 3, with smart default scores from backend evaluate api
  const loadAllQuestionsForTier3 = useCallback(
    async (type: string, currentAnswersV2: any) => {
      const tier1 = currentAnswersV2.tier_1
      const tier2 = currentAnswersV2.tier_2

      // Get default scores from backend evaluate API if available
      let defaultScores: number[] = []
      let groupLabel = ""
      if (userMetadata?.apiType === "live") {
        try {
          const response = await fetch(
            `${userMetadata.apiUrl}/api/v0.2/${type}/evaluate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ answers: currentAnswersV2 }),
            }
          )
          if (response.ok) {
            const evalData = await response.json()
            if (
              evalData.status === "complete" &&
              evalData.result?.default_scores
            ) {
              defaultScores = evalData.result.default_scores
              const topRanked = evalData.result.ranked_categories?.[0]?.id
              if (topRanked === "bekerja_keras") groupLabel = "Bekerja Keras"
              else if (topRanked === "berpikir") groupLabel = "Berpikir"
              else if (topRanked === "berperasaan") groupLabel = "Berperasaan"
              else if (topRanked === "mempengaruhi") groupLabel = "Mempengaruhi"
              else if (topRanked === "bekerjasama") groupLabel = "Bekerjasama"
              else if (topRanked === "melayani") groupLabel = "Melayani"
            }
          }
        } catch (err) {
          console.warn("Failed to fetch evaluate scores from backend", err)
        }
      }

      if (!groupLabel) {
        // Local fallback calculation for top group
        const introvertVal = tier1.introvert ?? 50
        const extrovertVal = tier1.extrovert ?? 50
        const introPct = introvertVal / 100
        const extroPct = extrovertVal / 100
        const tier2ScoreMap: Record<string, number> = {}
        if (Array.isArray(tier2) && tier2.length === 3) {
          tier2ScoreMap[tier2[0]] = 0.7
          tier2ScoreMap[tier2[1]] = 0.5
          tier2ScoreMap[tier2[2]] = 0.3
        }
        const karsaPct = tier2ScoreMap["karsa"] || 0
        const ciptaPct = tier2ScoreMap["cipta"] || 0
        const rasaPct = tier2ScoreMap["rasa"] || 0
        const localGroups = [
          {
            id: "bekerja_keras",
            label: "Bekerja Keras",
            score: introPct * karsaPct,
          },
          { id: "berpikir", label: "Berpikir", score: introPct * ciptaPct },
          {
            id: "berperasaan",
            label: "Berperasaan",
            score: introPct * rasaPct,
          },
          {
            id: "mempengaruhi",
            label: "Mempengaruhi",
            score: extroPct * karsaPct,
          },
          {
            id: "bekerjasama",
            label: "Bekerjasama",
            score: extroPct * ciptaPct,
          },
          { id: "melayani", label: "Melayani", score: extroPct * rasaPct },
        ]
        localGroups.sort((a, b) => b.score - a.score)
        groupLabel = localGroups[0].label
      }
      setV2Group({ label: groupLabel })

      // Load all questions
      let qList: Question[] = []
      try {
        if (userMetadata?.apiType === "live") {
          const response = await fetch(
            `${userMetadata.apiUrl}/api/v0.1/${type}/questions.json`
          )
          if (response.ok) {
            const data = await response.json()
            qList =
              data.parts?.[type === "tb40anak" ? "tb40anak" : "tb40Dewasa"]
                ?.questions || []
          }
        }
        if (qList.length === 0) {
          const response = await fetch("/questions.json")
          const data = await response.json()
          qList =
            data.parts?.[type === "tb40anak" ? "tb40anak" : "tb40Dewasa"]
              ?.questions || []
        }
      } catch {
        try {
          const response = await fetch("/questions.json")
          const data = await response.json()
          qList =
            data.parts?.[type === "tb40anak" ? "tb40anak" : "tb40Dewasa"]
              ?.questions || []
        } catch {
          setErrorMsg("Gagal memuat pertanyaan.")
          return
        }
      }

      const getQDefaultScore = (idx: number) => {
        if (defaultScores.length === 40) {
          return defaultScores[idx - 1]
        }
        return computeDefaultScore(idx, tier1, tier2)
      }

      // Sort questions by smart default score descending (90 → 75 → 60 → 45 → 30 → 15)
      const sortedQList = [...qList].sort((a, b) => {
        const scoreA = getQDefaultScore(parseInt(a.index))
        const scoreB = getQDefaultScore(parseInt(b.index))
        return scoreB - scoreA
      })

      setV2AllQuestions(sortedQList)

      // Compute smart default scores keyed by ORIGINAL question index (1-40)
      const defaultAnswers: Record<number, number> = {}
      sortedQList.forEach((q) => {
        const qIdx = parseInt(q.index)
        const savedScore = currentAnswersV2.tier_3?.[`q${q.index}`]
        if (typeof savedScore === "number") {
          defaultAnswers[qIdx] = savedScore
        } else {
          defaultAnswers[qIdx] = getQDefaultScore(qIdx)
        }
      })

      setV2Answers(defaultAnswers)
      localStorage.setItem(
        "tb40_answers_v2_tier3",
        JSON.stringify(defaultAnswers)
      )
    },
    [userMetadata]
  )

  // When tier_1 is answered → go to tier_2
  const handleTier1Answer = (introvert: number, extrovert: number) => {
    const newAnswers = { ...answersV2, tier_1: { introvert, extrovert } }
    delete newAnswers.tier_2
    delete newAnswers.tier_3
    setAnswersV2(newAnswers)
    localStorage.setItem("tb40_answers_v2", JSON.stringify(newAnswers))
    setCurrentTier("tier_2")
    if (typeof window !== "undefined") {
      try {
        posthog.capture("assessment_step_completed", {
          tier: "tier_1",
          introvert,
          extrovert,
        })
      } catch (err) {
        console.warn("PostHog tracking failed", err)
      }
    }
  }

  // When tier_2 is answered → prepare tier_3 with all 40 questions + smart defaults
  const handleTier2Answer = async (orderedArray: string[]) => {
    const newAnswers = { ...answersV2, tier_2: orderedArray }
    delete newAnswers.tier_3
    setAnswersV2(newAnswers)
    localStorage.setItem("tb40_answers_v2", JSON.stringify(newAnswers))
    setCurrentTier("tier_3")
    setV2Page(0)
    const type = userMetadata.usia < 14 ? "tb40anak" : "tb40"
    await loadAllQuestionsForTier3(type, newAnswers)
    if (typeof window !== "undefined") {
      try {
        posthog.capture("assessment_step_completed", {
          tier: "tier_2",
          ranking: orderedArray,
        })
      } catch (err) {
        console.warn("PostHog tracking failed", err)
      }
    }
  }

  // Handle tier_3 slider change — key by original question index
  const handleV2Tier3Change = (qIndex: number, val: number) => {
    const newAnswers = { ...v2Answers, [qIndex]: val }
    setV2Answers(newAnswers)
    localStorage.setItem("tb40_answers_v2_tier3", JSON.stringify(newAnswers))

    if (typeof window !== "undefined") {
      try {
        const answersCount = Object.keys(newAnswers).length
        posthog.capture("answer_changed", {
          questionId: qIndex,
          answerValue: val,
          mode: "adaptive",
          current_answers: newAnswers,
          answers_count: answersCount,
          $set: {
            latest_answers_adaptive: newAnswers,
            answers_count_adaptive: answersCount
          }
        })
      } catch (err) {
        console.warn("PostHog tracking failed", err)
      }
    }
  }

  // V2 Back Navigation
  const handleV2Back = () => {
    if (currentTier === "tier_2") {
      setCurrentTier("tier_1")
    } else if (currentTier === "tier_3") {
      if (v2Page > 0) {
        setV2Page(v2Page - 1)
      } else {
        setCurrentTier("tier_2")
      }
    } else {
      setShowResetModal(true)
    }
  }

  // Initialize answers for v0.1 (Precision Mode)
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
      const initial = new Array(qList.length).fill(60)
      setAnswers(initial)
      localStorage.setItem("tb40_answers", JSON.stringify(initial))
    } catch (e) {
      setAnswers(new Array(qList.length).fill(60))
    }
  }

  // Save V1 answer
  const handleAnswerChange = (questionIndex: number, val: number) => {
    const newAnswers = [...answers]
    newAnswers[questionIndex] = val
    setAnswers(newAnswers)
    localStorage.setItem("tb40_answers", JSON.stringify(newAnswers))

    if (typeof window !== "undefined") {
      try {
        // Rough heuristic for precision answers count (ignoring defaults of 60)
        const answersCount = newAnswers.filter(a => a !== 60).length
        posthog.capture("answer_changed", {
          questionId: questionIndex + 1,
          answerValue: val,
          mode: "precision",
          current_answers: newAnswers,
          answers_count: answersCount,
          $set: {
            latest_answers_precision: newAnswers,
            answers_count_precision: answersCount
          }
        })
      } catch (err) {
        console.warn("PostHog tracking failed", err)
      }
    }
  }

  const confirmResetAndRestart = () => {
    try {
      posthog.capture("assessment_reset_confirmed", { test_mode: testMode })
    } catch (err) {
      console.warn("PostHog tracking failed", err)
    }
    localStorage.removeItem("tb40_umum")
    localStorage.removeItem("tb40_answers")
    localStorage.removeItem("tb40_answers_v2")
    localStorage.removeItem("tb40_answers_v2_tier3")
    localStorage.removeItem("tb40_result")
    setShowResetModal(false)
    navigate({ to: "/" })
  }

  const getScoreTag = (score: number) => {
    if (score <= 20)
      return {
        label: "Sangat Lemah",
        color: "text-rose-600 bg-rose-50 dark:bg-rose-950/20",
      }
    if (score <= 40)
      return {
        label: "Kelemahan Potensial",
        color: "text-orange-600 bg-orange-50 dark:bg-orange-950/20",
      }
    if (score <= 60)
      return {
        label: "Cukup / Seimbang",
        color: "text-amber-600 bg-amber-50 dark:bg-amber-950/20",
      }
    if (score <= 80)
      return {
        label: "Bakat Kuat",
        color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20",
      }
    return {
      label: "Bakat Unggul",
      color: "text-teal-700 bg-teal-50 dark:bg-teal-950/20 font-bold",
    }
  }

  const getScoreDefaultLabel = (questionIndex: number) => {
    if (!answersV2.tier_1 || !answersV2.tier_2) return null
    const defaultScore = computeDefaultScore(
      questionIndex,
      answersV2.tier_1,
      answersV2.tier_2
    )
    if (defaultScore >= 75)
      return {
        label: "Bakat Utama",
        color: "text-teal-600 bg-teal-50 border-teal-200",
      }
    if (defaultScore >= 45)
      return {
        label: "Bakat Pendukung",
        color: "text-amber-600 bg-amber-50 border-amber-200",
      }
    return {
      label: "Bakat Pelengkap",
      color: "text-slate-500 bg-slate-50 border-slate-200",
    }
  }

  // Dynamic submission loader step changes
  useEffect(() => {
    if (isSubmitting) {
      const interval = setInterval(() => {
        setSubmitStep((prev) => (prev < 3 ? prev + 1 : prev))
      }, 700)
      return () => clearInterval(interval)
    }
  }, [isSubmitting])

  // Submit v0.1 Precision Test
  const submitTest = async () => {
    setIsSubmitting(true)
    setSubmitStep(0)
    const type = userMetadata.usia < 14 ? "tb40anak" : "tb40"
    const parsedAnswers: Record<string, number> = {}
    for (let i = 1; i <= 40; i++) {
      parsedAnswers[i.toString()] = answers[i - 1] ?? 60
    }

    const compactPayload = {
      u: {
        nama: { lengkap: userMetadata.nama.lengkap, panggilan: userMetadata.nama.panggilan },
        usia: userMetadata.usia,
        lahir: { tanggal: userMetadata.lahir.tanggal },
        tanggal: userMetadata.tanggal,
      },
      a: parsedAnswers,
      t: type,
    }
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(compactPayload))
    const shareUrl = `${window.location.origin}/result?share=${compressed}`

    if (typeof window !== "undefined") {
      try {
        posthog.capture("assessment_submitted", { 
          mode: "precision",
          $set: { result_url_precision: shareUrl }
        })
      } catch (err) {
        console.warn("PostHog tracking failed", err)
      }
    }

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
        [type]: answers,
      },
    }

    try {
      const response = await fetch(
        `${userMetadata.apiUrl}/api/v0.1/${type}/calculation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      )

      if (!response.ok) throw new Error("Calculation failed on live API")
      const resultData = await response.json()

      localStorage.setItem("tb40_result", JSON.stringify(resultData))

      if (typeof window !== "undefined" && resultData.parts?.[type]) {
        try {
          posthog.capture("assessment_result_saved", {
            mode: "precision",
            rawScores: resultData.parts[type],
            percentileScores: resultData.parts[type]
          })
        } catch (err) {
          console.warn("PostHog tracking failed", err)
        }
      }

      setTimeout(() => {
        setIsSubmitting(false)
        navigate({ to: "/result" as any })
      }, 800)
    } catch (err) {
      console.warn(
        "Could not run calculation on live API. Using local mock simulation data...",
        err
      )
      try {
        const response = await fetch("/result.json")
        const resultData = await response.json()

        if (resultData.parts) {
          resultData.parts.umum = payload.parts.umum
        }

        localStorage.setItem("tb40_result", JSON.stringify(resultData))

        if (typeof window !== "undefined" && resultData.parts?.[type]) {
          try {
            posthog.capture("assessment_result_saved", {
              mode: "precision",
              rawScores: resultData.parts[type],
              percentileScores: resultData.parts[type]
            })
          } catch (err) {
            console.warn("PostHog tracking failed", err)
          }
        }

        setTimeout(() => {
          setIsSubmitting(false)
          navigate({ to: "/result" as any })
        }, 800)
      } catch (localErr) {
        setIsSubmitting(false)
        setErrorMsg("Gagal melakukan perhitungan bakat.")
      }
    }
  }

  /**
   * Submit v0.2 Adaptive Test.
   * Uses the v0.1 calculation endpoint with the full 40 answers (smart defaults + user overrides).
   */
  const submitV2Test = async () => {
    setIsSubmitting(true)
    setSubmitStep(0)
    const type = userMetadata.usia < 14 ? "tb40anak" : "tb40"
    const parsedAnswers: Record<string, number> = {}
    for (let i = 1; i <= 40; i++) {
      parsedAnswers[i.toString()] = v2Answers[i] ?? 60
    }

    const compactPayload = {
      u: {
        nama: { lengkap: userMetadata.nama.lengkap, panggilan: userMetadata.nama.panggilan },
        usia: userMetadata.usia,
        lahir: { tanggal: userMetadata.lahir.tanggal },
        tanggal: userMetadata.tanggal,
      },
      a: parsedAnswers,
      t: type,
    }
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(compactPayload))
    const shareUrl = `${window.location.origin}/result?share=${compressed}`

    if (typeof window !== "undefined") {
      try {
        posthog.capture("assessment_submitted", { 
          mode: "adaptive",
          $set: { result_url_adaptive: shareUrl }
        })
      } catch (err) {
        console.warn("PostHog tracking failed", err)
      }
    }

    // Build ordered array[40] for the v0.1 API: index 0 = q1, index 39 = q40
    const fullAnswers = Array.from(
      { length: 40 },
      (_, i) => v2Answers[i + 1] ?? 60
    )

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
        [type]: fullAnswers,
      },
    }

    try {
      const apiUrl = userMetadata.apiUrl || ""
      if (!apiUrl) throw new Error("No API URL")

      const response = await fetch(`${apiUrl}/api/v0.1/${type}/calculation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Calculation failed")
      const resultData = await response.json()

      localStorage.setItem("tb40_result", JSON.stringify(resultData))

      if (typeof window !== "undefined" && resultData.parts?.[type]) {
        try {
          posthog.capture("assessment_result_saved", {
            mode: "adaptive",
            rawScores: resultData.parts[type],
            percentileScores: resultData.parts[type]
          })
        } catch (err) {
          console.warn("PostHog tracking failed", err)
        }
      }

      setTimeout(() => {
        setIsSubmitting(false)
        navigate({ to: "/result" as any })
      }, 800)
    } catch (err) {
      console.warn(
        "Could not run v0.2 calculation on live API. Using local mock...",
        err
      )
      try {
        const response = await fetch("/result.json")
        const resultData = await response.json()

        if (resultData.parts) {
          resultData.parts.umum = payload.parts.umum
        }

        localStorage.setItem("tb40_result", JSON.stringify(resultData))

        if (typeof window !== "undefined" && resultData.parts?.[type]) {
          try {
            posthog.capture("assessment_result_saved", {
              mode: "adaptive",
              rawScores: resultData.parts[type],
              percentileScores: resultData.parts[type]
            })
          } catch (err) {
            console.warn("PostHog tracking failed", err)
          }
        }

        setTimeout(() => {
          setIsSubmitting(false)
          navigate({ to: "/result" as any })
        }, 800)
      } catch (localErr) {
        setIsSubmitting(false)
        setErrorMsg("Gagal memproses hasil penilaian.")
      }
    }
  }

  // ─── Helper: get the G6 category label for a question
  const getG6CategoryLabel = (questionIndex: number): string => {
    const g6No = getQuestionG6(questionIndex)
    return G6_PARENT_MAP[g6No]?.name || ""
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
        <h3 className="font-heading text-lg font-medium">
          Memuat Lembar Penilaian
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {testMode === "adaptive"
            ? "Mempersiapkan pertanyaan adaptif..."
            : "Mengambil 40 pilar pertanyaan..."}
        </p>
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-foreground select-none">
        <div className="flex max-w-md flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div>
            <h3 className="font-heading text-xl font-semibold">
              Menganalisa Kepribadian Anda
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Harap tunggu sementara AI kami memproses laporan editorial Anda.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2.5 rounded-lg border border-border bg-secondary/80 p-4 text-left font-mono text-xs">
            {processingSteps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {submitStep > idx ? (
                  <span className="font-bold text-emerald-600">✓</span>
                ) : submitStep === idx ? (
                  <span className="animate-pulse font-bold text-primary">
                    ●
                  </span>
                ) : (
                  <span className="text-muted-foreground/30">○</span>
                )}
                <span
                  className={
                    submitStep === idx
                      ? "font-semibold text-foreground"
                      : submitStep > idx
                        ? "text-muted-foreground"
                        : "text-muted-foreground/45"
                  }
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // v0.2 ADAPTIVE ASSESSMENT RENDER WORKFLOW
  // ----------------------------------------------------
  if (testMode === "adaptive") {
    const v2TotalPages = Math.ceil(v2AllQuestions.length / QUESTIONS_PER_PAGE)
    const v2StartIdx = v2Page * QUESTIONS_PER_PAGE
    const v2CurrentQuestions = v2AllQuestions.slice(
      v2StartIdx,
      v2StartIdx + QUESTIONS_PER_PAGE
    )

    // Progress: tier1=25%, tier2=50%, tier3 pages proportionally fill 50%-100%
    let progressPercentV2 = 25
    if (currentTier === "tier_2") progressPercentV2 = 50
    if (currentTier === "tier_3") {
      progressPercentV2 = 50 + Math.round((v2Page / v2TotalPages) * 50)
    }
    if (currentTier === null) progressPercentV2 = 100

    const tier3IsLastPage =
      currentTier === "tier_3" && v2Page >= v2TotalPages - 1

    return (
      <>
        <div className="flex min-h-screen flex-col bg-background p-4 text-foreground md:p-8">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            {/* Header */}
            <div className="mt-2 flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="flex items-center gap-2 font-heading text-2xl font-semibold text-foreground">
                  <Zap className="h-5 w-5 text-primary" /> Penilaian Cepat
                  Adaptif (v0.2)
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Menilai untuk:{" "}
                  <span className="font-semibold text-primary">
                    {userMetadata?.nama?.lengkap}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setShowResetModal(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <RotateCcw className="h-3 w-3" /> Ulangi Tes
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex w-full flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>
                  {currentTier === "tier_1" && "Langkah 1: Energi Sosial"}
                  {currentTier === "tier_2" && "Langkah 2: Orientasi Bakat"}
                  {currentTier === "tier_3" &&
                    `Langkah 3: Evaluasi 40 Pilar (Halaman ${v2Page + 1}/${v2TotalPages})`}
                </span>
                <span>{progressPercentV2}% Selesai</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full border border-border bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progressPercentV2}%` }}
                />
              </div>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* TIER 1 - Energi Sosial (Allocation) */}
            {currentTier === "tier_1" && (
              <div className="mt-4 flex flex-col gap-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
                  <div className="inline-flex items-center gap-2 self-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                    <Users className="h-4 w-4 text-primary" /> Kepribadian
                    Sosial
                  </div>
                  <h3 className="mx-auto max-w-2xl font-heading text-lg leading-relaxed font-medium md:text-xl">
                    Bagilah 100% energi mental Anda antara Introvert dan
                    Extrovert:
                  </h3>
                  <p className="mx-auto max-w-lg text-xs text-muted-foreground">
                    Geser slider di bawah untuk menyesuaikan porsi energi Anda.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6 text-center">
                    <div className="rounded-full bg-primary/10 p-3 text-primary">
                      <User className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      Introvert
                    </span>
                    <span className="font-heading text-3xl font-bold text-primary">
                      {introvertVal}%
                    </span>
                    <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                      Nyaman dan berenergi saat sendiri atau dalam ketenangan.
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6 text-center">
                    <div className="rounded-full bg-primary/10 p-3 text-primary">
                      <Users className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      Extrovert
                    </span>
                    <span className="font-heading text-3xl font-bold text-primary">
                      {100 - introvertVal}%
                    </span>
                    <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                      Segar dan termotivasi saat bersosialisasi dan
                      berinteraksi.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span>100% Introvert</span>
                    <span>Seimbang (50/50)</span>
                    <span>100% Extrovert</span>
                  </div>
                  <Slider
                    id="socialEnergySlider"
                    value={[introvertVal]}
                    onValueChange={([v]) => setIntrovertVal(v)}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      onClick={() =>
                        handleTier1Answer(introvertVal, 100 - introvertVal)
                      }
                      className="flex cursor-pointer items-center gap-2 bg-primary px-6 py-5 font-heading font-semibold shadow-md shadow-primary/20 hover:bg-primary/90"
                    >
                      Simpan & Lanjut <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TIER 2 - Orientasi Bakat (Forced Ranking) */}
            {currentTier === "tier_2" && (
              <div className="mt-4 flex flex-col gap-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
                  <div className="inline-flex items-center gap-2 self-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                    <TrendingUp className="h-4 w-4 text-primary" /> Cara Kerja
                    Dasar
                  </div>
                  <h3 className="mx-auto max-w-2xl font-heading text-lg leading-relaxed font-medium md:text-xl">
                    Urutkan orientasi bakat yang paling menggambarkan diri Anda:
                  </h3>
                  <p className="mx-auto max-w-lg text-xs text-muted-foreground">
                    Klik kartu di bawah secara berurutan dari yang **Paling
                    Menggambarkan** (Pilihan ke-1) hingga yang **Paling Kurang
                    Menggambarkan** (Pilihan ke-3).
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {[
                    {
                      id: "karsa",
                      label: "Karsa (Aksi / Kerja Fisik)",
                      icon: Zap,
                      desc: "Tipe praktis yang menyukai aksi nyata, senang langsung memulai pekerjaan, dan menyukai aktifitas bergerak.",
                    },
                    {
                      id: "cipta",
                      label: "Cipta (Pikir / Logika)",
                      icon: BookOpen,
                      desc: "Senang memikirkan teori, menganalisis pola, merancang konsep, dan belajar secara visual atau kognitif.",
                    },
                    {
                      id: "rasa",
                      label: "Rasa (Hati / Emosi)",
                      icon: Heart,
                      desc: "Menaruh kepedulian tinggi terhadap perasaan sesama, peka terhadap harmoni sosial, dan mengedepankan empati.",
                    },
                  ].map((item) => {
                    const rankIdx = ranking.indexOf(item.id)
                    const isRanked = rankIdx !== -1
                    const IconComp = item.icon
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (ranking.includes(item.id)) {
                            setRanking((prev) =>
                              prev.filter((x) => x !== item.id)
                            )
                          } else {
                            setRanking((prev) => [...prev, item.id])
                          }
                        }}
                        className={`group relative flex cursor-pointer flex-col gap-2 rounded-2xl border bg-card p-5 text-left transition-all hover:border-primary/50 ${
                          isRanked
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border"
                        }`}
                      >
                        {isRanked && (
                          <span className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow">
                            {rankIdx + 1}
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <div
                            className={`rounded-lg border p-2 text-primary ${isRanked ? "border-primary/30 bg-primary/20" : "border-primary/20 bg-primary/10"}`}
                          >
                            <IconComp className="h-4 w-4" />
                          </div>
                          <h4 className="mr-6 font-heading text-sm font-semibold">
                            {item.label}
                          </h4>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {item.desc}
                        </p>
                        <span className="mt-auto block w-full border-t border-border/40 pt-2 text-[10px] font-medium text-muted-foreground/60">
                          {isRanked
                            ? `Pilihan ke-${rankIdx + 1}`
                            : "Pilih untuk urutan"}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {ranking.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-secondary/50 p-4">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-muted-foreground">
                        Urutan Terpilih:
                      </span>
                      <span className="flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 font-mono font-bold text-primary uppercase shadow-sm">
                        {ranking.map((id, index) => (
                          <span key={id} className="flex items-center gap-1.5">
                            {id === "karsa"
                              ? "Karsa"
                              : id === "cipta"
                                ? "Cipta"
                                : "Rasa"}
                            {index < ranking.length - 1 && (
                              <span className="font-normal text-muted-foreground">
                                →
                              </span>
                            )}
                          </span>
                        ))}
                      </span>
                    </div>
                    <button
                      onClick={() => setRanking([])}
                      className="cursor-pointer text-xs font-medium text-destructive hover:underline"
                    >
                      Reset Urutan
                    </button>
                  </div>
                )}

                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <Button
                    disabled={ranking.length !== 3}
                    onClick={() => handleTier2Answer(ranking)}
                    className="flex cursor-pointer items-center gap-2 bg-primary px-6 py-5 font-heading font-semibold shadow-md shadow-primary/20 hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                  >
                    Lanjut ke Evaluasi 40 Pilar{" "}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* TIER 3 - All 40 Questions (paginated sliders with smart defaults) */}
            {currentTier === "tier_3" && v2AllQuestions.length > 0 && (
              <div className="mt-4 flex flex-col gap-6">
                {/* Info banner about smart defaults */}
                <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4 text-xs">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="flex-col gap-1">
                    <p className="font-semibold text-foreground">
                      Skor Awal Adaptif
                    </p>
                    <p className="mt-0.5 leading-relaxed text-muted-foreground">
                      Skor awal setiap pilar ditetapkan secara otomatis
                      berdasarkan pilihan Anda di langkah sebelumnya.
                      <span className="font-medium text-teal-600">
                        {" "}
                        Bakat Utama (skor 90)
                      </span>{" "}
                      untuk klaster yang paling sesuai,
                      <span className="font-medium text-amber-600">
                        {" "}
                        Bakat Pendukung (skor 60)
                      </span>{" "}
                      untuk yang sebagian sesuai, dan
                      <span className="font-medium text-slate-500">
                        {" "}
                        Bakat Pelengkap (skor 30)
                      </span>{" "}
                      untuk lainnya. Silakan sesuaikan jika diperlukan.
                    </p>
                  </div>
                </div>

                {/* Cluster info */}
                {v2Group && (
                  <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 text-center">
                    <span className="font-mono text-[10px] font-bold tracking-widest text-primary uppercase">
                      Klaster Bakat Utama Anda
                    </span>
                    <h4 className="font-heading text-base font-semibold">
                      {v2Group?.label || ""}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Terdapat {v2AllQuestions.length} pilar yang perlu dinilai
                      — skor awal sudah disesuaikan.
                    </p>
                  </div>
                )}

                {/* Questions for current page */}
                <div className="flex flex-col gap-6">
                  {v2CurrentQuestions.map((q) => {
                    const qIndex = parseInt(q.index)
                    const score = v2Answers[qIndex] ?? 60
                    const tag = getScoreTag(score)
                    const defaultInfo = getScoreDefaultLabel(qIndex)
                    const categoryLabel = getG6CategoryLabel(qIndex)

                    return (
                      <div
                        key={q.index}
                        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm md:p-6"
                      >
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-border bg-secondary/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                              Pilar {q.index}
                            </span>
                            {categoryLabel && (
                              <span className="rounded-full border border-primary/15 bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary/70">
                                {categoryLabel}
                              </span>
                            )}
                            {defaultInfo && (
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${defaultInfo.color}`}
                              >
                                {defaultInfo.label}
                              </span>
                            )}
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${tag.color}`}
                          >
                            {tag.label}: {score}
                          </span>
                        </div>

                        <h4 className="font-heading text-base leading-relaxed font-medium md:text-lg">
                          "{q.question}"
                        </h4>

                        <div className="mt-2 flex flex-col gap-2">
                          <div className="flex items-center gap-4">
                            <span className="font-mono text-xs text-muted-foreground">
                              Sangat Kontra (0)
                            </span>
                            <Slider
                              value={[score]}
                              onValueChange={([v]) =>
                                handleV2Tier3Change(qIndex, v)
                              }
                              max={100}
                              step={1}
                              className="flex-1"
                            />
                            <span className="font-mono text-xs text-muted-foreground">
                              Sangat Pro (100)
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Navigation controls */}
            <div className="mt-8 mb-12 flex items-center justify-between border-t border-border pt-6">
              <Button
                variant="secondary"
                onClick={handleV2Back}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Kembali
              </Button>

              {/* Tier 3 pagination and submit */}
              {currentTier === "tier_3" && (
                <>
                  <span className="text-xs text-muted-foreground">
                    Halaman {v2Page + 1} / {v2TotalPages}
                  </span>
                  {tier3IsLastPage ? (
                    <Button
                      onClick={submitV2Test}
                      className="flex cursor-pointer items-center gap-2 bg-primary px-6 py-5 font-heading font-semibold shadow-md shadow-primary/20 hover:bg-primary/90"
                    >
                      Mulai Analisa Bakat{" "}
                      <Sparkles className="h-4 w-4 animate-pulse" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setV2Page(v2Page + 1)}
                      className="flex items-center gap-2"
                    >
                      Lanjut <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Reset Modal */}
        <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
          <DialogContent className="max-w-md">
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
                    Apakah Anda yakin ingin mengulangi tes dari awal? Tindakan
                    ini akan menghapus semua data pendaftaran, jawaban, dan
                    hasil analisis Anda secara permanen dari perangkat ini.
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
      </>
    )
  }

  // ----------------------------------------------------
  // v0.1 PRECISION ASSESSMENT RENDER WORKFLOW
  // ----------------------------------------------------
  const progressPercent = Math.round(((currentPage + 1) / TOTAL_PAGES) * 100)
  const startIdx = currentPage * QUESTIONS_PER_PAGE
  const currentQuestions = questions.slice(
    startIdx,
    startIdx + QUESTIONS_PER_PAGE
  )

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background p-4 text-foreground md:p-8">
        {/* Upper Progress tracker header */}
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <div className="mt-2 flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-foreground">
                Lembar Penilaian TB40
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Menilai untuk:{" "}
                <span className="font-semibold text-primary">
                  {userMetadata?.nama?.lengkap}
                </span>
              </p>
            </div>

            <button
              onClick={() => setShowResetModal(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <RotateCcw className="h-3 w-3" /> Ulangi Tes
            </button>
          </div>

          {/* Stepper progress indicator */}
          <div className="flex w-full flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>
                Bagian {currentPage + 1} dari {TOTAL_PAGES}
              </span>
              <span>{progressPercent}% Selesai</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full border border-border bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Form Error Banner */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Stepper Wizard Questions Container */}
          <div className="mt-4 flex flex-col gap-6">
            {currentQuestions.map((q) => {
              const questionIdx = parseInt(q.index) - 1
              const score = answers[questionIdx] ?? 60
              const tag = getScoreTag(score)

              return (
                <div
                  key={q.index}
                  className="relative flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md md:p-6"
                >
                  {/* Question Info Indicator */}
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <span className="rounded-full border border-border bg-secondary/80 px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground">
                      Pernyataan {q.index} dari 40
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${tag.color}`}
                    >
                      {tag.label}: {score}
                    </span>
                  </div>

                  {/* Statement Text */}
                  <h4 className="font-heading text-base leading-relaxed font-medium text-foreground md:text-lg">
                    "{q.question}"
                  </h4>

                  {/* Granular Slider Range Element */}
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-xs text-muted-foreground">
                        Sangat Kontra (0)
                      </span>
                      <Slider
                        value={[score]}
                        onValueChange={([v]) =>
                          handleAnswerChange(questionIdx, v)
                        }
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="font-mono text-xs text-muted-foreground">
                        Sangat Pro (100)
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bottom Stepper Controls */}
          <div className="mt-8 mb-12 flex items-center justify-between border-t border-border pt-6">
            <Button
              variant="secondary"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
              disabled={currentPage === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>

            <span className="text-xs text-muted-foreground">
              Halaman {currentPage + 1} / {TOTAL_PAGES}
            </span>

            {currentPage < TOTAL_PAGES - 1 ? (
              <Button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, TOTAL_PAGES - 1))
                }
                className="flex items-center gap-2"
              >
                Lanjut <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={submitTest}
                className="flex cursor-pointer items-center gap-2 bg-primary px-6 py-5 font-heading font-semibold shadow-md shadow-primary/20 hover:bg-primary/90"
              >
                Mulai Analisa Bakat{" "}
                <Sparkles className="h-4 w-4 animate-pulse" />
              </Button>
            )}
          </div>
        </div>
      </div>


      {/* Reset Modal (shared) */}
      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent className="max-w-md">
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
                  Apakah Anda yakin ingin mengulangi tes dari awal? Tindakan
                  ini akan menghapus semua data pendaftaran, jawaban, dan
                  hasil analisis Anda secara permanen dari perangkat ini.
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
    </>
  )
}
