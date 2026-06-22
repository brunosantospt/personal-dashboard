import { useEffect, useState } from "react";
import { api } from "../api";
import { SaveBar } from "./Aparencia.jsx";

export default function Fotos() {
  const [accounts, setAccounts] = useState([]);
  const [drive, setDrive] = useState({ account: "", folder_id: "", folder_name: "" });
  const [folders, setFolders] = useState(null);  // null = não carregado
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([api.status(), api.getConfig()])
      .then(([st, cfg]) => {
        setAccounts(st.google.accounts.map((a) => a.account));
        setDrive({ account: "", folder_id: "", folder_name: "", ...(cfg.widgets.photos.drive || {}) });
      })
      .catch((e) => setErr(e.message));
  }, []);

  async function loadFolders(account) {
    if (!account) { setFolders(null); return; }
    setLoadingFolders(true);
    setErr("");
    try {
      setFolders((await api.driveFolders(account)).folders);
    } catch (e) {
      setErr(e.message);
      setFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  }

  function pickAccount(account) {
    setDrive({ account, folder_id: "", folder_name: "" });
    setSaved(false);
    loadFolders(account);
  }

  function pickFolder(f) {
    setDrive((d) => ({ ...d, folder_id: f.id, folder_name: f.name }));
    setSaved(false);
  }

  async function save() {
    setErr("");
    try {
      await api.putWidgets({ photos: { drive } });
      setSaved(true);
    } catch (e) {
      setErr(e.message);
    }
  }

  async function useLocal() {
    setDrive({ account: "", folder_id: "", folder_name: "" });
    try {
      await api.putWidgets({ photos: { drive: { account: "", folder_id: "", folder_name: "" } } });
      setSaved(true);
      setFolders(null);
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Fotos</h2>
        <p className="text-sm text-zinc-500">
          Escolhe uma pasta do Google Drive para o carousel. Tudo o que lá puseres aparece no dashboard.
        </p>
      </div>

      {err && <p className="text-red-400 text-sm">{err}</p>}

      {drive.folder_id && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm">
          A passar: <b>{drive.folder_name}</b> <span className="text-zinc-400">({drive.account})</span>
        </div>
      )}

      <div>
        <label className="text-sm text-zinc-300 block mb-2">Conta Google</label>
        <select
          value={drive.account}
          onChange={(e) => pickAccount(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 outline-none focus:border-emerald-500"
        >
          <option value="">— escolher conta —</option>
          {accounts.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {drive.account && (
        <div>
          <label className="text-sm text-zinc-300 block mb-2">Pasta</label>
          {loadingFolders ? (
            <p className="text-zinc-500 text-sm">A carregar pastas…</p>
          ) : folders && folders.length ? (
            <ul className="max-h-72 overflow-y-auto rounded-lg border border-zinc-800 divide-y divide-zinc-800">
              {folders.map((f) => (
                <li key={f.id}>
                  <button
                    onClick={() => pickFolder(f)}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 ${
                      drive.folder_id === f.id ? "bg-emerald-500/15 text-emerald-400" : "hover:bg-zinc-900"
                    }`}
                  >
                    <span>📁</span> {f.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-zinc-500 text-sm">Sem pastas (ou sem acesso).</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        <SaveBar onSave={save} saved={saved} />
        <button onClick={useLocal} className="text-sm text-zinc-400 hover:text-zinc-200">
          Usar pasta local
        </button>
      </div>
    </div>
  );
}
