import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../l10n/app_localizations.dart';
import '../../result/result.dart';
import 'inline_error.dart';
/// Renders `AsyncValue<Result<T>>`: loading never blocks the whole screen; errors say what to do next.
class AsyncResultView<T> extends StatelessWidget {
  final AsyncValue<Result<T>> value; final Widget Function(T data) builder; final VoidCallback onRetry;
  const AsyncResultView({super.key, required this.value, required this.builder, required this.onRetry});
  @override Widget build(BuildContext context) {
    final l = L10n.of(context); final locale = Localizations.localeOf(context).languageCode;
    return value.when(
      loading: () => const InlineLoading(),
      error: (_, _) => InlineError(message: l.errorGeneric, retryLabel: l.retry, onRetry: onRetry),
      data: (r) => r.when(ok: builder, err: (f) => InlineError(icon: f is NetworkFailure ? Icons.cloud_off_outlined : Icons.error_outline, message: f.message(locale), retryLabel: l.retry, onRetry: onRetry)),
    );
  }
}
