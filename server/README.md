# Trainerbank – Server für die Online-Sicherung

Speichert Spielstände unter einem zufälligen Code (z. B. `7K4M-Q2XH`). Kein Konto, keine E-Mail.
Gespeichert werden nur der Spielstand und Verein, Saison, Spieltag, Gerätetyp (z. B. „iPhone-App“) und Zeitpunkt.
Codes, die ein Jahr lang nicht benutzt wurden, löscht der Server selbst.

## Schnittstelle

| Aufruf | Zweck |
| --- | --- |
| `POST /v1/codes` | neuen Code anlegen → `{code}` |
| `GET /v1/saves/CODE/meta` | Stand ohne Daten → `{rev, ts, meta, size}` |
| `GET /v1/saves/CODE` | Spielstand laden → `{rev, ts, meta, enc, data}` |
| `PUT /v1/saves/CODE` | sichern, Body `{base, force, meta, enc, data}`; `409`, wenn inzwischen woanders gesichert wurde |
| `DELETE /v1/saves/CODE` | Code und Spielstand löschen |

Schutz: höchstens 30 falsche Codes und 20 neue Codes pro Stunde und Adresse, Spielstand höchstens 6 MB.

## Betrieb

Node.js 18 oder neuer, keine weiteren Pakete.

```
PORT=8787 DATA=/var/lib/trainerbank TRUST_PROXY=1 node sync.js
```

Davor ein Webserver mit HTTPS (z. B. Caddy), der auf `127.0.0.1:8787` weiterleitet:

```
sync.example.de {
  reverse_proxy 127.0.0.1:8787
}
```

Im Spiel wird die Adresse in `SYNC_URL` eingetragen. Solange sie leer ist, ist die Online-Sicherung im Spiel ausgeblendet.
Zum Testen lässt sie sich pro Gerät setzen: `localStorage.setItem('tb-sync-url', 'https://…')`.
