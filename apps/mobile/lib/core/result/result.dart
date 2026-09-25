/// Result type used across layers — use cases never throw across boundaries (CLAUDE.md §5.5).
sealed class Result<T> {
  const Result();
  const factory Result.ok(T value) = Ok<T>;
  const factory Result.err(Failure failure) = Err<T>;
  bool get isOk => this is Ok<T>;
  T? get valueOrNull => switch (this) { Ok<T>(:final value) => value, Err<T>() => null };
  Failure? get failureOrNull => switch (this) { Err<T>(:final failure) => failure, Ok<T>() => null };
  R when<R>({required R Function(T value) ok, required R Function(Failure failure) err}) =>
      switch (this) { Ok<T>(:final value) => ok(value), Err<T>(:final failure) => err(failure) };
  Result<R> map<R>(R Function(T value) f) => switch (this) { Ok<T>(:final value) => Result.ok(f(value)), Err<T>(:final failure) => Result.err(failure) };
}
final class Ok<T> extends Result<T> { final T value; const Ok(this.value); }
final class Err<T> extends Result<T> { final Failure failure; const Err(this.failure); }

/// Failures mirror the API error envelope {code, message_ar, message_en, details} plus client-side kinds.
sealed class Failure {
  final String code; final String messageAr; final String messageEn; final Object? details;
  const Failure(this.code, this.messageAr, this.messageEn, [this.details]);
  String message(String locale) => locale == 'ar' ? messageAr : messageEn;
}
final class ApiFailure extends Failure { final int status; const ApiFailure(this.status, super.code, super.messageAr, super.messageEn, [super.details]); }
/// انقطاع الوصول: قد يكون الجهاز بلا شبكة، وقد تكون الشبكة سليمة والخادم بعيداً عن المتناول.
/// النص كان يجزم بالأول («لا يوجد اتصال بالإنترنت») بينما الجهاز متصل والعنوان هو المعطوب — فيبحث
/// صاحبه في المكان الخطأ. الصيغة الآن تصف ما نعرفه فعلاً وتذكر ما يُتحقَّق منه.
final class NetworkFailure extends Failure { const NetworkFailure() : super('NETWORK', 'تعذّر الوصول إلى الخادم. تحقّق من اتصالك ثم أعد المحاولة.', 'Could not reach the server. Check your connection and try again.'); }
final class UnauthorizedFailure extends Failure { const UnauthorizedFailure() : super('UNAUTHORIZED', 'انتهت الجلسة، سجّل الدخول مجدداً.', 'Session expired, please sign in again.'); }
final class ValidationFailure extends Failure { const ValidationFailure(String ar, String en, [Object? d]) : super('VALIDATION', ar, en, d); }
final class UnknownFailure extends Failure { const UnknownFailure([Object? d]) : super('UNKNOWN', 'حدث خطأ غير متوقع، حاول مرة أخرى.', 'Something went wrong.', d); }
