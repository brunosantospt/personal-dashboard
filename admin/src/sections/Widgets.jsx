import { useEffect, useState } from "react";
import { api } from "../api";
import { SaveBar } from "./Aparencia.jsx";

const META = {
  weather: "Meteorologia",
  calendar: "Eventos",
  tasks: "Tarefas",
  photos: "Fotos",
  spotify: "Spotify",
};

export default function Widgets() {
  const [w, setW] = useState(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.getConfig().then((c) => setW(c.widgets)).catch((e) => setErr(e.message));
  }, []);

  const setField = (widget, key, value) => {
    setW({ ...w, [widget]: { ...w[widget], [key]: value } });
    setSaved(false);
  };

  async function save() {
    setErr("");
    try {
      await api.putWidgets(w);
      setSaved(true);
    } catch (e) {
      setErr(e.message);
    }
  }

  if (err) return <p className="text-red-400">Erro: {err}</p>;
  if (!w) return <p className="text-zinc-500">A carregar…</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Widgets</h2>

      {Object.keys(META).map((id) => (
        <section key={id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="font-medium">{META[id]}</span>
            <Toggle on={w[id]?.enabled} onClick={() => setField(id, "enabled", !w[id]?.enabled)} />
          </div>

          {w[id]?.enabled && id === "weather" && (
            <div className="mt-4 flex gap-3">
              <Num label="Latitude" value={w.weather.lat} onChange={(v) => setField("weather", "lat", v)} />
              <Num label="Longitude" value={w.weather.lon} onChange={(v) => setField("weather", "lon", v)} />
            </div>
          )}

          {w[id]?.enabled && id === "calendar" && (
            <div className="mt-4 space-y-3">
              <Num
                label="Horizonte (dias)"
                value={w.calendar.horizon_days}
                onChange={(v) => setField("calendar", "horizon_days", v)}
              />
              <Text
                label="Esconder títulos (vírgulas)"
                value={(w.calendar.hide || []).join(", ")}
                onChange={(v) =>
                  setField(
                    "calendar",
                    "hide",
                    v.split(",").map((s) => s.trim()).filter(Boolean),
                  )
                }
              />
            </div>
          )}

          {w[id]?.enabled && id === "photos" && (
            <div className="mt-4">
              <Num
                label="Intervalo (segundos)"
                value={w.photos.interval_seconds}
                onChange={(v) => setField("photos", "interval_seconds", v)}
              />
            </div>
          )}
        </section>
      ))}

      <SaveBar onSave={save} saved={saved} />
    </div>
  );
}

function Toggle({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-12 h-6 rounded-full transition relative ${on ? "bg-emerald-500" : "bg-zinc-700"}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
          on ? "left-6" : "left-0.5"
        }`}
      />
    </button>
  );
}

function Num({ label, value, onChange }) {
  return (
    <label className="text-sm text-zinc-400 flex flex-col gap-1">
      {label}
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className="w-40 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 outline-none focus:border-emerald-500"
      />
    </label>
  );
}

function Text({ label, value, onChange }) {
  return (
    <label className="text-sm text-zinc-400 flex flex-col gap-1">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 outline-none focus:border-emerald-500"
      />
    </label>
  );
}
