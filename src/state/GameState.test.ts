import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../config'

/** Fresh module instance per test so the singleton never leaks progress. */
async function freshStore() {
  vi.resetModules()
  const module = await import('./store')
  return module.GameState
}

describe('GameStateStore', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with only level 1 unlocked and no stars', async () => {
    const store = await freshStore()
    store.load()
    expect(store.isUnlocked(1)).toBe(true)
    expect(store.isUnlocked(2)).toBe(false)
    expect(store.starsFor(1)).toBe(0)
    expect(store.availableLevel).toBe(1)
  })

  it('unlocks the next level and stores the star rating', async () => {
    const store = await freshStore()
    store.load()
    store.startRun(1)
    store.completeRun({ stars: 3, nextLevel: 2 })

    expect(store.availableLevel).toBe(2)
    expect(store.isUnlocked(2)).toBe(true)
    expect(store.starsFor(1)).toBe(3)
    expect(localStorage.getItem(`${STORAGE_KEYS.levelProgress}:1`)).toBe('3')
    expect(localStorage.getItem(STORAGE_KEYS.availableLevel)).toBe('2')
  })

  it('never lowers a stored star rating', async () => {
    const store = await freshStore()
    store.load()
    store.startRun(1)
    store.completeRun({ stars: 3, nextLevel: 2 })
    store.startRun(1)
    store.completeRun({ stars: 1, nextLevel: 2 })

    expect(store.starsFor(1)).toBe(3)
  })

  it('clamps progress to the last level', async () => {
    const store = await freshStore()
    localStorage.setItem(STORAGE_KEYS.availableLevel, '99')
    store.load()
    expect(store.availableLevel).toBe(6)
  })

  it('ignores persistence failures', async () => {
    const store = await freshStore()
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    store.load()
    store.startRun(1)
    expect(() => store.completeRun({ stars: 2, nextLevel: 2 })).not.toThrow()
    setItem.mockRestore()
  })
})
