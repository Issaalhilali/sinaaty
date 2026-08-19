/**
 * XML canonicalization (W3C C14N 1.1 subset) + the ZATCA transforms.
 *
 * Why hand-written: the invoice hash — the value the customer's QR proves and ZATCA validates — is the SHA-256 of
 * the *canonical* XML. Canonicalization must be exact: namespace declarations inherited and sorted, attributes
 * sorted (namespace declarations first, then by namespace URI + local name), self-closing tags expanded, text
 * escaped per spec, whitespace between elements preserved as-is. A "close enough" implementation silently produces
 * an invoice that ZATCA rejects, so the rules are implemented explicitly and unit-tested.
 *
 * Supported input: the documents this package generates (no comments, no processing instructions, no CDATA,
 * no DTD). `parseXml` throws on anything it does not understand rather than guessing.
 */
export interface XmlNode { name: string; attrs: Array<{ name: string; value: string }>; children: Array<XmlNode | string> }

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function unescapeXml(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (m, e: string) => {
    if (e.startsWith('#x')) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith('#')) return String.fromCodePoint(Number(e.slice(1)));
    const v = ENTITIES[e]; if (v === undefined) throw new SyntaxError(`unknown entity ${m}`); return v;
  });
}
/** Text nodes: & < > escaped, plus CR (spec: #xD must survive as a character reference). */
const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#xD;');
/** Attribute values: also " and the tab/newline/CR characters. */
const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/\t/g, '&#x9;').replace(/\n/g, '&#xA;').replace(/\r/g, '&#xD;');

export function parseXml(xml: string): XmlNode {
  let i = 0; const src = xml.trim().replace(/^<\?xml[^?]*\?>\s*/, '');
  if (/<!--|<!\[CDATA\[|<!DOCTYPE|<\?/.test(src)) throw new SyntaxError('comments, CDATA, DTD and processing instructions are not supported');
  const stack: XmlNode[] = []; let root: XmlNode | null = null;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    if (lt === -1) break;
    if (lt > i) { const text = src.slice(i, lt); if (stack.length) stack[stack.length - 1]!.children.push(unescapeXml(text)); }
    const gt = findTagEnd(src, lt);
    const tag = src.slice(lt + 1, gt).trim();
    i = gt + 1;
    if (tag.startsWith('/')) { const node = stack.pop(); if (!node || node.name !== tag.slice(1).trim()) throw new SyntaxError(`mismatched close tag </${tag.slice(1)}>`); if (!stack.length) root = node; continue; }
    const selfClosing = tag.endsWith('/');
    const body = selfClosing ? tag.slice(0, -1).trim() : tag;
    const node = parseTag(body);
    if (stack.length) stack[stack.length - 1]!.children.push(node); else if (root && !selfClosing) throw new SyntaxError('multiple roots');
    if (selfClosing) { if (!stack.length) root = node; } else stack.push(node);
  }
  if (stack.length) throw new SyntaxError(`unclosed element <${stack[stack.length - 1]!.name}>`);
  if (!root) throw new SyntaxError('no root element');
  return root;
}
function findTagEnd(src: string, from: number): number {
  let inQuote: string | null = null;
  for (let j = from + 1; j < src.length; j++) { const c = src[j]!; if (inQuote) { if (c === inQuote) inQuote = null; } else if (c === '"' || c === "'") inQuote = c; else if (c === '>') return j; }
  throw new SyntaxError('unterminated tag');
}
function parseTag(body: string): XmlNode {
  const m = /^([^\s/>]+)/.exec(body); if (!m) throw new SyntaxError(`bad tag: ${body}`);
  const name = m[1]!; const attrs: Array<{ name: string; value: string }> = [];
  const re = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g; let a: RegExpExecArray | null;
  while ((a = re.exec(body.slice(name.length))) !== null) attrs.push({ name: a[1]!, value: unescapeXml(a[3] ?? a[4] ?? '') });
  return { name, attrs, children: [] };
}

/** Namespace URI for a prefix, walking the inherited declarations. */
type NsMap = Map<string, string>;
const nsOf = (name: string) => (name.includes(':') ? name.split(':')[0]! : '');
function localOf(name: string) { return name.includes(':') ? name.split(':').slice(1).join(':') : name; }

/**
 * C14N serialization. `inherited` carries namespace declarations from ancestors so that a subtree
 * (SignedInfo, SignedProperties) canonicalizes exactly as it would inside the full document.
 */
export function canonicalizeNode(node: XmlNode, inherited: NsMap = new Map()): string {
  const declared: NsMap = new Map(inherited);
  const nsDecls: Array<{ name: string; value: string }> = [];
  const others: Array<{ name: string; value: string }> = [];
  for (const at of node.attrs) {
    if (at.name === 'xmlns' || at.name.startsWith('xmlns:')) {
      const prefix = at.name === 'xmlns' ? '' : at.name.slice(6);
      if (declared.get(prefix) !== at.value) { nsDecls.push(at); declared.set(prefix, at.value); }
    } else others.push(at);
  }
  // Prefixes declared by an ancestor stay visible through `inherited`, so they are not re-emitted here
  // (C14N rule: a namespace node is rendered only when it differs from the nearest ancestor's).
  nsDecls.sort((x, y) => (x.name === 'xmlns' ? '' : x.name.slice(6)).localeCompare(y.name === 'xmlns' ? '' : y.name.slice(6)));
  others.sort((x, y) => { const ux = declared.get(nsOf(x.name)) ?? ''; const uy = declared.get(nsOf(y.name)) ?? ''; return ux === uy ? localOf(x.name).localeCompare(localOf(y.name)) : ux.localeCompare(uy); });
  const attrStr = [...nsDecls, ...others].map((a) => ` ${a.name}="${escapeAttr(a.value)}"`).join('');
  const inner = node.children.map((c) => (typeof c === 'string' ? escapeText(c) : canonicalizeNode(c, declared))).join('');
  return `<${node.name}${attrStr}>${inner}</${node.name}>`;
}
export function canonicalizeXml(xml: string): string { return canonicalizeNode(parseXml(xml)); }

/** Depth-first search by qualified name (namespace prefix included, as generated). */
export function findElement(node: XmlNode, localName: string): XmlNode | null {
  if (localOf(node.name) === localName) return node;
  for (const c of node.children) if (typeof c !== 'string') { const f = findElement(c, localName); if (f) return f; }
  return null;
}
export function removeElements(node: XmlNode, predicate: (n: XmlNode) => boolean): XmlNode {
  return { name: node.name, attrs: node.attrs, children: node.children.filter((c) => typeof c === 'string' || !predicate(c)).map((c) => (typeof c === 'string' ? c : removeElements(c, predicate))) };
}
