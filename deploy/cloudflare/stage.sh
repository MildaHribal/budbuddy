#!/bin/sh
# Copies the generated site without the offline AI pack (never distributed, files over the 25 MB asset limit).
set -e
cd "$(dirname "$0")"
rm -rf site
mkdir site
rsync -a --exclude 'ai/' --exclude 'ort-wasm-*' ../../.output/public/ site/
# SPA fallback instead of Nuxt's static 404 page
rm -f site/404.html
cp _headers site/_headers
