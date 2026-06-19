// @ts-nocheck
import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { compactUser, defaultUserSettings, makeId, normalizeEmail, normalizeText } from "./ids";
import {
  getUserByEmail,
  getUserByPublicId,
  hashPassword,
  issueAuthSession,
  requireUserByToken,
  revokeAuthSession,
} from "./authSessions";

const avatarColors = ["#116a5b", "#a85612", "#8a4b7d", "#be123c", "#6d5d40", "#4f5d44"];
const avatarStyles = ["adventurer-neutral", "adventurer", "avataaars", "avataaars-neutral", "open-peeps", "thumbs"];

const normalizeUsername = (value?: string) =>
  normalizeText(value).toLowerCase().replace(/^@+/, "").replace(/[^a-z0-9_.-]/g, "").slice(0, 32);

const normalizeAvatarStyle = (value?: string) => {
  const next = normalizeText(value);
  return avatarStyles.includes(next) ? next : "adventurer-neutral";
};

const userPayload = (user: any, token?: string) => ({
  user: compactUser(user),
  token,
});

const authError = (error: string) => ({
  user: null,
  token: undefined,
  error,
});

export const me = query({
  args: { authToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.authToken) return null;
    const user = await requireUserByToken(ctx, args.authToken);
    return compactUser(user);
  },
});

export const signUp = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    password: v.string(),
    username: v.optional(v.string()),
    avatarSeed: v.optional(v.string()),
    avatarStyle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const fullName = normalizeText(args.fullName);
    const password = String(args.password || "");
    if (password.length < 8) return authError("Password must be at least 8 characters");
    if (!email || !email.includes("@")) return authError("Enter a valid email");
    if (fullName.length < 2) return authError("Name must be at least 2 characters");
    const existingEmail = await getUserByEmail(ctx, email);
    if (existingEmail) return authError("Email already registered");

    const username = normalizeUsername(args.username || email.split("@")[0]);
    if (username) {
      const existingUsername = await ctx.db
        .query("users")
        .withIndex("by_username", (q: any) => q.eq("username", username))
        .first();
      if (existingUsername) return authError("Username already taken");
    }

    const now = Date.now();
    const publicId = makeId("user");
    const avatarSeed = normalizeText(args.avatarSeed).slice(0, 80) || publicId;
    const avatarStyle = normalizeAvatarStyle(args.avatarStyle);
    const docId = await ctx.db.insert("users", {
      publicId,
      email,
      passwordHash: await hashPassword(email, password),
      fullName,
      username,
      avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)],
      avatarSeed,
      avatarStyle,
      authProvider: "password",
      role: "user",
      blockedUserIds: [],
      settings: {
        ...defaultUserSettings(),
        avatarSeed,
        avatarStyle,
      },
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    });
    const user = await ctx.db.get(docId);
    const token = await issueAuthSession(ctx, user.publicId, { source: "signup" });
    return userPayload(user, token);
  },
});

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const user = await getUserByEmail(ctx, email);
    if (!user) return authError("Invalid email or password");
    const passwordHash = await hashPassword(email, args.password);
    if (passwordHash !== user.passwordHash) return authError("Invalid email or password");
    const token = await issueAuthSession(ctx, user.publicId, {
      source: "login",
      tokenVersion: Number(user.tokenVersion || 0),
    });
    return userPayload(user, token);
  },
});

export const logout = mutation({
  args: { authToken: v.string() },
  handler: async (ctx, args) => revokeAuthSession(ctx, args.authToken),
});

export const completeGoogleLogin = internalMutation({
  args: {
    email: v.string(),
    fullName: v.string(),
    picture: v.optional(v.string()),
    googleSub: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const googleSub = normalizeText(args.googleSub);
    if (!email || !googleSub) return authError("Google sign-in failed");
    const at = Date.now();
    let user = await ctx.db
      .query("users")
      .withIndex("by_googleSub", (q: any) => q.eq("googleSub", googleSub))
      .first();
    if (!user) user = await getUserByEmail(ctx, email);
    if (user) {
      await ctx.db.patch(user._id, {
        googleSub,
        authProvider: user.authProvider || "google",
        profilePic: user.profilePic || normalizeText(args.picture).slice(0, 1000),
        updatedAt: at,
      });
      const nextUser = await ctx.db.get(user._id);
      return userPayload(nextUser, await issueAuthSession(ctx, nextUser.publicId, { source: "google" }));
    }

    const publicId = makeId("user");
    const fullName = normalizeText(args.fullName) || email.split("@")[0];
    const usernameBase = normalizeUsername(email.split("@")[0]);
    let username = usernameBase;
    if (username) {
      const existingUsername = await ctx.db
        .query("users")
        .withIndex("by_username", (q: any) => q.eq("username", username))
        .first();
      if (existingUsername) username = `${username}_${Math.random().toString(36).slice(2, 6)}`;
    }
    const docId = await ctx.db.insert("users", {
      publicId,
      email,
      passwordHash: `google:${googleSub}`,
      authProvider: "google",
      googleSub,
      fullName,
      username,
      avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)],
      profilePic: normalizeText(args.picture).slice(0, 1000),
      avatarSeed: publicId,
      avatarStyle: "adventurer-neutral",
      role: "user",
      blockedUserIds: [],
      settings: {
        ...defaultUserSettings(),
        avatarSeed: publicId,
        avatarStyle: "adventurer-neutral",
      },
      tokenVersion: 0,
      createdAt: at,
      updatedAt: at,
    });
    const nextUser = await ctx.db.get(docId);
    return userPayload(nextUser, await issueAuthSession(ctx, nextUser.publicId, { source: "google" }));
  },
});

export const googleLogin = action({
  args: { credential: v.string() },
  handler: async (ctx, args) => {
    const clientId = String(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "").trim();
    if (!clientId) return authError("Google sign-in is not configured");
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(args.credential)}`);
    if (!response.ok) return authError("Google sign-in failed");
    const profile = await response.json();
    if (profile.aud !== clientId) return authError("Google sign-in failed");
    if (profile.email_verified !== true && profile.email_verified !== "true") return authError("Google email is not verified");
    return await ctx.runMutation(internal.auth.completeGoogleLogin, {
      email: String(profile.email || ""),
      fullName: String(profile.name || profile.email || ""),
      picture: profile.picture ? String(profile.picture) : undefined,
      googleSub: String(profile.sub || ""),
    });
  },
});
