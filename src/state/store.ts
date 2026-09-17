import { STORAGE_KEYS, TOTAL_LEVELS } from '../config'

/** Snapshot of everything a level needs to report on the summary screen. */
export interface RunState {
  level: number
  lives: number
  bullets: number
  hasGun: boolean
  hasKey: boolean
  zombiesRemaining: number
  zombiesHealed: number
  zombiesAvailable: number
  healthCollected: number
  healthAvailable: number
  bulletsWasted: number
  bulletsAvailable: number
  zombieModeFound: boolean
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function readInt(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

/**
 * Progress and run state. Deliberately free of Phaser imports so it stays a
 * plain, unit-testable store; the event bus lives in `GameState.ts`.
 */
class GameStateStore {
  /** Highest level the player may enter. */
  availableLevel = 1

  private readonly stars = new Map<number, number>()

  private run: RunState | null = null

  load(): void {
    this.availableLevel = clamp(readInt(STORAGE_KEYS.availableLevel, 1), 1, TOTAL_LEVELS)

    this.stars.clear()
    for (let level = 1; level <= TOTAL_LEVELS; level++) {
      this.stars.set(level, readInt(`${STORAGE_KEYS.levelProgress}:${level}`, 0))
    }
  }

  starsFor(level: number): number {
    return this.stars.get(level) ?? 0
  }

  isUnlocked(level: number): boolean {
    return level <= this.availableLevel
  }

  startRun(level: number): RunState {
    this.run = {
      level,
      lives: 3,
      bullets: 0,
      hasGun: false,
      hasKey: false,
      zombiesRemaining: 0,
      zombiesHealed: 0,
      zombiesAvailable: 0,
      healthCollected: 0,
      healthAvailable: 0,
      bulletsWasted: 0,
      bulletsAvailable: 0,
      zombieModeFound: false,
    }
    return this.run
  }

  get currentRun(): RunState | null {
    return this.run
  }

  /** Record the outcome of a completed level and persist progress. */
  completeRun(result: { stars: number; nextLevel: number }): void {
    const run = this.run
    if (!run) return

    const previous = this.starsFor(run.level)
    if (result.stars > previous) {
      this.stars.set(run.level, result.stars)
      this.save(`${STORAGE_KEYS.levelProgress}:${run.level}`, String(result.stars))
    }

    if (result.nextLevel > this.availableLevel) {
      this.availableLevel = Math.min(result.nextLevel, TOTAL_LEVELS)
      this.save(STORAGE_KEYS.availableLevel, String(this.availableLevel))
    }
  }

  private save(key: string, value: string): void {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Private browsing / disabled storage — progress simply won't persist.
    }
  }
}

export const GameState = new GameStateStore()
