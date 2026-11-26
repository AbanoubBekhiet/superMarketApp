import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { STRINGS } from '@/constants/strings';
import { deleteStorageImage, uploadStorageFileUri } from '@/services/firebase/app';

function resolveImageExt(mimeType: string, uri: string): string {
  const fromMime =
    mimeType.includes('/') && !mimeType.endsWith('/*')
      ? mimeType.split('/')[1]?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg'
      : uri.split('.').pop()?.split('?')[0]?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
  return fromMime === 'jpeg' ? 'jpg' : fromMime;
}

/**
 * Builds an organized R2 object key under `<folder>/<entityId>/...` and uploads the image.
 */
export async function uploadEntityImageUri(params: {
  folder: 'products' | 'categories';
  suffix: 'prod' | 'cat';
  entityId: string;
  uri: string;
  mimeType?: string;
  base64?: string | null;
  requireEntityId?: boolean;
}): Promise<string> {
  const cleanId = params.entityId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (params.requireEntityId && !cleanId) {
    throw new Error('معرف العنصر غير صالح لرفع الصورة');
  }
  const safeMime = params.mimeType ?? 'image/jpeg';
  const ext = resolveImageExt(safeMime, params.uri);
  const directory = cleanId ? `${params.folder}/${cleanId}` : params.folder;
  return uploadStorageFileUri(
    `${directory}/${Date.now()}-${params.suffix}.${ext}`,
    params.uri,
    safeMime,
    params.base64,
  );
}

/**
 * Prompts the user to pick an image from the library, shows a preview, uploads it to R2,
 * and cleans up any previous unsaved draft upload.
 */
export async function pickAndUploadEntityImage(params: {
  previousSavedImageUrl?: string | null;
  currentImageUrl: string | null;
  resolveEntityId: () => string;
  uploadImage: (targetId: string, uri: string, mimeType: string, base64?: string | null) => Promise<string>;
  onPreview: (uri: string | null) => void;
  onUploadingChange: (loading: boolean) => void;
  onUploaded: (url: string) => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}): Promise<void> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    params.onError('يرجى السماح بصلاحية الوصول إلى الصور');
    return;
  }

  let asset: ImagePicker.ImagePickerAsset | undefined;
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.75,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    asset = result.assets[0];
  } catch (err) {
    const msg = err instanceof Error ? err.message : STRINGS.common.errorMessage;
    params.onError(msg || STRINGS.common.errorMessage);
    return;
  }

  const previousDraftUpload =
    params.currentImageUrl && params.currentImageUrl !== params.previousSavedImageUrl
      ? params.currentImageUrl
      : null;

  // On native, ImagePicker encodes base64 payloads via JPEG compression regardless of source mimeType.
  const effectiveMimeType =
    Platform.OS !== 'web' && asset.base64
      ? 'image/jpeg'
      : (asset.mimeType ?? 'image/jpeg');

  params.onPreview(asset.uri);
  params.onUploadingChange(true);
  try {
    const targetId = params.resolveEntityId();
    const url = await params.uploadImage(targetId, asset.uri, effectiveMimeType, asset.base64);
    if (previousDraftUpload && previousDraftUpload !== url) {
      void deleteStorageImage(previousDraftUpload).catch(() => undefined);
    }
    params.onUploaded(url);
    params.onSuccess();
  } catch (err) {
    const msg = err instanceof Error ? err.message : STRINGS.common.errorMessage;
    params.onError(msg || STRINGS.common.errorMessage);
    params.onPreview(null);
  } finally {
    params.onUploadingChange(false);
  }
}
