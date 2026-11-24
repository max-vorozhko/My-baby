import { describe, expect, it } from 'vitest'
import { decideAfterSignIn, isSnapshot } from './backup'

describe('what to do after Google sign-in', () => {
  it('restores when the phone is empty and a backup exists', () => {
    expect(decideAfterSignIn(null, 'fam-a')).toBe('restore')
  })
  it('uploads when there is no backup yet', () => {
    expect(decideAfterSignIn('fam-a', undefined)).toBe('upload')
  })
  it('keeps updating the same family backup', () => {
    expect(decideAfterSignIn('fam-a', 'fam-a')).toBe('same')
  })
  it('asks the user when families differ — never silently overwrites', () => {
    expect(decideAfterSignIn('fam-b', 'fam-a')).toBe('conflict')
    expect(decideAfterSignIn('fam-b', null)).toBe('conflict')
  })
  it('does nothing when both are empty', () => {
    expect(decideAfterSignIn(null, undefined)).toBe('empty')
  })
  it('validates snapshot shape', () => {
    expect(isSnapshot({ app: 'my-baby', version: 1, data: {} })).toBe(true)
    expect(isSnapshot({ app: 'other', version: 1, data: {} })).toBe(false)
    expect(isSnapshot(null)).toBe(false)
  })
})
