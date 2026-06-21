import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { Row, SaveBar } from "./Aparencia.jsx";

const LABELS = {
  weather: "Meteorologia",
  calendar: "Eventos",
  tasks: "Tarefas",
  photos: "Fotos",
};

export default function Layout() {
  const [layout, setLayout] = useState(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const dragIdx = useRef(null);

  useEffect(() => {
    api.getConfig().then((c) => setLayout(c.layout)).catch((e) => setErr(e.message));
  }, []);

  const change = (next) => {
    setLayout(next);
    setSaved(false);
  };

  function onDrop(i) {
    const from = dragIdx.current;
    if (from === null || from === i) return;
    const order = [...layout.order];
    const [moved] = order.splice(from, 1);
    order.splice(i, 0, moved);
    change({ ...layout, order });
    dragIdx.current = null;
  }

  async function save() {
    setErr("");
    try {
      await api.putLayout(layout);
      setSaved(true);
    } catch (e) {
      setErr(e.message);
    }
  }

  if (err) return <p className="text-red-400">Erro: {err}</p>;
  if (!layout) return <p className="text-zinc-500">A carregar…</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Layout</h2>

      <Row label="Número de colunas">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => change({ ...layout, columns: n })}
              className={`w-10 h-10 rounded-lg text-sm ${
                layout.columns === n ? "bg-emerald-500 text-emerald-950" : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Row>

      <div>
        <p className="text-sm text-zinc-300 mb-2">Ordem dos widgets (arrasta para reordenar)</p>
        <ul className="space-y-2">
          {layout.order.map((w, i) => (
            <li
              key={w}
              draggable
              onDragStart={() => (dragIdx.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 cursor-grab active:cursor-grabbing"
            >
              <span className="text-zinc-600">⠿</span>
              <span className="text-sm">{LABELS[w] || w}</span>
            </li>
          ))}
        </ul>
      </div>

      <SaveBar onSave={save} saved={saved} />
    </div>
  );
}
