#!/usr/bin/env bash
# Turn the phone into a dashboard-only device: disable preinstalled apps and background services
# that sync, download, update, scan or upload. Run on the PC with the phone on adb.
#   bash scripts/debloat.sh           disable everything below
#   bash scripts/debloat.sh enable    undo (re-enable all of them)
# Packages are disabled for user 0, not uninstalled. Kept on purpose: Chrome, WebView, Termux,
# the launcher, system UI, Settings, Device Care (com.samsung.android.lool: battery cap,
# thermals), Google Play services core, telephony / emergency alerts, Knox core, keyboard.
# Not disabled: com.sec.android.diagmonagent (the system keeps starting it; disabled, it
# crash-loops hundreds of times a minute) and com.samsung.android.themestore (protected).
MODE="${1:-disable}"

PKGS=(
  # Google apps and assistants
  com.google.android.apps.googleassistant com.google.android.googlequicksearchbox
  com.android.hotwordenrollment.okgoogle com.android.hotwordenrollment.xgoogle
  com.google.android.apps.maps com.google.android.apps.messaging com.google.android.apps.tachyon
  com.google.android.gm com.google.android.youtube com.google.ar.core
  com.google.android.projection.gearhead com.google.android.apps.restore
  com.google.android.syncadapters.calendar com.google.android.gms.location.history
  com.google.android.as com.google.android.as.oss com.google.android.apps.turbo
  com.google.android.feedback com.google.android.partnersetup com.google.android.configupdater
  com.google.android.printservice.recommendation com.google.android.tts
  com.google.audio.hearing.visualization.accessibility.scribe com.google.android.onetimeinitializer
  # third-party preloads
  com.facebook.appmanager com.facebook.system com.microsoft.appmanager
  com.netflix.mediaclient com.netflix.partner.activation com.hiya.star
  # Bixby / voice / AI suggestions
  com.samsung.android.bixby.agent com.samsung.android.bixby.wakeup
  com.samsung.android.bixbyvision.framework com.samsung.android.app.settings.bixby
  com.samsung.android.visionintelligence com.samsung.android.intellivoiceservice
  com.samsung.android.svoiceime com.samsung.android.smartsuggestions com.samsung.android.rubin.app
  # cloud, accounts, payments, backup, transfer
  com.samsung.android.scloud com.samsung.android.mobileservice com.samsung.android.samsungpass
  com.samsung.android.samsungpassautofill com.samsung.android.spayfw com.samsung.android.fmm
  com.samsung.android.smartswitchassistant com.sec.android.easyMover com.sec.android.easyMover.Agent
  # updates, stores, push, diagnostics, scanning
  com.samsung.android.app.updatecenter com.sec.android.soagent com.wssyncmldm
  com.sec.android.app.samsungapps com.sec.android.app.billing com.sec.spp.push
  com.samsung.android.dqagent com.samsung.android.knox.analytics.uploader
  com.samsung.android.sm.devicesecurity
  # location, nearby, sharing, continuity
  com.samsung.android.ipsgeofence com.samsung.android.location com.samsung.android.samsungpositioning
  com.samsung.android.mapsagent com.samsung.android.beaconmanager com.samsung.android.easysetup
  com.samsung.android.mcfds com.samsung.android.mcfserver com.samsung.android.aware.service
  com.samsung.android.app.sharelive com.samsung.android.allshare.service.mediashare
  com.samsung.android.mdx com.samsung.android.mdx.kit com.samsung.android.mdx.quickboard
  com.samsung.android.mdecservice com.samsung.android.inputshare com.samsung.android.smartmirroring
  com.samsung.android.service.peoplestripe com.samsung.android.service.stplatform
  com.samsung.android.service.tagservice com.sec.android.app.dexonpc
  com.samsung.android.carkey com.samsung.android.dkey com.samsung.android.coldwalletservice
  # media, camera, gallery, AR, stickers
  com.sec.android.app.camera com.sec.android.gallery3d com.samsung.android.video
  com.samsung.cmh com.samsung.storyservice com.samsung.android.photoremasterservice
  com.samsung.android.ardrawing com.samsung.android.aremoji com.samsung.android.aremojieditor
  com.samsung.android.arzone com.samsung.android.app.camera.sticker.facearavatar.preload
  com.samsung.android.stickercenter com.sec.android.mimage.avatarstickers
  com.sec.android.mimage.photoretouching com.sec.android.app.ve.vebgm com.sec.android.app.vepreload
  com.sec.android.autodoodle.service com.samsung.android.app.dressroom com.samsung.android.app.dofviewer
  com.samsung.android.singletake.service com.samsung.android.visualars
  # games
  com.samsung.android.game.gamehome com.samsung.android.game.gametools com.samsung.android.game.gos
  # misc apps, widgets, edge panels, routines
  com.samsung.android.app.spage com.samsung.android.app.tips com.samsung.android.app.watchmanagerstub
  com.samsung.android.forest com.samsung.android.kidsinstaller com.samsung.android.app.parentalcare
  com.samsung.android.da.daagent com.samsung.android.app.reminder com.samsung.android.app.routines
  com.samsung.android.dynamiclock com.samsung.android.calendar com.sec.android.app.sbrowser
  com.samsung.android.widget.pictureframe com.sec.android.daemonapp
  com.samsung.android.aircommandmanager com.samsung.android.app.appsedge
  com.samsung.android.app.clipboardedge com.samsung.android.app.taskedge
  com.samsung.android.app.cocktailbarservice
)

adb get-state >/dev/null || { echo "No device on adb."; exit 1; }
for p in "${PKGS[@]}"; do
  if [ "$MODE" = enable ]; then
    adb shell pm enable "$p" >/dev/null 2>&1 && echo "enabled  $p"
  else
    adb shell pm disable-user --user 0 "$p" >/dev/null 2>&1 && echo "disabled $p" || echo "skipped  $p"
  fi
done

# Play Protect app scanning; background Wi-Fi / Bluetooth scanning for location; nearby devices
if [ "$MODE" = enable ]; then
  adb shell settings put global package_verifier_user_consent 1
  adb shell settings put global wifi_scan_always_enabled 1
  adb shell settings put global ble_scan_always_enabled 1
  adb shell settings put system nearby_scanning_enabled 1
else
  adb shell settings put global package_verifier_user_consent -1
  adb shell settings put global verifier_verify_adb_installs 0
  adb shell settings put global wifi_scan_always_enabled 0
  adb shell settings put global ble_scan_always_enabled 0
  adb shell settings put system nearby_scanning_enabled 0
fi
