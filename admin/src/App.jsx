import { useState } from "react";
import { getToken, clearToken } from "./api";
import Login from "./Login.jsx";
import Shell from "./Shell.jsx";

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;
  return (
    <Shell
      onLogout={() => {
        clearToken();
        setAuthed(false);
      }}
    />
  );
}
