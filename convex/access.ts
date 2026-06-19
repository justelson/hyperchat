// @ts-nocheck
import { v } from "convex/values";
import { query } from "./_generated/server";
import { normalizeEmail } from "./ids";
import { requireUserByToken } from "./authSessions";

const DEFAULT_POWER_USER_EMAILS = "";

const configuredPowerEmails = () => {
  const env = typeof process !== "undefined"
    ? (process.env.HYPERCHAT_POWER_USER_EMAILS || process.env.POWER_USER_EMAILS || "")
    : "";
  return String(env || DEFAULT_POWER_USER_EMAILS)
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
};

export const isPowerUser = (user: any) => configuredPowerEmails().includes(normalizeEmail(user?.email));

export const canAccessRoom = (room: any, user: any) => {
  if (!room) return false;
  if (room.visibility !== "power") return true;
  return isPowerUser(user);
};

export const assertRoomVisibilityAccess = (room: any, user: any) => {
  if (!canAccessRoom(room, user)) throw new Error("This room is restricted");
};

export const capabilities = query({
  args: { authToken: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUserByToken(ctx, args.authToken);
    return {
      canAccessPowerGroups: isPowerUser(user),
    };
  },
});
