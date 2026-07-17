import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export interface ReceiptData {
  hash: string;
  contractId: string;
  issuer: string;
  /** ISO 8601 UTC timestamp of the confirmed anchor. */
  timestampIso: string;
}

const MARGIN = 20;
const PAGE_WIDTH = 210; // A4, mm
const PAGE_HEIGHT = 297; // A4, mm
const USABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;

const EXPLORER_BASE_URL = "https://stellar.expert/explorer/testnet/contract";
const QR_SIZE = 32; // mm, square
const QR_CAPTION = "[ SCAN TO VERIFY STATE ON STELLAR EXPERT ]";

const FIELDS: Array<[label: string, value: (data: ReceiptData) => string]> = [
  ["DOCUMENT HASH (SHA-256)", (d) => d.hash],
  ["NETWORK", () => "Stellar Soroban Testnet"],
  ["SMART CONTRACT ID", (d) => d.contractId],
  ["ISSUER WALLET ADDRESS", (d) => d.issuer],
  ["UTC TIMESTAMP OF ANCHOR", (d) => d.timestampIso],
];

function drawDivider(doc: jsPDF, y: number): void {
  doc.setFillColor(0, 0, 0);
  doc.rect(MARGIN, y, USABLE_WIDTH, 1.5, "F");
}

/**
 * Renders a QR code linking to the contract's Stellar Expert explorer
 * page, boxed in a heavy black border to match the receipt's Brutalist
 * borders, with a monospace caption sitting directly above it, both
 * flush against the page's bottom-right corner.
 */
async function drawExplorerQrCode(doc: jsPDF, contractId: string): Promise<void> {
  const explorerUrl = `${EXPLORER_BASE_URL}/${contractId}`;
  const dataUrl = await QRCode.toDataURL(explorerUrl, {
    margin: 0,
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  const boxRight = PAGE_WIDTH - MARGIN;
  const boxBottom = PAGE_HEIGHT - MARGIN;
  const boxSize = QR_SIZE + 4;
  const boxLeft = boxRight - boxSize;
  const boxTop = boxBottom - boxSize;

  doc.setLineWidth(0.8);
  doc.setDrawColor(0, 0, 0);
  doc.rect(boxLeft, boxTop, boxSize, boxSize, "S");
  doc.addImage(dataUrl, "PNG", boxLeft + 2, boxTop + 2, QR_SIZE, QR_SIZE);

  doc.setFont("courier", "bold");
  doc.setFontSize(6.5);
  doc.text(QR_CAPTION, boxRight, boxTop - 4, {
    maxWidth: USABLE_WIDTH,
    align: "right",
    charSpace: 0.3,
  });
}

/**
 * Generates a Brutalist compliance receipt for a confirmed anchor and
 * triggers a browser download. Black on white, courier only, no color —
 * matches the design system's monochrome constraints even on paper.
 */
export async function downloadComplianceReceipt(data: ReceiptData): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setProperties({
    title: "Axiom Protocol Compliance Receipt",
    subject: data.hash,
    creator: "Axiom Protocol",
  });

  doc.setTextColor(0, 0, 0);

  let y = 28;
  doc.setFont("courier", "bold");
  doc.setFontSize(22);
  doc.text("AXIOM PROTOCOL", MARGIN, y);

  y += 8;
  doc.setFontSize(11);
  doc.text("// CRYPTOGRAPHIC COMPLIANCE RECEIPT", MARGIN, y, {
    charSpace: 0.6,
  });

  y += 6;
  drawDivider(doc, y);
  y += 14;

  for (const [label, getValue] of FIELDS) {
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.text(label, MARGIN, y, { charSpace: 0.4 });

    y += 6;
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text(getValue(data), MARGIN, y, { maxWidth: USABLE_WIDTH });

    y += 12;
  }

  drawDivider(doc, y);
  y += 8;

  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.text(
    "THIS RECEIPT IS A LOCAL RECORD OF AN ON-CHAIN ANCHOR. VERIFY " +
      "INDEPENDENTLY ON THE STELLAR TESTNET LEDGER.",
    MARGIN,
    y,
    { maxWidth: USABLE_WIDTH, charSpace: 0.2 }
  );

  await drawExplorerQrCode(doc, data.contractId);

  doc.save(`axiom-receipt-${data.hash.slice(0, 12)}.pdf`);
}
