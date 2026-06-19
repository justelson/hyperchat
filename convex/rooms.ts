// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { defaultRoomSettings, makeId, normalizeText } from "./ids";
import { getUserByPublicId, requireUserByToken } from "./authSessions";
import { assertRoomVisibilityAccess, canAccessRoom, isPowerUser } from "./access";
import {
  getRoomById,
  getRoomMembership,
  getRoomMemberships,
  hydrateRoom,
  requireRoomMembership,
  seedConversationSummary,
} from "./chatHelpers";

const roomColors = ["#116a5b", "#a85612", "#8a4b7d", "#be123c", "#6d5d40", "#4f5d44"];

const normalizeVisibility = (value?: string) => {
  const next = normalizeText(value);
  return ["private", "discoverable", "power"].includes(next) ? next : "private";
};

const slugifyRoomName = (name: string) =>
  normalizeText(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

const makeInviteCode = () => makeId("invite").replace(/^invite_/, "").replace(/_/g, "-");

const roomMatches = (room: any, search: string) => {
  if (!search) return true;
  return [room.name, room.description, room.slug]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(search));
};

const requireRoomAdmin = async (ctx: any, roomId: string, userId: string) => {
  const membership = await requireRoomMembership(ctx, roomId, userId);
  if (!["owner", "admin"].includes(membership.role)) throw new Error("Only room admins can do that");
  return membership;
};

const addMembership = async (ctx: any, roomId: string, userId: string, role = "member") => {
  const room = await getRoomById(ctx, roomId);
  if (!room) throw new Error("Room not found");
  const target = await getUserByPublicId(ctx, userId);
  if (!target) throw new Error("User not found");
  if (room.visibility === "power" && !isPowerUser(target)) throw new Error("This room is restricted");
  const existing = await getRoomMembership(ctx, roomId, userId);
  if (existing) return existing;
  const at = Date.now();
  const id = await ctx.db.insert("groupmemberships", {
    membershipId: makeId("member"),
    roomId,
    userId,
    role,
    joinedAt: at,
    createdAt: at,
    updatedAt: at,
  });
  await seedConversationSummary(ctx, userId, roomId, "room", { unread: false });
  return await ctx.db.get(id);
};

export const list = query({
  args: { authToken: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireUserByToken(ctx, args.authToken);
    const memberships = await ctx.db
      .query("groupmemberships")
      .withIndex("by_user", (q: any) => q.eq("userId", viewer.publicId))
      .collect();
    const rooms = await Promise.all(
      memberships.map(async (membership: any) => await hydrateRoom(ctx, await getRoomById(ctx, membership.roomId), viewer.publicId))
    );
    return rooms
      .filter((room: any) => room && canAccessRoom(room, viewer))
      .sort((a: any, b: any) => Number(b.lastMessageAt || b.updatedAt) - Number(a.lastMessageAt || a.updatedAt));
  },
});

export const get = query({
  args: { authToken: v.string(), roomId: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireUserByToken(ctx, args.authToken);
    const room = await getRoomById(ctx, args.roomId);
    if (!room) throw new Error("Room not found");
    assertRoomVisibilityAccess(room, viewer);
    await requireRoomMembership(ctx, args.roomId, viewer.publicId);
    return await hydrateRoom(ctx, room, viewer.publicId);
  },
});

export const discover = query({
  args: {
    authToken: v.string(),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireUserByToken(ctx, args.authToken);
    const search = normalizeText(args.search).toLowerCase();
    const rows = await ctx.db
      .query("groups")
      .withIndex("by_visibility", (q: any) => q.eq("visibility", "discoverable"))
      .collect();
    const hydrated = await Promise.all(rows
      .filter((room: any) => canAccessRoom(room, viewer))
      .filter((room: any) => roomMatches(room, search))
      .slice(0, 80)
      .map(async (room: any) => {
        const membership = await getRoomMembership(ctx, room.roomId, viewer.publicId);
        return {
          ...(await hydrateRoom(ctx, room, viewer.publicId)),
          joined: Boolean(membership),
        };
      }));
    return hydrated.filter(Boolean).sort((a: any, b: any) => Number(b.lastMessageAt || b.updatedAt) - Number(a.lastMessageAt || a.updatedAt));
  },
});

