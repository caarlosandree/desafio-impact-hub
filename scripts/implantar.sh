#!/usr/bin/env bash
# Constrói os workflows com n8n/config.local.json, importa, publica e reinicia o n8n local.
set -euo pipefail
cd "$(dirname "$0")/.."

node scripts/construir-workflows.mjs
docker exec nf-n8n rm -rf /tmp/nf
docker exec nf-n8n mkdir -p /tmp/nf
for arquivo in n8n/workflows/*.json; do
  docker cp "$arquivo" nf-n8n:/tmp/nf/
done
docker exec nf-n8n n8n import:workflow --separate --input=/tmp/nf
for id in NFerrosAlerta001 NFapoioTestes001 NFrecepcaoExtr01; do
  docker exec nf-n8n n8n publish:workflow --id="$id"
done
docker restart nf-n8n >/dev/null
until curl -sf http://localhost:5678/healthz >/dev/null; do sleep 2; done
sleep 5
docker logs --since 60s nf-n8n 2>&1 | grep -E "Activated workflow|problem in" || true
echo "Workflows importados, publicados e n8n reiniciado."
