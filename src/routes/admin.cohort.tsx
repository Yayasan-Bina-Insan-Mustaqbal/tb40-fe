import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { getAdminSessions } from '@/lib/analytics'
import { getAdminToken, getAdminOrgName } from '@/lib/auth'
import { ArrowLeft, Users, BarChart3, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/admin/cohort')({
  component: CohortAnalysisPage,
})

function CohortAnalysisPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aggregated, setAggregated] = useState<any>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const orgName = getAdminOrgName() || ''

  useEffect(() => {
    const token = getAdminToken()
    if (!token) {
      setUnauthorized(true)
      setLoading(false)
      return
    }
    fetchSessions(token)
  }, [])

  const fetchSessions = async (token: string) => {
    setLoading(true)
    try {
      const res = await getAdminSessions({ data: token })
      if (res.success && res.sessions) {
        // Filter to only COMPLETED sessions that have raw_scores
        const completed = res.sessions.filter((s: any) => s.status === 'COMPLETED' && s.raw_scores)
        setSessions(completed)
        aggregateData(completed)
      } else {
        // Token invalid — treat as unauthorized
        setUnauthorized(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const aggregateData = (completedSessions: any[]) => {
    if (completedSessions.length === 0) return

    let totalMuthmainnah = 0
    let totalLawwamah = 0
    let totalAmmarah = 0
    let totalSupiyah = 0

    let count3 = 0

    completedSessions.forEach((s) => {
      try {
        const raw = JSON.parse(s.raw_scores)
        const tb40Data = raw.parts?.tb40 || raw.parts?.tb40anak || raw
        const resultData = tb40Data.tb40Result || tb40Data.result

        if (resultData && resultData["3"]) {
          count3++
          resultData["3"].forEach((p: any) => {
            const name = (p.data?.nama_lengkap || p.name).toLowerCase()
            const score = Number(p.score)
            if (name.includes('muthmainnah')) totalMuthmainnah += score
            if (name.includes('lawwamah')) totalLawwamah += score
            if (name.includes('ammarah')) totalAmmarah += score
            if (name.includes('supiyah')) totalSupiyah += score
          })
        }
      } catch (e) {
        console.error("Error parsing session data", e)
      }
    })

    if (count3 > 0) {
      setAggregated({
        muthmainnah: Math.round(totalMuthmainnah / count3),
        lawwamah: Math.round(totalLawwamah / count3),
        ammarah: Math.round(totalAmmarah / count3),
        supiyah: Math.round(totalSupiyah / count3),
      })
    }
  }

  if (unauthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Sesi tidak valid. Silakan login ulang.</p>
        <Button onClick={() => (window.location.href = '/admin')}>Kembali ke Login</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Button variant="ghost" className="mb-4 gap-2" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Analisa Kelompok</h1>
              <p className="text-muted-foreground">
                {orgName && <span className="font-semibold text-foreground">{orgName} — </span>}
                Agregasi hasil tes dari {sessions.length} anggota
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-card">
            <p className="text-muted-foreground">Memuat data kelompok...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold">Belum Ada Data Selesai</h3>
            <p className="text-sm text-muted-foreground">Belum ada anggota yang menyelesaikan tes presisi untuk dianalisis.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">Rata-rata Dominasi Karakter</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Nilai rata-rata dari 4 karakter dasar untuk seluruh anggota dalam kelompok ini.
            </p>

            {aggregated ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-emerald-500" />
                    <span className="font-semibold text-foreground">Muthmainnah (Tenang)</span>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Skor: {aggregated.muthmainnah}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-amber-500" />
                    <span className="font-semibold text-foreground">Lawwamah (Penyesalan)</span>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Skor: {aggregated.lawwamah}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-rose-500" />
                    <span className="font-semibold text-foreground">Ammarah (Emosi)</span>
                  </div>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">Skor: {aggregated.ammarah}</span>
                </div>
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-slate-500" />
                    <span className="font-semibold text-foreground">Supiyah (Hasrat)</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Skor: {aggregated.supiyah}</span>
                </div>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground">Tidak cukup data untuk agregasi</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
