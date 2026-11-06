import { useEffect, useState } from 'react'
import type { BottleContent, BreastSide, Child } from '@/db/types'
import { addBottle, getLastBottle, startBreast } from '@/db/actions'
import { useFeedingsSince } from '@/db/hooks'
import { DAY_MS } from '@/lib/time'
import { Sheet } from '@/ui/Sheet'
import { Button, Segmented, inputCls } from '@/ui/kit'
import { lastSide } from './labels'

const AMOUNTS = [60, 90, 120, 150, 180, 210]

/** Швидкий запис: груди — 1 тап по стороні; пляшечка — 1 тап з останньою кількістю. */
export function FeedingSheet({ open, onClose, child }: { open: boolean; onClose: () => void; child: Child }) {
  const [since] = useState(() => Date.now() - 2 * DAY_MS)
  const recent = useFeedingsSince(child.id, since)
  const last = lastSide(recent)
  const [content, setContent] = useState<BottleContent>('formula')
  const [amount, setAmount] = useState(120)

  useEffect(() => {
    if (open) getLastBottle().then((b) => { setContent(b.content); setAmount(b.amountMl) })
  }, [open])

  const breast = async (side: BreastSide) => { await startBreast(child.id, side); onClose() }
  const bottle = async () => { await addBottle(child.id, content, amount); onClose() }

  return (
    <Sheet open={open} onClose={onClose} title="Груди / пляшечка">
      <p className="mb-2 text-sm text-muted">Груди — запустити таймер</p>
      <div className="grid grid-cols-2 gap-2">
        {(['left', 'right'] as const).map((side) => (
          <button
            key={side}
            onClick={() => breast(side)}
            className="min-h-16 rounded-2xl border border-line bg-surface text-lg font-semibold"
          >
            {side === 'left' ? 'Ліва' : 'Права'}
            {last === side && <span className="block text-xs font-normal text-muted">минулого разу</span>}
          </button>
        ))}
      </div>

      <p className="mt-6 mb-2 text-sm text-muted">Пляшечка</p>
      <Segmented<BottleContent> value={content} onChange={setContent} options={[
        { value: 'formula', label: 'Суміш' }, { value: 'breast_milk', label: 'Зціджене' },
      ]} />
      <div className="mt-3 grid grid-cols-3 gap-2">
        {AMOUNTS.map((a) => (
          <button key={a} onClick={() => setAmount(a)}
            className={`min-h-12 rounded-2xl border font-semibold tabular-nums ${amount === a ? 'border-accent bg-accent-soft' : 'border-line bg-surface text-muted'}`}>
            {a}
          </button>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2">
        <span className="text-sm text-muted">Інша кількість, мл</span>
        <input type="number" inputMode="numeric" min={5} max={400} className={`${inputCls} w-28`}
          value={amount} onChange={(e) => setAmount(Math.max(0, Math.min(400, Number(e.target.value) || 0)))} />
      </label>
      <Button className="mt-4 w-full" disabled={amount < 5} onClick={bottle}>Записати {amount} мл</Button>
    </Sheet>
  )
}
