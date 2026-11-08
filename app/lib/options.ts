/**
 * Option names that behave like a colour on product pages.
 * Keep this in one place so the form, cards and material filtering agree.
 */
export const COLOR_OPTION = /^(colou?r|finish|metal)$/i;

export function isColorOption(name: string): boolean {
  return COLOR_OPTION.test(name);
}
