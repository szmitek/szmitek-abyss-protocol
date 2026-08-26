import { Directory, File, Paths } from 'expo-file-system';

import { POSTURE_VIEWS, type PosturePhotoMap, type PosturePhotoSource, type PostureView } from '../domain/types.ts';

export interface PosturePhotoDraft {
  uri: string;
  width: number;
  height: number;
  source: PosturePhotoSource;
}

export type PosturePhotoDraftMap = Record<PostureView, PosturePhotoDraft>;

function safeScanId(scanId: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(scanId)) throw new Error('Invalid posture scan identifier');
  return scanId;
}

function extensionFor(uri: string): string {
  const extension = uri.split('?')[0]?.match(/\.(jpe?g|png|webp|heic)$/i)?.[0];
  return extension?.toLowerCase() ?? '.jpg';
}

function scanDirectory(scanId: string): Directory {
  return new Directory(Paths.document, 'posture-archive', safeScanId(scanId));
}

export async function persistPosturePhotos(scanId: string, drafts: PosturePhotoDraftMap, capturedAt: string): Promise<PosturePhotoMap> {
  const directory = scanDirectory(scanId);
  directory.create({ idempotent: true, intermediates: true });
  const photos = {} as PosturePhotoMap;

  try {
    for (const view of POSTURE_VIEWS) {
      const draft = drafts[view];
      const destination = new File(directory, `${view}${extensionFor(draft.uri)}`);
      if (destination.exists) destination.delete();
      new File(draft.uri).copy(destination);
      photos[view] = {
        view,
        uri: destination.uri,
        width: draft.width,
        height: draft.height,
        source: draft.source,
        capturedAt,
      };
    }
    return photos;
  } catch (error) {
    if (directory.exists) directory.delete();
    throw error;
  }
}

export async function deletePosturePhotos(scanId: string): Promise<void> {
  const directory = scanDirectory(scanId);
  if (directory.exists) directory.delete();
}
