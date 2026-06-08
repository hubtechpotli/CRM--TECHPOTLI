import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client | null = null;
  private bucket: string;
  private region: string;
  private useLocal: boolean;
  private localDir: string;
  private backendUrl: string;

  constructor(config: ConfigService) {
    this.bucket = config.get('AWS_S3_BUCKET') || 'techpotli-local';
    this.region = config.get('AWS_REGION') || 'ap-south-1';
    const key = config.get('AWS_ACCESS_KEY_ID');
    this.useLocal = !key;
    this.localDir = path.join(process.cwd(), 'uploads');
    this.backendUrl = config.get('BACKEND_URL') || 'http://localhost:3001';
    if (this.useLocal) {
      fs.mkdirSync(this.localDir, { recursive: true });
      this.logger.warn('AWS not configured — using local uploads/ folder');
    } else {
      this.client = new S3Client({
        region: this.region,
        forcePathStyle: true,
        credentials: {
          accessKeyId: key!,
          secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY')!,
        },
      });
    }
  }

  async upload(buffer: Buffer, filename: string, mimeType: string, folder = 'files') {
    const key = `${folder}/${uuidv4()}-${filename}`;
    if (this.useLocal) {
      const full = path.join(this.localDir, key.replace(/\//g, path.sep));
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, buffer);
      return { key, url: `/api/uploads/local/${key}` };
    }
    try {
      await this.client!.send(
        new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer, ContentType: mimeType }),
      );
      const url = await getSignedUrl(this.client!, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: 3600 });
      return { key, url };
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string; Code?: string };
      if (e?.name === 'NoSuchBucket' || e?.Code === 'NoSuchBucket') {
        throw new BadGatewayException(
          `S3 bucket "${this.bucket}" not found. Create it in AWS Console (region ${this.region}) or fix AWS_S3_BUCKET in .env`,
        );
      }
      if (e?.name === 'AccessDenied' || e?.Code === 'AccessDenied') {
        throw new BadGatewayException('S3 access denied — check IAM policy is attached to your user');
      }
      throw new BadGatewayException(`S3 upload failed: ${e?.message || 'unknown error'}`);
    }
  }

  async getSignedUrl(key: string) {
    if (this.useLocal) return `/api/uploads/local/${key}`;
    return getSignedUrl(this.client!, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: 3600 });
  }

  /** Absolute URL the browser can open (S3 signed URL or backend local file route). */
  async getAccessUrl(key: string) {
    const signed = await this.getSignedUrl(key);
    if (signed.startsWith('http://') || signed.startsWith('https://')) return signed;
    return `${this.backendUrl}${signed.startsWith('/') ? '' : '/'}${signed}`;
  }

  localFileExists(key: string) {
    return fs.existsSync(this.getLocalPath(key));
  }

  getLocalPath(key: string) {
    return path.join(this.localDir, key.replace(/\//g, path.sep));
  }

  async download(key: string): Promise<Buffer> {
    if (this.useLocal) {
      const p = this.getLocalPath(key);
      if (!fs.existsSync(p)) throw new BadGatewayException(`File not found: ${key}`);
      return fs.readFileSync(p);
    }
    const res = await this.client!.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const body = res.Body;
    if (!body) throw new BadGatewayException(`Empty file: ${key}`);
    if (Buffer.isBuffer(body)) return body;
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(key: string) {
    if (this.useLocal) {
      const p = this.getLocalPath(key);
      if (fs.existsSync(p)) fs.unlinkSync(p);
      return;
    }
    await this.client!.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
