import { useNavigate } from 'react-router-dom'
import { IconClose, IconPhone } from '@/ui/icons'
import { Disclaimer } from '@/ui/Disclaimer'

/**
 * Перша допомога при поперхуванні немовляти до 1 року (ТЗ 3.9).
 * Загальновідомий алгоритм «5 ударів по спині + 5 натискань на грудину».
 * ЧЕРНЕТКА: текст НЕ перевірений педіатром. Ілюстрації — після рецензії.
 * Працює офлайн (входить у precache застосунку).
 */

const STEPS: { title: string; body: string[] }[] = [
  {
    title: 'Покладіть малюка животиком на передпліччя',
    body: [
      'Голова — нижче за тулуб.',
      'Підтримуйте голову за нижню щелепу пальцями. Не затискайте шию.',
      'Обіпріть руку на своє стегно.',
    ],
  },
  {
    title: '5 ударів по спині',
    body: ['Основою долоні — 5 різких ударів між лопатками.', 'Після кожного удару дивіться, чи не вийшов предмет.'],
  },
  {
    title: 'Переверніть на спину',
    body: [
      'Підтримуючи голову, покладіть малюка спиною на інше передпліччя.',
      'Голова — так само нижче за тулуб.',
    ],
  },
  {
    title: '5 натискань на грудину',
    body: [
      'Двома пальцями — в центр грудей, трохи нижче лінії сосків.',
      '5 різких натискань углиб приблизно на третину грудної клітки.',
    ],
  },
  {
    title: 'Повторюйте 5 + 5',
    body: [
      'Чергуйте 5 ударів по спині і 5 натискань, доки предмет не вийде або малюк не почне кашляти, плакати чи дихати.',
      'Дивіться в рот: виймайте предмет, лише якщо його чітко видно. Не шукайте пальцем наосліп.',
    ],
  },
]

export function SosPage() {
  const navigate = useNavigate()
  const close = () => (history.length > 1 ? navigate(-1) : navigate('/'))

  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-bg px-4 pt-[max(env(safe-area-inset-top),12px)] pb-[max(env(safe-area-inset-bottom),24px)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sos">Поперхування</h1>
          <p className="text-sm text-muted">Немовля до 1 року</p>
        </div>
        <button onClick={close} aria-label="Закрити" className="flex h-12 w-12 items-center justify-center rounded-full border border-line">
          <IconClose />
        </button>
      </div>

      <a href="tel:103" className="mt-4 flex min-h-16 items-center justify-center gap-3 rounded-3xl bg-sos text-xl font-bold text-white active:scale-[0.98] dark:text-bg">
        <IconPhone /> Телефонувати 103
      </a>
      <p className="mt-2 text-center text-sm text-muted">Попросіть когось подзвонити або увімкніть гучний зв'язок.</p>

      <section className="mt-5 rounded-3xl bg-food-soft p-4">
        <p className="font-bold">Кашляє, плаче або видає звуки?</p>
        <p className="mt-1">Не заважайте кашляти. Не стукайте по спині і не лізьте пальцями в рот. Будьте поруч і спостерігайте.</p>
      </section>

      <section className="mt-3 rounded-3xl border-2 border-sos p-4">
        <p className="font-bold">Не може кашляти, плакати чи дихати, синіє?</p>
        <p className="mt-1">Дійте одразу:</p>
        <ol className="mt-3 space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sos text-lg font-bold text-white dark:text-bg">{i + 1}</span>
              <div>
                <p className="text-lg font-bold leading-snug">{s.title}</p>
                {s.body.map((b) => <p key={b} className="mt-1">{b}</p>)}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-3 rounded-3xl bg-sos p-4 text-white dark:text-bg">
        <p className="font-bold">Втратив свідомість?</p>
        <p className="mt-1">Негайно 103. Покладіть на тверду поверхню і почніть серцево-легеневу реанімацію — диспетчер підкаже, що робити.</p>
      </section>

      <section className="mt-3 space-y-2 rounded-3xl border border-line bg-surface p-4">
        <p><b>Не робіть</b> немовляті поштовхів у живіт (прийом Геймліха) — це для дітей, старших за рік.</p>
        <p><b>Після будь-якого епізоду</b> покажіть малюка лікарю, навіть якщо все минуло.</p>
        <p className="text-sm text-muted">Найкраще — заздалегідь пройти курс першої допомоги дітям з практикою на манекені.</p>
      </section>

      <Disclaimer className="mt-4" />
      <p className="mt-2 text-center text-xs text-muted">Чернетка, ще не перевірена педіатром. Ілюстрації з'являться після рецензії.</p>
    </main>
  )
}
