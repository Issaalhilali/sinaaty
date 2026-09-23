import 'package:flutter_test/flutter_test.dart';
import 'package:sinaaty/core/api/upload_url.dart';

void main() {
  test('a loopback upload URL is re-pointed at the API host the app talks to', () {
    expect(reachableUploadUrl('http://localhost:3000/v1/media/mock-upload/b/k%2Fx', 'http://10.0.2.2:3000/v1'), 'http://10.0.2.2:3000/v1/media/mock-upload/b/k%2Fx');
    expect(reachableUploadUrl('http://127.0.0.1:3000/u', 'https://api.sinaaty.sa/v1'), 'https://api.sinaaty.sa/u');
  });
  test('real storage URLs pass through untouched', () {
    const s3 = 'https://s3.me-south-1.amazonaws.com/sinaaty-media/k?X-Amz-Signature=abc';
    expect(reachableUploadUrl(s3, 'http://10.0.2.2:3000/v1'), s3);
    expect(reachableUploadUrl('mock://x', 'http://10.0.2.2:3000/v1'), 'mock://x');
  });
}
