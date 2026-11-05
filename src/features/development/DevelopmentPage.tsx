import { ComingSoon, PageTitle } from '@/ui/kit'

export function DevelopmentPage() {
  return (
    <>
      <PageTitle sub="З'явиться у версії 0.2">Розвиток</PageTitle>
      <div className="space-y-3 opacity-70">
        <ComingSoon stage="v0.2" title="Віхи і ігри" items={['Віхи за місяцями без оцінок «відстає»', '3–5 ігор на тиждень']} />
        <ComingSoon stage="v0.2" title="Ріст і вага" items={['Графіки на кривих ВООЗ']} />
      </div>
    </>
  )
}
