/**
 * Picture Upload Queue
 * Manages picture uploads to cloud storage with retry logic
 */

import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { db, generateId, nowISO } from '../../db/client';
import { pictures } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { supabase } from '../supabase';
import { isOnline } from './network';
import { DEFAULT_SYNC_CONFIG } from './types';

// Upload status types
export type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed';

// Queued upload item
export interface QueuedUpload {
  id: string;
  pictureId: string;
  localPath: string;
  remotePath: string | null;
  status: UploadStatus;
  progress: number; // 0-100
  retryCount: number;
  lastError: string | null;
  createdAt: string;
  thumbnailPath: string | null;
}

// In-memory upload queue
let uploadQueue: QueuedUpload[] = [];
let uploadListeners: ((queue: QueuedUpload[]) => void)[] = [];
let isProcessing = false;

// Thumbnail configuration
const THUMBNAIL_SIZE = { width: 200, height: 200 };
const THUMBNAIL_QUALITY = 0.7;

/**
 * Add a picture to the upload queue
 */
export async function queuePictureUpload(
  pictureId: string,
  localPath: string
): Promise<QueuedUpload> {
  // Generate thumbnail first
  const thumbnailPath = await generateThumbnail(localPath, pictureId);

  const upload: QueuedUpload = {
    id: generateId(),
    pictureId,
    localPath,
    remotePath: null,
    status: 'pending',
    progress: 0,
    retryCount: 0,
    lastError: null,
    createdAt: nowISO(),
    thumbnailPath,
  };

  uploadQueue.push(upload);
  notifyListeners();

  // Start processing if not already
  processQueue();

  return upload;
}

/**
 * Generate a thumbnail for a picture
 */
async function generateThumbnail(
  originalPath: string,
  pictureId: string
): Promise<string | null> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      originalPath,
      [{ resize: THUMBNAIL_SIZE }],
      { compress: THUMBNAIL_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Save thumbnail to app's cache directory
    const thumbnailDir = `${FileSystem.cacheDirectory}thumbnails/`;
    await FileSystem.makeDirectoryAsync(thumbnailDir, { intermediates: true });

    const thumbnailPath = `${thumbnailDir}${pictureId}_thumb.jpg`;
    await FileSystem.moveAsync({
      from: result.uri,
      to: thumbnailPath,
    });

    return thumbnailPath;
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    return null;
  }
}

/**
 * Get all queued uploads
 */
export function getQueuedUploads(): QueuedUpload[] {
  return [...uploadQueue];
}

/**
 * Get upload by picture ID
 */
export function getUploadByPictureId(pictureId: string): QueuedUpload | undefined {
  return uploadQueue.find((u) => u.pictureId === pictureId);
}

/**
 * Get pending upload count
 */
export function getPendingUploadCount(): number {
  return uploadQueue.filter((u) => u.status === 'pending' || u.status === 'uploading').length;
}

/**
 * Process the upload queue
 */
async function processQueue(): Promise<void> {
  if (isProcessing || !isOnline()) {
    return;
  }

  isProcessing = true;

  while (true) {
    // Get next pending upload
    const upload = uploadQueue.find((u) => u.status === 'pending');
    if (!upload) break;

    // Check if online
    if (!isOnline()) {
      break;
    }

    await processUpload(upload);
  }

  isProcessing = false;
}

/**
 * Process a single upload
 */
