import {describe, expect, it} from 'vitest';
import {formatMetafieldValue} from '../../app/lib/jeweliette-catalog';

describe('formatMetafieldValue', () => {
  it('hides missing and sentinel values', () => {
    expect(formatMetafieldValue(null)).toBe('');
    expect(formatMetafieldValue(undefined)).toBe('');
    expect(formatMetafieldValue('   ')).toBe('');
    expect(formatMetafieldValue('null')).toBe('');
    expect(formatMetafieldValue('NULL')).toBe('');
    expect(formatMetafieldValue('undefined')).toBe('');
  });

  it('trims plain text', () => {
    expect(formatMetafieldValue('  Gold plated  ')).toBe('Gold plated');
  });

  it('renders list metafields as readable text', () => {
    expect(formatMetafieldValue('["Gold", "Silver"]')).toBe('Gold, Silver');
    expect(formatMetafieldValue('["", "Gold", 42, "  "]')).toBe('Gold, 42');
    expect(formatMetafieldValue('[]')).toBe('');
  });

  it('keeps malformed JSON as text', () => {
    expect(formatMetafieldValue('not json')).toBe('not json');
    expect(formatMetafieldValue('{"metal":"gold"}')).toBe('{"metal":"gold"}');
  });
});
