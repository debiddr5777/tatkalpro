/**
 * Captcha solver — in-process ONNX inference.
 *
 * Latency budget: <50 ms per solve. The model runs inside the worker process —
 * a network hop to a separate OCR service (like the reference repo's Flask +
 * EasyOCR setup at ~1–2 s) is a hard latency violation and is forbidden here.
 *
 * Ensemble strategy:
 *   1. ONNX CNN (primary, >95% target accuracy, <50 ms)
 *   2. Tesseract.js fallback with preprocessing (grayscale → binarize → deskew)
 *   3. Human-in-the-loop prompt in the UI (with countdown)
 *
 * If all three fail: retry with a fresh captcha, max 3 attempts in <2 s.
 */
import type { InferenceSession } from "onnxruntime-node";

export interface CaptchaSolver {
  solve(imageB64: string): Promise<{ text: string; confidence: number; elapsedMs: number }>;
}

export class OnnxCaptchaSolver implements CaptchaSolver {
  constructor(private readonly session: InferenceSession) {}

  async solve(imageB64: string): Promise<{ text: string; confidence: number; elapsedMs: number }> {
    const start = performance.now();
    // TODO: preprocess (resize → grayscale → binarize) and run the ONNX session.
    // The session is created once at worker boot from models/captcha.onnx.
    void this.session;
    const text = await this.preprocess(imageB64);
    return { text, confidence: 0.9, elapsedMs: performance.now() - start };
  }

  private async preprocess(_imageB64: string): Promise<string> {
    return "";
  }
}
