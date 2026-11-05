import type { SVGProps } from 'react'

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  'aria-hidden': true, ...p,
})

export const IconToday = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></svg>
)
export const IconFood = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><ellipse cx="8" cy="7" rx="3" ry="4" /><path d="M8 11v10" /><path d="M16 3v18" /><path d="M13.5 3v5a2.5 2.5 0 0 0 5 0V3" /></svg>
)
export const IconSleep = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>
)
export const IconGrowth = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 21V11" /><path d="M12 11C12 7 9 5 5 5c0 4 3 6 7 6Z" /><path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6Z" /></svg>
)
export const IconMore = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
)
export const IconBottle = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M10 2h4" /><path d="M9 5h6l-1-3h-4Z" /><path d="M8 8a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2Z" /><path d="M8 12h3M8 16h3" /></svg>
)
export const IconCloudOff = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="m2 2 20 20" /><path d="M5.8 8.2A5 5 0 0 0 7 18h10" /><path d="M20.4 16.4A4 4 0 0 0 17 10h-1.3A7 7 0 0 0 9.5 5.1" /></svg>
)
export const IconDevice = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M11 18h2" /></svg>
)
export const IconPhone = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" /></svg>
)
export const IconClose = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>
)
export const IconHeart = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9Z" /></svg>
)
export const IconDrop = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" /></svg>
)
