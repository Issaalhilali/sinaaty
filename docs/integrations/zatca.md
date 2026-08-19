# ZATCA Fatoora (E-invoicing) — Phase 2

Port: `apps/api/src/modules/invoicing/application/ports/zatca.port.ts` · adapters: `zatca.mock.adapter.ts` (dev/test),
`zatca.sandbox.adapter.ts` (sandbox/live HTTP). Selected by `INTEGRATION_ZATCA=mock|sandbox|live`, base URL in
`ZATCA_BASE_URL`.

## What is implemented (crypto, not stubs)
| Piece | Where | Verified by |
|---|---|---|
| UBL 2.1 invoice / credit note / debit note (`388/381/383`, subtype `0100000` standard, `0200000` simplified) | `packages/zatca-ubl/src/ubl.ts` | e2e + unit |
| XML canonicalization (C14N 1.1 subset) | `src/c14n.ts` | 8 unit tests (attribute order, namespace inheritance, escaping, whitespace, refusal to guess) |
| Invoice hash = SHA-256 of the canonical XML **minus** UBLExtensions, the QR reference and any signature | `src/hash.ts` | unit: hash unchanged by the QR, changed by any signed field |
| XAdES-B-B signature: invoice digest → SignedProperties digest → ECDSA-SHA256 over canonical SignedInfo, raw `r‖s` | `src/sign.ts` | signs with a real secp256k1 certificate and verifies independently; tampering breaks it |
| QR TLV tags 1–9 (hash, signature, public key, CA signature) | `src/qr.ts` | decodes back to the same values, Arabic seller names counted as bytes |
| PKCS#10 CSR: secp256k1, challengePassword (OTP), template OID `1.3.6.1.4.1.311.20.2`, SAN directoryName (SN/UID/title/address/category) | `src/csr.ts` | **OpenSSL verifies the CSR** and shows the curve, template and UID |
| ICV + PIH chain per EGS device, advanced under a row lock | `zatca.service.ts` + `zatca.prisma-repository.ts` | e2e: invoice 2's PIH equals invoice 1's hash, inside the signed bytes |
| Clearance (B2B) vs reporting (B2C), submission log, automatic submission on issue via the outbox | `zatca.service.ts`, `zatca.handlers.ts` | e2e |

The CSID (private key + certificate) is stored **AES-256-GCM encrypted** (`PiiCryptoService`); the e2e asserts the
stored bytes contain no clear-text key.

## Onboarding (one call per EGS unit)
`POST /v1/organizations/:orgId/zatca/onboard { unit_name, otp }` →
CSR → **compliance CSID** → ZATCA replays a signed compliance document → **production CSID** → device stored.
The OTP comes from the Fatoora portal and is the only human input.

## Runtime
`InvoiceIssued` (outbox) → sign → clear/report → persist `zatca_hash`, `zatca_qr`, `zatca_xml`, `zatca_icv`,
`zatca_pih` and a `zatca_submissions` row. A rejection **does not** advance the chain and marks the invoice
`rejected`; the outbox retries with backoff and dead-letters into the admin integrations monitor.
Manual retry: `POST /v1/invoices/:id/zatca/submit` (idempotent).

## Before going live — must be re-checked against the portal
1. **Endpoint paths and payload field names** of the Fatoora API (`/compliance`, `/production/csids`,
   `/invoices/clearance/single`, `/invoices/reporting/single`) — written from the published contract, not yet
   exercised against the sandbox from this machine.
2. **The certificate template name** (`TSTZATCA-Code-Signing` sandbox vs `ZATCA-Code-Signing` production).
3. Business rules validation (BR-KSA-*) beyond signature/hash — ZATCA returns them as warnings/errors, which are
   already stored per submission but not yet mapped to Arabic messages.
4. Archiving: `zatca_xml` is kept in the database (6-year retention); moving it to cold object storage is backlog.
