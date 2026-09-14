import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createComplaint, createComplaintAttachment, getComplaintById, listAssignableStaff, listComplaintAttachments, listComplaints, updateComplaint } from "./db";
import { storagePut } from "./storage";

const categorySchema = z.enum(["service_quality", "access", "safety", "billing", "other"]);
const prioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const statusSchema = z.enum(["new", "in_review", "assigned", "awaiting_response", "resolved", "closed"]);
const assignmentSchema = z.union([z.literal("all"), z.literal("unassigned"), z.literal("assigned")]);
const attachmentMimeTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const attachmentSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  contentType: z.string().trim().max(120),
  data: z.string().min(1).max(11_200_000),
});

function requireStaff(user: { role: "user" | "staff" | "admin" }) {
  if (user.role !== "staff" && user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Staff access is required." });
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  complaints: router({
    create: protectedProcedure
      .input(z.object({
        category: categorySchema,
        priority: prioritySchema,
        subject: z.string().trim().min(5).max(160),
        description: z.string().trim().min(20).max(5000),
        attachments: z.array(attachmentSchema).max(3).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        for (const attachment of input.attachments ?? []) {
          if (!attachmentMimeTypes.has(attachment.contentType)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "One or more attachment types are not supported." });
          }
          const sizeBytes = Buffer.byteLength(attachment.data, "base64");
          if (sizeBytes > 8 * 1024 * 1024) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Each attachment must be 8 MB or smaller." });
          }
        }
        const created = await createComplaint({
          reference: `LEHME-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          submittedByUserId: ctx.user.id,
          category: input.category,
          priority: input.priority,
          subject: input.subject,
          description: input.description,
          status: "new",
        });
        if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Complaint was not created." });
        for (const attachment of input.attachments ?? []) {
          const safeFileName = attachment.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
          const sizeBytes = Buffer.byteLength(attachment.data, "base64");
          const stored = await storagePut(`complaints/${created.id}/${crypto.randomUUID()}-${safeFileName}`, Buffer.from(attachment.data, "base64"), attachment.contentType);
          await createComplaintAttachment({
            complaintId: created.id,
            uploadedByUserId: ctx.user.id,
            fileName: attachment.fileName,
            contentType: attachment.contentType,
            sizeBytes,
            storageKey: stored.key,
            storageUrl: stored.url,
          });
        }
        return created;
      }),
    mine: protectedProcedure.query(({ ctx }) => listComplaints({ submittedByUserId: ctx.user.id })),
    list: protectedProcedure
      .input(z.object({
        status: statusSchema.optional(),
        priority: prioritySchema.optional(),
        assignment: assignmentSchema.optional(),
        search: z.string().trim().max(120).optional(),
      }).optional())
      .query(({ ctx, input }) => {
        requireStaff(ctx.user);
        return listComplaints(input ?? {});
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        const complaint = await getComplaintById(input.id);
        if (!complaint) throw new TRPCError({ code: "NOT_FOUND", message: "Complaint not found." });
        const isStaff = ctx.user.role === "staff" || ctx.user.role === "admin";
        if (!isStaff && complaint.submittedByUserId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only access your own complaints." });
        }
        return { ...complaint, attachments: await listComplaintAttachments(input.id) };
      }),
    staffDirectory: protectedProcedure.query(({ ctx }) => {
      requireStaff(ctx.user);
      return listAssignableStaff();
    }),
    updateWorkflow: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        status: statusSchema.optional(),
        priority: prioritySchema.optional(),
        assignedToUserId: z.number().int().positive().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireStaff(ctx.user);
        if (input.assignedToUserId !== undefined && input.assignedToUserId !== null) {
          const staff = await listAssignableStaff();
          if (!staff.some(person => person.id === input.assignedToUserId)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Complaints can only be assigned to staff." });
          }
        }
        const updates: Parameters<typeof updateComplaint>[1] = {};
        if (input.status !== undefined) updates.status = input.status;
        if (input.priority !== undefined) updates.priority = input.priority;
        if (input.assignedToUserId !== undefined) updates.assignedToUserId = input.assignedToUserId;
        if (input.status === "resolved" || input.status === "closed") updates.resolvedAt = new Date();
        if (input.status && input.status !== "resolved" && input.status !== "closed") updates.resolvedAt = null;
        const updated = await updateComplaint(input.id, updates);
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Complaint not found." });
        return updated;
      }),
  }),
});

export type AppRouter = typeof appRouter;
