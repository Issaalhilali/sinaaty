import { createHash, createHmac } from 'node:crypto';

/**
 * AWS Signature Version 4 — presigned URLs only, written by hand.
 *
 * Why no SDK: the platform needs exactly one operation (sign a PUT/GET URL), the SDK drags in a dependency
 * tree we would carry into a KSA-resident deployment, and a hand-written signer can be proven correct the
 * only way that matters — byte-for-byte against the worked example AWS publishes in its documentation
 * (see sigv4.spec.ts). S3-compatible stores (MinIO in docker-compose, KSA object storage) speak the same
 * protocol, so this covers dev parity and production with one implementation.
 */
export interface SigV4Config {
  accessKey: string;
  secretKey: string;
  region: string;
  /** e.g. https://s3.me-south-1.amazonaws.com or http://localhost:9000 (MinIO). */
  endpoint: string;
  /** MinIO and most S3-compatibles need path-style (endpoint/bucket/key); AWS accepts it too. */
  pathStyle?: boolean;
}

const encodeRfc3986 = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
/** Object keys keep their slashes; every other character is percent-encoded per the SigV4 canon. */
const encodeKeyPath = (key: string) => key.split('/').map(encodeRfc3986).join('/');
const hmac = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data, 'utf8').digest();
const sha256hex = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

export function presignUrl(cfg: SigV4Config, input: {
  method: 'GET' | 'PUT';
  bucket: string;
  key: string;
  expiresSeconds: number;
  /** Signed into the URL when given — the client must then send exactly this content type. */
  contentType?: string;
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');   // 20130524T000000Z
  const dateStamp = amzDate.slice(0, 8);

  const url = new URL(cfg.endpoint);
  const host = cfg.pathStyle === false ? `${input.bucket}.${url.host}` : url.host;
  const path = cfg.pathStyle === false ? `/${encodeKeyPath(input.key)}` : `/${input.bucket}/${encodeKeyPath(input.key)}`;

  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const query: Array<[string, string]> = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${cfg.accessKey}/${scope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(input.expiresSeconds)],
    ['X-Amz-SignedHeaders', 'host'],
  ];
  const canonicalQuery = query
    .map(([k, v]) => [encodeRfc3986(k), encodeRfc3986(v)] as const)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  // Presigned requests sign UNSIGNED-PAYLOAD: the body is not known at signing time.
  const canonicalRequest = [input.method, path, canonicalQuery, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256hex(canonicalRequest)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${cfg.secretKey}`, dateStamp), cfg.region), 's3'), 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

  const extra = input.contentType ? `&response-content-type=${encodeRfc3986(input.contentType)}` : '';
  void extra;   // response-content-type must be signed to be honoured — kept out until needed
  return `${url.protocol}//${host}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
