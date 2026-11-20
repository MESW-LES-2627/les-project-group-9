export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

export type PhotoFileError = 'type' | 'size';

/** Validates the picked photo before it is decoded. */
export function validatePhotoFile(file: {
  type: string;
  size: number;
}): PhotoFileError | null {
  if (!file.type.startsWith('image/')) return 'type';
  if (!(file.size > 0) || file.size > MAX_PHOTO_BYTES) return 'size';

  return null;
}

/**
 * Decodes a photo with the camera's orientation applied, so landmarks match
 * what the shopper sees.
 */
export async function decodePhoto(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file, {imageOrientation: 'from-image'});
}
