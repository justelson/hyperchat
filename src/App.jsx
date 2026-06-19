import { useEffect, useState } from "react";
import { AuthScreen } from "./components/auth/AuthScreen";
import { ChatApp } from "./components/chat/ChatApp";
import { TOKEN_KEY } from "./lib/chatConstants";
import { useRoute } from "./hooks/useRoute";

function isKnownRoute(path = "") {
  if (path === "/") return true;
  if (path === "/app") return true;
  if (/^\/app\/(chats|rooms)\/.+/.test(path)) return true;
  if (/^\/settings(\/(profile|appearance|privacy|notifications))?$/.test(path)) return true;
  if (/^\/auth\/(sign-in|sign-up)$/.test(path)) return true;
  if (/^\/invite\/.+/.test(path)) return true;
  return false;
}

function MissingPage({ navigate }) {
  return (
    <main className="missing-page">
      <section>
        <span>404</span>
        <h1>Page not found</h1>
        <p>This Hyperchat route does not exist.</p>
        <button type="button" className="primary-button" onClick={() => navigate?.("/app", { replace: true })}>Back to chats</button>
      </section>
    </main>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const { routePath, navigate } = useRoute();
  const knownRoute = isKnownRoute(routePath);

  useEffect(() => {
    if (!knownRoute) return;
    if (!token && !routePath.startsWith("/auth")) {
      if (routePath.startsWith("/invite/")) sessionStorage.setItem("hyperchat:pendingInvite", routePath);
      navigate("/auth/sign-in", { replace: true });
    }
    if (token && (routePath === "/" || routePath.startsWith("/auth"))) {
      const pendingInvite = sessionStorage.getItem("hyperchat:pendingInvite");
      if (pendingInvite) sessionStorage.removeItem("hyperchat:pendingInvite");
      navigate(pendingInvite || "/app", { replace: true });
    }
  }, [knownRoute, navigate, routePath, token]);

  if (!knownRoute) return <MissingPage navigate={navigate} />;
  if (!token) return <AuthScreen onToken={setToken} routePath={routePath} navigate={navigate} />;
  return <ChatApp token={token} routePath={routePath} navigate={navigate} onLogout={() => setToken("")} />;
}
