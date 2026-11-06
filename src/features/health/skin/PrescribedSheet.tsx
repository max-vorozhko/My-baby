import { useEffect, useState } from 'react'
import type { Child } from '@/db/types'
import { addSkinCare } from '@/db/actions'
import { getSetting } from '@/db'
import { Sheet } from '@/ui/Sheet'
import { Button, inputCls } from '@/ui/kit'

/** Відмітка «нанесли засіб, призначений лікарем». Лише назва — застосунок нічого не радить. */
export function PrescribedSheet({ child, open, onClose }: { child: Child; open: boolean; onClose: () => void }) {
  const [saved, setSaved] = useState<string[]>([])
  const [name, setName] = useState('')
  useEffect(() => { if (open) { setName(''); getSetting<string[]>('prescribedProducts').then((l) => setSaved(l ?? [])) } }, [open])
  const add = async (product: string) => { await addSkinCare(child.id, 'prescribed', product.trim()); onClose() }

  return (
    <Sheet open={open} onClose={onClose} title="Засіб">
      <p className="mb-3 text-sm text-muted">Відмітка, що засіб нанесли. Назву вписуєте ви.</p>
      {saved.length > 0 && (
        <div className="mb-4 space-y-2">
          {saved.map((p) => (
            <button key={p} onClick={() => add(p)} className="flex min-h-12 w-full items-center rounded-2xl border border-line bg-surface px-4 text-left font-semibold">{p}</button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Назва засобу" />
        <Button disabled={!name.trim()} onClick={() => add(name)}>Додати</Button>
      </div>
    </Sheet>
  )
}
