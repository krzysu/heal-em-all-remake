/**
 * The tool ladder.
 *
 * One room, one new tool: the campaign is six single-screen rooms and finishing
 * a room hands the doctor something he keeps. The order is the teaching order,
 * and each room is built so the previous room's tool is the answer to it (see
 * `tools/gen_screens.py`, which refuses to emit a room whose geometry does not
 * hold up its barrier).
 *
 * The ladder lives here rather than in `config.ts` because the store, the HUD
 * and the level select all read it; nothing in this file touches Phaser.
 */
export type AbilityId = 'doubleJump' | 'dash' | 'spread' | 'charge' | 'melee' | 'chain'

export interface AbilityInfo {
  name: string
  /** One line for the summary screen: what the tool does and what it answers. */
  blurb: string
}

/** Room titles, so screens can name a room instead of numbering it. */
export const ROOM_NAMES: Record<number, string> = {
  1: 'The Gate',
  2: 'The Well',
  3: 'The Rift',
  4: 'The Ward',
  5: 'The Galleries',
  6: 'The Long Night',
}

/** Room `n` hands out `ABILITY_LADDER[n - 1]`. */
export const ABILITY_LADDER: AbilityId[] = [
  'doubleJump',
  'dash',
  'spread',
  'charge',
  'melee',
  'chain',
]

export const ABILITY_INFO: Record<AbilityId, AbilityInfo> = {
  doubleJump: {
    name: 'Double jump',
    blurb: 'A second jump in mid-air. Reach what one jump cannot.',
  },
  dash: { name: 'Dash', blurb: 'A short burst of speed with a moment of invincibility.' },
  spread: { name: 'Spread shot', blurb: 'One round, three doses. Cure a whole row at once.' },
  charge: { name: 'Charge shot', blurb: 'Hold fire for a heavy round that punches armour.' },
  melee: { name: 'Melee stun', blurb: 'A close-range cure that costs no ammo.' },
  chain: { name: 'Chain cure', blurb: 'A cure jumps to the zombie touching the fresh human.' },
}

const IDS = new Set<string>(ABILITY_LADDER)

export function isAbilityId(value: string): value is AbilityId {
  return IDS.has(value)
}

/** The tool finishing `level` hands out, or null past the ladder. */
export function abilityForLevel(level: number): AbilityId | null {
  return ABILITY_LADDER[level - 1] ?? null
}

/** Tools the previous rooms hand out before `level` is entered. */
export function abilitiesBeforeLevel(level: number): AbilityId[] {
  return ABILITY_LADDER.slice(0, Math.max(0, Math.min(level - 1, ABILITY_LADDER.length)))
}
