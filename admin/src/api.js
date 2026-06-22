const TOKEN_KEY = "admin_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function req(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    clearToken();
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `HTTP ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  login: (password) => req("POST", "/admin/login", { password }),
  status: () => req("GET", "/admin/status"),
  getConfig: () => req("GET", "/admin/config"),
  putAppearance: (v) => req("PUT", "/admin/appearance", v),
  putLayout: (v) => req("PUT", "/admin/layout", v),
  putWidgets: (v) => req("PUT", "/admin/widgets", v),
  driveFolders: (account) =>
    req("GET", `/admin/drive/folders?account=${encodeURIComponent(account)}`),
};
