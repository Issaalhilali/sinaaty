import type { Invoice } from '../../domain/invoice';
export interface InvoiceRendererPort { render(invoice: Invoice, opts: { qrBase64: string; xml: string }): Promise<{ bytes: Buffer; mimeType: 'application/pdf' | 'text/html' }> }
export const INVOICE_RENDERER_PORT = Symbol('INVOICE_RENDERER_PORT');
