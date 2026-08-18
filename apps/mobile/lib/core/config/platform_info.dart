import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
/// Device platform label sent to the API on login (devices.platform).
String platformName() => kIsWeb ? 'web' : Platform.isIOS ? 'ios' : 'android';
