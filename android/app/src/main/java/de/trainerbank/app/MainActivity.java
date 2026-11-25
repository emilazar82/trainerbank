package de.trainerbank.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Schlanke Hülle um das Spiel: Die HTML-Datei liegt in der App (assets/index.html)
 * und läuft in einem WebView. Die App fragt nur die Projektseite nach einer neueren
 * Spieldatei (siehe GameUpdater); ohne Netz läuft die vorhandene Fassung.
 */
public class MainActivity extends ComponentActivity {

    private static final String START_URL = "file:///android_asset/index.html";
    private static final int BG = Color.parseColor("#0F5A54");

    private WebView web;
    private ValueCallback<Uri[]> pendingChooser;
    private String pendingSave;
    private String pendingUpdate;
    private GameUpdater updater;

    private ActivityResultLauncher<Intent> pickFile;
    private ActivityResultLauncher<Intent> createFile;
    private ActivityResultLauncher<String> askCamera;
    private android.webkit.PermissionRequest pendingCam;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        updater = new GameUpdater(this);

        // Datei auswählen (Spielstand laden, eigene Daten laden)
        pickFile = registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
            if (pendingChooser == null) return;
            Uri[] uris = null;
            if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                uris = WebChromeClient.FileChooserParams.parseResult(result.getResultCode(), result.getData());
            }
            pendingChooser.onReceiveValue(uris);
            pendingChooser = null;
        });

        // Kamera für den QR-Code der Online-Sicherung (nur auf Nachfrage beim Scannen)
        askCamera = registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
            android.webkit.PermissionRequest r = pendingCam;
            pendingCam = null;
            if (r == null) return;
            if (granted) r.grant(new String[]{android.webkit.PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else r.deny();
        });

        // Datei anlegen (Spielstand sichern)
        createFile = registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
            boolean ok = false;
            String data = pendingSave;
            pendingSave = null;
            if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null
                    && result.getData().getData() != null && data != null) {
                try (OutputStream os = getContentResolver().openOutputStream(result.getData().getData())) {
                    if (os != null) {
                        os.write(data.getBytes(StandardCharsets.UTF_8));
                        ok = true;
                    }
                } catch (Exception ignored) {
                    ok = false;
                }
            }
            final boolean done = ok;
            web.post(() -> web.evaluateJavascript("window.tbSaved&&window.tbSaved(" + done + ")", null));
        });

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(BG);
        web = new WebView(this);
        web.setBackgroundColor(BG);
        root.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        // Inhalt nicht unter Statusleiste, Navigationsleiste oder Tastatur schieben
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout() | WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // Spielstand (localStorage)
        s.setDatabaseEnabled(true);            // Sicherungskopie (IndexedDB)
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);                    // Systemschriftgröße soll das Layout nicht sprengen
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setAllowFileAccess(true);            // nur für die mitgelieferte Spieldatei
        s.setAllowContentAccess(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        web.setLongClickable(false);
        web.setHapticFeedbackEnabled(false);

        web.addJavascriptInterface(new Bridge(), "TBApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Die App bleibt bei der eigenen Spieldatei; alles andere wird nicht geladen.
                String u = request.getUrl().toString();
                java.io.File f = updater.newerFile();
                return !(START_URL.equals(u) || (f != null && Uri.fromFile(f).toString().equals(u)));
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                announceUpdate();
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(android.webkit.ConsoleMessage m) {
                android.util.Log.i("Trainerbank", String.valueOf(m.message()));
                return true;
            }

            @Override
            public void onPermissionRequest(android.webkit.PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean video = false;
                    for (String r : request.getResources())
                        if (android.webkit.PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) video = true;
                    if (!video) { request.deny(); return; }
                    if (androidx.core.content.ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.CAMERA)
                            == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{android.webkit.PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    } else {
                        if (pendingCam != null) pendingCam.deny();
                        pendingCam = request;
                        askCamera.launch(android.Manifest.permission.CAMERA);
                    }
                });
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingChooser != null) pendingChooser.onReceiveValue(null);
                pendingChooser = callback;
                try {
                    Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("*/*");
                    pickFile.launch(i);
                } catch (Exception e) {
                    pendingChooser = null;
                    callback.onReceiveValue(null);
                }
                return true;
            }
        });

        // Zurück-Taste: erst im Spiel einen Schritt zurück, sonst App in den Hintergrund
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                web.evaluateJavascript("(window.tbBack&&window.tbBack())?1:0", value -> {
                    if (!"1".equals(value)) moveTaskToBack(true);
                });
            }
        });

        loadGame();
        checkUpdate(true, false);
    }

    /**
     * Lädt das Spiel in der neuesten vorhandenen Fassung. Eine nachgeladene Fassung liegt wie die
     * mitgelieferte unter file://, damit der Spielstand (localStorage, IndexedDB) derselbe bleibt.
     */
    private void loadGame() {
        java.io.File f = updater.newerFile();
        // Als Datei laden statt als Text übergeben: so gibt es keine Größengrenze. Mitgelieferte und
        // nachgeladene Fassung liegen beide unter file://, der Spielstand-Speicher ist derselbe.
        web.loadUrl(f != null ? Uri.fromFile(f).toString() : START_URL);
    }

    /** Fragt die Projektseite nach einer neueren Spieldatei; notify meldet auch "nichts Neues". */
    private void checkUpdate(boolean force, boolean notify) {
        updater.check(force, build -> {
            if (web == null) return;
            if (build != null) {
                pendingUpdate = build;
                announceUpdate();
            } else if (notify) {
                web.evaluateJavascript("window.TBNoUpdate&&window.TBNoUpdate()", null);
            }
        });
    }

    private void announceUpdate() {
        if (pendingUpdate == null || web == null) return;
        web.evaluateJavascript("window.TBUpdate&&window.TBUpdate(" + org.json.JSONObject.quote(pendingUpdate) + ")", null);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();   // hält Ton und Animationen an
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        checkUpdate(false, false);
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            ((ViewGroup) web.getParent()).removeView(web);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    /** Brücke zum Spiel: window.TBApp */
    private class Bridge {
        @JavascriptInterface
        public void checkUpdate() {
            runOnUiThread(() -> MainActivity.this.checkUpdate(true, true));
        }

        @JavascriptInterface
        public void reload() {
            runOnUiThread(() -> { pendingUpdate = null; loadGame(); });
        }

        @JavascriptInterface
        public void saveFile(String name, String json) {
            pendingSave = json;
            runOnUiThread(() -> {
                try {
                    Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("application/json");
                    i.putExtra(Intent.EXTRA_TITLE, name);
                    createFile.launch(i);
                } catch (Exception e) {
                    pendingSave = null;
                    web.evaluateJavascript("window.tbSaved&&window.tbSaved(false)", null);
                }
            });
        }

        @JavascriptInterface
        public void shareFile(String name, String json, String text) {
            runOnUiThread(() -> {
                try {
                    java.io.File dir = new java.io.File(getCacheDir(), "share");
                    dir.mkdirs();
                    java.io.File f = new java.io.File(dir, name.replace('/', '-'));
                    try (java.io.FileOutputStream o = new java.io.FileOutputStream(f)) {
                        o.write(json.getBytes(StandardCharsets.UTF_8));
                    }
                    Uri u = androidx.core.content.FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".files", f);
                    Intent i = new Intent(Intent.ACTION_SEND);
                    i.setType("application/json");
                    i.putExtra(Intent.EXTRA_STREAM, u);
                    i.putExtra(Intent.EXTRA_SUBJECT, "Trainerbank-Spielstand");
                    if (text != null && !text.isEmpty()) i.putExtra(Intent.EXTRA_TEXT, text);
                    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(i, "Spielstand teilen"));
                } catch (Exception e) {
                    web.evaluateJavascript("window.tbShared&&window.tbShared(false)", null);
                }
            });
        }
    }
}
