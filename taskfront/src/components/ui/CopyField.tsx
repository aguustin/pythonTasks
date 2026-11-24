'use client'

import { Check, Copy } from 'lucide-react'
import { useRef, useState } from 'react'

/** Campo de solo lectura con botón para copiar (p. ej. un link de invitación). */
export function CopyField({ label, value }: { label: string; value: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Sin permiso de portapapeles: se selecciona el texto para copiarlo a mano.
      inputRef.current?.select()
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <label htmlFor="copy-field" className="mb-1.5 block text-[13px] font-semibold">{label}</label>
      <div className="flex gap-2">
        <input ref={inputRef} id="copy-field" readOnly value={value} onFocus={(e) => e.target.select()}
          className="h-9 min-w-0 flex-1 rounded-[var(--radius-field)] border border-input-border bg-surface-2 px-3 font-mono text-[13px] text-text outline-none focus-visible:border-focus" />
        <button type="button" onClick={copy}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-field)] border border-border-strong bg-surface px-3 text-sm font-semibold hover:bg-surface-2">
          {copied ? <Check aria-hidden size={16} className="text-success" /> : <Copy aria-hidden size={16} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <span aria-live="polite" className="sr-only">{copied ? 'Link copiado' : ''}</span>
    </div>
  )
}
