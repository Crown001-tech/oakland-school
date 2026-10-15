/**
 * Oakland International School - Supabase Storage Service
 * 
 * Provides unified, secure file storage abstraction for:
 * - Documents (Admission, birth certificates, credentials)
 * - Report cards (Generated terminal academic reports)
 * - Receipts (Fee payment slips and vouchers)
 * - Letters (Formal principal notices, queries, appointments)
 * - Staff documents (Qualifications, resumes, IDs)
 */

import { supabase, supabaseAdmin } from '../../config/supabase.js';

export type StorageBucket =
  | 'documents'
  | 'report-cards'
  | 'receipts'
  | 'letters'
  | 'staff-documents';

export interface FileUploadResult {
  path: string;
  url: string;
  bucket: StorageBucket;
}

class StorageService {
  private client = supabaseAdmin || supabase;

  /**
   * Upload a file buffer or blob to the designated Supabase bucket.
   */
  public async uploadFile(
    bucket: StorageBucket,
    filePath: string,
    fileData: Buffer | Uint8Array | Blob,
    contentType: string,
    upsert = true
  ): Promise<FileUploadResult> {
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .upload(filePath, fileData, {
          contentType,
          upsert,
        });

      if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      // Generate accessible URL
      const url = this.getPublicUrl(bucket, data.path);

      return {
        path: data.path,
        url,
        bucket,
      };
    } catch (err: any) {
      console.error(`[StorageService] Upload error to bucket "${bucket}":`, err.message);
      throw err;
    }
  }

  /**
   * Generates a secure, time-limited signed URL for private documents.
   * Default expiration: 1 hour (3600 seconds).
   */
  public async createSignedUrl(
    bucket: StorageBucket,
    filePath: string,
    expiresInSeconds = 3600
  ): Promise<string> {
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresInSeconds);

      if (error || !data) {
        throw new Error(`Failed to create signed URL: ${error?.message}`);
      }

      return data.signedUrl;
    } catch (err: any) {
      console.error(`[StorageService] Signed URL error for "${bucket}/${filePath}":`, err.message);
      throw err;
    }
  }

  /**
   * Returns the public URL for an asset (for public or direct-download assets).
   */
  public getPublicUrl(bucket: StorageBucket, filePath: string): string {
    const { data } = this.client.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  /**
   * Deletes a file from the specified bucket.
   */
  public async deleteFile(bucket: StorageBucket, filePath: string): Promise<boolean> {
    try {
      const { error } = await this.client.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.warn(`[StorageService] Delete warning: ${error.message}`);
        return false;
      }

      return true;
    } catch (err: any) {
      console.error(`[StorageService] Delete error:`, err.message);
      return false;
    }
  }

  /**
   * Downloads a file from the bucket as a Blob.
   */
  public async downloadFile(bucket: StorageBucket, filePath: string): Promise<Blob | null> {
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .download(filePath);

      if (error || !data) {
        throw new Error(`Download failed: ${error?.message}`);
      }

      return data;
    } catch (err: any) {
      console.error(`[StorageService] Download error:`, err.message);
      return null;
    }
  }

  /**
   * Checks or initializes a bucket if it does not yet exist.
   */
  public async ensureBucket(bucket: StorageBucket, isPublic = false): Promise<void> {
    try {
      const { data: buckets } = await this.client.storage.listBuckets();
      const exists = buckets?.some((b) => b.id === bucket);

      if (!exists) {
        const { error } = await this.client.storage.createBucket(bucket, {
          public: isPublic,
          fileSizeLimit: 10 * 1024 * 1024, // 10MB
        });

        if (error) {
          console.warn(`[StorageService] Could not auto-create bucket "${bucket}":`, error.message);
        } else {
          console.log(`[StorageService] ✓ Created storage bucket: "${bucket}"`);
        }
      }
    } catch (err: any) {
      console.warn(`[StorageService] Bucket check warning:`, err.message);
    }
  }
}

export const storageService = new StorageService();
