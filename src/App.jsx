import { useEffect, useState } from "react";
import { AuthScreen } from "./components/auth/AuthScreen";
import { ChatApp } from "./components/chat/ChatApp";
import { TOKEN_KEY } from "./lib/chatConstants";
import { useRoute } from "./hooks/useRoute";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const { routePath, navigate } = useRoute();

  useEffect(() => {
    if (!token && !routePath.startsWith("/auth")) {
      navigate("/auth/sign-in", { replace: true });
    }
    if (token && (routePath === "/" || routePath.startsWith("/auth"))) {
      navigate("/app", { replace: true });
    }
  }, [navigate, routePath, token]);

  if (!token) return <AuthScreen onToken={setToken} routePath={routePath} navigate={navigate} />;
  return <ChatApp token={token} routePath={routePath} navigate={navigate} onLogout={() => setToken("")} />;
}
