import { FONTS } from '../config'

/**
 * Resolves once the game's web fonts are loaded.
 *
 * Phaser rasterises `Text` to a texture when it is created, so if the face is
 * still loading the glyphs are baked from the fallback and never repainted. The
 * DOM `#boot` splash already covers the canvas while this resolves, and the
 * fonts are preloaded from `index.html`, so the wait is normally invisible.
 */
export async function whenFontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return

  const families = [FONTS.title, FONTS.body]
  try {
    await document.fonts.ready
    await Promise.all(families.map((family) => document.fonts.load(`400 16px "${family}"`)))
    await document.fonts.ready
  } catch {
    // Best effort: fall back to the system face if a font cannot be loaded.
  }
}