async function processUpload(upload: QueuedUpload): Promise<void> {
  try {
    upload.status = 'uploading';
    upload.progress = 0;
    notifyListeners();

    // Read file
    const fileInfo = await FileSystem.getInfoAsync(upload.localPath);
    if (!fileInfo.exists) {
      throw new Error('File not found');
    }

    // Get current user
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      throw new Error('User not authenticated');
    }

    const userId = session.session.user.id;
    const fileName = upload.localPath.split('/').pop() || `${upload.pictureId}.jpg`;
    const remotePath = `${userId}/${upload.pictureId}/${fileName}`;

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(upload.localPath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to Uint8Array for upload
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    upload.progress = 30;
    notifyListeners();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('pictures')
      .upload(remotePath, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      throw error;
    }

    upload.progress = 70;
    notifyListeners();

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('pictures')
      .getPublicUrl(remotePath);

    upload.remotePath = urlData.publicUrl;
    upload.progress = 90;
    notifyListeners();

    // Update local database
    await db
      .update(pictures)
      .set({
        storage_path: urlData.publicUrl,
        sync_status: 'synced',
        updated_at: nowISO(),
      })
      .where(eq(pictures.id, upload.pictureId));

    upload.status = 'uploaded';
    upload.progress = 100;
    notifyListeners();

    // Remove from queue after successful upload
    setTimeout(() => {
      uploadQueue = uploadQueue.filter((u) => u.id !== upload.id);
      notifyListeners();
    }, 2000);
  } catch (error) {
    console.error('Upload failed:', error);

    upload.retryCount++;
    upload.lastError = (error as Error).message;

    if (upload.retryCount >= DEFAULT_SYNC_CONFIG.maxRetries) {
      upload.status = 'failed';
    } else {
      upload.status = 'pending';
      // Schedule retry with exponential backoff
      const delay =
        DEFAULT_SYNC_CONFIG.baseRetryDelay * Math.pow(2, upload.retryCount - 1);
      setTimeout(() => processQueue(), Math.min(delay, DEFAULT_SYNC_CONFIG.maxRetryDelay));
    }

    notifyListeners();
  }
}

/**
 * Retry a failed upload
 */
export function retryUpload(uploadId: string): boolean {
  const upload = uploadQueue.find((u) => u.id === uploadId);
  if (upload && upload.status === 'failed') {
    upload.status = 'pending';
    upload.retryCount = 0;
    upload.lastError = null;
    notifyListeners();
    processQueue();
    return true;
  }
  return false;
}

/**
 * Cancel a pending upload
 */
export function cancelUpload(uploadId: string): boolean {
  const index = uploadQueue.findIndex((u) => u.id === uploadId);
  if (index !== -1 && uploadQueue[index].status !== 'uploading') {
    uploadQueue.splice(index, 1);
    notifyListeners();
    return true;
  }
  return false;
}

/**
 * Clear completed uploads from queue
 */
export function clearCompletedUploads(): void {
  uploadQueue = uploadQueue.filter((u) => u.status !== 'uploaded');
  notifyListeners();
}

/**
 * Clear failed uploads from queue
 */
export function clearFailedUploads(): void {
  uploadQueue = uploadQueue.filter((u) => u.status !== 'failed');
  notifyListeners();
}

/**
 * Subscribe to upload queue changes
 */
export function subscribeToUploadQueue(
  listener: (queue: QueuedUpload[]) => void
): () => void {
  uploadListeners.push(listener);
  return () => {
    uploadListeners = uploadListeners.filter((l) => l !== listener);
  };
}

/**
 * Notify listeners of queue changes
 */
function notifyListeners(): void {
  uploadListeners.forEach((listener) => listener([...uploadQueue]));
}

/**
 * Resume uploads when coming back online
 */
export function resumeUploads(): void {
  if (!isProcessing) {
    processQueue();
  }
}

/**
 * Get thumbnail path for a picture
 */
export function getThumbnailPath(pictureId: string): string | null {
  const upload = uploadQueue.find((u) => u.pictureId === pictureId);
  return upload?.thumbnailPath || null;
}

/**
 * Get upload progress for a picture
 */
export function getUploadProgress(pictureId: string): number {
  const upload = uploadQueue.find((u) => u.pictureId === pictureId);
  if (!upload) return 100; // Assume completed if not in queue
  return upload.progress;
}

/**
 * Check if a picture is currently uploading
 */
export function isPictureUploading(pictureId: string): boolean {
  const upload = uploadQueue.find((u) => u.pictureId === pictureId);
  return upload?.status === 'uploading';
}