export const create = mutation({
  args: {
    authToken: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    memberIds: v.optional(v.array(v.string())),
    visibility: v.optional(v.union(v.literal("private"), v.literal("discoverable"), v.literal("power"))),
  },
  handler: async (ctx, args) => {
    const owner = await requireUserByToken(ctx, args.authToken);
    const name = normalizeText(args.name);
    if (name.length < 2) throw new Error("Room name must be at least 2 characters");
    const visibility = normalizeVisibility(args.visibility);
    if (visibility === "power" && !isPowerUser(owner)) throw new Error("This room is restricted");
    const at = Date.now();
    const roomId = makeId("room");
    const memberIds = visibility === "power"
      ? [owner.publicId]
      : Array.from(new Set([owner.publicId, ...(args.memberIds || [])])).filter(Boolean);
    const docId = await ctx.db.insert("groups", {
      roomId,
      slug: slugifyRoomName(name) || roomId,
      name,
      description: normalizeText(args.description).slice(0, 240),
      ownerId: owner.publicId,
      adminIds: [owner.publicId],
      memberIds,
      visibility,
      inviteCode: makeInviteCode(),
      avatarColor: roomColors[Math.floor(Math.random() * roomColors.length)],
      settings: defaultRoomSettings(),
      createdAt: at,
      updatedAt: at,
    });
    for (const userId of memberIds) {
      await addMembership(ctx, roomId, userId, userId === owner.publicId ? "owner" : "member");
    }
    return await hydrateRoom(ctx, await ctx.db.get(docId), owner.publicId);
  },
});

export const addMembers = mutation({
  args: { authToken: v.string(), roomId: v.string(), memberIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireUserByToken(ctx, args.authToken);
    const room = await getRoomById(ctx, args.roomId);
    if (!room) throw new Error("Room not found");
    assertRoomVisibilityAccess(room, actor);
    const actorMembership = await requireRoomMembership(ctx, args.roomId, actor.publicId);
    if (room.visibility === "power") throw new Error("This room is restricted");
    if (room.settings?.allowMemberInvites === false && !["owner", "admin"].includes(actorMembership.role)) {
      throw new Error("Only admins can invite members");
    }
    const nextIds = Array.from(new Set(args.memberIds || [])).filter(Boolean);
    for (const userId of nextIds) await addMembership(ctx, args.roomId, userId, "member");
    const memberships = await getRoomMemberships(ctx, args.roomId);
    await ctx.db.patch(room._id, {
      memberIds: memberships.map((entry: any) => entry.userId),
      updatedAt: Date.now(),
    });
    return await hydrateRoom(ctx, await getRoomById(ctx, args.roomId), actor.publicId);
  },
});

