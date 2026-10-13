#!/bin/sh
# Uploads (up) or deletes (rm) the demo community photos in Storage: media/<demo user id>/demo/<file>.
# Files are the bundled Wikimedia Commons photos from app/assets/{demo,guide}; demo/catalog/<slug>/<file> are copies of
# the strain catalogue photos (media/catalog/<slug>/<file>, credited in the post/update text). The list comes from demo_community.sql.
# Usage: sh supabase/seed/demo_media.sh up|rm
set -eu
cd "$(dirname "$0")/../.."
REF=mlvpmiwvuxgwjssrtxsq
FLAGS="--experimental --linked --project-ref $REF"
PUBLIC=https://$REF.supabase.co/storage/v1/object/public
PATHS=$(grep -o 'media/de3a0000-[0-9a-f-]*/demo/[A-Za-z0-9._/-]*' supabase/seed/demo_community.sql | sort -u)

case "${1:-}" in
  up)
    tmp=$(mktemp -d)
    trap 'rm -rf "$tmp"' EXIT
    for p in $PATHS; do
      f=$(basename "$p")
      case "$p" in
        */demo/catalog/*)
          src=$tmp/$f
          curl -fsS -o "$src" "$PUBLIC/media/catalog/${p#*/demo/catalog/}"
          ;;
        *)
          src=app/assets/demo/$f
          [ -f "$src" ] || src=app/assets/guide/$f
          ;;
      esac
      npx supabase storage cp $FLAGS --cache-control "max-age=31536000" "$src" "ss:///$p" >/dev/null
      echo "uploaded $p"
    done
    ;;
  rm)
    for u in $(echo "$PATHS" | cut -d/ -f2 | sort -u); do
      npx supabase storage rm $FLAGS --yes -r "ss:///media/$u" >/dev/null || true
      echo "removed media/$u"
    done
    ;;
  *) echo "usage: $0 up|rm" >&2; exit 1 ;;
esac
