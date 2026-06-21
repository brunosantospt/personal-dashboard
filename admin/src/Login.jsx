import { useState } from "react";
import { api, setToken } from "./api";

export default function Login({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const { token } = await api.login(pw);
      setToken(token);
      onLogin();
    } catch {
      setErr("Password incorreta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-5"
      >
        <div>
          <h1 className="text-xl font-semibold">Personal Dashboard</h1>
          <p className="text-zinc-400 text-sm">Painel de administração</p>
        </div>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 outline-none focus:border-emerald-500"
        />
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button
          type="submit"
          disabled={busy || !pw}
          className="w-full py-3 rounded-lg bg-emerald-500 text-emerald-950 font-semibold disabled:opacity-50"
        >
          {busy ? "A entrar…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
