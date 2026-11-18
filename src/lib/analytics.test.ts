import { describe, expect, it } from 'vitest'
import { screenPath } from './analytics'

describe('screenPath', () => {
  it('strips the base path and query, keeps only known screens', () => {
    expect(screenPath('/My-baby/', '/My-baby/')).toBe('/')
    expect(screenPath('/My-baby/sleep', '/My-baby/')).toBe('/sleep')
    expect(screenPath('/My-baby/health/skin/', '/My-baby/')).toBe('/health/skin')
    expect(screenPath('/My-baby/stats?x=1#y', '/My-baby/')).toBe('/stats')
  })
  it('collapses unknown paths so nothing from the URL leaks', () => {
    expect(screenPath('/My-baby/invite/abc123', '/My-baby/')).toBe('/інше')
    expect(screenPath('/food', '/')).toBe('/food')
  })
})
