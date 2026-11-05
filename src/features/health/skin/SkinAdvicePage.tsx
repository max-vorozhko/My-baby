import { Link } from 'react-router-dom'
import { SKIN_ADVICE, SKIN_RED_FLAGS } from '@/data/skin'
import { Card, PageTitle } from '@/ui/kit'
import { Disclaimer } from '@/ui/Disclaimer'

export function SkinAdvicePage() {
  return (
    <div className="space-y-4">
      <Link to="/health/skin" className="inline-flex min-h-12 items-center text-accent">← Шкіра</Link>
      <PageTitle sub="Загальні поради з догляду">Як доглядати за шкірою</PageTitle>
      <Disclaimer />
      {SKIN_ADVICE.map((s) => (
        <Card key={s.title}>
          <h2 className="font-semibold">{s.title}</h2>
          <ul className="mt-2 space-y-2">
            {s.points.map((p) => <li key={p} className="flex gap-2"><span className="text-accent">•</span><span>{p}</span></li>)}
          </ul>
        </Card>
      ))}
      <Card className="border-2 border-sos">
        <h2 className="font-semibold">Коли до лікаря</h2>
        <ul className="mt-2 space-y-2">
          {SKIN_RED_FLAGS.map((f) => (
            <li key={f.id} className="flex gap-2">
              <span className={f.urgent ? 'font-bold text-sos' : 'text-sos'}>!</span>
              <span>{f.label}{f.urgent ? <b> — негайно, 103</b> : ' — найближчим часом'}</span>
            </li>
          ))}
        </ul>
      </Card>
      <p className="text-center text-xs text-muted">Чернетка, ще не перевірена педіатром.</p>
    </div>
  )
}
