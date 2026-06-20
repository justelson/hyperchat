import { ArrowLeft, ArrowRight, AtSign, Chrome, Eye, EyeOff, ImagePlus, Loader2, Lock, Shuffle, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AVATAR_STYLES, TOKEN_KEY } from "../../lib/chatConstants";
import { createAvatarSeed, displayError } from "../../lib/chatUtils";
import { compressAvatarImage } from "../../lib/imageUpload";
import { Avatar } from "../common/Avatar";
import { CheckboxRow } from "../common/FormControls";
import { IconButton } from "../common/IconButton";

export function AuthScreen({ onToken, routePath = "/auth/sign-in", navigate }) {
  const mode = routePath.includes("sign-up") ? "signup" : "login";
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    avatarSeed: createAvatarSeed(),
    avatarStyle: "adventurer-neutral",
    profilePic: "",
    profilePicStorageId: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [signupStep, setSignupStep] = useState(1);
  const [avatarUpload, setAvatarUpload] = useState({ busy: false, error: "", meta: null });
  const avatarInputRef = useRef(null);
  const login = useMutation(api.auth.login);
  const signUp = useMutation(api.auth.signUp);
  const generateSignupAvatarUploadUrl = useMutation(api.files.generateSignupAvatarUploadUrl);
  const googleLogin = useAction(api.auth.googleLogin);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    setError("");
    setSignupStep(1);
  }, [mode]);

  useEffect(() => () => {
    if (form.profilePic?.startsWith("blob:")) URL.revokeObjectURL(form.profilePic);
  }, [form.profilePic]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  const isValidUsername = (value) => /^[a-z0-9_.-]{3,32}$/.test(String(value || "").trim());
  const isSignupStepOneValid = () =>
    form.fullName.trim().length >= 2 &&
    isValidEmail(form.email) &&
    form.password.length >= 8;
  const isSignupStepTwoValid = () =>
    isValidUsername(form.username) &&
    agreed &&
    !avatarUpload.busy;

  const continueSignup = () => {
    if (!isSignupStepOneValid()) {
      setError("Complete name, email, and password first.");
      return;
    }
    setError("");
    setSignupStep(2);
  };

  const uploadSignupAvatar = async (file) => {
    if (!file) return;
    let nextPreview = "";
    setAvatarUpload({ busy: true, error: "", meta: null });
    setError("");
    try {
      const compressed = await compressAvatarImage(file);
      nextPreview = compressed.previewUrl;
      const uploadUrl = await generateSignupAvatarUploadUrl({});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": compressed.file.type || "image/webp" },
        body: compressed.file,
      });
      if (!response.ok) throw new Error("Avatar upload failed");
      const { storageId } = await response.json();
      setForm((current) => ({
        ...current,
        profilePic: compressed.previewUrl,
        profilePicStorageId: storageId,
      }));
      setAvatarUpload({ busy: false, error: "", meta: { size: compressed.size } });
    } catch (err) {
      if (nextPreview) URL.revokeObjectURL(nextPreview);
      const message = displayError(err, "Avatar upload failed");
      setAvatarUpload({ busy: false, error: message, meta: null });
      setError(message);
    }
  };

  const finishAuth = (result, fallback = "Could not sign in") => {
    if (result?.error || !result?.token) {
      setError(result?.error || fallback);
      return;
    }
    localStorage.setItem(TOKEN_KEY, result.token);
    onToken(result.token);
    const pendingInvite = sessionStorage.getItem("hyperchat:pendingInvite");
    if (pendingInvite) sessionStorage.removeItem("hyperchat:pendingInvite");
    navigate?.(pendingInvite || "/app", { replace: true });
  };

  const loadGoogleScript = () => new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.querySelector("script[data-google-identity]");
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const signInWithGoogle = async () => {
    if (!googleClientId) {
      setError("Google sign-in needs setup.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await loadGoogleScript();
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          try {
            const result = await googleLogin({ credential: response.credential });
            finishAuth(result, "Google sign-in failed");
          } catch (err) {
            setError(displayError(err, "Google sign-in failed"));
          } finally {
            setBusy(false);
          }
        },
      });
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
          setBusy(false);
          setError("Google sign-in was not available in this browser.");
        }
      });
    } catch (err) {
      setError(displayError(err, "Google sign-in failed"));
      setBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (mode === "signup" && signupStep === 1) {
      continueSignup();
      return;
    }
    if (mode === "signup" && !isValidUsername(form.username)) {
      setError("Choose a username with 3 to 32 letters, numbers, dots, dashes, or underscores.");
      return;
    }
    if (mode === "signup" && !agreed) {
      setError("Accept the account terms to create your account.");
      return;
    }
    if (mode === "signup" && avatarUpload.busy) {
      setError("Wait for the avatar upload to finish.");
      return;
    }
    setBusy(true);
    try {
      const result = mode === "login"
        ? await login({ email: form.email, password: form.password })
        : await signUp({
          fullName: form.fullName,
          username: form.username.trim() || undefined,
          email: form.email,
          password: form.password,
          avatarSeed: form.avatarSeed,
          avatarStyle: form.avatarStyle,
          profilePicStorageId: form.profilePicStorageId || undefined,
        });

      finishAuth(result, mode === "login" ? "Invalid email or password" : "Could not create account");
    } catch (err) {
      setError(displayError(err, mode === "login" ? "Invalid email or password" : "Could not create account"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-side">
        <div className="auth-brand auth-logo-lockup">
          <img className="auth-logo" src="/brand/hyperchat-logo.svg" alt="Hyper Chat" />
        </div>
        <div className="auth-preview" aria-hidden="true">
          <div className="auth-bubble auth-bubble-a">
            <Avatar entity={{ fullName: "Aya", avatarSeed: "aya" }} size="sm" online />
            <span>Research notes are in the room.</span>
          </div>
          <div className="auth-bubble auth-bubble-b">
            <Avatar entity={{ name: "Build Room", roomId: "build-room", type: "room" }} kind="room" size="sm" />
            <span>4 members</span>
          </div>
          <div className="auth-bubble auth-bubble-c">
            <span className="mini-checks">Seen</span>
            <span>Seen just now</span>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-form-heading">
            <span className="auth-form-icon">{mode === "login" ? <Lock size={21} /> : <User size={21} />}</span>
            <div>
              <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
              <p>{mode === "login" ? "Continue to your conversations." : signupStep === 1 ? "Let's get started with your basic info." : "Complete your profile setup."}</p>
            </div>
          </div>

          <div className="auth-tabs">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => navigate?.("/auth/sign-in")}>Sign in</button>
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => navigate?.("/auth/sign-up")}>Create</button>
          </div>

          {mode === "signup" && (
            <div className="auth-stepper" aria-label={`Create account step ${signupStep} of 2`}>
              <span className={`auth-step-node ${signupStep >= 1 ? "active" : ""}`}>1</span>
              <span className={`auth-step-line ${signupStep >= 2 ? "active" : ""}`} />
              <span className={`auth-step-node ${signupStep >= 2 ? "active" : ""}`}>2</span>
            </div>
          )}

          {(mode === "login" || signupStep === 1) && (
            <button
              type="button"
              className="secondary-button google-button"
              disabled={busy || !googleClientId}
              onClick={signInWithGoogle}
              title={googleClientId ? "Continue with Google" : "Set VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID"}
            >
              <Chrome size={17} />
              Continue with Google
            </button>
          )}

          {mode === "signup" && signupStep === 2 && (
            <>
              <div className="signup-avatar-row">
                <Avatar entity={{ fullName: form.fullName || form.username || "Hyper Chat", avatarSeed: form.avatarSeed, avatarStyle: form.avatarStyle, profilePic: form.profilePic }} size="lg" />
                <div className="avatar-style-controls">
                  <span>Fallback avatar</span>
                  <div>
                    <select value={form.avatarStyle} onChange={(event) => updateField("avatarStyle", event.target.value)}>
                      {AVATAR_STYLES.map((style) => <option key={style.value} value={style.value}>{style.label}</option>)}
                    </select>
                    <button type="button" className="secondary-button tiny" onClick={() => updateField("avatarSeed", createAvatarSeed())} disabled={avatarUpload.busy}>
                      <Shuffle size={13} /> Shuffle
                    </button>
                    <input
                      ref={avatarInputRef}
                      className="avatar-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        uploadSignupAvatar(event.target.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                    <button
                      type="button"
                      className="secondary-button tiny avatar-upload-button"
                      title="Upload avatar"
                      aria-label="Upload avatar"
                      disabled={avatarUpload.busy}
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      {avatarUpload.busy ? <Loader2 size={13} className="spin" /> : <ImagePlus size={14} />}
                    </button>
                  </div>
                  {avatarUpload.error && <small className="avatar-upload-note error">{avatarUpload.error}</small>}
                </div>
              </div>
              <label>
                <span>Username</span>
                <span className="input-with-icon">
                  <AtSign size={16} />
                  <input value={form.username} onChange={(event) => updateField("username", event.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))} autoComplete="username" required />
                </span>
              </label>
              {form.username && !isValidUsername(form.username) && (
                <p className="signup-hints">Username must be 3-32 characters using letters, numbers, dots, dashes, or underscores.</p>
              )}
            </>
          )}

          {(mode === "login" || signupStep === 1) && (
            <>
              {mode === "signup" && (
                <label>
                  <span>Name</span>
                  <input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} autoComplete="name" required />
                </label>
              )}
              <label>
                <span>Email</span>
                <input value={form.email} onChange={(event) => updateField("email", event.target.value)} type="email" autoComplete="email" required />
              </label>
              <label>
                <span>Password</span>
                <span className="password-field">
                  <input
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    minLength={8}
                  />
                  <IconButton title={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </IconButton>
                </span>
              </label>
              {mode === "signup" && !isSignupStepOneValid() && (form.fullName || form.email || form.password) && (
                <div className="signup-hints">
                  {form.fullName && form.fullName.trim().length < 2 && <p>Name must be at least 2 characters.</p>}
                  {form.email && !isValidEmail(form.email) && <p>Enter a valid email address.</p>}
                  {form.password && form.password.length < 8 && <p>Password must be at least 8 characters.</p>}
                </div>
              )}
            </>
          )}

          {mode === "signup" && signupStep === 2 && (
            <CheckboxRow checked={agreed} onChange={setAgreed}>
              I agree to keep this account accurate and private.
            </CheckboxRow>
          )}

          {error && <p className="form-error">{error}</p>}
          {mode === "login" ? (
            <button className="primary-button" disabled={busy}>
              {busy ? <><Loader2 size={17} className="spin" /> Signing in...</> : "Sign in"}
            </button>
          ) : signupStep === 1 ? (
            <button type="button" className="primary-button" disabled={!isSignupStepOneValid()} onClick={continueSignup}>
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <div className="signup-action-row">
              <button type="button" className="secondary-button" onClick={() => { setError(""); setSignupStep(1); }} disabled={busy}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="primary-button" disabled={busy || !isSignupStepTwoValid()}>
                {busy ? <><Loader2 size={17} className="spin" /> Creating...</> : <><span>Create account</span><ArrowRight size={16} /></>}
              </button>
            </div>
          )}
          <p className="auth-switch-copy">
            {mode === "login" ? "Need an account?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => navigate?.(mode === "login" ? "/auth/sign-up" : "/auth/sign-in")}>
              {mode === "login" ? "Create one" : "Sign in"}
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}
