import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "staff", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const complaints = mysqlTable("complaints", {
  id: int("id").autoincrement().primaryKey(),
  reference: varchar("reference", { length: 32 }).notNull().unique(),
  submittedByUserId: int("submittedByUserId").notNull(),
  category: mysqlEnum("category", ["service_quality", "access", "safety", "billing", "other"]).notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  subject: varchar("subject", { length: 160 }).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["new", "in_review", "assigned", "awaiting_response", "resolved", "closed"]).default("new").notNull(),
  assignedToUserId: int("assignedToUserId"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const complaintAttachments = mysqlTable("complaintAttachments", {
  id: int("id").autoincrement().primaryKey(),
  complaintId: int("complaintId").notNull(),
  uploadedByUserId: int("uploadedByUserId").notNull(),
  fileName: varchar("fileName", { length: 180 }).notNull(),
  contentType: varchar("contentType", { length: 120 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull().unique(),
  storageUrl: varchar("storageUrl", { length: 600 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Complaint = typeof complaints.$inferSelect;
export type InsertComplaint = typeof complaints.$inferInsert;
export type ComplaintCategory = Complaint["category"];
export type ComplaintPriority = Complaint["priority"];
export type ComplaintStatus = Complaint["status"];
export type ComplaintAttachment = typeof complaintAttachments.$inferSelect;
export type InsertComplaintAttachment = typeof complaintAttachments.$inferInsert;
