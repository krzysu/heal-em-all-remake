import { STORAGE_KEYS, TOTAL_LEVELS } from '../config'
import { abilityForLevel, isAbilityId, type AbilityId } from '../levels/abilities'

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

function readAbilities(key: string): AbilityId[] {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return []
    const out: AbilityId[] = []
    for (const entry of raw.split(',')) {
      const value = entry.trim()
      if (isAbilityId(value)) out.push(value)
    }
    return out
  } catch {
    return []
  }
}

/**
 * Progress and run state. Deliberately free of Phaser imports so it stays a
 * plain, unit-testable store; the event bus lives in `GameState.ts`.
 */
class GameStateStore {
  /** Highest level the player may enter. */
  availableLevel = 1

  /** Tool handed out by the run that just finished, for the summary screen. */
  lastUnlocked: AbilityId | null = null

  private readonly stars = new Map<number, number>()

  private readonly abilities = new Set<AbilityId>()

  private run: RunState | null = null

  load(): void {
    this.availableLevel = clamp(readInt(STORAGE_KEYS.availableLevel, 1), 1, TOTAL_LEVELS)

    this.stars.clear()
    for (let level = 1; level <= TOTAL_LEVELS; level++) {
      this.stars.set(level, readInt(`${STORAGE_KEYS.levelProgress}:${level}`, 0))
    }

    this.abilities.clear()
    for (const ability of readAbilities(STORAGE_KEYS.abilities)) this.abilities.add(ability)
  }

  starsFor(level: number): number {
    return this.stars.get(level) ?? 0
  }

  isUnlocked(level: number): boolean {
    return level <= this.availableLevel
  }

  hasAbility(ability: AbilityId): boolean {
    return this.abilities.has(ability)
  }

  unlockedAbilities(): AbilityId[] {
    return [...this.abilities]
  }

  startRun(level: number): RunState {
    this.lastUnlocked = null
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

    this.grantAbility(run.level)
  }

  /** Finishing a room hands out its tool once, and only once. */
  private grantAbility(level: number): void {
    this.lastUnlocked = null
    const ability = abilityForLevel(level)
    if (!ability || this.abilities.has(ability)) return

    this.abilities.add(ability)
    this.lastUnlocked = ability
    this.save(STORAGE_KEYS.abilities, this.unlockedAbilities().join(','))
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
