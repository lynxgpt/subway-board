#!/usr/bin/env bash
# Run on the PC with the phone connected over USB (USB debugging on).
#   bash scripts/adb-setup.sh [termux.apk termux-boot.apk fully-kiosk.apk ...]
# Any APK paths given are installed first.
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"

adb get-state >/dev/null || { echo "No device. Check 'adb devices' and accept the prompt on the phone."; exit 1; }
adb devices -l

for apk in "$@"; do
  echo "installing $apk"
  adb install -r "$apk"
done

# screen on while charging (AC|USB|wireless), landscape lock, long screen timeout
adb shell settings put global stay_on_while_plugged_in 7
adb shell settings put system accelerometer_rotation 0
adb shell settings put system user_rotation 1
adb shell settings put system screen_off_timeout 2147483647

# exempt from battery optimisation (ignored if a package isn't installed)
for pkg in com.termux com.termux.boot de.ozerov.fully com.android.chrome; do
  adb shell dumpsys deviceidle whitelist +$pkg >/dev/null 2>&1 && echo "battery-exempt: $pkg" || true
done

# copy the project (without node_modules) to the phone's Download folder
TMP="$(mktemp -d)"
mkdir -p "$TMP/subway-board"
(cd "$DIR" && tar --exclude=node_modules --exclude=.git -cf - .) | (cd "$TMP/subway-board" && tar -xf -)
adb shell rm -rf /sdcard/Download/subway-board
adb push "$TMP/subway-board" /sdcard/Download/ >/dev/null
rm -rf "$TMP"
echo "pushed project to /sdcard/Download/subway-board"

cat <<'EOF'

Next, in Termux on the phone:
  termux-setup-storage                       # allow storage access (tap Allow)
  cp -r ~/storage/downloads/subway-board ~/
  bash ~/subway-board/scripts/termux-setup.sh
  bash ~/subway-board/scripts/start.sh

Then open http://localhost:8080 in Fully Kiosk (or Chrome -> Add to Home screen).
From the PC you can open it on the phone with:
  adb shell am start -a android.intent.action.VIEW -d http://localhost:8080
EOF
