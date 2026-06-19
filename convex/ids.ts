// @ts-nocheck
export const now = () => Date.now();

export const makeId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const normalizeEmail = (value?: string) => String(value || "").trim().toLowerCase();

export const normalizeText = (value?: string) => String(value || "").trim();

export const directConversationId = (userIdA: string, userIdB: string) =>
  `direct:${[String(userIdA), String(userIdB)].sort().join(":")}`;

const graphemeCount = (value: string) => {
  const segmenter = typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;
  return segmenter
    ? [...segmenter.segment(value)].length
    : Array.from(value).length;
};

export const normalizeReactionEmoji = (value?: string) => {
  const emoji = normalizeText(value).slice(0, 32);
  if (!emoji) throw new Error("Pick a reaction");
  if (graphemeCount(emoji) !== 1) throw new Error("Pick one emoji reaction");
  const hasEmojiGlyph = /[\p{Extended_Pictographic}\p{Regional_Indicator}#*0-9]/u.test(emoji);
  const hasTextLetters = /[A-Za-z]/.test(emoji.replace(/\u200D/g, ""));
  if (!hasEmojiGlyph || hasTextLetters) throw new Error("Pick one emoji reaction");
  return emoji;
};

export const compactUser = (user: any) => {
  if (!user) return null;
  const settings = {
    ...defaultUserSettings(),
    ...(user.settings || {}),
  };
  const showProfilePhoto = settings.showProfilePhoto !== false && settings.profilePhoto !== false;
  return {
    _id: user.publicId,
    publicId: user.publicId,
    fullName: user.fullName,
    username: user.username,
    avatarColor: user.avatarColor,
    profilePic: showProfilePhoto ? user.profilePic : "",
    profilePicStorageId: showProfilePhoto ? user.profilePicStorageId : undefined,
    avatarSeed: user.avatarSeed || settings.avatarSeed,
    avatarStyle: user.avatarStyle || settings.avatarStyle,
    profileBackdrop: user.profileBackdrop,
    bio: settings.showBio === false ? "" : user.bio,
    status: settings.showStatus === false ? "" : user.status,
    settings,
    lastSeen: settings.lastSeen === false ? null : user.lastSeen,
    role: user.role || "user",
  };
};

export const defaultUserSettings = () => ({
  readReceipts: true,
  typingIndicator: true,
  notifications: true,
  lastSeen: true,
  profilePhoto: true,
  theme: "system",
  themePack: "fieldstone",
  density: "compact",
  accent: "#a85612",
  fontSize: 14,
  chatWallpaper: "doodle",
  authBackground: "forest",
  avatarSeed: "",
  avatarStyle: "adventurer-neutral",
  showProfilePhoto: true,
  showBio: true,
  showStatus: true,
});

export const defaultRoomSettings = () => ({
  onlyAdminsCanMessage: false,
  allowMemberInvites: true,
  allowLinks: true,
  allowFiles: true,
  slowModeSeconds: 0,
});

export const messagePreview = (message: any = {}) => {
  if (message.senderDeleted) return "Message deleted";
  const text = normalizeText(message.text || message.html?.replace(/<[^>]+>/g, " "));
  if (text) return text.slice(0, 180);
  if (Array.isArray(message.attachments) && message.attachments.length > 0) {
    return message.attachments.length === 1 ? "Attachment" : `${message.attachments.length} attachments`;
  }
  return "Message";
};
