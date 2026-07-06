import JsBarcode from 'jsbarcode';
import { DOMImplementation, XMLSerializer } from '@xmldom/xmldom';

export function generateVinBarcodeSvg(vin: string): string {
  const normalized = vin.replace(/-/g, '').toUpperCase();
  const document = new DOMImplementation().createDocument('http://www.w3.org/1999/xhtml', 'html', null);
  const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  JsBarcode(svgNode, normalized, {
    xmlDocument: document as unknown as XMLDocument,
    format: 'CODE128',
    displayValue: false,
    height: 40,
    width: 1.5,
    margin: 0,
  });

  return new XMLSerializer().serializeToString(svgNode);
}
