import { useEffect, useState } from "react";
import { api } from "../api";

export default function Aparencia() {
  const [a, setA] = useState(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.getConfig().then((c) => setA(c.appearance)).catch((e) => setErr(e.message));
  }, []);

  const set = (k, v) => {
    setA({ ...a, [k]: v });
    setSaved(false);
  };

  async function save() {
    setErr("");
    try {
      await api.putAppearance(a);
      setSaved(true);
    } catch (e) {
      setErr(e.message);
    }
  }

  if (err) return <p className="text-red-400">Erro: {err}</p>;
  if (!a) return <p className="text-zinc-500">A carregar…</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Aparência</h2>

      <Row label="Tema">
        <div className="flex gap-2">
          {["dark", "light"].map((t) => (
            <button
              key={t}
              onClick={() => set("theme", t)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${
                a.theme === t ? "bg-emerald-500 text-emerald-950" : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {t === "dark" ? "Escuro" : "Claro"}
            </button>
          ))}
        </div>
      </Row>

      <Row label="Cor de destaque">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={a.accent}
            onChange={(e) => set("accent", e.target.value)}
            className="w-12 h-10 rounded bg-transparent cursor-pointer"
          />
          <span className="text-sm text-zinc-400">{a.accent}</span>
        </div>
      </Row>

      <Row label={`Tamanho do texto (${a.font_scale.toFixed(2)}×)`}>
        <input
          type="range"
          min="0.8"
          max="1.4"
          step="0.05"
          value={a.font_scale}
          onChange={(e) => set("font_scale", parseFloat(e.target.value))}
          className="w-64 accent-emerald-500"
        />
      </Row>

      <SaveBar onSave={save} saved={saved} />
    </div>
  );
}

export function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-6 py-2 border-b border-zinc-900">
      <span className="text-sm text-zinc-300">{label}</span>
      {children}
    </div>
  );
}

export function SaveBar({ onSave, saved }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        onClick={onSave}
        className="px-5 py-2.5 rounded-lg bg-emerald-500 text-emerald-950 font-semibold text-sm"
      >
        Guardar
      </button>
      {saved && <span className="text-emerald-400 text-sm">Guardado ✓</span>}
    </div>
  );
}
