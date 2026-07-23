import { useState, useEffect, useRef } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ChevronsUpDown, Check, Search, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Org {
  id: number
  name: string
}

interface OrgComboboxProps {
  value: string
  onChange: (value: string) => void
  allowFreeText?: boolean
  placeholder?: string
  id?: string
  required?: boolean
  className?: string
}

export function OrgCombobox({
  value,
  onChange,
  allowFreeText = false,
  placeholder = 'Pilih atau cari organisasi...',
  id,
  className,
}: OrgComboboxProps) {
  const [open, setOpen] = useState(false)
  const [orgs, setOrgs] = useState<Org[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    // Default list of organizations
    const defaultOrgs: Org[] = [
      { id: 1, name: 'Yayasan Bina Insan Mustaqbal' },
      { id: 2, name: 'Universitas Indonesia' },
      { id: 3, name: 'Institut Teknologi Bandung' },
    ]
    setOrgs(defaultOrgs)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) {
      setSearch(value)
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [open, value])

  const filtered = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  )

  const displayLabel = value
    ? orgs.find((o) => o.name.toLowerCase() === value.toLowerCase())?.name ?? value
    : ''

  const handleSelect = (orgName: string) => {
    onChange(orgName)
    setOpen(false)
    setSearch('')
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearch(val)
    if (allowFreeText) {
      onChange(val)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0) {
        handleSelect(filtered[0].name)
      } else if (allowFreeText && search.trim()) {
        handleSelect(search.trim())
      }
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between font-normal rounded-lg',
              !displayLabel && 'text-muted-foreground',
              className
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{displayLabel || placeholder}</span>
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={searchRef}
            value={search}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder="Cari organisasi..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="max-h-56 overflow-y-auto py-1">
          {loading ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">Memuat daftar...</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              {allowFreeText && search.trim() ? (
                <button
                  type="button"
                  onClick={() => handleSelect(search.trim())}
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                >
                  Gunakan <span className="font-semibold">"{search.trim()}"</span> sebagai nama baru
                </button>
              ) : (
                search.trim()
                  ? 'Organisasi tidak ditemukan.'
                  : 'Tidak ada organisasi tersedia.'
              )}
            </div>
          ) : (
            <>
              {filtered.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => handleSelect(org.name)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      value.toLowerCase() === org.name.toLowerCase()
                        ? 'opacity-100 text-primary'
                        : 'opacity-0'
                    )}
                  />
                  <span className="truncate capitalize">{org.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
