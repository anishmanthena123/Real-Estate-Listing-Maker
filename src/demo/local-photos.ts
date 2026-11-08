export const MAX_LOCAL_PHOTOS = 10;
export const MAX_LOCAL_PHOTO_BYTES = 8 * 1024 * 1024;
export async function validateLocalPhoto(
  file: File,
): Promise<{ width: number; height: number }> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Choose JPEG, PNG, or WebP images.');
  if (!file.size || file.size > MAX_LOCAL_PHOTO_BYTES)
    throw new Error('Each picture must be nonempty and no larger than 8 MB.');
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ascii = (start: number, end: number) =>
    String.fromCharCode(...header.slice(start, end));
  const matches =
    file.type === 'image/jpeg'
      ? header[0] === 255 && header[1] === 216 && header[2] === 255
      : file.type === 'image/png'
        ? [137, 80, 78, 71, 13, 10, 26, 10].every(
            (byte, index) => header[index] === byte,
          )
        : ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
  if (!matches)
    throw new Error('Picture content does not match its file type.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      'This picture could not be decoded. Choose a valid JPEG, PNG, or WebP.',
    );
  }
  try {
    if (
      !bitmap.width ||
      !bitmap.height ||
      bitmap.width * bitmap.height > 40_000_000
    )
      throw new Error('Picture dimensions exceed the 40 megapixel limit.');
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}
export type LocalPhoto = {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
};
