import { compressImageFile } from '@/src/lib/imageCompression';
import { getSupabaseBrowserClient } from '@/src/lib/supabaseBrowserClient';
import type { PhotoMeta } from '@/src/lib/photoMarks';
import { PhotoItem, MAX_PHOTOS_PER_GROUP } from './SupplierClaimPhotoGroup';

/** Manejo de fotos compartido por los formularios de reclamos a proveedores y de comunicados (mismo bucket y mismas rutas). */

const PHOTO_BUCKET = 'supplier-claim-photos';

export async function parseJson(res: Response) {
  try {
    return await res.json();
  } catch {
    throw new Error('El servidor no respondió correctamente. Intenta de nuevo.');
  }
}

export function photosFromPaths(paths: string[], meta: Record<string, PhotoMeta> = {}): PhotoItem[] {
  return paths.map(p => ({
    key: p,
    path: p,
    previewUrl: `/api/supplier-claims/photo?path=${encodeURIComponent(p)}`,
    comment: meta[p]?.comentario || '',
    marks: meta[p]?.marcas || []
  }));
}

/** Comentario y marcas de cada foto, indexados por la ruta final que tuvo en Storage. */
export function buildPhotoMeta(group: PhotoItem[], paths: string[]): Record<string, PhotoMeta> {
  const meta: Record<string, PhotoMeta> = {};
  group.forEach((photo, i) => {
    const comentario = photo.comment.trim();
    if (paths[i] && (comentario || photo.marks.length > 0)) meta[paths[i]] = { comentario, marcas: photo.marks };
  });
  return meta;
}

/** Comprime las fotos elegidas y las agrega al grupo (máximo MAX_PHOTOS_PER_GROUP). */
export async function addPhotosToGroup(files: File[], setGroup: React.Dispatch<React.SetStateAction<PhotoItem[]>>) {
  const added: PhotoItem[] = [];
  for (const file of files) {
    const compressed = await compressImageFile(file);
    const blob = await (await fetch(compressed.previewUrl)).blob();
    const jpeg = new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
    added.push({ key: `${Date.now()}-${Math.random()}`, file: jpeg, previewUrl: compressed.previewUrl, comment: '', marks: [] });
  }
  setGroup(prev => [...prev, ...added].slice(0, MAX_PHOTOS_PER_GROUP));
}

/** Sube un archivo a Storage con una signed upload URL de la ruta indicada y devuelve su path final. */
export async function uploadFileToStorage(file: File, uploadUrlEndpoint: string, contentType: string): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Carga de archivos no disponible: falta configuración del servidor.');
  const urlRes = await fetch(uploadUrlEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name })
  });
  const urlData = await parseJson(urlRes);
  if (!urlRes.ok || !urlData.success) throw new Error(urlData.error || 'No se pudo iniciar la carga del archivo.');
  const { error } = await supabase.storage.from(PHOTO_BUCKET).uploadToSignedUrl(urlData.storagePath, urlData.token, file, { contentType });
  if (error) throw new Error(error.message);
  return urlData.storagePath;
}

async function uploadPhoto(photo: PhotoItem): Promise<string | null> {
  if (photo.path) return photo.path;
  if (!photo.file) return null;
  return uploadFileToStorage(photo.file, '/api/supplier-claims/upload-url', 'image/jpeg');
}

/** Sube en paralelo las fotos nuevas del grupo y devuelve los paths finales. */
export async function uploadPhotoGroup(group: PhotoItem[]): Promise<string[]> {
  const paths = await Promise.all(group.map(uploadPhoto));
  return paths.filter((p): p is string => p !== null);
}
