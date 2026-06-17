import { ArrowLeft, Camera, ChevronRight, LogOut, Shuffle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ACCENTS, AUTH_BACKGROUNDS, AVATAR_STYLES, SETTINGS_SECTIONS, WALLPAPERS } from "../../lib/chatConstants";
import { createAvatarSeed, displayError, getName, normalizeVisualSettings } from "../../lib/chatUtils";
import { Avatar } from "../common/Avatar";
import { ColorPicker, SegmentControl, ToggleRow } from "../common/FormControls";
import { IconButton } from "../common/IconButton";

export function SettingsPage({
  section,
  currentUser,
  onBackToChats,
  onNavigate,
  onUpdateProfile,
  onUpdateSettings,
  onUploadAvatar,
  onClearAvatar,
  onLogout,
}) {
  const [profileDraft, setProfileDraft] = useState({
    fullName: currentUser?.fullName || "",
    username: currentUser?.username || "",
    bio: currentUser?.bio || "",
    status: currentUser?.status || "",
  });
  const [settingsDraft, setSettingsDraft] = useState(normalizeVisualSettings(currentUser?.settings || {}));
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    setProfileDraft({
      fullName: currentUser?.fullName || "",
      username: currentUser?.username || "",
      bio: currentUser?.bio || "",
      status: currentUser?.status || "",
    });
    setSettingsDraft(normalizeVisualSettings(currentUser?.settings || {}));
  }, [currentUser]);

  const activeSection = SETTINGS_SECTIONS.find((item) => item.id === section);
  const run = async (label, action, success = "Saved") => {
    setBusy(label);
    setNotice("");
    try {
      await action();
      setNotice(success);
    } catch (err) {
      setNotice(displayError(err, "Could not save changes"));
    } finally {
      setBusy("");
    }
  };

  const updateSetting = (patch, label = "settings") => {
    const next = { ...settingsDraft, ...patch };
    setSettingsDraft(next);
    return run(label, () => onUpdateSettings(patch), "Settings updated");
  };

  const saveProfile = () => run("profile", () => onUpdateProfile({
    fullName: profileDraft.fullName,
    username: profileDraft.username,
    bio: profileDraft.bio,
    status: profileDraft.status,
  }), "Profile saved");

  const shuffleAvatar = () => {
    const style = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)]?.value || "adventurer-neutral";
    return updateSetting({ avatarSeed: createAvatarSeed(), avatarStyle: style }, "avatar");
  };

  const settingsHome = (
    <div className="settings-home">
      <div className="settings-profile-card">
        <Avatar entity={currentUser} size="lg" online />
        <div>
          <h2>{getName(currentUser)}</h2>
          <p>{currentUser?.username ? `@${currentUser.username}` : currentUser?.email || "Hyperchat account"}</p>
        </div>
      </div>
      <div className="settings-home-grid">
        {SETTINGS_SECTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" className="settings-tile" onClick={() => onNavigate?.(`/settings/${item.id}`)}>
              <span><Icon size={20} /></span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
              <ChevronRight size={17} />
            </button>
          );
        })}
      </div>
    </div>
  );

  const profilePage = (
    <div className="settings-grid">
      <section className="settings-card profile-card wide">
        <div className={`profile-backdrop backdrop-${settingsDraft.chatWallpaper || "doodle"}`} />
        <div className="profile-avatar-block">
          <Avatar entity={{ ...currentUser, settings: settingsDraft }} size="lg" online />
          <div>
            <strong>{getName(currentUser)}</strong>
            <span>{currentUser?.status || "Available"}</span>
          </div>
        </div>
        <div className="avatar-actions">
          <input ref={fileRef} type="file" accept="image/*" onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) run("avatar", () => onUploadAvatar(file), "Photo updated");
          }} />
          <button type="button" className="secondary-button small" onClick={() => fileRef.current?.click()}><Camera size={15} /> Upload</button>
          <button type="button" className="secondary-button small" onClick={shuffleAvatar} disabled={busy === "avatar"}><Shuffle size={15} /> Shuffle</button>
          <button type="button" className="secondary-button small" onClick={() => run("avatar", onClearAvatar, "Photo removed")}><X size={15} /> Remove</button>
        </div>
      </section>
      <section className="settings-card wide">
        <div className="settings-card-title"><strong>Profile</strong><span>Public account details.</span></div>
        <div className="settings-form-grid">
          <label><span>Name</span><input value={profileDraft.fullName} onChange={(event) => setProfileDraft({ ...profileDraft, fullName: event.target.value })} /></label>
          <label><span>Username</span><input value={profileDraft.username} onChange={(event) => setProfileDraft({ ...profileDraft, username: event.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, "") })} /></label>
          <label><span>Status</span><input value={profileDraft.status} onChange={(event) => setProfileDraft({ ...profileDraft, status: event.target.value })} /></label>
          <label className="wide"><span>Bio</span><textarea value={profileDraft.bio} onChange={(event) => setProfileDraft({ ...profileDraft, bio: event.target.value })} /></label>
        </div>
        <button type="button" className="primary-button" disabled={busy === "profile"} onClick={saveProfile}>Save profile</button>
      </section>
    </div>
  );

  const appearancePage = (
    <div className="settings-grid">
      <section className="settings-card">
        <div className="settings-card-title"><strong>Theme</strong><span>System-wide visual mode.</span></div>
        <SegmentControl
          value={settingsDraft.theme || "system"}
          onChange={(theme) => updateSetting({ theme }, "theme")}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </section>
      <section className="settings-card">
        <div className="settings-card-title"><strong>Density</strong><span>Spacing for repeated use.</span></div>
        <SegmentControl
          value={settingsDraft.density || "compact"}
          onChange={(density) => updateSetting({ density }, "density")}
          options={[
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Comfort" },
          ]}
        />
      </section>
      <section className="settings-card wide">
        <div className="settings-card-title"><strong>Accent</strong><span>Choose the app color.</span></div>
        <ColorPicker value={settingsDraft.accent || ACCENTS[0]} onChange={(accent) => updateSetting({ accent }, "accent")} swatches={ACCENTS} />
      </section>
      <section className="settings-card wide">
        <div className="settings-card-title"><strong>Chat background</strong><span>Images borrowed from the Monax wallpaper set.</span></div>
        <div className="wallpaper-options">
          {WALLPAPERS.map((wallpaper) => (
            <button
              key={wallpaper.id}
              type="button"
              className={`wallpaper-choice ${settingsDraft.chatWallpaper === wallpaper.id ? "active" : ""} wallpaper-${wallpaper.id}`}
              onClick={() => updateSetting({ chatWallpaper: wallpaper.id }, "wallpaper")}
            >
              {wallpaper.thumbUrl && <img src={wallpaper.thumbUrl} alt="" />}
              <span>{wallpaper.label}</span>
              <small>{wallpaper.description}</small>
            </button>
          ))}
        </div>
      </section>
      <section className="settings-card wide">
        <div className="settings-card-title"><strong>Auth background</strong><span>Sign-in page mood.</span></div>
        <SegmentControl
          value={settingsDraft.authBackground || "forest"}
          onChange={(authBackground) => updateSetting({ authBackground }, "authBackground")}
          options={AUTH_BACKGROUNDS.map((item) => ({ value: item.value, label: item.label }))}
        />
      </section>
    </div>
  );

  const privacyPage = (
    <div className="settings-grid">
      <section className="settings-card wide">
        <div className="settings-card-title"><strong>Visibility</strong><span>Control what others can see.</span></div>
        <ToggleRow checked={settingsDraft.readReceipts !== false} onChange={(value) => updateSetting({ readReceipts: value }, "readReceipts")} title="Read receipts" description="Show when messages are seen." />
        <ToggleRow checked={settingsDraft.typingIndicator !== false} onChange={(value) => updateSetting({ typingIndicator: value }, "typingIndicator")} title="Typing indicators" description="Show when you are typing." />
        <ToggleRow checked={settingsDraft.lastSeen !== false} onChange={(value) => updateSetting({ lastSeen: value }, "lastSeen")} title="Last seen" description="Show recent presence." />
        <ToggleRow checked={settingsDraft.showProfilePhoto !== false} onChange={(value) => updateSetting({ showProfilePhoto: value }, "showProfilePhoto")} title="Profile photo" description="Show your avatar to contacts." />
        <ToggleRow checked={settingsDraft.showBio !== false} onChange={(value) => updateSetting({ showBio: value }, "showBio")} title="Bio" description="Show profile bio." />
      </section>
    </div>
  );

  const notificationsPage = (
    <div className="settings-grid">
      <section className="settings-card wide">
        <div className="settings-card-title"><strong>Notifications</strong><span>In-app notification behavior.</span></div>
        <ToggleRow checked={settingsDraft.notifications !== false} onChange={(value) => updateSetting({ notifications: value }, "notifications")} title="Message notifications" description="Create notifications for new messages and thread replies." />
      </section>
    </div>
  );

  const page = !section ? settingsHome
    : section === "profile" ? profilePage
      : section === "appearance" ? appearancePage
        : section === "privacy" ? privacyPage
          : notificationsPage;

  return (
    <div className="settings-page">
      <header className="settings-header">
        <IconButton title={section ? "Back to settings" : "Back to chats"} onClick={() => section ? onNavigate?.("/settings") : onBackToChats?.()}>
          <ArrowLeft size={18} />
        </IconButton>
        <div>
          <strong>{activeSection?.label || "Settings"}</strong>
          <small>{activeSection?.description || "Account, appearance, privacy, and notifications."}</small>
        </div>
        {notice && <span className={`settings-notice ${/saved|updated|removed/i.test(notice) ? "" : "error"}`}>{notice}</span>}
        <button type="button" className="secondary-button small settings-signout" onClick={onLogout}><LogOut size={15} /> Sign out</button>
      </header>
      <div className="settings-content">{page}</div>
    </div>
  );
}
