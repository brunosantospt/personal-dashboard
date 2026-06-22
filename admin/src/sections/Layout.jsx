import { useEffect, useState } from "react";
import GridLayout, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { api } from "../api";
import { SaveBar } from "./Aparencia.jsx";

const Grid = WidthProvider(GridLayout);

const META = {
  weather: { label: "Meteorologia", color: "#5eead4" },
  calendar: { label: "Eventos", color: "#f0883e" },
  tasks: { label: "Tarefas", color: "#a78bfa" },
  photos: { label: "Fotos", color: "#f87171" },
};

const toLayout = (items) =>
  Object.entries(items).map(([i, p]) => ({ i, ...p, minW: 2, minH: 2 }));

const toItems = (layout) =>
  Object.fromEntries(layout.map((l) => [l.i, { x: l.x, y: l.y, w: l.w, h: l.h }]));

export default function Layout() {
  const [cfg, setCfg] = useState(null);
  const [layout, setLayoutState] = useState([]);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .getConfig()
      .then((c) => {
        setCfg(c.layout);
        setLayoutState(toLayout(c.layout.items));
      })
      .catch((e) => setErr(e.message));
  }, []);

  async function save() {
    setErr("");
    try {
      await api.putLayout({ ...cfg, items: toItems(layout) });
      setSaved(true);
    } catch (e) {
      setErr(e.message);
    }
  }

  if (err) return <p className="text-red-400">Erro: {err}</p>;
  if (!cfg) return <p className="text-zinc-500">A carregar…</p>;

  return (
    <div className="space-y-4 max-w-none">
      <div>
        <h2 className="text-lg font-semibold">Layout</h2>
        <p className="text-sm text-zinc-500">
          Arrasta os widgets para mover e puxa o canto inferior direito para redimensionar.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-2">
        <Grid
          className="layout"
          layout={layout}
          cols={cfg.cols}
          rowHeight={cfg.row_height}
          margin={[10, 10]}
          onLayoutChange={(l) => {
            setLayoutState(l);
            setSaved(false);
          }}
          isBounded
          compactType={null}
        >
          {layout.map((l) => (
            <div
              key={l.i}
              className="rounded-lg flex items-center justify-center text-sm font-semibold select-none"
              style={{
                background: `${META[l.i]?.color || "#5eead4"}22`,
                border: `1px solid ${META[l.i]?.color || "#5eead4"}`,
                color: META[l.i]?.color || "#5eead4",
              }}
            >
              {META[l.i]?.label || l.i}
            </div>
          ))}
        </Grid>
      </div>

      <SaveBar onSave={save} saved={saved} />
    </div>
  );
}
