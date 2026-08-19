import { describe, expect, it } from 'vitest';
import { canonicalizeNode, canonicalizeXml, findElement, parseXml, removeElements } from '../c14n';

/** Canonicalization decides the invoice hash — every rule here is a rule ZATCA validates against. */
describe('XML canonicalization (C14N 1.1 subset)', () => {
  it('expands self-closing tags and keeps element order', () => {
    expect(canonicalizeXml('<a><b/><c>x</c></a>')).toBe('<a><b></b><c>x</c></a>');
  });
  it('sorts attributes: namespace declarations first (by prefix), then by namespace URI + local name', () => {
    const out = canonicalizeXml('<r z="1" a="2" xmlns:b="urn:b" xmlns:a="urn:a" b:k="3" a:k="4"/>');
    expect(out).toBe('<r xmlns:a="urn:a" xmlns:b="urn:b" a="2" z="1" a:k="4" b:k="3"></r>');
  });
  it('does not re-declare a namespace already visible from an ancestor', () => {
    expect(canonicalizeXml('<a xmlns:p="urn:p"><p:b xmlns:p="urn:p">x</p:b></a>')).toBe('<a xmlns:p="urn:p"><p:b>x</p:b></a>');
  });
  it('re-declares an inherited namespace when a subtree is canonicalized on its own (XAdES needs this)', () => {
    const root = parseXml('<a xmlns:ds="urn:ds"><ds:SignedInfo><ds:X>1</ds:X></ds:SignedInfo></a>');
    const si = findElement(root, 'SignedInfo')!;
    expect(canonicalizeNode(si)).toBe('<ds:SignedInfo><ds:X>1</ds:X></ds:SignedInfo>');
    // inside the document the declaration comes from the ancestor, so it is not repeated:
    expect(canonicalizeNode(root)).toContain('<a xmlns:ds="urn:ds"><ds:SignedInfo>');
  });
  it('escapes text and attributes per spec (and decodes entities on the way in)', () => {
    expect(canonicalizeXml('<a t="a&amp;b&#x9;c">x &lt; y &amp; z</a>')).toBe('<a t="a&amp;b&#x9;c">x &lt; y &amp; z</a>');
    expect(canonicalizeXml('<a>&gt;</a>')).toBe('<a>&gt;</a>');
  });
  it('preserves whitespace between elements (it is part of the signed bytes)', () => {
    expect(canonicalizeXml('<a>\n  <b>1</b>\n</a>')).toBe('<a>\n  <b>1</b>\n</a>');
  });
  it('removes the elements ZATCA excludes from the hash, leaving the rest untouched', () => {
    const root = parseXml('<Invoice><ext:UBLExtensions xmlns:ext="urn:e"><x/></ext:UBLExtensions><cbc:ID xmlns:cbc="urn:c">INV-1</cbc:ID></Invoice>');
    const stripped = removeElements(root, (n) => n.name.endsWith(':UBLExtensions'));
    expect(canonicalizeNode(stripped)).toBe('<Invoice><cbc:ID xmlns:cbc="urn:c">INV-1</cbc:ID></Invoice>');
  });
  it('refuses input it cannot canonicalize faithfully instead of guessing', () => {
    expect(() => canonicalizeXml('<a><!-- c --></a>')).toThrow(/comments/);
    expect(() => canonicalizeXml('<a><b></a>')).toThrow();
    expect(() => canonicalizeXml('<a>&unknown;</a>')).toThrow(/entity/);
  });
});
