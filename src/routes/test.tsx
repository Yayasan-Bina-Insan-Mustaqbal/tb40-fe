import { useState, useEffect, useRef, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  BookOpen,
  Heart,
  User,
  AlertTriangle,
  WifiOff,
  Clock,
} from 'lucide-react'
import {
  getSubmission,
  evaluateStep,
  updateProfile,
  getSchema,
} from '@/lib/api-client'

export const Route = createFileRoute('/test')({
  component: TestWizard,
  validateSearch: (search: Record<string, unknown>): { id?: string } => {
    return {
      id: search.id as string | undefined,
    }
  },
})

function TestWizard() {
  const navigate = useNavigate()
  const { id: submissionIdParam } = Route.useSearch()

  // Primary Submission State
  const [submissionId, setSubmissionId] = useState<string | null>(submissionIdParam || null)
  const [submission, setSubmission] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Network Offline & Retry Queue State
  const [isOffline, setIsOffline] = useState(false)
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null)

  // Question Schema State
  const [schema, setSchema] = useState<any>(null)

  // Tier 1 State (Introvert vs Extrovert Allocation)
  const [introvertVal, setIntrovertVal] = useState<number>(50)
  const [extrovertVal, setExtrovertVal] = useState<number>(50)

  // Tier 2 State (Karsa / Cipta / Rasa Forced Ranking Order)
  const [forcedRanking, setForcedRanking] = useState<string[]>([])

  // Profile Gate Modal State (when next_tier === 'profile_required')
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [subjectName, setSubjectName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [ageVal, setAgeVal] = useState<number | ''>('')
  const [isObserver, setIsObserver] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)

  // Tier 3 Slider State (sub_1..sub_18)
  const [tier3Answers, setTier3Answers] = useState<Record<string, number>>({})
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load or sync submission from URL parameter or localStorage
  const loadSubmissionData = useCallback(async (idToLoad: string) => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const data = await getSubmission(idToLoad)
      if (data && data.id) {
        setSubmission(data)
        setLastSavedTimestamp(data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : null)
        setIsOffline(false)

        // Sync local storage active submission ID
        localStorage.setItem('tb40_active_submission_id', data.id)

        // Load schema for this submission's type
        const schemaData = await getSchema(
          data.type || 'tb40',
          Boolean(data.is_observer),
          data.subject_name || ''
        )
        if (schemaData) setSchema(schemaData)

        // Populate existing answers if resuming
        if (data.answers) {
          if (data.answers.tier_1) {
            setIntrovertVal(data.answers.tier_1.introvert ?? 50)
            setExtrovertVal(data.answers.tier_1.extrovert ?? 50)
          }
          if (data.answers.tier_2) {
            const t2 = data.answers.tier_2
            setForcedRanking(Array.isArray(t2) ? t2 : (t2.order || []))
          }
          if (data.answers.tier_3) {
            setTier3Answers(data.answers.tier_3)
          }
        }

        // Open Profile Gate modal if profile is required
        if (data.next_tier === 'profile_required') {
          setProfileModalOpen(true)
        }
      } else {
        setErrorMsg('Sesi tes tidak ditemukan atau telah kedaluwarsa.')
      }
    } catch (err) {
      console.error('Error loading submission:', err)
      setIsOffline(true)
      setErrorMsg('Gagal terhubung ke server API.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const activeId = submissionIdParam || localStorage.getItem('tb40_active_submission_id')
    if (activeId) {
      setSubmissionId(activeId)
      loadSubmissionData(activeId)
    } else {
      setLoading(false)
      setErrorMsg('Tidak ada ID sesi tes. Silakan mulai tes dari Halaman Utama.')
    }
  }, [submissionIdParam, loadSubmissionData])

  // Handle Tier 1 Allocation Change
  const handleIntrovertChange = (val: number) => {
    setIntrovertVal(val)
    setExtrovertVal(100 - val)
  }

  // Handle Tier 1 Submit
  const handleTier1Submit = async () => {
    if (!submissionId) return
    setSubmitting(true)
    try {
      const res = await evaluateStep(submissionId, {
        sequence_number: 1,
        answers: { tier_1: { introvert: introvertVal, extrovert: extrovertVal } },
      })
      if (res && res.saved) {
        setLastSavedTimestamp(new Date().toLocaleTimeString())
        setSubmission((prev: any) => ({ ...prev, ...res }))
        if (res.next_tier === 'profile_required') setProfileModalOpen(true)
      }
    } catch (err) {
      console.error('Tier 1 save error:', err)
      setIsOffline(true)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Tier 2 Forced Ranking Item Selection
  const toggleRankingItem = (itemKey: string) => {
    if (forcedRanking.includes(itemKey)) {
      setForcedRanking(forcedRanking.filter((k) => k !== itemKey))
    } else if (forcedRanking.length < 3) {
      setForcedRanking([...forcedRanking, itemKey])
    }
  }

  // Handle Tier 2 Submit
  const handleTier2Submit = async () => {
    if (!submissionId || forcedRanking.length !== 3) return
    setSubmitting(true)
    try {
      const res = await evaluateStep(submissionId, {
        sequence_number: 2,
        answers: { tier_2: forcedRanking },
      })
      if (res && res.saved) {
        setLastSavedTimestamp(new Date().toLocaleTimeString())
        setSubmission((prev: any) => ({ ...prev, ...res }))
        if (res.next_tier === 'profile_required') setProfileModalOpen(true)
      }
    } catch (err) {
      console.error('Tier 2 save error:', err)
      setIsOffline(true)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Profile Gate Submit (Unlocking Tier 3)
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!submissionId || !subjectName.trim()) return
    setProfileSaving(true)
    try {
      const res = await updateProfile(submissionId, {
        subject_name: subjectName.trim(),
        birth_date: birthDate || undefined,
        age: typeof ageVal === 'number' ? ageVal : undefined,
        is_observer: isObserver,
      })
      if (res && (res.next_tier === 'tier_3' || res.saved)) {
        setSubmission((prev: any) => ({ ...prev, ...res }))
        setProfileModalOpen(false)

        // Re-fetch updated question schema for observer/subject
        const schemaData = await getSchema(res.type || 'tb40', isObserver, subjectName.trim())
        if (schemaData) setSchema(schemaData)
      }
    } catch (err) {
      console.error('Profile update error:', err)
      alert('Gagal mengupdate profil. Silakan coba lagi.')
    } finally {
      setProfileSaving(false)
    }
  }

  // Handle Tier 3 Slider Interaction with Debounced Auto-Save
  const handleTier3SliderChange = (qId: string, val: number) => {
    const updated = { ...tier3Answers, [qId]: val }
    setTier3Answers(updated)

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      if (!submissionId) return
      try {
        const seqNum = (submission?.sequence_number || 2) + 1
        const res = await evaluateStep(submissionId, {
          sequence_number: seqNum,
          answers: { tier_3: updated },
        })
        if (res && res.saved) {
          setLastSavedTimestamp(new Date().toLocaleTimeString())
          setSubmission((prev: any) => ({ ...prev, ...res }))
          setIsOffline(false)
        }
      } catch (err) {
        console.error('Debounced save error:', err)
        setIsOffline(true)
      }
    }, 600)
  }

  // Handle Final Submission & Transition to Result Page
  const handleCompleteAssessment = () => {
    if (!submissionId) return
    navigate({ to: '/result', search: { id: submissionId } })
  }

  // Helpers for Qualitative Labels and Emojis
  const getSliderEmoji = (val: number) => {
    if (val <= 20) return '🤫'
    if (val <= 40) return '🌿'
    if (val <= 60) return '🤝'
    if (val <= 80) return '🎉'
    return '🧠'
  }

  const getSliderLabel = (val: number) => {
    if (val <= 20) return 'Sangat Tidak Sesuai'
    if (val <= 40) return 'Kurang Sesuai'
    if (val <= 60) return 'Cukup Sesuai'
    if (val <= 80) return 'Sangat Sesuai'
    return 'Sangat Dominan'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-teal-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Memuat Sesi Tes Adaptif...</p>
      </div>
    )
  }

  if (errorMsg && !submission) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Terjadi Kesalahan Sesi</h2>
        <p className="text-slate-400 text-sm max-w-md mb-6">{errorMsg}</p>
        <Button onClick={() => navigate({ to: '/' })} className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold">
          Kembali ke Halaman Utama
        </Button>
      </div>
    )
  }

  const currentTier = submission?.next_tier || submission?.current_tier || 'tier_1'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      
      {/* Offline Status Retry Banner */}
      {isOffline && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-300 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Koneksi Terputus — Mencoba menyimpan jawaban ke server di latar belakang...</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/' })}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-sm sm:text-base text-slate-200">
              {submission?.type === 'tb40anak' ? 'Tes TB40 Anak' : 'Tes TB40 Dewasa'}
            </h1>
            <p className="text-xs text-slate-400">
              ID: <span className="font-mono text-teal-400">{submissionId}</span>
            </p>
          </div>
        </div>

        {/* Auto-Save Server Confirmation Timestamp Indicator */}
        <div className="flex items-center gap-3">
          {lastSavedTimestamp && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-slate-400 bg-slate-800/60 border border-slate-700/60">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              Tersimpan pada {lastSavedTimestamp}
            </span>
          )}
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20">
            {currentTier === 'tier_1' && 'Tier 1 / 3'}
            {currentTier === 'tier_2' && 'Tier 2 / 3'}
            {currentTier === 'profile_required' && 'Gate Profil'}
            {currentTier === 'tier_3' && 'Tier 3 (18 Sub-Grup)'}
            {submission?.status === 'complete' && 'Selesai 100%'}
          </span>
        </div>
      </header>

      {/* Main Content Step Wizard Container */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl flex flex-col items-center">
        
        {/* TIER 1: SOCIAL ENERGY ALLOCATION */}
        {currentTier === 'tier_1' && (
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="mb-6">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Tier 1: Energi Sosial</span>
              <h2 className="text-2xl font-bold text-slate-100 mt-1">Alokasi Energi Sosial (Introvert vs Extrovert)</h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Tentukan pembagian persen kecenderungan energi sosial Anda. Total alokasi harus berjumlah 100%.
              </p>
            </div>

            {/* Double Percentage Visual Card */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                <span className="text-xs text-slate-400 block mb-1">Introvert (Menyendiri/Internal)</span>
                <span className="text-3xl font-extrabold text-teal-400">{introvertVal}%</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center">
                <span className="text-xs text-slate-400 block mb-1">Extrovert (Berinteraksi/Eksternal)</span>
                <span className="text-3xl font-extrabold text-indigo-400">{extrovertVal}%</span>
              </div>
            </div>

            {/* Allocation Slider */}
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-xs text-slate-400 font-semibold">
                <span>100% Introvert</span>
                <span>50% / 50%</span>
                <span>100% Extrovert</span>
              </div>
              <Slider
                value={[introvertVal]}
                onValueChange={(val) => handleIntrovertChange(val[0])}
                min={0}
                max={100}
                step={5}
                className="py-4"
              />
            </div>

            <Button
              onClick={handleTier1Submit}
              disabled={submitting}
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-6 text-base shadow-lg shadow-teal-500/20"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Simpan Tier 1 & Lanjut ke Tier 2 <ArrowRight className="w-5 h-5 ml-2" /></>}
            </Button>
          </div>
        )}

        {/* TIER 2: TALENT ORIENTATION FORCED RANKING */}
        {currentTier === 'tier_2' && (
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="mb-6">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Tier 2: Orientasi Bakat</span>
              <h2 className="text-2xl font-bold text-slate-100 mt-1">Pemeringkatan Orientasi Bakat Utama</h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Pilih dan urutkan 3 dimensi di bawah dari yang paling menggambarkan diri Anda (Urutan #1 = Paling Kuat).
              </p>
            </div>

            {/* Selection Options */}
            <div className="space-y-3 mb-8">
              {[
                { key: 'karsa', label: 'Karsa (Pengerahan Tenaga & Eksekusi Nyata ⚡)', desc: 'Suka bekerja keras, menyelesaikan tugas, dan bertindak cepat.' },
                { key: 'cipta', label: 'Cipta (Gagasan, Analisis & Logika 💡)', desc: 'Suka berpikir mendalam, menganalisis data, dan menciptakan ide.' },
                { key: 'rasa', label: 'Rasa (Perasaan, Empati & Pelayanan ❤️)', desc: 'Sensitif terhadap perasaan orang lain, senang membantu, dan membina hubungan.' },
              ].map((item) => {
                const rankIndex = forcedRanking.indexOf(item.key)
                const isSelected = rankIndex !== -1
                return (
                  <div
                    key={item.key}
                    onClick={() => toggleRankingItem(item.key)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500/60 text-slate-100 shadow-md'
                        : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      isSelected ? 'bg-teal-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {isSelected ? `#${rankIndex + 1}` : '+'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-slate-200">{item.label}</h4>
                      <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <Button
              onClick={handleTier2Submit}
              disabled={submitting || forcedRanking.length !== 3}
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-6 text-base shadow-lg shadow-teal-500/20"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Simpan Tier 2 & Lihat Laporan Awal <ArrowRight className="w-5 h-5 ml-2" /></>}
            </Button>
          </div>
        )}

        {/* TIER 3 / COMPLETE: 18 SUB-GROUPS LIKERT SLIDERS */}
        {(currentTier === 'tier_3' || submission?.status === 'complete') && (
          <div className="w-full space-y-6">
            
            {/* Intermediate Preliminary Teaser Card (If present in halfway_report) */}
            {submission?.halfway_report?.preliminary_results && (
              <div className="bg-gradient-to-r from-teal-900/40 to-indigo-900/40 border border-teal-500/30 rounded-2xl p-6 backdrop-blur-md">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Hasil Awal Sementara ({submission.halfway_report.completion_percentage}%)</span>
                <h3 className="text-xl font-extrabold text-slate-100 mt-1">
                  {submission.halfway_report.preliminary_results.panggilan || 'Sang Pelaksana Tangguh'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs text-slate-300">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <BookOpen className="w-4 h-4 text-teal-400" />
                    <span>Gaya Belajar: <strong>{
                      typeof submission.halfway_report.preliminary_results.gaya_belajar === 'object'
                        ? (submission.halfway_report.preliminary_results.gaya_belajar?.gaya_belajar || submission.halfway_report.preliminary_results.gaya_belajar?.category_name || 'Kinestetik')
                        : (submission.halfway_report.preliminary_results.gaya_belajar || 'Kinestetik')
                    }</strong></span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <Heart className="w-4 h-4 text-indigo-400" />
                    <span>Bahasa Hati: <strong>{
                      typeof submission.halfway_report.preliminary_results.bahasa_hati === 'object'
                        ? (submission.halfway_report.preliminary_results.bahasa_hati?.bahasa_hati || submission.halfway_report.preliminary_results.bahasa_hati?.category_name || 'Acts of Service')
                        : (submission.halfway_report.preliminary_results.bahasa_hati || 'Acts of Service')
                    }</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* Questions List (18 Sub-Groups) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="mb-6">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Tier 3: 18 Sub-Grup Pendalaman</span>
                <h2 className="text-2xl font-bold text-slate-100 mt-1">Pendalaman Indikator Sub-Grup</h2>
                <p className="text-sm text-slate-400 mt-2">
                  Geser slider sesuai tingkat kesesuaian setiap pernyataan dengan kondisi diri Anda.
                </p>
              </div>

              {/* Dynamically Render Questions from Schema */}
              <div className="space-y-8">
                {(schema?.questions || [
                  { id: 'sub_1', text: 'Saya memiliki dorongan kuat untuk segera menyelesaikan pekerjaan tanpa menunda.' },
                  { id: 'sub_2', text: 'Saya senang menganalisis masalah kompleks dengan data dan logika sistematis.' },
                  { id: 'sub_3', text: 'Saya mudah merasakan emosi dan kebutuhan orang lain di sekitar saya.' },
                  { id: 'sub_4', text: 'Saya menikmati memimpin dan mengarahkan anggota tim mencapai target.' },
                  { id: 'sub_5', text: 'Saya terbuka untuk bekerja sama secara inklusif dengan berbagai karakter.' },
                  { id: 'sub_6', text: 'Saya merasa puas ketika bisa membantu dan melayani orang lain dengan tulus.' },
                ]).map((q: any, idx: number) => {
                  const currentVal = tier3Answers[q.id] ?? 50
                  return (
                    <div key={q.id || idx} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                          #{idx + 1}
                        </span>
                        <div className="text-right">
                          <span className="text-lg mr-1">{getSliderEmoji(currentVal)}</span>
                          <span className="text-xs font-semibold text-slate-300">{getSliderLabel(currentVal)} ({currentVal})</span>
                        </div>
                      </div>

                      <p className="text-sm font-medium text-slate-200 leading-relaxed">{q.text}</p>

                      <Slider
                        value={[currentVal]}
                        onValueChange={(val) => handleTier3SliderChange(q.id, val[0])}
                        min={0}
                        max={100}
                        step={5}
                        className="py-2"
                      />
                    </div>
                  )
                })}
              </div>

              {/* Final Completion Action Button */}
              <Button
                onClick={handleCompleteAssessment}
                className="w-full mt-8 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-6 text-base shadow-lg shadow-emerald-500/20"
              >
                Lihat Laporan Analisis Lengkap (100%)
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

          </div>
        )}

      </main>

      {/* PROFILE COMPLETION GATE DIALOG / MODAL (Required to unlock Tier 3) */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-50 max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center mb-2">
              <User className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-100">
              Lengkapi Profil untuk Membuka Tier 3
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1">
              Selamat! Anda telah menyelesaikan Tier 1 & Tier 2. Masukkan nama dan data profil Anda untuk membuka analisis pendalaman 18 sub-grup.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleProfileSubmit} className="space-y-4 py-2">
            
            {/* Observer Mode Switch Option */}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <Label className="text-xs font-semibold text-slate-300">Target Subjek Penilaian</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={!isObserver ? 'default' : 'outline'}
                  onClick={() => setIsObserver(false)}
                  className={`text-xs h-9 ${!isObserver ? 'bg-teal-500 text-slate-950 font-bold' : 'border-slate-700 text-slate-400'}`}
                >
                  Diri Sendiri
                </Button>
                <Button
                  type="button"
                  variant={isObserver ? 'default' : 'outline'}
                  onClick={() => setIsObserver(true)}
                  className={`text-xs h-9 ${isObserver ? 'bg-indigo-500 text-white font-bold' : 'border-slate-700 text-slate-400'}`}
                >
                  Orang Lain / Anak
                </Button>
              </div>
            </div>

            {/* Subject Name Input */}
            <div className="space-y-1.5">
              <Label htmlFor="subjectName" className="text-xs font-semibold text-slate-300">
                {isObserver ? 'Nama Subjek yang Diamati' : 'Nama Lengkap Anda'} *
              </Label>
              <Input
                id="subjectName"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Contoh: Ahmad Budi"
                required
                className="bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>

            {/* Birth Date / Age Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="birthDate" className="text-xs font-semibold text-slate-300">Tanggal Lahir</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-100 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ageVal" className="text-xs font-semibold text-slate-300">atau Usia (Tahun)</Label>
                <Input
                  id="ageVal"
                  type="number"
                  value={ageVal}
                  onChange={(e) => setAgeVal(e.target.value ? parseInt(e.target.value, 10) : '')}
                  placeholder="Contoh: 25"
                  className="bg-slate-800 border-slate-700 text-slate-100 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="submit"
                disabled={profileSaving || !subjectName.trim()}
                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-5"
              >
                {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buka & Lanjut ke Tier 3'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
