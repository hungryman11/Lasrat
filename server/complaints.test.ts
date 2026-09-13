import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: "user" | "staff" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "test",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("complaint authorization", () => {
  it("prevents regular users from opening the staff queue", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.complaints.list({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects complaint text that is too short", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.complaints.create({
      category: "other",
      priority: "medium",
      subject: "Too short",
      description: "Not enough",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
