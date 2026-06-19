import { Chrome, Eye, EyeOff, Loader2, Lock, Shuffle, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AVATAR_STYLES, TOKEN_KEY } from "../../lib/chatConstants";
import { createAvatarSeed, displayError } from "../../lib/chatUtils";
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
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const login = useMutation(api.auth.login);
  const signUp = useMutation(api.auth.signUp);
  const googleLogin = useAction(api.auth.googleLogin);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    setError("");
  }, [mode]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
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
    if (mode === "signup" && !agreed) {
      setError("Accept the account terms to create your account.");
      return;
    }
    setBusy(true);
    try {
      const result = mode === "login"
        ? await login({ email: form.email, password: form.password })
        : await signUp({
          fullName: form.fullName,
          username: form.username || undefined,
          email: form.email,
          password: form.password,
          avatarSeed: form.avatarSeed,
          avatarStyle: form.avatarStyle,
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
        <div className="auth-brand">
          <span className="brand-mark">H</span>
          <div>
            <h1>Hyperchat</h1>
            <p>Direct chats and rooms, kept focused.</p>
          </div>
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
              <p>{mode === "login" ? "Continue to your conversations." : "Set up your Hyperchat identity."}</p>
            </div>
          </div>

          <div className="auth-tabs">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => navigate?.("/auth/sign-in")}>Sign in</button>
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => navigate?.("/auth/sign-up")}>Create</button>
          </div>

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

          {mode === "signup" && (
            <>
              <div className="signup-avatar-row">
                <Avatar entity={{ fullName: form.fullName || form.username || "Hyperchat", avatarSeed: form.avatarSeed, avatarStyle: form.avatarStyle }} size="lg" />
                <div className="avatar-style-controls">
                  <span>Fallback avatar</span>
                  <div>
                    <select value={form.avatarStyle} onChange={(event) => updateField("avatarStyle", event.target.value)}>
                      {AVATAR_STYLES.map((style) => <option key={style.value} value={style.value}>{style.label}</option>)}
                    </select>
                    <button type="button" className="secondary-button tiny" onClick={() => updateField("avatarSeed", createAvatarSeed())}>
                      <Shuffle size={13} /> Shuffle
                    </button>
                  </div>
                </div>
              </div>
              <label>
                <span>Name</span>
                <input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} autoComplete="name" required />
              </label>
              <label>
                <span>Username</span>
                <input value={form.username} onChange={(event) => updateField("username", event.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))} autoComplete="username" />
              </label>
            </>
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

          {mode === "signup" && (
            <CheckboxRow checked={agreed} onChange={setAgreed}>
              I agree to keep this account accurate and private.
            </CheckboxRow>
          )}

          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" disabled={busy}>
            {busy ? <><Loader2 size={17} className="spin" /> {mode === "login" ? "Signing in..." : "Creating..."}</> : mode === "login" ? "Sign in" : "Create account"}
          </button>
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
