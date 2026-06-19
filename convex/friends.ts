// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { compactUser, makeId, normalizeText } from "./ids";
import { createNotification } from "./chatHelpers";
import { getUserByPublicId, requireUserByToken } from "./authSessions";

const pairKeyFor = (a: string, b: string) => [String(a || ""), String(b || "")].sort().join(":");

const getFriendshipByPair = async (ctx: any, userIdA?: string, userIdB?: string) => {
  const pairKey = pairKeyFor(userIdA, userIdB);
  if (!pairKey.includes(":")) return null;
  return await ctx.db
    .query("friendships")
    .withIndex("by_pair", (q: any) => q.eq("pairKey", pairKey))
    .first();
};

const relationshipFor = (friendship: any, viewerId: string) => {
  if (!friendship) return { status: "none" };
  if (friendship.status === "accepted") return { status: "friend", friendshipId: friendship.friendshipId };
  if (friendship.status === "declined") return { status: "none", friendshipId: friendship.friendshipId };
  return {
    status: friendship.requesterId === viewerId ? "outgoing" : "incoming",
    friendshipId: friendship.friendshipId,
  };
};

const hydratePerson = async (ctx: any, viewerId: string, user: any) => {
  const friendship = await getFriendshipByPair(ctx, viewerId, user?.publicId);
  return {
    ...compactUser(user),
    relationship: relationshipFor(friendship, viewerId),
  };
};

export const searchPeople = query({
  args: {
    authToken: v.string(),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireUserByToken(ctx, args.authToken);
    const search = normalizeText(args.search).toLowerCase();
    const limit = Math.max(1, Math.min(80, Number(args.limit || 50)));
    const users = await ctx.db.query("users").collect();
    const filtered = users
      .filter((user: any) => user.publicId !== viewer.publicId)
      .filter((user: any) => {
        if (!search) return true;
        return [user.fullName, user.username, user.email]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      })
      .slice(0, limit);
    return await Promise.all(filtered.map((user: any) => hydratePerson(ctx, viewer.publicId, user)));
  },
});

export const listFriends = query({
  args: { authToken: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireUserByToken(ctx, args.authToken);
    const outgoing = await ctx.db
      .query("friendships")
      .withIndex("by_requester_status", (q: any) => q.eq("requesterId", viewer.publicId).eq("status", "accepted"))
      .collect();
    const incoming = await ctx.db
      .query("friendships")
      .withIndex("by_recipient_status", (q: any) => q.eq("recipientId", viewer.publicId).eq("status", "accepted"))
      .collect();
    const rows = [...outgoing, ...incoming].sort((a: any, b: any) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    const people = await Promise.all(rows.map(async (row: any) => {
      const otherId = row.requesterId === viewer.publicId ? row.recipientId : row.requesterId;
      const user = await getUserByPublicId(ctx, otherId);
      return user ? await hydratePerson(ctx, viewer.publicId, user) : null;
    }));
    return people.filter(Boolean);
  },
});

export const pending = query({
  args: { authToken: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireUserByToken(ctx, args.authToken);
    const incoming = await ctx.db
      .query("friendships")
      .withIndex("by_recipient_status", (q: any) => q.eq("recipientId", viewer.publicId).eq("status", "pending"))
      .collect();
    const outgoing = await ctx.db
      .query("friendships")
      .withIndex("by_requester_status", (q: any) => q.eq("requesterId", viewer.publicId).eq("status", "pending"))
      .collect();
    const hydrate = async (row: any, direction: string) => ({
      ...row,
      direction,
      user: compactUser(await getUserByPublicId(ctx, direction === "incoming" ? row.requesterId : row.recipientId)),
    });
    return {
      incoming: (await Promise.all(incoming.map((row: any) => hydrate(row, "incoming")))).filter((row: any) => row.user),
      outgoing: (await Promise.all(outgoing.map((row: any) => hydrate(row, "outgoing")))).filter((row: any) => row.user),
    };
  },
});

export const request = mutation({
  args: { authToken: v.string(), targetUserId: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireUserByToken(ctx, args.authToken);
    const target = await getUserByPublicId(ctx, args.targetUserId);
    if (!target) throw new Error("User not found");
    if (target.publicId === viewer.publicId) throw new Error("Pick someone else");
    const existing = await getFriendshipByPair(ctx, viewer.publicId, target.publicId);
    const at = Date.now();
    if (existing?.status === "accepted") return { ok: true, status: "friend" };
    if (existing?.status === "pending") return { ok: true, status: existing.requesterId === viewer.publicId ? "outgoing" : "incoming" };
    if (existing) {
      await ctx.db.patch(existing._id, {
        requesterId: viewer.publicId,
        recipientId: target.publicId,
        status: "pending",
        respondedAt: undefined,
        updatedAt: at,
      });
      await createNotification(ctx, target.publicId, viewer.publicId, "friend_request", {}, {});
      return { ok: true, status: "outgoing" };
    }
    await ctx.db.insert("friendships", {
      friendshipId: makeId("friend"),
      pairKey: pairKeyFor(viewer.publicId, target.publicId),
      requesterId: viewer.publicId,
      recipientId: target.publicId,
      status: "pending",
      createdAt: at,
      updatedAt: at,
    });
    await createNotification(ctx, target.publicId, viewer.publicId, "friend_request", {}, {});
    return { ok: true, status: "outgoing" };
  },
});

export const respond = mutation({
  args: {
    authToken: v.string(),
    friendshipId: v.string(),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireUserByToken(ctx, args.authToken);
    const row = await ctx.db
      .query("friendships")
      .filter((q: any) => q.eq(q.field("friendshipId"), args.friendshipId))
      .first();
    if (!row || row.recipientId !== viewer.publicId) throw new Error("Friend request not found");
    const at = Date.now();
    await ctx.db.patch(row._id, {
      status: args.accept ? "accepted" : "declined",
      respondedAt: at,
      updatedAt: at,
    });
    if (args.accept) await createNotification(ctx, row.requesterId, viewer.publicId, "friend_accept", {}, {});
    return { ok: true };
  },
});

export const remove = mutation({
  args: { authToken: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireUserByToken(ctx, args.authToken);
    const row = await getFriendshipByPair(ctx, viewer.publicId, args.userId);
    if (row) await ctx.db.delete(row._id);
    return { ok: true };
  },
});
