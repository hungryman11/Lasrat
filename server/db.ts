import { and, asc, desc, eq, inArray, isNotNull, isNull, like, or } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";
import { Complaint, complaints, InsertComplaint, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export const complaintProjection = {
  id: complaints.id,
  reference: complaints.reference,
  submittedByUserId: complaints.submittedByUserId,
  category: complaints.category,
  priority: complaints.priority,
  subject: complaints.subject,
  description: complaints.description,
  status: complaints.status,
  assignedToUserId: complaints.assignedToUserId,
  resolvedAt: complaints.resolvedAt,
  createdAt: complaints.createdAt,
  updatedAt: complaints.updatedAt,
};

const assignedUsers = alias(users, "assignedUsers");

export async function createComplaint(input: InsertComplaint) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const result = await db.insert(complaints).values(input);
  const id = Number(result[0].insertId);
  return getComplaintById(id);
}

export async function getComplaintById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const result = await db
    .select({
      ...complaintProjection,
      submitterName: users.name,
      submitterEmail: users.email,
      assigneeName: assignedUsers.name,
      assigneeEmail: assignedUsers.email,
    })
    .from(complaints)
    .innerJoin(users, eq(complaints.submittedByUserId, users.id))
    .leftJoin(assignedUsers, eq(complaints.assignedToUserId, assignedUsers.id))
    .where(eq(complaints.id, id))
    .limit(1);
  return result[0];
}

export async function listComplaints(filters: {
  submittedByUserId?: number;
  status?: string;
  priority?: string;
  assignment?: "all" | "unassigned" | "assigned";
  search?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const conditions = [];
  if (filters.submittedByUserId !== undefined) conditions.push(eq(complaints.submittedByUserId, filters.submittedByUserId));
  if (filters.status) conditions.push(eq(complaints.status, filters.status as typeof complaints.status.enumValues[number]));
  if (filters.priority) conditions.push(eq(complaints.priority, filters.priority as typeof complaints.priority.enumValues[number]));
  if (filters.assignment === "unassigned") conditions.push(isNull(complaints.assignedToUserId));
  if (filters.assignment === "assigned") conditions.push(isNotNull(complaints.assignedToUserId));
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(or(like(complaints.reference, term), like(complaints.subject, term), like(complaints.description, term)));
  }

  return db
    .select({
      ...complaintProjection,
      submitterName: users.name,
      submitterEmail: users.email,
      assigneeName: assignedUsers.name,
      assigneeEmail: assignedUsers.email,
    })
    .from(complaints)
    .innerJoin(users, eq(complaints.submittedByUserId, users.id))
    .leftJoin(assignedUsers, eq(complaints.assignedToUserId, assignedUsers.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(complaints.createdAt))
    .limit(250);
}

export async function updateComplaint(id: number, updates: Partial<Pick<Complaint, "priority" | "status" | "assignedToUserId" | "resolvedAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.update(complaints).set(updates).where(eq(complaints.id, id));
  return getComplaintById(id);
}

export async function listAssignableStaff() {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(inArray(users.role, ["staff", "admin"]))
    .orderBy(asc(users.name));
}
