import { Client } from "minio";
import { env } from "../config/env";

export const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export class MinioService {
  /**
   * Ensures the bucket exists before any operation.
   */
  private static async ensureBucket(bucket: string): Promise<void> {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket);
    }
  }

  /**
   * Upload a file to MinIO.
   * Accepts a Web API File, a Buffer, or a ReadableStream.
   */
  static async uploadFile(
    bucket: string,
    path: string,
    file: File | Buffer,
  ): Promise<string> {
    await this.ensureBucket(bucket);

    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await minioClient.putObject(bucket, path, buffer, buffer.length, {
        "Content-Type": file.type || "application/octet-stream",
      });
    } else {
      await minioClient.putObject(bucket, path, file, file.length);
    }

    return path;
  }

  /**
   * Get file content as Buffer.
   */
  static async getFileBuffer(bucket: string, path: string): Promise<Buffer> {
    const stream = await minioClient.getObject(bucket, path);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }

  /**
   * Get a presigned URL for downloading a file (default 1 hour expiry).
   */
  static async getFileUrl(
    bucket: string,
    path: string,
    expirySeconds = 3600,
  ): Promise<string> {
    return minioClient.presignedGetObject(bucket, path, expirySeconds);
  }

  /**
   * Returns the canonical path (non-presigned) for storage reference.
   */
  static getFilePath(bucket: string, path: string): string {
    return `${bucket}/${path}`;
  }

  /**
   * Delete a file from MinIO.
   */
  static async deleteFile(bucket: string, path: string): Promise<void> {
    await minioClient.removeObject(bucket, path);
  }
}
