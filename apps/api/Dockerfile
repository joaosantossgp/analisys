# ---------------------------------------------------------------------------
# Stage 1 — instalar dependencias de producao
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /app

COPY apps/api/requirements-prod.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements-prod.txt

# ---------------------------------------------------------------------------
# Stage 2 — imagem final enxuta
# ---------------------------------------------------------------------------
FROM python:3.11-slim

WORKDIR /app

# Copiar pacotes instalados no stage anterior
COPY --from=builder /install /usr/local

# Copiar codigo fonte necessario para a API
COPY src/ src/
COPY apps/__init__.py apps/__init__.py
COPY apps/api/ apps/api/

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
# PORT substituido pela Railway; WEB_CONCURRENCY=2 para planos single-vCPU
ENV PORT=8000
ENV WEB_CONCURRENCY=4

CMD ["sh", "-c", "uvicorn apps.api.app.main:app --host 0.0.0.0 --port ${PORT} --workers ${WEB_CONCURRENCY} --loop uvloop --access-log"]
