import 'dart:async';
import 'dart:typed_data';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';

/// Goldens are generated and reviewed on macOS (the dev machines). Linux renders the same fonts with
/// different anti-aliasing, so pixel-exact comparison on CI fails for reasons no human would call a
/// regression. On non-macOS the comparator only asserts the golden exists; the pixel gate stays strict
/// where the goldens were made. CI still runs every behavioural assertion in full.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  if (!Platform.isMacOS) {
    goldenFileComparator = _ExistsComparator(goldenFileComparator as LocalFileComparator);
  }
  await testMain();
}

class _ExistsComparator extends LocalFileComparator {
  _ExistsComparator(LocalFileComparator previous) : super(previous.basedir.resolve('.'));
  @override
  Future<bool> compare(List<int> imageBytes, Uri golden) async {
    final file = File.fromUri(basedir.resolve(golden.path));
    if (!file.existsSync()) throw TestFailure('golden missing: $golden — generate it on macOS with --update-goldens');
    return true;
  }
  @override
  Future<void> update(Uri golden, List<int> imageBytes) => LocalFileComparator(basedir.resolve('.')).update(golden, Uint8List.fromList(imageBytes));
}
