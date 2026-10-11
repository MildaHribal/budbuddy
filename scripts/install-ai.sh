#!/bin/sh
# Copies the on-device AI files (not in git) into public/ai/.
set -e
SRC="${KONOPI_MOBILE:-$HOME/konopi-expert/mobile}"
DST="$(dirname "$0")/../public/ai"
mkdir -p "$DST/ort" "$DST/kb"
cp node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs "$DST/ort/"
rsync -a --delete "$SRC/kb/pack/" "$DST/kb/"
if [ -f "$SRC/classifier/diag.onnx" ]; then
  mkdir -p "$DST/classifier"
  rsync -a --delete --include='*.onnx' --include='*.ort' --include='*.json' --exclude='*' "$SRC/classifier/" "$DST/classifier/"
fi
du -sh "$DST"/*
