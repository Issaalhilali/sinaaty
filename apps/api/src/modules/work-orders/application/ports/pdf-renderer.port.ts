import type { Snapshot } from '../../domain/snapshot';
export interface RenderedDocument { bytes: Buffer; mimeType: 'application/pdf' | 'text/html'; }
/** Renders the approved version as an Arabic RTL document. Live adapter = Puppeteer (PDF/A); mock = HTML. */
export interface PdfRendererPort { renderWorkOrderVersion(snapshot: Snapshot, opts: { signed: boolean; signedAt?: Date | null; signatureRef?: string | null }): Promise<RenderedDocument> }
export const PDF_RENDERER_PORT = Symbol('PDF_RENDERER_PORT');
