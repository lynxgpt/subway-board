#!/data/data/com.termux/files/usr/bin/bash
# Run INSIDE Termux on the phone, from the project folder:
#   bash ~/subway-board/scripts/termux-setup.sh
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"

pkg update -y
pkg install -y nodejs

cd "$DIR"
npm install --omit=dev
npm run fetch-stops || echo "fetch-stops failed; destination names will be blank until it succeeds"

# auto-start on boot (needs the Termux:Boot app, opened once)
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/subway-board.sh <<EOF
#!/data/data/com.termux/files/usr/bin/bash
bash "$DIR/scripts/start.sh"
EOF
chmod +x ~/.termux/boot/subway-board.sh

echo
echo "Done. Start now with:  bash $DIR/scripts/start.sh"
