import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { generateUUID } from '@fitness-studio/shared';
import { db } from '../db/client';
import { pictures, NewPicture } from '../db/schema';

export interface CameraResult {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileName: string;
  fileSize: number;
  exifTimestamp: string | null;
}

export interface ExifData {
  DateTimeOriginal?: string;
  DateTimeDigitized?: string;
  DateTime?: string;
  GPSLatitude?: number;
  GPSLongitude?: number;
}

/**
 * Request camera permissions
 */
export async function requestCameraPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
}

/**
 * Request media library permissions
 */
export async function requestMediaLibraryPermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

/**
 * Parse EXIF date string to ISO format
 * EXIF dates are typically in format: "YYYY:MM:DD HH:MM:SS"
 */
function parseExifDate(exifDate: string | undefined): string | null {
  if (!exifDate) return null;

  try {
    // EXIF format: "YYYY:MM:DD HH:MM:SS"
    const parts = exifDate.split(' ');
    if (parts.length !== 2) return null;

    const dateParts = parts[0].split(':');
    const timeParts = parts[1].split(':');

    if (dateParts.length !== 3 || timeParts.length !== 3) return null;

    const [year, month, day] = dateParts;
    const [hour, minute, second] = timeParts;

    const date = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10)
    );

    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Extract EXIF timestamp from image picker result
 */
function extractExifTimestamp(exif: ExifData | undefined | null): string | null {
  if (!exif) return null;

  // Try different EXIF date fields in order of preference
  const timestamp =
    parseExifDate(exif.DateTimeOriginal) ||
    parseExifDate(exif.DateTimeDigitized) ||
    parseExifDate(exif.DateTime);

  return timestamp;
}

/**
 * Take a photo using the camera
 */
export async function takePhoto(): Promise<CameraResult | null> {
  const hasPermission = await requestCameraPermissions();
  if (!hasPermission) {
    throw new Error('Camera permission not granted');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.8,
    exif: true,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const exifTimestamp = extractExifTimestamp(asset.exif as ExifData | undefined);

  // Get file info
  let fileSize = 0;
  try {
    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    if (fileInfo.exists && 'size' in fileInfo) {
      fileSize = fileInfo.size;
    }
  } catch {
    // Ignore file size errors
  }

  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType || 'image/jpeg',
    fileName: asset.fileName || `photo_${Date.now()}.jpg`,
    fileSize,
    exifTimestamp,
  };
}

/**
 * Pick a photo from the media library
 */
export async function pickPhoto(): Promise<CameraResult | null> {
  const hasPermission = await requestMediaLibraryPermissions();
  if (!hasPermission) {
    throw new Error('Media library permission not granted');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.8,
    exif: true,
  });

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const exifTimestamp = extractExifTimestamp(asset.exif as ExifData | undefined);

  // Get file info
  let fileSize = 0;
  try {
    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    if (fileInfo.exists && 'size' in fileInfo) {
      fileSize = fileInfo.size;
    }
  } catch {
    // Ignore file size errors
  }

  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType || 'image/jpeg',
    fileName: asset.fileName || `photo_${Date.now()}.jpg`,
    fileSize,
    exifTimestamp,
  };
}

/**
 * Save a picture to the local database
 */
export async function savePictureLocally(
  userId: string,
  cameraResult: CameraResult,
  pictureType: 'weight' | 'food' | 'progress' | 'other'
): Promise<string> {
  const id = generateUUID();
  const localId = generateUUID();
  const now = new Date().toISOString();

  const newPicture: NewPicture = {
    id,
    user_id: userId,
    storage_path: cameraResult.uri, // Local URI for now
    filename: cameraResult.fileName,
    mime_type: cameraResult.mimeType,
    size_bytes: cameraResult.fileSize,
    width: cameraResult.width,
    height: cameraResult.height,
    picture_type: pictureType,
    is_reviewed: false,
    review_status: 'pending',
    exif_timestamp: cameraResult.exifTimestamp,
    local_id: localId,
    sync_status: 'pending',
    created_at: now,
    updated_at: now,
  };

  await db.insert(pictures).values(newPicture);
  return id;
}

/**
 * Take a photo for weight tracking
 * - Captures photo
 * - Extracts EXIF timestamp
 * - Saves to pictures table with is_reviewed: false, picture_type: 'weight'
 */
export async function takeWeightPhoto(userId: string): Promise<{
  pictureId: string;
  exifTimestamp: string | null;
  uri: string;
} | null> {
  const photo = await takePhoto();
  if (!photo) return null;

  const pictureId = await savePictureLocally(userId, photo, 'weight');

  return {
    pictureId,
    exifTimestamp: photo.exifTimestamp,
    uri: photo.uri,
  };
}

/**
 * Pick a photo for weight tracking from library
 */
export async function pickWeightPhoto(userId: string): Promise<{
  pictureId: string;
  exifTimestamp: string | null;
  uri: string;
} | null> {
  const photo = await pickPhoto();
  if (!photo) return null;

  const pictureId = await savePictureLocally(userId, photo, 'weight');

  return {
    pictureId,
    exifTimestamp: photo.exifTimestamp,
    uri: photo.uri,
  };
}
