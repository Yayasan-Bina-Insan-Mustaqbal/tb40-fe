import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { createSubmission, getSubmission } from '@/lib/api-client'
import {
  Sparkles,
  User,
  Users,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Zap,
  Activity,
  Heart,
  Loader2,
} from 'lucide-react'

export const Route = createFileRoute('/')({ component: LandingPage })

function LandingPage() {
  const navigate = useNavigate()
  const [loadingType, setLoadingType] = useState<'tb40' | 'tb40anak' | null>(null)
  const [activeSession, setActiveSession] = useState<{ id: string; type: string; current_tier: string } | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  // Check for active unfinished session in localStorage
  useEffect(() => {
    async function checkActiveSession() {
      try {
        const savedId = localStorage.getItem('tb40_active_submission_id')
        if (savedId) {
          const res = await getSubmission(savedId)
          if (res && res.id && res.status !== 'complete') {
            setActiveSession({
              id: res.id,
              type: res.type || 'tb40',
              current_tier: res.current_tier || 'tier_1',
            })
          } else {
            localStorage.removeItem('tb40_active_submission_id')
          }
        }
      } catch (err) {
        console.warn('Session check failed:', err)
      } finally {
        setCheckingSession(false)
      }
    }
    checkActiveSession()
  }, [])

  const handleStartTest = async (type: 'tb40' | 'tb40anak') => {
    setLoadingType(type)
    try {
      const res = await createSubmission({ is_anonymous: true, type })
      if (res && res.id) {
        localStorage.setItem('tb40_active_submission_id', res.id)
        window.location.href = `/test?id=${res.id}`
      } else {
        alert('Gagal memulai tes. Silakan pastikan server API berjalan.')
      }
    } catch (err) {
      console.error('handleStartTest error:', err)
      alert('Terjadi kesalahan koneksi saat memulai tes.')
    } finally {
      setLoadingType(null)
    }
  }

  // Resume active session
  const handleResumeSession = () => {
    if (activeSession) {
      navigate({ to: '/test', search: { id: activeSession.id } })
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Background Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-teal-300 via-teal-100 to-white bg-clip-text text-transparent">
              Tafsir Bakat 40
            </h1>
            <p className="text-xs text-slate-400">v0.3 Adaptive Assessment Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            API v0.3 Ready
          </span>
        </div>
      </header>

      {/* Main Hero & CTA Section */}
      <main className="relative z-10 flex-1 container mx-auto px-4 py-12 max-w-4xl flex flex-col items-center justify-center text-center">
        
        {/* Active Session Resume Banner */}
        {!checkingSession && activeSession && (
          <div className="w-full mb-8 p-4 rounded-2xl bg-gradient-to-r from-teal-900/40 via-indigo-900/40 to-slate-900/40 border border-teal-500/30 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-teal-950/50 text-left">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-teal-500/20 text-teal-300">
                <RotateCcw className="w-6 h-6 animate-spin-slow" />
              </div>
              <div>
                <h3 className="font-semibold text-teal-200">Anda Memiliki Tes yang Belum Selesai</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  ID: <span className="font-mono text-teal-400">{activeSession.id}</span> ({activeSession.type === 'tb40anak' ? 'Versi Anak' : 'Versi Dewasa'})
                </p>
              </div>
            </div>
            <Button
              onClick={handleResumeSession}
              className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-6 shadow-lg shadow-teal-500/20"
            >
              Lanjutkan Tes Saya
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Hero Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-medium mb-6">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          Penilaian Bakat Bercabang Adaptif Tanpa Login Awal
        </div>

        {/* Main Title */}
        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
          Temukan Potensi Bakat Dominan <br />
          <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-indigo-400 bg-clip-text text-transparent">
            Secara Cepat & Akurat
          </span>
        </h2>
        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mb-12">
          Pilih kategori usia di bawah ini untuk memulai tes adaptif bercabang secara mandiri tanpa pendaftaran awal.
        </p>

        {/* 2 BIG SELECTION CTA BUTTONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          
          {/* Adult Version Button Card */}
          <button
            onClick={() => handleStartTest('tb40')}
            disabled={loadingType !== null}
            className="group relative p-6 rounded-2xl bg-slate-900/90 border-2 border-slate-800 hover:border-teal-500/60 transition-all duration-300 hover:shadow-2xl hover:shadow-teal-500/10 text-left flex flex-col justify-between overflow-hidden cursor-pointer"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <User className="w-32 h-32 text-teal-400" />
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4 group-hover:scale-110 transition-transform">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 group-hover:text-teal-300 transition-colors">
                Tes TB40 Dewasa
              </h3>
              <p className="text-xs text-teal-400 font-semibold mt-1">Usia 15 Tahun ke Atas</p>
              <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                Evaluasi adaptif bercabang untuk profesional, mahasiswa, dan dewasa muda.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-teal-400 group-hover:text-teal-300">
              {loadingType === 'tb40' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Memulai Sesi...
                </span>
              ) : (
                <>
                  <span>Mulai Tes Dewasa</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </div>
          </button>

          {/* Child Version Button Card */}
          <button
            onClick={() => handleStartTest('tb40anak')}
            disabled={loadingType !== null}
            className="group relative p-6 rounded-2xl bg-slate-900/90 border-2 border-slate-800 hover:border-indigo-500/60 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 text-left flex flex-col justify-between overflow-hidden cursor-pointer"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-32 h-32 text-indigo-400" />
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                Tes TB40 Anak
              </h3>
              <p className="text-xs text-indigo-400 font-semibold mt-1">Usia di Bawah 15 Tahun</p>
              <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                Bahasa dan ilustrasi disesuaikan untuk anak-anak, pelajar, serta observasi anak oleh orang tua.
              </p>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
              {loadingType === 'tb40anak' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Memulai Sesi...
                </span>
              ) : (
                <>
                  <span>Mulai Tes Anak</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </div>
          </button>

        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mt-16 text-left">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
            <ShieldCheck className="w-5 h-5 text-teal-400 mb-2" />
            <h4 className="font-semibold text-sm text-slate-200">Fast-Track Anonymous</h4>
            <p className="text-xs text-slate-400 mt-1">Mulai tanpa isi form panjang. Lengkapi profil saat memasuki Tier 3.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
            <Activity className="w-5 h-5 text-emerald-400 mb-2" />
            <h4 className="font-semibold text-sm text-slate-200">Tersimpan Otomatis</h4>
            <p className="text-xs text-slate-400 mt-1">Progres interaksi tersimpan di server secara real-time dengan konfirmasi timestamp.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm">
            <Heart className="w-5 h-5 text-indigo-400 mb-2" />
            <h4 className="font-semibold text-sm text-slate-200">Observer Mode</h4>
            <p className="text-xs text-slate-400 mt-1">Isi tes untuk diri sendiri atau observasi orang lain/anak dengan kalimat dinamis.</p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        © 2026 TB40 Insan Mustaqbal. Powered by API TB40 v0.3 Adaptive Engine.
      </footer>
    </div>
  )
}
