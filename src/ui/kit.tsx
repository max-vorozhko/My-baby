import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white dark:text-bg',
  secondary: 'bg-surface border border-line text-ink',
  ghost: 'text-accent',
  danger: 'bg-sos text-white dark:text-bg',
}

export function Button({
  variant = 'primary', className = '', ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`min-h-12 rounded-2xl px-5 font-semibold transition active:scale-[0.98] disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-line bg-surface p-4 ${className}`}>{children}</div>
}

/** group — для груп кнопок: без <label>, інакше тап по підпису «клікає» першу кнопку. */
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
  'w-full min-h-12 rounded-2xl border border-line bg-surface px-4 text-base outline-none focus:border-accent'

export function Segmented<T extends string>({
  value, onChange, options,
}: { value: T | null; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-12 flex-1 rounded-2xl border px-3 font-medium ${
            value === o.value ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-surface text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold">{children}</h1>
      {sub && <p className="mt-1 text-muted">{sub}</p>}
    </header>
  )
}

/** Заглушка для модулів наступних етапів / релізів. */
export function ComingSoon({ title, stage, items }: { title: string; stage: string; items: string[] }) {
  return (
    <Card className="border-dashed">
      <p className="text-sm font-semibold text-muted">{stage}</p>
      <h2 className="mt-1 text-lg font-semibold">{title}</h2>
      <ul className="mt-3 space-y-1.5 text-muted">
        {items.map((i) => <li key={i}>• {i}</li>)}
      </ul>
    </Card>
  )
}
