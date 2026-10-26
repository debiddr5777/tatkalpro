/**
 * Driver factory — chooses the adapter from config.
 *
 * MOCK_IRCTC=true  → MockDriver (offline, CI, demo)
 * MOCK_IRCTC=false → HttpDriver + PlaywrightDriver race (requires a captured HAR)
 */
import type { BookingDriver } from "./driver.js";
import { MockDriver } from "./drivers/mock-driver.js";

export interface DriverFactoryOptions {
  mockIrctc: boolean;
}

export function createDriver(options: DriverFactoryOptions): BookingDriver {
  if (options.mockIrctc) {
    return new MockDriver();
  }
  // The HttpDriver is implemented from the HAR captured with `pnpm record:irctc`
  // (see docs/IRCTC_FLOW.md). Until a HAR exists, refuse to run against the real
  // site with a half-understood protocol.
  throw new Error(
    "Real IRCTC mode requires a captured HAR. Run `pnpm record:irctc` first and see docs/IRCTC_FLOW.md.",
  );
}
