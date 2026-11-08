import "server-only";
import QRCode from "qrcode";
import { siteUrl } from "./site-url";

/** Contenu du code QR : lien que le commerçant ouvre en scannant (étape 5). */
export function qrPayload(reference: string): string {
  return `${siteUrl()}/scan/${reference}`;
}

export async function qrSvg(reference: string): Promise<string> {
  return QRCode.toString(qrPayload(reference), { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}

export async function qrPng(reference: string): Promise<Buffer> {
  return QRCode.toBuffer(qrPayload(reference), { type: "png", width: 480, margin: 2, errorCorrectionLevel: "M" });
}
