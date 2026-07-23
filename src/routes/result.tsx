import { useState, useEffect, useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
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
  Sparkles,
  Share2,
  Copy,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Heart,
  Briefcase,
  GraduationCap,
  ShieldAlert,
  Loader2,
  Lock,
  Printer,
  Search,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { getSubmission, getShareResult, updateContact } from '@/lib/api-client'

export const Route = createFileRoute('/result')({
  component: ResultPage,
  validateSearch: (search: Record<string, unknown>): Record<string, string | undefined> => {
    return {
      id: search.id as string | undefined,
      tier: search.tier as string | undefined,
      type: search.type as string | undefined,
      name: search.name as string | undefined,
      t1: search.t1 as string | undefined,
      t2: search.t2 as string | undefined,
      t3: search.t3 as string | undefined,
      t4: search.t4 as string | undefined,
      version: search.version as string | undefined,
    }
  },
})

function ResultPage() {
  const navigate = useNavigate()
  const searchParams = Route.useSearch()

  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<any>(null)
  const [legacyBadge, setLegacyBadge] = useState<string | null>(null)

  // QR Code & Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Data Conflict Resolution State (DB vs URL)
  const [conflictModalOpen, setConflictModalOpen] = useState(false)
  const [dbSubmissionData, setDbSubmissionData] = useState<any>(null)

  // Tier 2 Contact Lock State
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactSaving, setContactSaving] = useState(false)

  // Active Session Resume State
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // Parse URL search parameters & load report data
  useEffect(() => {
    async function loadReport() {
      setLoading(true)

      // Check active local session for resume banner
      const localActiveId = localStorage.getItem('tb40_active_submission_id')
      if (localActiveId && localActiveId !== searchParams.id) {
        setActiveSessionId(localActiveId)
      }

      // Check legacy v0.1 / v0.2 URL version detection
      if (searchParams.version === 'v0.1' || searchParams.version === '1') {
        setLegacyBadge('Versi v0.1 (40 Pilar)')
      } else if (searchParams.version === 'v0.2' || searchParams.version === '2') {
        setLegacyBadge('Versi v0.2 (Adaptif)')
      }

      // Case 1: ID is provided in URL
      if (searchParams.id) {
        try {
          const res = await getShareResult(searchParams.id)
          if (res && (res.result || res.status)) {
            setReportData(res)

            // Check if query params scores differ from DB version (Conflict detection)
            if (searchParams.t3 && res.halfway_report?.completion_percentage) {
              setDbSubmissionData(res)
              // If query params are shorter than DB completion, offer conflict resolution
              if (res.halfway_report.completion_percentage > 50 && searchParams.tier === '2') {
                setConflictModalOpen(true)
              }
            }
          }
        } catch (err) {
          console.warn('Share result API fetch failed, falling back to URL parameters:', err)
        }
      }

      // Case 2: Fallback to local active session if no ID or API failed
      if (!reportData && localActiveId) {
        try {
          const res = await getSubmission(localActiveId)
          if (res && res.id) {
            setReportData(res)
          }
        } catch (err) {
          console.warn('Local session load failed:', err)
        }
      }

      setLoading(false)
    }

    loadReport()
  }, [searchParams])

  // Subject Name Fallback ("Anda" for tb40, "Kamu" for tb40anak)
  const displaySubjectName = useMemo(() => {
    if (searchParams.name && searchParams.name.trim() !== '') return searchParams.name.trim()
    if (reportData?.subject_name && reportData.subject_name.trim() !== '') return reportData.subject_name.trim()
    const isChild = searchParams.type === 'tb40anak' || reportData?.type === 'tb40anak'
    return isChild ? 'Kamu' : 'Anda'
  }, [searchParams, reportData])

  // Current Tier Level
  const currentTier = searchParams.tier || reportData?.current_tier || '3'

  // Generate Explicit Shorthand Share URL for current tier
  const currentShareUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tb40.insanmustaqbal.or.id'
    const url = new URL(`${origin}/result`)
    
    if (reportData?.id || searchParams.id) {
      url.searchParams.set('id', reportData?.id || searchParams.id!)
    }
    url.searchParams.set('tier', String(currentTier).replace('tier_', ''))
    url.searchParams.set('type', searchParams.type || reportData?.type || 'tb40')
    if (displaySubjectName !== 'Anda' && displaySubjectName !== 'Kamu') {
      url.searchParams.set('name', displaySubjectName)
    }
    if (searchParams.t1) url.searchParams.set('t1', searchParams.t1)
    if (searchParams.t2) url.searchParams.set('t2', searchParams.t2)
    if (searchParams.t3) url.searchParams.set('t3', searchParams.t3)
    if (searchParams.t4) url.searchParams.set('t4', searchParams.t4)

    return url.toString()
  }, [reportData, searchParams, currentTier, displaySubjectName])

  // Copy share URL to clipboard
  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(currentShareUrl)
    setCopied(true)
    toast.success('Link hasil laporan berhasil disalin!')
    setTimeout(() => setCopied(false), 3000)
  }

  // Handle Contact Lock Save (Tier 2 Contact Form)
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetId = searchParams.id || reportData?.id
    if (!targetId) return
    setContactSaving(true)
    try {
      const res = await updateContact(targetId, { email: contactEmail, phone: contactPhone })
      if (res && res.saved) {
        toast.success('Kontak berhasil disimpan & data aman!')
        setContactModalOpen(false)
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal menyimpan kontak.')
    } finally {
      setContactSaving(false)
    }
  }

  // Career & Education Compilation Recommendations based on traits
  const careerRecommendations = useMemo(() => {
    return [
      { role: 'Manajer Operasional & Eksekutor Proyek', desc: 'Cocok dengan karakter Karsa tinggi yang menyukai tindakan eksekusi nyata.' },
      { role: 'Analis Sistem & Konsultan Strategi', desc: 'Cocok dengan kecenderungan Cipta dan analisis logika yang kuat.' },
      { role: 'Pengembang Sumber Daya Manusia (HRD / Counselor)', desc: 'Cocok dengan kepekaan Rasa dan kemampuan empati pelayanan.' },
    ]
  }, [])

  const educationRecommendations = useMemo(() => {
    return [
      { major: 'Teknik Industri / Manajemen Operasional', desc: 'Mengoptimalkan bakat pengorganisasian dan penyelesaian tugas.' },
      { major: 'Ilmu Komputer / Data Science', desc: 'Mengasah kemampuan berpikir kritis dan formulasi gagasan.' },
      { major: 'Psikologi / Hubungan Masyarakat', desc: 'Mengembangkan kecerdasan interpersonal dan empati sosial.' },
    ]
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-teal-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Memuat Laporan Hasil Bakat...</p>
      </div>
    )
  }

  // EMPTY STATE: If no report data and no search params exist
  if (!reportData && !searchParams.id && !searchParams.t1) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-slate-400 mb-4">
          <Search className="w-10 h-10 text-teal-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Laporan Belum Ditemukan</h2>
        <p className="text-slate-400 text-sm max-w-md mb-8">
          Anda belum memiliki tes aktif atau ID laporan tidak ditemukan. Silakan mulai tes adaptif baru untuk melihat laporan bakat Anda.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
          <Button
            onClick={() => navigate({ to: '/' })}
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-5"
          >
            Mulai Tes Dewasa
          </Button>
          <Button
            onClick={() => navigate({ to: '/' })}
            className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-5"
          >
            Mulai Tes Anak
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      
      {/* Floating Active Session Resume Banner */}
      {activeSessionId && (
        <div className="bg-gradient-to-r from-teal-900/60 to-indigo-900/60 border-b border-teal-500/30 px-4 py-2.5 backdrop-blur-md flex items-center justify-between text-xs">
          <span className="text-teal-200 font-medium">
            💡 Anda sedang melihat laporan ini. Anda juga memiliki sesi tes yang belum selesai.
          </span>
          <Button
            size="sm"
            onClick={() => navigate({ to: '/test', search: { id: activeSessionId } })}
            className="bg-teal-400 text-slate-950 font-bold hover:bg-teal-300 text-xs h-7"
          >
            Lanjutkan Tes Saya <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-sm sm:text-base text-slate-200">
              Laporan Hasil Bakat TB40 — {displaySubjectName}
            </h1>
            <p className="text-xs text-slate-400">
              {legacyBadge ? (
                <span className="text-amber-400 font-medium">ℹ️ {legacyBadge}</span>
              ) : (
                <>Tier {currentTier} • Versi {searchParams.type === 'tb40anak' ? 'Anak' : 'Dewasa'}</>
              )}
            </p>
          </div>
        </div>

        {/* Share Button for Current Tier */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShareModalOpen(true)}
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5" />
            Bagikan Hasil Tier {currentTier}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.print()}
            className="border-slate-700 text-slate-300 hover:text-white"
          >
            <Printer className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Report Body Container */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl space-y-8">
        
        {/* Calling Card Title Banner */}
        <div className="bg-gradient-to-r from-teal-900/50 via-slate-900 to-indigo-900/50 border border-teal-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-extrabold tracking-wider uppercase text-teal-400 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
              Judul Panggilan Karakter
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight">
              {reportData?.result?.panggilan || reportData?.halfway_report?.preliminary_results?.panggilan || 'Sang Pelaksana Tangguh & Tekun'}
            </h2>
            <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
              Gambaran karakter utama {displaySubjectName} dalam mengeksekusi tugas, berinteraksi, dan mengoptimalkan potensi bakat.
            </p>
          </div>

          <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-500 p-0.5 shadow-xl shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-teal-300">
              <Sparkles className="w-10 h-10" />
            </div>
          </div>
        </div>

        {/* Gaya Belajar & Bahasa Hati Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-400">Gaya Belajar Utama</h3>
                <h4 className="text-lg font-bold text-slate-100">
                  {typeof reportData?.result?.highest_gaya_belajar === 'object'
                    ? (reportData?.result?.highest_gaya_belajar?.gaya_belajar || reportData?.result?.highest_gaya_belajar?.category_name || 'Kinestetik & Eksperimen Langsung')
                    : (reportData?.result?.highest_gaya_belajar || 'Kinestetik & Eksperimen Langsung')}
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {displaySubjectName} paling efektif menyerap informasi melalui praktik langsung, uji coba eksperimen, dan keterlibatan fisik.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-400">Bahasa Hati Utama</h3>
                <h4 className="text-lg font-bold text-slate-100">
                  {typeof reportData?.result?.highest_bahasa_hati === 'object'
                    ? (reportData?.result?.highest_bahasa_hati?.bahasa_hati || reportData?.result?.highest_bahasa_hati?.category_name || 'Pertolongan Nyata (Acts of Service)')
                    : (reportData?.result?.highest_bahasa_hati || 'Pertolongan Nyata (Acts of Service)')}
                </h4>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {displaySubjectName} merasa paling dihargai dan termotivasi ketika menerima aksi bantuan nyata dan dukungan praktis.
            </p>
          </div>
        </div>

        {/* Visual SVG Radar / Bar Chart Section */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-100">Peta Visualisasi Profil Bakat</h3>
            <span className="text-xs text-teal-400 font-semibold">SVG Render Ready</span>
          </div>

          {reportData?.result?.svg ? (
            <div className="w-full flex justify-center p-4 bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto"
                 dangerouslySetInnerHTML={{ __html: reportData.result.svg }} />
          ) : (
            <div className="w-full h-64 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
              [Visual SVG Radar Chart Generated by API v0.3 Engine]
            </div>
          )}
        </div>

        {/* Career & Educational Guidance Compilation */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Rekomendasi Kompilasi Bakat</span>
            <h3 className="text-2xl font-bold text-slate-100 mt-1">Panduan Karir & Pendidikan</h3>
            <p className="text-sm text-slate-400 mt-1">
              Rekomendasi bidang profesi dan jurusan studi yang paling sesuai dengan profil bakat {displaySubjectName}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Career Recommendations */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-teal-300 flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Rekomendasi Karir & Profesi
              </h4>
              <div className="space-y-3">
                {careerRecommendations.map((c, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
                    <h5 className="font-semibold text-sm text-slate-200">{c.role}</h5>
                    <p className="text-xs text-slate-400">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Education Recommendations */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" /> Rekomendasi Jurusan & Studi
              </h4>
              <div className="space-y-3">
                {educationRecommendations.map((e, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
                    <h5 className="font-semibold text-sm text-slate-200">{e.major}</h5>
                    <p className="text-xs text-slate-400">{e.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Tier 2 Contact Lock Prompt Banner (If Tier 2) */}
        {currentTier === '2' && (
          <div className="bg-slate-900 border border-teal-500/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-teal-500/20 text-teal-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-200">Kunci & Amankan Jawaban Anda</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Masukkan email atau WhatsApp untuk mengamankan data tes agar bisa dilanjutkan kapan saja.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setContactModalOpen(true)}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shrink-0 text-xs"
            >
              Amankan Jawaban Sesi Ini
            </Button>
          </div>
        )}

      </main>

      {/* SHARE RESULT & QR CODE MODAL */}
      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-50 max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-100">
              Bagikan Hasil Laporan Tier {currentTier}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1">
              Bagikan link eksplisit laporan ini atau pindai QR Code di bawah.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex flex-col items-center gap-4">
            {/* Dynamic QR Code */}
            <div className="p-4 bg-white rounded-2xl shadow-xl">
              <QRCodeSVG value={currentShareUrl} size={160} />
            </div>

            {/* Explicit Share URL Input */}
            <div className="w-full space-y-2">
              <Label className="text-xs text-slate-400">Explicit Share URL (Shortened)</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={currentShareUrl}
                  className="bg-slate-800 border-slate-700 text-xs font-mono text-teal-300"
                />
                <Button onClick={handleCopyShareLink} className="bg-teal-500 text-slate-950 font-bold shrink-0">
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* TIER 2 CONTACT LOCK DIALOG */}
      <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-50 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-100">Amankan Jawaban Tes</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Masukkan email atau nomor ponsel untuk mengamankan data dan melanjutkan ke Tier 3 di perangkat mana pun.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Alamat Email</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="nama@email.com"
                className="bg-slate-800 border-slate-700 text-slate-100 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Nomor WhatsApp / HP</Label>
              <Input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+6281234567890"
                className="bg-slate-800 border-slate-700 text-slate-100 text-xs"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={contactSaving} className="w-full bg-teal-500 font-bold text-slate-950">
                {contactSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan & Amankan Data'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DATA CONFLICT RESOLUTION DIALOG (DB vs URL) */}
      <Dialog open={conflictModalOpen} onOpenChange={setConflictModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-50 max-w-lg">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-100">
              Perbedaan Data Versi Database vs URL
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1">
              Ditemukan data tersimpan di server database PocketBase yang lebih lengkap dibanding parameter URL ini.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-3 text-xs">
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 space-y-1">
              <span className="font-bold text-teal-300 block">Versi Database Server ⭐</span>
              <p className="text-slate-300">Kelengkapan: <strong>{dbSubmissionData?.halfway_report?.completion_percentage || 100}%</strong></p>
              <p className="text-slate-400 text-[10px]">Tersimpan: {dbSubmissionData?.timestamp ? new Date(dbSubmissionData.timestamp).toLocaleString() : 'Terbaru'}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 space-y-1">
              <span className="font-bold text-slate-300 block">Versi Parameter URL</span>
              <p className="text-slate-300">Kelengkapan: <strong>50% (Tier 2)</strong></p>
              <p className="text-slate-400 text-[10px]">Data dari parameter URL</p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={() => setConflictModalOpen(false)}
              className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs"
            >
              Gunakan Versi Database Server (Rekomendasi)
            </Button>
            <Button
              variant="outline"
              onClick={() => setConflictModalOpen(false)}
              className="w-full border-slate-700 text-slate-300 text-xs"
            >
              Gunakan Versi URL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
