# packages/

Shared TypeScript libraries (pnpm workspaces). Step 3 populated `shared-types/` and `ledger/`; `zatca-ubl/` (Step 8/20) and `ui-tokens/` (Step 12) come later.

- `shared-types/` — enums/DTOs mirrored from DB; OpenAPI → Dart codegen source
- `ledger/` — double-entry posting helpers (pure, framework-free)
- `zatca-ubl/` — UBL 2.1 XML + XAdES + QR TLV
- `ui-tokens/` — design tokens (colors, spacing, Arabic fonts)
