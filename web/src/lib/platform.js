export function isIOS(nav = navigator) {
  // iPadOS reports itself as a Mac, so tell it apart by its touchscreen.
  return /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
}
