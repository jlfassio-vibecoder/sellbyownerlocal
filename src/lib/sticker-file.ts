export const MAX_STICKER_FILE_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_STICKER_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;

export const STICKER_FILE_ACCEPT = ACCEPTED_STICKER_TYPES.join(',');

const STICKER_DATA_URI_PATTERN =
  /^data:(image\/(?:jpeg|png)|application\/pdf);base64,/;

export function extractMimeTypeFromDataUri(dataUri: string): string {
  const match = dataUri.match(/^data:([^;]+);base64,/);
  if (!match?.[1]) {
    throw new Error('Invalid sticker data URI');
  }
  return match[1];
}

export function extractBase64FromDataUri(dataUri: string): string {
  const commaIndex = dataUri.indexOf(',');
  if (commaIndex < 0) {
    throw new Error('Invalid sticker data URI');
  }
  return dataUri.slice(commaIndex + 1);
}

export function isValidStickerDataUri(dataUri: string): boolean {
  if (!STICKER_DATA_URI_PATTERN.test(dataUri)) return false;
  const b64 = extractBase64FromDataUri(dataUri);
  return Math.ceil((b64.length * 3) / 4) <= MAX_STICKER_FILE_BYTES;
}

export function readStickerFileAsDataUri(file: File): Promise<string> {
  if (!ACCEPTED_STICKER_TYPES.includes(file.type as (typeof ACCEPTED_STICKER_TYPES)[number])) {
    return Promise.reject(
      new Error('File must be a JPEG, PNG, or PDF window sticker')
    );
  }

  if (file.size > MAX_STICKER_FILE_BYTES) {
    return Promise.reject(new Error('Sticker file must be under 5MB'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string' || !isValidStickerDataUri(result)) {
        reject(new Error('Could not read sticker file'));
        return;
      }
      resolve(result);
    };

    reader.onerror = () => {
      reject(new Error('Could not read sticker file'));
    };

    reader.readAsDataURL(file);
  });
}
