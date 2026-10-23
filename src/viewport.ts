// Mobile keyboards often resize only the visual viewport, leaving 100vh/dvh
// unchanged. Follow its height and offset so the prompt stays above the keyboard.
export function followVisualViewport(element: HTMLElement) {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};

  const update = () => {
    // Preserve browser pinch zoom instead of reflowing the terminal under it.
    if (Math.abs(viewport.scale - 1) > 0.01) return;
    element.style.setProperty('--app-viewport-height', `${viewport.height}px`);
    element.style.setProperty('--app-viewport-top', `${viewport.offsetTop}px`);
  };
  update();
  viewport.addEventListener('resize', update);
  viewport.addEventListener('scroll', update);
  return () => {
    viewport.removeEventListener('resize', update);
    viewport.removeEventListener('scroll', update);
    element.style.removeProperty('--app-viewport-height');
    element.style.removeProperty('--app-viewport-top');
  };
}
