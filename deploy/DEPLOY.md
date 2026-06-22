# Deploy — Personal Dashboard (Hetzner, HTTP por IP)

Deploy inicial sem domínio: HTTP, acedido por `http://IP_DA_VPS/`.
Os tokens OAuth migram do Mac (continuam a funcionar via refresh, independentes do host),
por isso **não é preciso re-autenticar** no servidor.

> ⚠️ Sem HTTPS, os dados (calendário/tarefas/fotos) e a password do admin viajam em claro.
> Mitigação abaixo (firewall). Passar a HTTPS assim que tiveres domínio (secção no fim).

Substitui `SERVER` pelo IP da VPS. Assume SSH como `root` (ajusta se usares outro user).

---

## 1. No Mac — build do admin e envio

```bash
cd ~/Documents/HOME-ASSISTANT
# garantir o build do admin atualizado
(cd admin && npm run build)

# enviar o projeto para /opt/dashboard (inclui .env e dashboard.db = tokens;
# exclui venv, node_modules, caches)
rsync -avz --delete \
  --exclude '.venv' --exclude 'node_modules' --exclude '__pycache__' \
  --exclude 'photos_cache' --exclude '.git' \
  ~/Documents/HOME-ASSISTANT/ root@SERVER:/opt/dashboard/
```

## 2. Na VPS — dependências e venv

```bash
ssh root@SERVER
apt update && apt install -y python3-venv python3-pip   # Nginx já instalado
cd /opt/dashboard
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
# arranque rápido (Ctrl+C depois de confirmar que sobe sem erros)
.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

## 3. systemd (arranque automático + restart)

```bash
cp /opt/dashboard/deploy/dashboard.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now dashboard
systemctl status dashboard          # deve estar 'active (running)'
curl -s localhost:8000/api/health   # {"status":"ok",...}
```

## 4. Nginx (reverse proxy na porta 80)

```bash
cp /opt/dashboard/deploy/nginx-dashboard.conf /etc/nginx/sites-available/dashboard
ln -sf /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/dashboard
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Abre **http://SERVER/** — deve aparecer o dashboard. Admin em **http://SERVER/admin/**.

## 5. Firewall (mitigação)

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw enable
```
(uvicorn está em 127.0.0.1, logo não acessível diretamente — só via Nginx.)

---

## Tablet (kiosk)
No Chrome/Firefox do Lenovo M10 HD: abrir `http://SERVER/` em modo ecrã inteiro / kiosk.

## Atualizações futuras
Repetir o passo 1 (rsync) e depois:
```bash
ssh root@SERVER 'cd /opt/dashboard && .venv/bin/pip install -r requirements.txt && systemctl restart dashboard'
```

## Notas importantes
- **Não cliques em "reconectar" no admin do servidor** — o OAuth precisa de HTTPS+domínio.
  Se um token morrer: re-autentica no Mac (local) e re-envia o `dashboard.db` (passo 1).
- O carousel usa o Google Drive (config na BD migrada) — funciona porque os tokens funcionam.

## Quando tiveres domínio → HTTPS
1. DNS: registo A `dashboard.teu-dominio.com` → IP da VPS.
2. `nginx-dashboard.conf`: trocar `server_name _;` por `server_name dashboard.teu-dominio.com;`, `nginx -t && systemctl reload nginx`.
3. `apt install -y certbot python3-certbot-nginx && certbot --nginx -d dashboard.teu-dominio.com`.
4. Atualizar os **redirect URIs** no Google Console e no Spotify para
   `https://dashboard.teu-dominio.com/api/auth/{google,spotify}/callback`
   e no `.env` da VPS (`GOOGLE_REDIRECT_URI`, `SPOTIFY_REDIRECT_URI`); `systemctl restart dashboard`.
   A partir daí o OAuth/reconnect também funciona no servidor.
