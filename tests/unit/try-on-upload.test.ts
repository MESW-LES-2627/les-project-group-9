import {describe, expect, it} from 'vitest';
import {
  MAX_PHOTO_BYTES,
  validatePhotoFile,
} from '../../app/lib/try-on/upload';

describe('validatePhotoFile', () => {
  it('accepts images under the size cap', () => {
    expect(validatePhotoFile({type: 'image/jpeg', size: 1024})).toBe(null);
    expect(validatePhotoFile({type: 'image/png', size: 1024})).toBe(null);
    expect(validatePhotoFile({type: 'image/heic', size: 1024})).toBe(null);
  });

  it('rejects other file types', () => {
    expect(validatePhotoFile({type: 'application/pdf', size: 1024})).toBe(
      'type',
    );
    expect(validatePhotoFile({type: '', size: 1024})).toBe('type');
  });

  it('rejects empty and oversized files', () => {
    expect(validatePhotoFile({type: 'image/png', size: 0})).toBe('size');
    expect(
      validatePhotoFile({type: 'image/png', size: MAX_PHOTO_BYTES + 1}),
    ).toBe('size');
    expect(
      validatePhotoFile({type: 'image/png', size: MAX_PHOTO_BYTES}),
    ).toBe(null);
  });
});
