# --- build do Admin Panel (Vite/React) ---
FROM node:20-alpine AS admin
WORKDIR /admin
COPY admin/package.json admin/package-lock.json ./
RUN npm ci
COPY admin/ ./
RUN npm run build

# --- runtime (FastAPI / uvicorn) ---
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY --from=admin /admin/dist ./admin/dist

# /data é volume persistente no Coolify (SQLite com tokens + config).
# Definir DATABASE_URL=sqlite:////data/dashboard.db nas env vars do Coolify.
RUN mkdir -p /data

EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
