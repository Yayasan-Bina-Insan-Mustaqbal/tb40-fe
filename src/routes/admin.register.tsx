import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerOrg } from '@/lib/analytics'
import { PlusCircle, ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react'

export const Route = createFileRoute('/admin/register')({
  component: RegisterOrgPage,
})

function RegisterOrgPage() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.')
      return
    }
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.')
      return
    }
    if (!name.trim()) {
      setError('Nama organisasi tidak boleh kosong.')
      return
    }

    setLoading(true)
    try {
      console.log('Client sending registerOrg with:', { name: name.trim(), password })
      const res = await registerOrg({ data: { name: name.trim(), password } })
      console.log('Client received registerOrg res:', res)
      if (res.success) {
        setSuccess(true)
      } else {
        setError(res.error || 'Pendaftaran gagal.')
      }
    } catch (err) {
      console.error('Client error in registerOrg call:', err)
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl text-center">
          <div className="mb-4 inline-flex rounded-full bg-emerald-100 p-4">
            <ShieldCheck className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="mb-2 text-2xl font-bold">Organisasi Terdaftar!</h2>
          <p className="mb-1 text-muted-foreground">
            <span className="font-semibold text-foreground capitalize">{name}</span> berhasil didaftarkan.
          </p>
          <p className="mb-6 text-sm text-muted-foreground">
            Gunakan nama dan kata sandi ini untuk masuk ke Admin Dashboard.
          </p>
          <a
            href="/admin"
            className="inline-block w-full rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Masuk ke Admin Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        {/* Header */}
        <div className="mb-6">
          <a
            href="/admin"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Login
          </a>
          <div className="mt-4 flex flex-col items-center text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <PlusCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Daftarkan Organisasi / Event</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Buat akun admin baru untuk memantau hasil tes peserta.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Org/Event Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="orgName">Nama Organisasi / Event</Label>
            <Input
              id="orgName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: PT. Bintang Sejahtera, Workshop Ramadan 2025"
            />
            <p className="text-xs text-muted-foreground">
              Nama ini akan digunakan peserta saat memilih organisasi mereka.
            </p>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Kata Sandi</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi kata sandi"
            />
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-destructive">Kata sandi tidak cocok.</p>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 w-full"
          >
            {loading ? 'Mendaftarkan...' : 'Daftarkan Organisasi'}
          </Button>
        </form>
      </div>
    </div>
  )
}
