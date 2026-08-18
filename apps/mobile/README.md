# apps/mobile — صناعتي (Flutter)

One codebase, three flavors: **customer** · **partner** (workshop / scrapyard / distributor / driver) · **fleet**.
Clean Architecture per feature (`features/<f>/{domain,data,presentation}`), enforced by `dart run import_lint`.

## Run
```bash
flutter pub get && flutter gen-l10n
flutter run --flavor customer --dart-define-from-file=env/dev.json -t lib/main_customer.dart
flutter run --flavor partner  --dart-define-from-file=env/dev.json -t lib/main_partner.dart
# iOS: create matching Xcode schemes (customer/partner/fleet) or run without --flavor using the entrypoint only.
```
API base URL comes from `env/<env>.json` (`API_BASE_URL`); the API must be reachable from the device (use your LAN IP, not localhost, on a phone).

## Checks (design review gate — CLAUDE.md §5.0 #10)
```bash
flutter analyze && dart run import_lint && flutter test
flutter test --update-goldens test/rtl_scaffold_golden_test.dart   # regenerate test/goldens/*.png (light/dark, RTL)
```

## Layout
- `core/` config (dart-define), theme (tokens from docs/design), l10n (ARB ar/en, `L10n`), routing (go_router + auth guard), api (dio + refresh interceptor + error envelope mapping), auth (secure token store), result (`Result<T>/Failure`), ui (shared components: AppScaffold, PrimaryButton, StatusBadge, SectionCard, EmptyState), di (Riverpod providers).
- `features/auth` OTP login (phone → code), session restore, sign-out. `features/home` flavor tab shell (3–4 tabs).
- `tool/gen_api.dart` → `core/api/generated/endpoints.dart` from OpenAPI (full model codegen tracked in docs/backlog.md).
