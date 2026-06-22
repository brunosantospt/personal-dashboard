import { useState } from "react";
import Conexoes from "./sections/Conexoes.jsx";
import Aparencia from "./sections/Aparencia.jsx";
import Layout from "./sections/Layout.jsx";
import Widgets from "./sections/Widgets.jsx";
import Fotos from "./sections/Fotos.jsx";

const SECTIONS = [
  { id: "conexoes", label: "Conexões", Comp: Conexoes },
  { id: "aparencia", label: "Aparência", Comp: Aparencia },
  { id: "layout", label: "Layout", Comp: Layout },
  { id: "widgets", label: "Widgets", Comp: Widgets },
  { id: "fotos", label: "Fotos", Comp: Fotos },
];

export default function Shell({ onLogout }) {
  const [active, setActive] = useState("conexoes");
  const Active = SECTIONS.find((s) => s.id === active).Comp;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <aside className="w-56 shrink-0 border-r border-zinc-800 p-4 flex flex-col">
        <div className="px-2 pb-6">
          <div className="font-semibold">Dashboard</div>
          <div className="text-xs text-zinc-500">Admin</div>
        </div>
        <nav className="space-y-1 flex-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                active === s.id
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-zinc-400 hover:bg-zinc-900"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <button
          onClick={onLogout}
          className="text-left px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-900"
        >
          Terminar sessão
        </button>
      </aside>

      <main className="flex-1 p-8 max-w-5xl">
        <Active />
      </main>
    </div>
  );
}
