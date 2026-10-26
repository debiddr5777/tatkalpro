/**
 * Captcha sample harvester.
 *
 * Collects IRCTC captcha images into captcha-data/ for labeling. The captcha
 * URL pattern is deterministic once the booking page session starts. Ship a
 * labeling workflow (the UI batches 100 images at a time) before training.
 */
import { mkdirSync, appendFileSync } from "node:fs";

const DATA_DIR = "captcha-data";
mkdirSync(DATA_DIR, { recursive: true });

export function saveSample(imageB64: string, label: string): void {
  const line = JSON.stringify({ imageB64, label, harvestedAt: new Date().toISOString() });
  appendFileSync(`${DATA_DIR}/samples.jsonl`, line + "\n");
}

// TODO: fetch loop — download N captcha images, pause between fetches (no
// flooding), and hand the batch to the labeling UI.
