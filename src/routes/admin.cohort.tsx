import { useState, useEffect, useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Search,
  Download,
  Printer,
  Briefcase,
  GraduationCap,
  ArrowLeft,
  CheckSquare,
  Square,
  FileText,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { getEventSubmissions } from '@/lib/api-client'

export const Route = createFileRoute('/admin/cohort')({
  component: CohortAnalysisPage,
})

function CohortAnalysisPage() {
  const navigate = useNavigate()

  // Event ID Selection State
  const [eventId, setEventId] = useState('event_workshop_2026')
  const [loading, setLoading] = useState(false)
  const [submissions, setSubmissions] = useState<any[]>([])

  // Selection & Active Preview State
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [activeParticipant, setActiveParticipant] = useState<any>(null)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState('all')
  const [versionFilter, setVersionFilter] = useState('all')
  const [orientationFilter, setOrientationFilter] = useState('all')
  const [modeFilter, setModeFilter] = useState('all')

  // Fetch submissions for active Event ID
  const fetchCohortData = async (targetEventId: string) => {
    setLoading(true)
    try {
      const res = await getEventSubmissions(targetEventId)
      if (res && Array.isArray(res)) {
        setSubmissions(res)
        if (res.length > 0) setActiveParticipant(res[0])
      } else if (res && res.items && Array.isArray(res.items)) {
        setSubmissions(res.items)
        if (res.items.length > 0) setActiveParticipant(res.items[0])
      } else {
        // Fallback demo dataset if backend event is empty
        const mockData = [
          {
            id: 'sub_ahmad_budi_1784758720',
            subject_name: 'Ahmad Budi',
            type: 'tb40',
            status: 'complete',
            current_tier: 'tier_3',
            is_observer: false,
            created: '2026-07-23T08:15:00Z',
            result: {
              panggilan: 'Sang Pelaksana Tangguh & Tekun',
              highest_gaya_belajar: 'Kinestetik & Eksperimen Langsung',
              highest_bahasa_hati: 'Pertolongan Nyata (Acts of Service)',
              dominant_orientation: 'karsa',
            },
          },
          {
            id: 'sub_siti_aminah_1784759900',
            subject_name: 'Siti Aminah',
            type: 'tb40anak',
            status: 'complete',
            current_tier: 'tier_4',
            is_observer: true,
            created: '2026-07-23T08:30:00Z',
            result: {
              panggilan: 'Sang Inovator & Formulator Gagasan',
              highest_gaya_belajar: 'Visual & Ilustrasi Sistematis',
              highest_bahasa_hati: 'Apresiasi & Kata-kata Positif',
              dominant_orientation: 'cipta',
            },
          },
          {
            id: 'sub_budi_santoso_1784761200',
            subject_name: 'Budi Santoso',
            type: 'tb40',
            status: 'incomplete',
            current_tier: 'tier_2',
            is_observer: false,
            created: '2026-07-23T09:00:00Z',
            result: {
              panggilan: 'Sang Pengayom & Pembina Hubungan',
              highest_gaya_belajar: 'Auditori & Diskusi Interaktif',
              highest_bahasa_hati: 'Waktu Berkualitas (Quality Time)',
              dominant_orientation: 'rasa',
            },
          },
        ]
        setSubmissions(mockData)
        setActiveParticipant(mockData[0])
      }
    } catch (err) {
      console.error('Error fetching cohort data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCohortData(eventId)
  }, [eventId])

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      // Search Filter
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !q ||
        (item.subject_name || '').toLowerCase().includes(q) ||
        (item.id || '').toLowerCase().includes(q) ||
        (item.email || '').toLowerCase().includes(q) ||
        (item.phone || '').toLowerCase().includes(q)

      // Tier Filter
      const matchesTier =
        tierFilter === 'all' ||
        (tierFilter === 'complete' && item.status === 'complete') ||
        (tierFilter === 'tier_2' && (item.current_tier === 'tier_2' || item.next_tier === 'profile_required')) ||
        (tierFilter === 'tier_3' && item.current_tier === 'tier_3') ||
        (tierFilter === 'tier_4' && (item.current_tier === 'tier_4' || item.is_precision))

      // Version Filter
      const matchesVersion = versionFilter === 'all' || item.type === versionFilter

      // Orientation Filter
      const matchesOrientation =
        orientationFilter === 'all' || item.result?.dominant_orientation === orientationFilter

      // Mode Filter
      const matchesMode =
        modeFilter === 'all' ||
        (modeFilter === 'self' && !item.is_observer) ||
        (modeFilter === 'observer' && item.is_observer)

      return matchesSearch && matchesTier && matchesVersion && matchesOrientation && matchesMode
    })
  }, [submissions, searchQuery, tierFilter, versionFilter, orientationFilter, modeFilter])

  // Rich Cohort Metrics Aggregation
  const cohortMetrics = useMemo(() => {
    const total = filteredSubmissions.length
    if (total === 0) {
      return { total: 0, completionRate: 0, karsaPct: 33, ciptaPct: 33, rasaPct: 34, topCallingCard: 'N/A' }
    }

    const completedCount = filteredSubmissions.filter((s) => s.status === 'complete').length
    const completionRate = Math.round((completedCount / total) * 100)

    let karsaCount = 0
    let ciptaCount = 0
    let rasaCount = 0
    const callingCardMap: Record<string, number> = {}

    filteredSubmissions.forEach((s) => {
      const orient = s.result?.dominant_orientation || 'karsa'
      if (orient === 'karsa') karsaCount++
      else if (orient === 'cipta') ciptaCount++
      else if (orient === 'rasa') rasaCount++

      const cc = s.result?.panggilan || 'Sang Pelaksana Tangguh'
      callingCardMap[cc] = (callingCardMap[cc] || 0) + 1
    })

    const karsaPct = Math.round((karsaCount / total) * 100)
    const ciptaPct = Math.round((ciptaCount / total) * 100)
    const rasaPct = Math.round((rasaCount / total) * 100)

    let topCallingCard = 'N/A'
    let maxCC = 0
    Object.entries(callingCardMap).forEach(([cc, count]) => {
      if (count > maxCC) {
        maxCC = count
        topCallingCard = cc
      }
    })

    return { total, completionRate, karsaPct, ciptaPct, rasaPct, topCallingCard }
  }, [filteredSubmissions])

  // Toggle Single Row Selection
  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // Select All Filtered Rows
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSubmissions.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredSubmissions.map((s) => s.id))
    }
  }

  // Export Batch CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Nama Subjek', 'Tipe', 'Status', 'Current Tier', 'Panggilan Karakter', 'Dominan']
    const rows = filteredSubmissions.map((s) => [
      s.id,
      `"${s.subject_name || 'Anon'}"`,
      s.type || 'tb40',
      s.status || 'incomplete',
      s.current_tier || 'tier_1',
      `"${s.result?.panggilan || '-'}"`,
      s.result?.dominant_orientation || '-',
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cohort_export_${eventId}_${Date.now()}.csv`
    link.click()
  }

  // Export Multiple PDFs Batch Print View
  const handleBatchPrintPDF = () => {
    if (selectedIds.length === 0) {
      alert('Pilih setidaknya satu peserta untuk dicetak.')
      return
    }
    window.print()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      
      {/* Top Header & Event Switcher Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-base text-slate-200">Dashboard Analisis Kohort Event</h1>
            <p className="text-xs text-slate-400">Panel Admin Eksplorasi Data & Pratinjau Laporan</p>
          </div>
        </div>

        {/* Event ID Combobox Switcher */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label className="text-xs text-slate-400 shrink-0">Event ID:</Label>
          <div className="flex gap-2 w-full sm:w-64">
            <Input
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder="Masukkan Event ID..."
              className="bg-slate-800 border-slate-700 text-xs text-teal-300 font-mono"
            />
            <Button
              size="sm"
              onClick={() => fetchCohortData(eventId)}
              disabled={loading}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shrink-0"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Load'}
            </Button>
          </div>
        </div>
      </header>

      {/* 2-PANE ADMIN LAYOUT */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* LEFT PANE: COHORT OVERVIEW & PARTICIPANT LIST (7 Cols) */}
        <div className="lg:col-span-7 border-r border-slate-800/80 p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-73px)]">
          
          {/* Cohort Summary Metrics Header Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Ringkasan Kohort Event</span>
              <span className="text-xs text-slate-400">Total: <strong>{cohortMetrics.total} Peserta</strong></span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Tingkat Penyelesaian</span>
                <span className="text-xl font-black text-emerald-400">{cohortMetrics.completionRate}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Dominan Karsa ⚡</span>
                <span className="text-xl font-black text-teal-400">{cohortMetrics.karsaPct}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Dominan Cipta 💡</span>
                <span className="text-xl font-black text-indigo-400">{cohortMetrics.ciptaPct}%</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Judul Panggilan Paling Umum:</span>
              <strong className="text-teal-300 font-semibold">{cohortMetrics.topCallingCard}</strong>
            </div>
          </div>

          {/* Advanced Multi-Filter & Search Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, email, HP, atau ID..."
                  className="bg-slate-800 border-slate-700 pl-9 text-xs text-slate-100"
                />
              </div>
              <Button onClick={handleExportCSV} variant="outline" className="border-slate-700 text-xs text-teal-400 shrink-0">
                <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
              </Button>
            </div>

            {/* Filter Pills Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 text-xs"
              >
                <option value="all">Semua Tier</option>
                <option value="complete">Complete (100%)</option>
                <option value="tier_2">Tier 2 Only</option>
                <option value="tier_3">Tier 3 Only</option>
                <option value="tier_4">Tier 4 Precision</option>
              </select>

              <select
                value={versionFilter}
                onChange={(e) => setVersionFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 text-xs"
              >
                <option value="all">Semua Versi</option>
                <option value="tb40">Dewasa (tb40)</option>
                <option value="tb40anak">Anak (tb40anak)</option>
              </select>

              <select
                value={orientationFilter}
                onChange={(e) => setOrientationFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 text-xs"
              >
                <option value="all">Semua Orientasi</option>
                <option value="karsa">Karsa ⚡</option>
                <option value="cipta">Cipta 💡</option>
                <option value="rasa">Rasa ❤️</option>
              </select>

              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300 text-xs"
              >
                <option value="all">Semua Mode</option>
                <option value="self">Diri Sendiri</option>
                <option value="observer">Observer Mode</option>
              </select>
            </div>

            {/* Multi-Select PDF Export Action Bar */}
            {selectedIds.length > 0 && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between text-xs">
                <span className="text-indigo-300 font-semibold">
                  {selectedIds.length} peserta dipilih
                </span>
                <Button
                  onClick={handleBatchPrintPDF}
                  className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs h-8"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" /> Export PDF Terpilih ({selectedIds.length})
                </Button>
              </div>
            )}
          </div>

          {/* Participant Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="p-1 h-auto text-slate-400 hover:text-white"
                >
                  {selectedIds.length === filteredSubmissions.length && filteredSubmissions.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-teal-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </Button>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Daftar Peserta ({filteredSubmissions.length})</span>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {filteredSubmissions.map((s) => {
                const isSelected = selectedIds.includes(s.id)
                const isActive = activeParticipant?.id === s.id
                return (
                  <div
                    key={s.id}
                    onClick={() => setActiveParticipant(s)}
                    className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                      isActive ? 'bg-teal-500/10 border-l-4 border-l-teal-500' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelectRow(s.id)
                        }}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-teal-400" /> : <Square className="w-4 h-4" />}
                      </button>

                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-slate-100 truncate">{s.subject_name || 'Anonim'}</h4>
                        <p className="text-xs text-slate-400 truncate">
                          <span className="font-mono text-teal-400">{s.id}</span> • {s.type === 'tb40anak' ? 'Versi Anak' : 'Versi Dewasa'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'complete' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {s.status === 'complete' ? 'Complete 100%' : (s.current_tier || 'Tier 2')}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {s.created ? new Date(s.created).toLocaleDateString() : 'Hari ini'}
                        </span>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-600'}`} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* RIGHT PANE: LIVE PARTICIPANT REPORT PREVIEW (5 Cols) */}
        <div className="lg:col-span-5 p-6 bg-slate-900/40 overflow-y-auto max-h-[calc(100vh-73px)] space-y-6">
          {activeParticipant ? (
            <div className="space-y-6">
              
              {/* Participant Header Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Pratinjau Laporan Peserta</span>
                  <Button
                    size="sm"
                    onClick={() => window.print()}
                    className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs h-7"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1" /> Cetak PDF
                  </Button>
                </div>

                <h2 className="text-2xl font-bold text-slate-100">{activeParticipant.subject_name || 'Anonim'}</h2>
                <p className="text-xs text-slate-400">
                  ID: <span className="font-mono text-teal-400">{activeParticipant.id}</span> ({activeParticipant.type === 'tb40anak' ? 'Anak' : 'Dewasa'})
                </p>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Panggilan Karakter:</span>
                  <strong className="text-sm font-bold text-slate-200">
                    {activeParticipant.result?.panggilan || 'Sang Pelaksana Tangguh & Tekun'}
                  </strong>
                </div>
              </div>

              {/* Traits Breakdown */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Gaya Belajar:</span>
                  <strong className="text-slate-200 block">{activeParticipant.result?.highest_gaya_belajar || 'Kinestetik'}</strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Bahasa Hati:</span>
                  <strong className="text-slate-200 block">{activeParticipant.result?.highest_bahasa_hati || 'Acts of Service'}</strong>
                </div>
              </div>

              {/* Career & Education Preview */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
                <h4 className="font-bold text-teal-300 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4" /> Rekomendasi Karir
                </h4>
                <p className="text-slate-300">
                  • Manajer Operasional & Eksekutor Proyek <br />
                  • Analis Sistem & Konsultan Strategi
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
                <h4 className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" /> Rekomendasi Jurusan
                </h4>
                <p className="text-slate-300">
                  • Teknik Industri / Manajemen Operasional <br />
                  • Ilmu Komputer / Data Science
                </p>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-8">
              <FileText className="w-12 h-12 mb-3 text-slate-700" />
              <p className="text-sm">Pilih peserta di panel kiri untuk melihat pratinjau laporan.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
