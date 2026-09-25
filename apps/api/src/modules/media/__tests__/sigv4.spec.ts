import { presignUrl } from '../infrastructure/sigv4';

/**
 * The signer is proven against the worked example AWS publishes in the SigV4 documentation
 * ("Authenticating Requests: Using Query Parameters"): examplebucket in us-east-1, the documented
 * test credentials, 24 May 2013, an 86400-second GET of /test.txt — with the exact signature the
 * documentation prints. If this test passes, the implementation is correct by AWS's own arithmetic.
 */
describe('SigV4 presigning', () => {
  const AWS_DOC_EXAMPLE = {
    accessKey: 'AKIAIOSFODNN7EXAMPLE',
    secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    region: 'us-east-1',
    endpoint: 'https://s3.amazonaws.com',
    pathStyle: false as const,
  };

  it('reproduces the documented AWS example signature byte for byte', () => {
    const url = presignUrl(AWS_DOC_EXAMPLE, {
      method: 'GET', bucket: 'examplebucket', key: 'test.txt',
      expiresSeconds: 86400, now: new Date(Date.UTC(2013, 4, 24, 0, 0, 0)),
    });
    expect(url).toContain('https://examplebucket.s3.amazonaws.com/test.txt?');
    expect(url).toContain('X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request');
    expect(url).toContain('X-Amz-Date=20130524T000000Z');
    expect(url).toContain('X-Amz-Expires=86400');
    expect(url).toContain('X-Amz-SignedHeaders=host');
    // The exact signature printed in the AWS documentation for this request.
    expect(url).toContain('X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404');
  });

  it('path-style URLs (MinIO and S3-compatibles) keep the bucket in the path', () => {
    const url = presignUrl({ ...AWS_DOC_EXAMPLE, endpoint: 'http://localhost:9000', pathStyle: true }, {
      method: 'PUT', bucket: 'sinaaty-media', key: 'inspection/2026-08-20/abc.jpg', expiresSeconds: 900,
    });
    expect(url.startsWith('http://localhost:9000/sinaaty-media/inspection/2026-08-20/abc.jpg?')).toBe(true);
    expect(url).toContain('X-Amz-Signature=');
  });

  it('percent-encodes key segments but never the slashes between them', () => {
    const url = presignUrl({ ...AWS_DOC_EXAMPLE, endpoint: 'http://localhost:9000', pathStyle: true }, {
      method: 'GET', bucket: 'b', key: 'a b/c+d/e(f).png', expiresSeconds: 60,
    });
    expect(url).toContain('/b/a%20b/c%2Bd/e%28f%29.png?');
  });

  it('two calls at different moments sign differently — the date is part of the signature', () => {
    const at = (h: number) => presignUrl(AWS_DOC_EXAMPLE, { method: 'GET', bucket: 'examplebucket', key: 'test.txt', expiresSeconds: 300, now: new Date(Date.UTC(2026, 7, 20, h)) });
    const a = at(10); const b = at(11);
    expect(a).not.toBe(b);
    expect(a.split('X-Amz-Signature=')[1]).not.toBe(b.split('X-Amz-Signature=')[1]);
  });
});
