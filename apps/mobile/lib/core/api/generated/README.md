# Generated API client

`dart run tool/gen_api.dart` fetches `packages/shared-types/openapi.json` (or `$API_BASE_URL/docs/openapi.json`)
and writes `endpoints.dart` (typed path constants + operation ids). Full model/codegen via `openapi-generator`
(needs Java) is tracked in docs/backlog.md; until then feature `data/` layers use `ApiClient` + hand-written DTOs.
