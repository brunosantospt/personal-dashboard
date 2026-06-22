# Deploy via Coolify (servidor 46.62.197.69)

O servidor é um host **Coolify**. Deployar o dashboard **como app Coolify** (build do
`Dockerfile`, atrás do Caddy com HTTPS automático). Não usar o deploy manual (DEPLOY.md).

## 1. Ligar o GitHub ao Coolify (repo privado)
- Coolify → **Sources** (ou Keys & Tokens → GitHub Apps) → ligar a conta GitHub
  `brunosantospt` (instalar a GitHub App no repo `personal-dashboard`).
- Alternativa: adicionar um *deploy key* do Coolify ao repo.

## 2. Criar a aplicação
- **+ New** → **Application** → escolher o repo `brunosantospt/personal-dashboard`, branch `main`.
- **Build Pack: Dockerfile** (deteta o `Dockerfile` na raiz automaticamente).
- **Port / Ports Exposes:** `8000`.

## 3. Volume persistente (tokens + config sobrevivem a re-deploys)
- **Persistent Storage** → adicionar um volume montado em **`/data`**.

## 4. Environment Variables
Copiar do `.env` local (`~/Documents/HOME-ASSISTANT/.env`). **Mudar só os 2 redirect URIs**
para o domínio HTTPS (passo 5). Manter a **mesma `SECRET_KEY`** (permite migrar a BD e
manter os tokens válidos).

```
DATABASE_URL=sqlite:////data/dashboard.db
SECRET_KEY=<igual ao .env local>
ADMIN_PASSWORD_HASH=<igual ao .env local>
GOOGLE_CLIENT_ID=<igual>
GOOGLE_CLIENT_SECRET=<igual>
GOOGLE_REDIRECT_URI=https://<DOMINIO>/api/auth/google/callback
SPOTIFY_CLIENT_ID=<igual>
SPOTIFY_REDIRECT_URI=https://<DOMINIO>/api/auth/spotify/callback
ACCOUNT_LABELS=<igual>
CALENDAR_HIDE=<igual>
CALENDAR_HORIZON_DAYS=30
LOCATION_LAT=41.1579
LOCATION_LON=-8.6291
```

## 5. Domínio + HTTPS
- **Domains** da app → definir o FQDN. Sem comprar domínio: usar sslip.io, ex.:
  `https://dashboard.46.62.197.69.sslip.io` (o Caddy do Coolify emite o certificado).
- (Ou um subdomínio próprio com registo A → 46.62.197.69.)

## 6. Deploy
- **Deploy**. O Coolify faz build do Dockerfile e põe a app atrás do Caddy com HTTPS.
- Testar: `https://<DOMINIO>/api/health`.

## 7. Redirect URIs do OAuth (senão o login parte)
- **Google Cloud Console** → Credentials → o OAuth client → adicionar
  `https://<DOMINIO>/api/auth/google/callback`.
- **Spotify Developer Dashboard** → a app → Redirect URIs → adicionar
  `https://<DOMINIO>/api/auth/spotify/callback`.

## 8. Tokens / config
Duas opções:
- **Re-autenticar no servidor** (HTTPS funciona): `https://<DOMINIO>/admin` → Conexões
  (ligar Google + Spotify) → Fotos (escolher pasta Drive). Refazer layout/aparência.
- **Migrar a BD local** (preserva tudo): copiar o `dashboard.db` local para o volume `/data`
  do container (mesma `SECRET_KEY`) — fazemos isto com ajuda quando a app estiver de pé.

## Tablet
Kiosk no Lenovo M10 HD → `https://<DOMINIO>/`.
