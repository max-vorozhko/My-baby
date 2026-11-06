import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white dark:text-bg',
  secondary: 'bg-surface text-ink shadow-soft',
  ghost: 'text-accent',
  danger: 'bg-sos text-white dark:text-bg',
}

export function Button({
  variant = 'primary', className = '', ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`min-h-12 rounded-2xl px-5 font-bold transition active:scale-[0.98] disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl bg-surface p-4 shadow-soft ${className}`}>{children}</div>
}

/** Заголовок секції з необов'язковою дією праворуч. */
export function Section({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-2 flex min-h-8 items-center justify-between px-1">
        <h2 className="text-base font-extrabold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Число + підпис. */
export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <p className="text-xl font-extrabold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

/** Кругла іконка-«маркер» модуля: єдине місце, де живуть кольори модулів. */
export type Tone = 'sleep' | 'food' | 'feed' | 'skin' | 'accent' | 'sos'
export function Dot({ tone, children }: { tone: Tone; children: ReactNode }) {
  const cls = {
    sleep: 'bg-sleep-soft text-sleep', food: 'bg-food-soft text-food', feed: 'bg-feed-soft text-feed',
    skin: 'bg-skin-soft text-skin', accent: 'bg-accent-soft text-accent', sos: 'bg-sos/10 text-sos',
  }[tone]
  return <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${cls}`}>{children}</span>
}

export function Field({
  label, hint, children, group,
}: { label: string; hint?: string; children: ReactNode; group?: boolean }) {
  const inner = (
    <>
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </>
  )
  return group
    ? <div role="group" aria-label={label} className="block">{inner}</div>
    : <label className="block">{inner}</label>
}

export const inputCls =
  'w-full min-h-12 rounded-3xl bg-surface shadow-soft px-4 text-base outline-none focus:border-accent'

export function Segmented<T extends string>({
  value, onChange, options,
}: { value: T | null; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex gap-1 rounded-2xl bg-line p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-medium transition ${
            value === o.value ? 'bg-surface font-bold text-ink shadow-soft' : 'text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Чіпи з множинним вибором. */
export function Chips<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const sel = value.includes(o.value)
        return (
          <button key={o.value} type="button" aria-pressed={sel}
            onClick={() => onChange(sel ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={`min-h-11 rounded-full border px-4 text-sm ${sel ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-surface text-muted'}`}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-4 px-1">
      <h1 className="text-[26px] font-extrabold leading-tight">{children}</h1>
      {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
    </header>
  )
}

/** Рядок 103 замість медичних порад. */
export function Emergency103() {
  return (
    <a href="tel:103" className="flex min-h-12 items-center justify-between rounded-2xl bg-sos/10 px-4 text-sm">
      <span>Тривожні симптоми?</span>
      <span className="font-semibold text-sos">Телефонуйте 103</span>
    </a>
  )
}
