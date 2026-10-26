import { integer, jsonb, pgTable, text, timestamp, uuid, varchar, boolean } from "drizzle-orm/pg-core";

/**
 * TatkalPro PostgreSQL schema (Drizzle).
 *
 * Conventions:
 * - UUIDs for all entity ids.
 * - `created_at` / `updated_at` on every mutable table.
 * - No raw SQL anywhere else in the codebase — Drizzle parameterized queries only.
 */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const irctcAccounts = pgTable("irctc_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  irctcUsername: varchar("irctc_username", { length: 50 }).notNull(),
  /** AES-256-GCM encrypted — never stored or logged in plaintext. */
  encryptedPassword: text("encrypted_password").notNull(),
  mobile: varchar("mobile", { length: 15 }),
  email: varchar("email", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const journeys = pgTable("journeys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  irctcAccountId: uuid("irctc_account_id")
    .notNull()
    .references(() => irctcAccounts.id, { onDelete: "restrict" }),
  sourceStationCode: varchar("source_station_code", { length: 5 }).notNull(),
  destinationStationCode: varchar("destination_station_code", { length: 5 }).notNull(),
  boardingStationCode: varchar("boarding_station_code", { length: 5 }),
  travelDate: varchar("travel_date", { length: 10 }).notNull(),
  quota: varchar("quota", { length: 20 }).notNull(),
  trainNo: varchar("train_no", { length: 5 }).notNull(),
  coachClass: varchar("coach_class", { length: 3 }).notNull(),
  bookOnlyIfConfirmed: boolean("book_only_if_confirmed").notNull().default(true),
  autoUpgradation: boolean("auto_upgradation").notNull().default(true),
  status: varchar("status", { length: 30 }).notNull().default("DRAFT"),
  targetOpenAt: timestamp("target_open_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passengers = pgTable("passengers", {
  id: uuid("id").primaryKey().defaultRandom(),
  journeyId: uuid("journey_id")
    .notNull()
    .references(() => journeys.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 15 }).notNull(),
  age: integer("age").notNull(),
  gender: varchar("gender", { length: 15 }).notNull(),
  berthPreference: varchar("berth_preference", { length: 20 }).notNull().default("No Preference"),
  foodChoice: varchar("food_choice", { length: 10 }).notNull().default("No Food"),
  seniorCitizen: boolean("senior_citizen").notNull().default(false),
  isChild: boolean("is_child").notNull().default(false),
});

export const bookingAttempts = pgTable("booking_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  journeyId: uuid("journey_id")
    .notNull()
    .references(() => journeys.id, { onDelete: "cascade" }),
  attemptNo: integer("attempt_no").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  firedAt: timestamp("fired_at", { withTimezone: true }),
  responseAt: timestamp("response_at", { withTimezone: true }),
  status: varchar("status", { length: 30 }).notNull(),
  errorCode: varchar("error_code", { length: 50 }),
  pnr: varchar("pnr", { length: 10 }),
  paymentId: varchar("payment_id", { length: 100 }),
  /** Per-stage latency breakdown (ms), e.g. {"login":0,"captcha":42,"submit":310} */
  stageTimings: jsonb("stage_timings").$type<Record<string, number>>(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  irctcAccountId: uuid("irctc_account_id")
    .notNull()
    .references(() => irctcAccounts.id, { onDelete: "cascade" }),
  jwt: text("jwt").notNull(),
  jwtExpiresAt: timestamp("jwt_expires_at", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("ACTIVE"),
  lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true }).notNull().defaultNow(),
});

export const captchaSamples = pgTable("captcha_samples", {
  id: uuid("id").primaryKey().defaultRandom(),
  imageB64: text("image_b64").notNull(),
  label: varchar("label", { length: 10 }).notNull(),
  source: varchar("source", { length: 20 }).notNull(),
  confidence: integer("confidence").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  journeyId: uuid("journey_id").references(() => journeys.id, { onDelete: "set null" }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
