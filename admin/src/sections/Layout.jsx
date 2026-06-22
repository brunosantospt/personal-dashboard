import { useEffect, useRef, useState } from "react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { api } from "../api";
import { SaveBar } from "./Aparencia.jsx";

const META = {
  weather: { label: "Meteorologia", color: "#5eead4" },
  calendar: { label: "Eventos", color: "#f0883e" },
  tasks: { label: "Tarefas", color: "#a78bfa" },
  photos: { label: "Fotos", color: "#f87171" },
};

const ASPECT = 1280 / 800; // ecrã do tablet (Lenovo M10 HD) — canvas WYSIWYG
const MARGIN = 8;

const toLayout = (items) =>
  Object.entries(items).map(([i, p]) => ({ i, ...p, minW: 1, minH: 1 }));

const toItems = (layout) =>
  Object.fromEntries(layout.map((l) => [l.i, { x: l.x, y: l.y, w: l.w, h: l.h }]));

export default function Layout() {
  const [cfg, setCfg] = useState(null);
  const [layout, setLayoutState] = useState([]);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(900);

  useEffect(() => {
    api
      .getConfig()
      .then((c) => {
        setCfg(c.layout);
        setLayoutState(toLayout(c.layout.items));
      })
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [cfg]);

  async function save() {
    setErr("");
    try {
      await api.putLayout({ cols: cfg.cols, rows: cfg.rows, items: toItems(layout) });
      setSaved(true);
    } catch (e) {
      setErr(e.message);
    }
  }

  if (err) return <p className="text-red-400">Erro: {err}</p>;
  if (!cfg) return <p className="text-zinc-500">A carregar…</p>;

  const rows = cfg.rows;
  // altura fixa do canvas a partir da largura medida, mantendo a proporção do ecrã
  const rowHeight = Math.max(
    16,
    Math.floor((width / ASPECT - MARGIN * (rows + 1)) / rows),
  );
  const canvasHeight = rowHeight * rows + MARGIN * (rows + 1);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Layout</h2>
        <p className="text-sm text-zinc-500">
          Tela de tamanho fixo (proporção do tablet). Arrasta para mover, puxa o canto
          inferior direito para redimensionar.
        </p>
      </div>

      <div
        ref={wrapRef}
        className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden"
        style={{ height: canvasHeight }}
      >
        <GridLayout
          layout={layout}
          width={width}
          cols={cfg.cols}
          maxRows={rows}
          rowHeight={rowHeight}
          margin={[MARGIN, MARGIN]}
          autoSize={false}
          isBounded
          preventCollision
          compactType={null}
          onLayoutChange={(l) => {
            setLayoutState(l);
            setSaved(false);
          }}
          style={{ height: canvasHeight }}
        >
          {layout.map((l) => (
            <div
              key={l.i}
              className="rounded-lg flex items-center justify-center text-sm font-semibold select-none overflow-hidden"
              style={{
                background: `${META[l.i]?.color || "#5eead4"}22`,
                border: `1px solid ${META[l.i]?.color || "#5eead4"}`,
                color: META[l.i]?.color || "#5eead4",
              }}
            >
              {META[l.i]?.label || l.i}
            </div>
          ))}
        </GridLayout>
      </div>

      <SaveBar onSave={save} saved={saved} />
    </div>
  );
}
