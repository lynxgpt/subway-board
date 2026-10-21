#!/data/data/com.termux/files/usr/bin/bash
# Start the board server in Termux (keeps the CPU awake so Android doesn't kill it).
DIR="$(cd "$(dirname "$0")/.." && pwd)"
command -v termux-wake-lock >/dev/null && termux-wake-lock
cd "$DIR"
pkill -f "node server.js" 2>/dev/null
nohup node server.js >> "$DIR/server.log" 2>&1 &
echo "subway-board running (log: $DIR/server.log)"
