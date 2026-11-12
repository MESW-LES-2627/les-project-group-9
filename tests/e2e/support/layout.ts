import {expect, type Locator} from '@playwright/test';

/** Minimum touch target in CSS px (see docs/responsive.md). */
export const MIN_TOUCH_TARGET = 44;

/**
 * Asserts that a control's rendered box is at least 44×44 CSS px. Retries
 * until layout settles (e.g. while a drawer is opening under load), and still
 * fails if the size never reaches the minimum.
 */
export async function expectTouchTarget(locator: Locator) {
  await expect
    .poll(async () => {
      const box = await locator.boundingBox();
      return Math.min(box?.width ?? 0, box?.height ?? 0);
    })
    .toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
}
