import 'dart:async';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../di/core_providers.dart';
import 'package:record/record.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

/// On-device dictation (the system engine, Arabic first). Dictation is an input method the user
/// owns — the app itself sends no audio anywhere; our raw recording goes only to our own storage
/// (voice-input scope §4, mirrored in docs/integrations/speech.md). Injectable so tests and
/// simulators speak through a fake.
abstract interface class VoiceInput {
  /// Initializes the engine and asks for permission. False = no dictation on this device;
  /// callers hide their mic entirely (an entry point must never lead to a dead end).
  Future<bool> init();
  /// Starts listening; emits the growing transcript (partials included). Closes on final result.
  Stream<String> start({String localeId});
  Future<void> stop();
}

class SystemVoiceInput implements VoiceInput {
  final _engine = stt.SpeechToText();
  StreamController<String>? _out;
  @override Future<bool> init() async { try { return await _engine.initialize(); } catch (_) { return false; } }
  @override Stream<String> start({String localeId = 'ar-SA'}) {
    final out = _out = StreamController<String>();
    // A dying engine must END the stream, never hang it: some simulators accept init then
    // kill the session instantly — the sheet turns that into its dev typed fallback.
    _engine.errorListener = (_) { if (!out.isClosed) out.close(); };
    try {
      _engine.listen(
        listenOptions: stt.SpeechListenOptions(partialResults: true, listenMode: stt.ListenMode.dictation, localeId: localeId, pauseFor: const Duration(seconds: 4)),
        onResult: (r) { if (!out.isClosed) out.add(r.recognizedWords); if (r.finalResult && !out.isClosed) out.close(); },
      ).catchError((_) { if (!out.isClosed) out.close(); });
    } catch (_) { if (!out.isClosed) out.close(); }
    return out.stream;
  }
  @override Future<void> stop() async { await _engine.stop(); await _out?.close(); }
}

/// The raw voice file, recorded in parallel with dictation — uploaded as the legal trail
/// (the API's voice_note media, which POST /voice-notes requires BEFORE the call).
abstract interface class VoiceRecorder {
  Future<bool> begin();
  /// Stops and returns the recorded bytes (m4a), or null if nothing was captured.
  Future<Uint8List?> finish();
}

class SystemVoiceRecorder implements VoiceRecorder {
  final _rec = AudioRecorder();
  @override Future<bool> begin() async {
    try {
      if (!await _rec.hasPermission()) return false;
      await _rec.start(const RecordConfig(encoder: AudioEncoder.aacLc, bitRate: 64000, sampleRate: 22050),
        path: '${Directory.systemTemp.path}/vn_${DateTime.now().millisecondsSinceEpoch}.m4a');
      return true;
    } catch (_) { return false; }
  }
  @override Future<Uint8List?> finish() async {
    try { final p = await _rec.stop(); if (p == null) return null; return await File(p).readAsBytes(); } catch (_) { return null; }
  }
}

final voiceInputProvider = Provider<VoiceInput>((_) => SystemVoiceInput());
final voiceRecorderProvider = Provider<VoiceRecorder>((_) => SystemVoiceRecorder());

/// How voice input works on THIS device: the system engine, a dev-only typed stand-in (simulators
/// often lack SFSpeechRecognizer — dev demos must not lose the mic), or nothing at all.
/// typedDev never leaves dev: production hides the mic exactly as before.
enum VoiceMode { system, typedDev, none }
final voiceModeProvider = FutureProvider<VoiceMode>((ref) async {
  if (await ref.watch(voiceInputProvider).init()) return VoiceMode.system;
  return ref.watch(appConfigProvider).appEnv == 'dev' ? VoiceMode.typedDev : VoiceMode.none;
});
/// Resolved once per session: does this device take voice input? Drives every mic's existence.
final voiceAvailableProvider = FutureProvider<bool>((ref) async => (await ref.watch(voiceModeProvider.future)) != VoiceMode.none);
