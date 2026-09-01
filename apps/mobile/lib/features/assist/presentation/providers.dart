import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/di/core_providers.dart';
import '../data/assist_repository_impl.dart';
import '../domain/assist.dart';

final assistRepositoryProvider = Provider<AssistRepository>((ref) => AssistRepositoryImpl(ref.watch(apiClientProvider).dio));
