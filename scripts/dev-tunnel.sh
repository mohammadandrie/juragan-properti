#!/usr/bin/env bash
# Restart dev server juragan-properti di VPS (bound 127.0.0.1:3100)
# Port 3100 dipilih agar TIDAK bentrok dengan hermes (yang pakai 3000).
# Akses dari laptop via: ssh -N -L 3100:localhost:3100 ubuntu@43.134.25.125
set -e
cd "$(dirname "$0")/.."

echo "[*] Mematikan instance lama di port 3100..."
fuser -k 3100/tcp 2>/dev/null || true
sleep 1

echo "[*] Start next dev di 127.0.0.1:3100..."
nohup npm run dev -- -H 127.0.0.1 -p 3100 > /tmp/juragan-dev.log 2>&1 &
sleep 6

if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3100/ | grep -q 200; then
  echo "[OK] Server jalan di http://127.0.0.1:3100 (log: /tmp/juragan-dev.log)"
else
  echo "[!] Belum 200, cek log: tail -f /tmp/juragan-dev.log"
fi
