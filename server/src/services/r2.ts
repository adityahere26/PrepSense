import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'prepsense-resumes';

let s3Client: S3Client | null = null;

if (R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Uploads a file buffer to Cloudflare R2 bucket.
 * Returns the stored key / file location identifier.
 */
export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  userId: string
): Promise<string> {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `resumes/${userId}/${Date.now()}-${sanitizedFileName}`;

  if (!s3Client) {
    console.warn('⚠️ Cloudflare R2 credentials missing. Falling back to local URL format.');
    return `https://storage.prepsense.internal/${key}`;
  }

  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await s3Client.send(command);

    const fileUrl = `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
    return fileUrl;
  } catch (error) {
    console.error('Failed to upload file to Cloudflare R2:', error);
    return `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
  }
}

/**
 * Generates a presigned GET URL for viewing/downloading an R2 file object securely.
 */
export async function getR2SignedUrl(fileUrlOrKey: string): Promise<string> {
  if (!s3Client || !fileUrlOrKey) {
    return fileUrlOrKey;
  }

  try {
    let key = fileUrlOrKey;
    if (fileUrlOrKey.startsWith('http://') || fileUrlOrKey.startsWith('https://')) {
      const urlObj = new URL(fileUrlOrKey);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts[0] === R2_BUCKET_NAME) {
        key = pathParts.slice(1).join('/');
      } else {
        key = pathParts.join('/');
      }
    }

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    // Signed URL valid for 24 hours (86400 seconds)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 86400 });
    return signedUrl;
  } catch (error) {
    console.error('Failed to generate presigned URL for R2 object:', error);
    return fileUrlOrKey;
  }
}

/**
 * Fetches the raw file Buffer from Cloudflare R2 bucket.
 */
export async function getBufferFromR2(fileUrlOrKey: string): Promise<Buffer | null> {
  if (!fileUrlOrKey) return null;

  if (s3Client) {
    try {
      let key = fileUrlOrKey;
      if (fileUrlOrKey.startsWith('http://') || fileUrlOrKey.startsWith('https://')) {
        const urlObj = new URL(fileUrlOrKey);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts[0] === R2_BUCKET_NAME) {
          key = pathParts.slice(1).join('/');
        } else {
          key = pathParts.join('/');
        }
      }

      const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);
      if (response.Body) {
        const byteArray = await response.Body.transformToByteArray();
        return Buffer.from(byteArray);
      }
    } catch (error) {
      console.warn('Failed to fetch file buffer directly from S3 client, trying HTTP fetch...', error);
    }
  }

  try {
    const signedUrl = await getR2SignedUrl(fileUrlOrKey);
    const res = await fetch(signedUrl);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
  } catch (err) {
    console.error('Failed to fetch buffer via HTTP:', err);
  }

  return null;
}

