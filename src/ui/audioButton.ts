import type Phaser from 'phaser'
import { GAME_HEIGHT } from '../config'

/**
 * Port of `audio_button.coffee`. The original toggled the whole game's mute
 * state through `Q.AudioManager` and swapped between `hud_audio_on_button` and
 * `hud_audio_off_button`. Phaser's `sound.mute` is the equivalent global switch,
 * so the choice is persisted in the same place the original kept `Game.isMuted`.
 */
const STORAGE_KEY = 'zombieGame:muted'

function frame(muted: boolean): string {
  return muted ? 'hud_audio_off_button:0' : 'hud_audio_on_button:0'
}

function isMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, muted ? '1' : '0')
  } catch {
    // Storage disabled; the in-memory Phaser mute still applies this session.
  }
}

/** The button reads too small at 1:1 in the 1920x1080 design space. */
const SCALE = (GAME_HEIGHT / 320) * 0.55

/** Applies the saved mute state, so a screen can sync it before drawing. */
export function applyMutedState(scene: Phaser.Scene): void {
  scene.sound.mute = isMuted()
}

/** Flips mute, persists it and returns the new state. */
export function toggleMute(scene: Phaser.Scene): boolean {
  const muted = !scene.sound.mute
  scene.sound.mute = muted
  setMuted(muted)
  return muted
}

export function createAudioButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
): Phaser.GameObjects.Image {
  applyMutedState(scene)

  const image = scene.add
    .image(x, y, 'hud', frame(scene.sound.mute))
    .setScale(SCALE)
    .setInteractive({ useHandCursor: true })

  image.on('pointerup', () => {
    image.setFrame(frame(toggleMute(scene)))
  })

  return image
}
