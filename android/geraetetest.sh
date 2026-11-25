#!/bin/bash
# Gerätetest der Selbstaktualisierung. Läuft im Emulator der Build-Pipeline.
set -u
APK=android/app/build/outputs/apk/debug/app-debug.apk
PKG=de.trainerbank.app
probe() { for i in $(seq 1 40); do L=$(adb logcat -d -s Trainerbank:I | grep -o "TBPROBE had=[01] build=.*" | tail -1); [ -n "$L" ] && { echo "$L"; return 0; }; sleep 3; done; echo "keine Meldung"; return 1; }

adb install -r "$APK" || exit 1

echo "== 1. Start mit der mitgelieferten Spieldatei"
adb logcat -c
adb shell am start -n $PKG/.MainActivity >/dev/null
P1=$(probe); echo "   $P1"
case "$P1" in *"had=0"*) ;; *) echo "FEHLER: erster Start meldet nicht had=0"; exit 1;; esac
sleep 2
adb shell am force-stop $PKG || { sleep 5; adb wait-for-device; adb shell am force-stop $PKG; }

echo "== 2. Neuere Spieldatei in die App legen (wie nach einem Download)"
sed "s/var BUILD = '[^']*'/var BUILD = 'GERAETETEST'/" index.html > /tmp/idx.html
# Auf gut 24 MB auffüllen: Die Größe der Spieldatei darf keine Rolle mehr spielen.
{ printf '<!-- '; head -c 10000000 /dev/zero | tr '\0' 'x'; printf ' -->\n'; } >> /tmp/idx.html
ls -l /tmp/idx.html
echo '{"b":"GERAETETEST","t":9999999999}' > /tmp/stamp.json
adb push /tmp/idx.html /data/local/tmp/tb-index.html >/dev/null || exit 1
adb push /tmp/stamp.json /data/local/tmp/tb-stamp.json >/dev/null || exit 1
adb shell chmod 644 /data/local/tmp/tb-index.html /data/local/tmp/tb-stamp.json
adb shell "run-as $PKG sh -c 'mkdir -p files/web && cp /data/local/tmp/tb-index.html files/web/index.html && cp /data/local/tmp/tb-stamp.json files/web/stamp.json && ls -la files/web'" || exit 1

echo "== 3. Start mit der neueren Spieldatei"
adb logcat -c
adb shell am start -n $PKG/.MainActivity >/dev/null
P2=$(probe); echo "   $P2"
case "$P2" in
  *"had=1 build=GERAETETEST"*) echo "OK: neuere Fassung geladen, Speicher ist derselbe.";;
  *"build=GERAETETEST"*) echo "FEHLER: neuere Fassung geladen, aber der Speicher ist ein anderer (Spielstand wäre weg)."; exit 1;;
  *) echo "FEHLER: die neuere Fassung wurde nicht geladen."; exit 1;;
esac
