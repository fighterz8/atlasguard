const MINIMUM_KEYBOARD_INSET_PX = 140;
const MINIMUM_KEYBOARD_INSET_RATIO = 0.18;

export function isLikelySoftKeyboardOpen(
  layoutViewportHeight: number,
  visualViewportHeight: number,
) {
  if (
    !Number.isFinite(layoutViewportHeight) ||
    !Number.isFinite(visualViewportHeight) ||
    layoutViewportHeight <= 0 ||
    visualViewportHeight <= 0
  ) {
    return false;
  }

  const inset = layoutViewportHeight - visualViewportHeight;
  return (
    inset >= MINIMUM_KEYBOARD_INSET_PX &&
    inset / layoutViewportHeight >= MINIMUM_KEYBOARD_INSET_RATIO
  );
}
