import type Phaser from 'phaser'

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

export interface AudioButton {
  image: Phaser.GameObjects.Image
  layout: (x: number, y: number) => void
}

export function createAudioButton(scene: Phaser.Scene): AudioButton {
  scene.sound.mute = isMuted()

  const image = scene.add
    .image(0, 0, 'hud', frame(scene.sound.mute))
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })

  image.on('pointerup', () => {
    const muted = !scene.sound.mute
    scene.sound.mute = muted
    setMuted(muted)
    image.setFrame(frame(muted))
  })

  return {
    image,
    layout: (x, y) => image.setPosition(x, y),
  }
}
