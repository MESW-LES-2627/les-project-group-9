import {describe, expect, it} from 'vitest';
import {hasHtmlContent} from '../../app/lib/html';

describe('hasHtmlContent', () => {
  it('rejects missing and empty values', () => {
    expect(hasHtmlContent(null)).toBe(false);
    expect(hasHtmlContent(undefined)).toBe(false);
    expect(hasHtmlContent('')).toBe(false);
    expect(hasHtmlContent('   ')).toBe(false);
  });

  it('rejects markup that has no visible text', () => {
    expect(hasHtmlContent('<p></p>')).toBe(false);
    expect(hasHtmlContent('<p>&nbsp;</p>')).toBe(false);
    expect(hasHtmlContent('<br><br/>')).toBe(false);
    expect(hasHtmlContent('<div><span> </span></div>')).toBe(false);
  });

  it('accepts descriptions with text', () => {
    expect(hasHtmlContent('<p>Handmade in Lisbon.</p>')).toBe(true);
    expect(hasHtmlContent('Plain text')).toBe(true);
  });

  it('accepts media-only descriptions', () => {
    expect(hasHtmlContent('<img src="/piece.jpg" alt="" />')).toBe(true);
    expect(hasHtmlContent('<video src="/clip.mp4"></video>')).toBe(true);
  });
});
