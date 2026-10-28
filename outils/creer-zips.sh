#!/usr/bin/env bash
# Génère les archives ZIP de livraison, site par site.
#
# L'archive globale du parc (~1 Go avant compression) dépasse la taille autorisée
# dans le dépôt : elle n'est donc pas versionnée. Ce script produit les ZIP à la
# demande dans livrables/ (ignoré par Git).
#
#   ./outils/creer-zips.sh              # un ZIP par landing page traitée
#   ./outils/creer-zips.sh assurance-tns # un seul site
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p livrables

sites=()
if [ $# -gt 0 ]; then
  sites=("$@")
else
  for dir in */; do
    site="${dir%/}"
    if [ -f "$site/lead-handler.js" ]; then sites+=("$site"); fi
  done
fi

for site in "${sites[@]}"; do
  out="livrables/${site}-FONCTIONNEL.zip"
  rm -f "$out"
  zip -qr "$out" "$site" -x '*.DS_Store'
  printf '%-45s %s\n' "$out" "$(du -h "$out" | cut -f1)"
done
