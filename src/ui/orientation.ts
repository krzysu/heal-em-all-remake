import Phaser from 'phaser'

/**
 * Portrait phones get a full-screen "rotate" prompt instead of a sliver of
 * letterboxed game. Only coarse-pointer devices are gated, so a narrow desktop
 * window is unaffected.
 *
 * The game loop is put to sleep under the prompt rather than merely covered, so
 * nothing keeps simulating (or playing audio) behind the overlay. The prompt
 * itself is a plain DOM element toggled by the `rotate-gate` class on `<html>`,
 * so it renders even while the loop is asleep.
 */
export function installOrientationGate(game: Phaser.Game): void {
  const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)')

  const apply = (): void => {
    const gated = portrait.matches
    document.documentElement.classList.toggle('rotate-gate', gated)
    if (!game.isBooted) return

    const gamePaused = game.scene.isPaused('Game')

    if (gated) {
      if (game.loop.running) game.loop.sleep()
      if (!gamePaused) game.sound.pauseAll()
      return
    }

    if (!game.loop.running) game.loop.wake(true)
    if (!gamePaused) game.sound.resumeAll()
  }

  // `READY` fires before the loop starts, so sleeping there would be a no-op;
  // `POST_STEP` is the first point where the loop is actually running.
  game.events.once(Phaser.Core.Events.POST_STEP, apply)
  portrait.addEventListener('change', apply)
  apply()
}
