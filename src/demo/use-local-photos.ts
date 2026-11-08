import { useEffect, useRef, useState } from 'react';
import {
  MAX_LOCAL_PHOTOS,
  validateLocalPhoto,
  type LocalPhoto,
} from './local-photos';
export function useLocalPhotos() {
  const [photos, setPhotos] = useState<Record<string, LocalPhoto[]>>({});
  const stored = useRef<Record<string, LocalPhoto[]>>({});
  const urls = useRef(new Set<string>());
  const locks = useRef(new Set<string>());
  const epoch = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    const allocated = urls.current;
    alive.current = true;
    return () => {
      alive.current = false;
      for (const url of allocated) URL.revokeObjectURL(url);
      allocated.clear();
    };
  }, []);
  async function importPhotos(propertyId: string, files: File[]) {
    if (!files.length) return;
    if (locks.current.has(propertyId))
      throw new Error('A photo import is already in progress.');
    if (
      (stored.current[propertyId]?.length ?? 0) + files.length >
      MAX_LOCAL_PHOTOS
    )
      throw new Error(
        `Import up to ${MAX_LOCAL_PHOTOS} pictures per property.`,
      );
    locks.current.add(propertyId);
    const version = epoch.current;
    try {
      const prepared: { file: File; width: number; height: number }[] = [];
      for (const file of files)
        prepared.push({ file, ...(await validateLocalPhoto(file)) });
      if (!alive.current || version !== epoch.current)
        throw new Error('Photo import cancelled because the demo was reset.');
      const added = prepared.map(({ file, width, height }) => {
        const url = URL.createObjectURL(file);
        urls.current.add(url);
        return {
          id: crypto.randomUUID(),
          name: file.name.slice(0, 200),
          url,
          width,
          height,
        };
      });
      stored.current = {
        ...stored.current,
        [propertyId]: [...(stored.current[propertyId] ?? []), ...added],
      };
      setPhotos(stored.current);
    } finally {
      locks.current.delete(propertyId);
    }
  }
  function removePhoto(propertyId: string, photoId: string) {
    const photo = stored.current[propertyId]?.find((p) => p.id === photoId);
    if (photo) {
      URL.revokeObjectURL(photo.url);
      urls.current.delete(photo.url);
    }
    stored.current = {
      ...stored.current,
      [propertyId]: (stored.current[propertyId] ?? []).filter(
        (p) => p.id !== photoId,
      ),
    };
    setPhotos(stored.current);
  }
  function resetPhotos() {
    epoch.current++;
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current.clear();
    stored.current = {};
    setPhotos({});
  }
  return { photos, importPhotos, removePhoto, resetPhotos };
}