export const update = mutation({
  args: {
    authToken: v.string(),
    roomId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("private"), v.literal("discoverable"), v.literal("power"))),
    settings: v.optional(v.object({
      onlyAdminsCanMessage: v.optional(v.boolean()),
      allowMemberInvites: v.optional(v.boolean()),
      allowLinks: v.optional(v.boolean()),
      allowFiles: v.optional(v.boolean()),
      slowModeSeconds: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const actor = await requireUserByToken(ctx, args.authToken);
    const room = await getRoomById(ctx, args.roomId);
    if (!room) throw new Error("Room not found");
    assertRoomVisibilityAccess(room, actor);
    await requireRoomAdmin(ctx, args.roomId, actor.publicId);
    const patch: any = { updatedAt: Date.now() };
    if (args.name !== undefined) {
      const name = normalizeText(args.name);
      if (name.length < 2) throw new Error("Room name must be at least 2 characters");
      patch.name = name;
      patch.slug = slugifyRoomName(name) || room.slug || room.roomId;
    }
    if (args.description !== undefined) patch.description = normalizeText(args.description).slice(0, 240);
    if (args.visibility !== undefined) {
      const visibility = normalizeVisibility(args.visibility);
      if (visibility === "power" && !isPowerUser(actor)) throw new Error("This room is restricted");
      patch.visibility = visibility;
    }
    if (args.settings) {
      const nextSettings = { ...defaultRoomSettings(), ...(room.settings || {}), ...args.settings };
      patch.settings = nextSettings;
      if (nextSettings.allowLinks === false) {
        patch.inviteRevokedAt = Date.now();
      } else if (!room.inviteCode) {
        patch.inviteCode = makeInviteCode();
        patch.inviteRevokedAt = undefined;
      } else {
        patch.inviteRevokedAt = undefined;
      }
    }
    await ctx.db.patch(room._id, patch);
    return await hydrateRoom(ctx, await getRoomById(ctx, args.roomId), actor.publicId);
  },
});

export const joinRoom = mutation({
  args: { authToken: v.string(), roomId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireUserByToken(ctx, args.authToken);
    const room = await getRoomById(ctx, args.roomId);
    if (!room) throw new Error("Room not found");
    assertRoomVisibilityAccess(room, actor);
    if (room.visibility !== "discoverable") throw new Error("Use an invite link to join this room");
    await addMembership(ctx, room.roomId, actor.publicId, "member");
    const memberships = await getRoomMemberships(ctx, room.roomId);
    await ctx.db.patch(room._id, { memberIds: memberships.map((entry: any) => entry.userId), updatedAt: Date.now() });
    return await hydrateRoom(ctx, await getRoomById(ctx, room.roomId), actor.publicId);
  },
});

export const joinByInvite = mutation({
  args: { authToken: v.string(), inviteCode: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireUserByToken(ctx, args.authToken);
    const code = normalizeText(args.inviteCode);
    const room = await ctx.db
      .query("groups")
      .withIndex("by_inviteCode", (q: any) => q.eq("inviteCode", code))
      .first();
    if (!room || room.inviteRevokedAt || room.settings?.allowLinks === false) throw new Error("Invite link is no longer valid");
    assertRoomVisibilityAccess(room, actor);
    await addMembership(ctx, room.roomId, actor.publicId, "member");
    const memberships = await getRoomMemberships(ctx, room.roomId);
    await ctx.db.patch(room._id, { memberIds: memberships.map((entry: any) => entry.userId), updatedAt: Date.now() });
    return await hydrateRoom(ctx, await getRoomById(ctx, room.roomId), actor.publicId);
  },
});

export const rotateInviteLink = mutation({
  args: { authToken: v.string(), roomId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireUserByToken(ctx, args.authToken);
    const room = await getRoomById(ctx, args.roomId);
    if (!room) throw new Error("Room not found");
    assertRoomVisibilityAccess(room, actor);
    await requireRoomAdmin(ctx, args.roomId, actor.publicId);
    await ctx.db.patch(room._id, {
      inviteCode: makeInviteCode(),
      inviteRevokedAt: undefined,
      settings: { ...defaultRoomSettings(), ...(room.settings || {}), allowLinks: true },
      updatedAt: Date.now(),
    });
    return await hydrateRoom(ctx, await getRoomById(ctx, args.roomId), actor.publicId);
  },
});

export const leave = mutation({
  args: { authToken: v.string(), roomId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireUserByToken(ctx, args.authToken);
    const room = await getRoomById(ctx, args.roomId);
    if (!room) throw new Error("Room not found");
    if (room.ownerId === actor.publicId) throw new Error("Transfer ownership before leaving");
    const membership = await getRoomMembership(ctx, args.roomId, actor.publicId);
    if (membership) await ctx.db.delete(membership._id);
    const summary = await ctx.db
      .query("conversationsummaries")
      .withIndex("by_user_conversation", (q: any) => q.eq("userId", actor.publicId).eq("conversationId", args.roomId))
      .first();
    if (summary) await ctx.db.delete(summary._id);
    const memberships = await getRoomMemberships(ctx, args.roomId);
    await ctx.db.patch(room._id, { memberIds: memberships.map((entry: any) => entry.userId), updatedAt: Date.now() });
    return { ok: true };
  },
});
