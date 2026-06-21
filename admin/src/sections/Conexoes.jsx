import { useEffect, useState } from "react";
import { api } from "../api";

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Conexoes() {
  const [status, setStatus] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      setStatus(await api.status());
    } catch (e) {
      setErr(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const connect = (provider) => window.open(`/api/auth/${provider}`, "_blank");

  if (err) return <p className="text-red-400">Erro: {err}</p>;
  if (!status) return <p className="text-zinc-500">A carregar…</p>;

  const g = status.google;
  const s = status.spotify;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Conexões</h2>
        <button
          onClick={load}
          className="text-sm text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-800"
        >
          Atualizar
        </button>
      </div>

      {/* Google */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Google (Calendar + Tasks)</div>
          <Badge ok={g.authenticated} />
        </div>
        {g.accounts.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {g.accounts.map((a) => (
              <li key={a.account} className="flex justify-between text-zinc-300">
                <span>{a.account}</span>
                <span className="text-zinc-500">expira {fmt(a.expires_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">Nenhuma conta ligada.</p>
        )}
        <button
          onClick={() => connect("google")}
          className="text-sm px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700"
        >
          + Ligar conta Google
        </button>
      </section>

      {/* Spotify */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Spotify</div>
          <Badge ok={s.authenticated} />
        </div>
        <p className="text-sm text-zinc-500">
          {s.authenticated ? `Ligado · expira ${fmt(s.expires_at)}` : "Não ligado."}
        </p>
        <button
          onClick={() => connect("spotify")}
          className="text-sm px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700"
        >
          {s.authenticated ? "Reconectar Spotify" : "Ligar Spotify"}
        </button>
      </section>
    </div>
  );
}

function Badge({ ok }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${
        ok ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
      }`}
    >
      {ok ? "ligado" : "desligado"}
    </span>
  );
}
