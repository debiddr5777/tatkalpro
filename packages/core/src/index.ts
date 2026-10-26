/**
 * TatkalPro domain layer.
 *
 * This package never imports IRCTC, HTTP, or DB code. Everything here is pure
 * domain logic: the state machine, the clock port, and the error taxonomy.
 */
export * from "./state-machine.js";
export * from "./clock.js";
export * from "./errors.js";
