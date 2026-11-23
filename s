#!/bin/sh
# Trainerbank – Spiel und Online-Sicherung unter der eigenen Domain ausliefern.
# Einmal als root auf dem Server ausführen:
#   curl -fsSL https://raw.githubusercontent.com/emilazar82/trainerbank/main/server/setup-web.sh | sh
# Danach holt sich der Server alle 5 Minuten die neueste Fassung des Spiels aus GitHub.
set -e
DOMAIN=trainerbank.eu
REPO=https://github.com/emilazar82/trainerbank.git

apt-get update -qq
apt-get install -y -qq git caddy curl >/dev/null

# 1. Spieldateien aus GitHub holen (nur oberste Ebene: index.html, datenschutz.html, version.json …)
install -d /var/lib/trainerbank-src /var/www/trainerbank
cat > /usr/local/bin/trainerbank-site <<'EOF'
#!/bin/sh
set -e
SRC=/var/lib/trainerbank-src
if [ ! -d "$SRC/.git" ]; then
  rm -rf "$SRC"; git clone -q --depth 1 https://github.com/emilazar82/trainerbank.git "$SRC"
else
  git -C "$SRC" fetch -q --depth 1 origin main
  git -C "$SRC" reset -q --hard origin/main
  git -C "$SRC" gc -q --prune=now >/dev/null 2>&1 || true
fi
TMP=$(mktemp -d /var/www/.tb.XXXXXX)
for f in "$SRC"/*; do
  [ -f "$f" ] || continue
  case "$f" in *.html|*.json|*.png|*.webp|*.ico|*.svg|*.webmanifest|*.txt|*.xml) cp "$f" "$TMP/";; esac
done
chmod 755 "$TMP"; chmod 644 "$TMP"/*
if ! diff -rq "$TMP" /var/www/trainerbank >/dev/null 2>&1; then
  rm -rf /var/www/trainerbank.old; mv /var/www/trainerbank /var/www/trainerbank.old; mv "$TMP" /var/www/trainerbank; rm -rf /var/www/trainerbank.old
  echo "Spiel aktualisiert: $(date)"
else
  rm -rf "$TMP"
fi
EOF
chmod 755 /usr/local/bin/trainerbank-site
/usr/local/bin/trainerbank-site

cat > /etc/systemd/system/trainerbank-site.service <<'EOF'
[Unit]
Description=Trainerbank-Spieldateien aus GitHub holen
[Service]
Type=oneshot
ExecStart=/usr/local/bin/trainerbank-site
EOF
cat > /etc/systemd/system/trainerbank-site.timer <<'EOF'
[Unit]
Description=Trainerbank-Spieldateien alle 5 Minuten aktualisieren
[Timer]
OnBootSec=1min
OnUnitActiveSec=5min
[Install]
WantedBy=timers.target
EOF

# 2. Webserver: Spiel + Online-Sicherung unter der Domain, alte sslip-Adresse bleibt für ältere Versionen erreichbar
OLD=$(cat /etc/trainerbank-host 2>/dev/null || true)
cat > /etc/caddy/Caddyfile.new <<EOF
$DOMAIN${OLD:+, $OLD} {
	encode zstd gzip
	header {
		-Server
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
	}
	handle /v1/* {
		request_body {
			max_size 7MB
		}
		reverse_proxy 127.0.0.1:8787
	}
	handle {
		root * /var/www/trainerbank
		@html path / /index.html /datenschutz.html /version.json
		header @html Cache-Control "no-cache"
		file_server
	}
}
www.$DOMAIN {
	redir https://$DOMAIN{uri} permanent
}
EOF
caddy validate --config /etc/caddy/Caddyfile.new --adapter caddyfile >/dev/null
cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak 2>/dev/null || true
mv /etc/caddy/Caddyfile.new /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable --now trainerbank-site.timer
systemctl reload caddy || systemctl restart caddy
echo "$DOMAIN" > /etc/trainerbank-domain
echo
echo "Fertig. Spiel: https://$DOMAIN  ·  Online-Sicherung: https://$DOMAIN/v1/health"
