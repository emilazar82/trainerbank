package de.trainerbank.app;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Hält das Spiel aktuell: prüft auf trainerbank.eu, ob eine neuere Spieldatei vorliegt, lädt sie und
 * legt sie in der App ab. Ohne Netz läuft die zuletzt geladene oder die mitgelieferte Fassung.
 * Übertragen wird dabei nichts außer der Abfrage selbst.
 */
final class GameUpdater {

    interface Done { void run(String build); }

    private static final String BASE = "https://trainerbank.eu/";

    private final Context ctx;
    private final File cachedFile;
    private final File stampFile;
    private final Handler main = new Handler(Looper.getMainLooper());
    private volatile boolean busy;
    private volatile long lastCheck;

    GameUpdater(Context context) {
        ctx = context.getApplicationContext();
        File dir = new File(ctx.getFilesDir(), "web");
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        cachedFile = new File(dir, "index.html");
        stampFile = new File(dir, "stamp.json");
    }

    private static byte[] readAll(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream(1 << 16);
        byte[] buf = new byte[1 << 16];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        return out.toByteArray();
    }

    private static String readFile(File f) {
        try (InputStream in = new FileInputStream(f)) {
            return new String(readAll(in), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }

    private String readAsset(String name) {
        try (InputStream in = ctx.getAssets().open(name)) {
            return new String(readAll(in), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }

    /** version.json, z. B. {"b":"18.11. 17:26","t":1795019202} */
    private static double stampT(String json) {
        try { return new JSONObject(json).getDouble("t"); } catch (Exception e) { return 0; }
    }

    private static String stampB(String json) {
        try { return new JSONObject(json).getString("b"); } catch (Exception e) { return null; }
    }

    private double bundledT() { return stampT(readAsset("version.json")); }

    private double cachedT() { return cachedFile.exists() ? stampT(readFile(stampFile)) : 0; }

    /**
     * Die geladene Spieldatei, wenn sie neuer ist als die mitgelieferte, sonst null. Zurück kommt die Datei
     * selbst und nicht ihr Inhalt: Die Ansicht liest sie direkt von der Platte, damit die Größe keine Rolle spielt.
     */
    File newerFile() {
        if (cachedT() <= bundledT()) return null;
        return cachedFile.isFile() && cachedFile.length() > 500_000 ? cachedFile : null;
    }

    private static byte[] fetch(String url, int timeoutMs) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(timeoutMs);
        c.setReadTimeout(timeoutMs);
        c.setUseCaches(false);
        try {
            if (c.getResponseCode() != 200) return null;
            try (InputStream in = c.getInputStream()) { return readAll(in); }
        } finally {
            c.disconnect();
        }
    }

    private static void writeAtomic(File target, byte[] data) throws Exception {
        File tmp = new File(target.getParentFile(), target.getName() + ".tmp");
        try (FileOutputStream out = new FileOutputStream(tmp)) { out.write(data); }
        if (!tmp.renameTo(target)) throw new Exception("rename");
    }

    /**
     * Prüft höchstens einmal pro Stunde (außer mit force). done läuft auf dem Hauptthread und bekommt
     * den Stand der neu geladenen Fassung oder null.
     */
    void check(boolean force, Done done) {
        long now = System.currentTimeMillis();
        if (busy || (!force && now - lastCheck < 3_600_000L)) { done.run(null); return; }
        busy = true;
        lastCheck = now;
        new Thread(() -> {
            String build = null;
            boolean retrySoon = false;
            try {
                double have = Math.max(cachedT(), bundledT());
                byte[] v = fetch(BASE + "version.json?t=" + now, 15_000);
                if (v == null) {
                    retrySoon = true;
                } else {
                    String vs = new String(v, StandardCharsets.UTF_8);
                    String b = stampB(vs);
                    if (b != null && stampT(vs) > have) {
                        byte[] h = fetch(BASE + "index.html?t=" + now, 60_000);
                        String html = h == null ? null : new String(h, StandardCharsets.UTF_8);
                        // Nur eine vollständige Spieldatei mit genau dem angekündigten Stand wird übernommen.
                        if (html != null && h.length > 500_000 && html.contains("var BUILD = '" + b + "'")
                                && html.contains("<script id=\"logic\">")) {
                            writeAtomic(cachedFile, h);
                            writeAtomic(stampFile, v);
                            build = b;
                        } else {
                            retrySoon = true;
                        }
                    }
                }
            } catch (Exception e) {
                retrySoon = true;   // kein Netz: bald noch einmal versuchen
            }
            final String result = build;
            final boolean soon = retrySoon;
            main.post(() -> {
                busy = false;
                if (soon) lastCheck = System.currentTimeMillis() - 3_300_000L;   // in fünf Minuten noch einmal
                done.run(result);
            });
        }, "tb-update").start();
    }
}
