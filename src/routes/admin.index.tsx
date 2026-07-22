import { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OrgCombobox } from '@/components/org-combobox'
import { adminLogin, adminLogout, getAdminSessions } from '@/lib/analytics'
import { setAdminToken, getAdminToken, getAdminOrgName, clearAdminToken } from '@/lib/auth'
import { ShieldAlert, Users, Copy, CheckCircle2, LogOut } from 'lucide-react'

export const Route = createFileRoute('/admin/')({
  component: AdminPage,
})

function AdminPage() {
  const [orgName, setOrgName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [displayOrgName, setDisplayOrgName] = useState('')

  // On mount, check for a stored token and restore the session if valid
  useEffect(() => {
    const storedToken = getAdminToken()
    const storedOrgName = getAdminOrgName()
    if (storedToken) {
      setDisplayOrgName(storedOrgName || '')
      setIsLoggedIn(true)
      fetchSessions(storedToken)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await adminLogin({ data: { orgName, password } })
      console.log('DEBUG adminLogin response:', res)
      if (res.success && res.token) {
        setAdminToken(res.token, orgName)
        setDisplayOrgName(orgName)
        setIsLoggedIn(true)
        fetchSessions(res.token)
      } else {
        setError(res.error || 'Login failed')
      }
    } catch (err) {
      console.error('DEBUG adminLogin error:', err)
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const fetchSessions = async (token: string) => {
    try {
      const res = await getAdminSessions({ data: token })
      if (res.success && res.sessions) {
        setSessions(res.sessions)
      } else if (!res.success) {
        // Token is invalid or expired — force re-login
        handleLogout()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleLogout = async () => {
    const token = getAdminToken()
    if (token) {
      try {
        await adminLogout({ data: token })
      } catch (err) {
        console.error('Logout error (non-critical):', err)
      }
      clearAdminToken()
    }
    setIsLoggedIn(false)
    setSessions([])
    setOrgName('')
    setPassword('')
    setError('')
  }

  const copyResumeLink = (sessionId: string) => {
    const link = `${window.location.origin}/test?resume=${sessionId}`
    navigator.clipboard.writeText(link)
    setCopiedId(sessionId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <ShieldAlert className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Silakan masukkan kredensial organisasi Anda.</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="orgName">Nama Organisasi / Event</Label>
              <OrgCombobox
                id="orgName"
                value={orgName}
                onChange={setOrgName}
                allowFreeText={false}
                placeholder="Pilih organisasi..."
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading ? 'Memeriksa...' : 'Masuk'}
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Belum terdaftar?{' '}
              <a href="/admin/register" className="font-medium text-primary hover:underline">
                Daftarkan Organisasi / Event Baru
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Data Hasil Tes</h1>
            <p className="text-muted-foreground">Organisasi: <span className="font-semibold text-foreground">{displayOrgName}</span></p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              className="gap-2"
              onClick={() => {
                window.location.href = `/admin/cohort`
              }}
            >
              <Users className="h-4 w-4" /> Analisa Kelompok
            </Button>
            <Button variant="outline" onClick={() => fetchSessions(getAdminToken()!)}>Refresh Data</Button>
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Keluar
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm text-muted-foreground">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase text-foreground">
              <tr>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Panggilan</th>
                <th className="px-6 py-4">Usia</th>
                <th className="px-6 py-4">Mode Tes</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <Users className="mx-auto mb-3 h-8 w-8 opacity-20" />
                    Belum ada data tes untuk organisasi ini.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-6 py-4 font-medium text-foreground">{session.name || '-'}</td>
                    <td className="px-6 py-4">{session.nick_name || '-'}</td>
                    <td className="px-6 py-4">{session.age || '-'}</td>
                    <td className="px-6 py-4 uppercase text-xs">{session.test_mode || '-'}</td>
                    <td className="px-6 py-4">
                      {session.status === 'COMPLETED' ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Selesai</span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Mengerjakan</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">{new Date(session.created_at).toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4 text-right">
                      {session.status === 'COMPLETED' ? (
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open(`/result?code=${session.session_id}`, '_blank')}
                        >
                          Lihat Hasil
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-2"
                          onClick={() => copyResumeLink(session.session_id)}
                        >
                          {copiedId === session.session_id ? (
                            <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Disalin</>
                          ) : (
                            <><Copy className="h-3.5 w-3.5" /> Link Resume</>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
