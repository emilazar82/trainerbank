#!/usr/bin/env python3
"""Zeigt nur lesend den Store-Status der iOS-App (Versionen, Prüfung, letzte Builds).
Aufruf: status.py <Schlüsseldatei.p8> <Key-ID> <Issuer-ID>"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from alte_zertifikate import token, call
p8, kid, iss = sys.argv[1:4]
tok = token(p8, kid, iss); A = "https://api.appstoreconnect.apple.com/v1"
app = call(tok, "GET", A + "/apps?filter[bundleId]=de.trainerbank.app")["data"][0]
print("App:", app["attributes"].get("name"), app["id"])
vs = call(tok, "GET", A + f"/apps/{app['id']}/appStoreVersions?limit=10&fields[appStoreVersions]=versionString,appStoreState,appVersionState,createdDate,platform")
for v in vs["data"]:
    a = v["attributes"]; print("Version", a.get("versionString"), "|", a.get("appStoreState"), "|", a.get("appVersionState"), "|", a.get("createdDate"))
    try:
        b = call(tok, "GET", A + f"/appStoreVersions/{v['id']}/build?fields[builds]=version,processingState,uploadedDate")
        if b.get("data"): print("   gekoppelter Build:", b["data"]["attributes"].get("version"), b["data"]["attributes"].get("uploadedDate"))
    except Exception as e: print("   Build:", e)
    try:
        s = call(tok, "GET", A + f"/appStoreVersions/{v['id']}/appStoreVersionSubmission")
        if s.get("data"): print("   Einreichung:", s["data"]["id"])
    except Exception as e: pass
try:
    rs = call(tok, "GET", A + f"/reviewSubmissions?filter[app]={app['id']}&limit=5")
    for r in rs["data"]: print("Review-Einreichung", r["attributes"].get("state"), r["attributes"].get("submittedDate"))
except Exception as e: print("reviewSubmissions:", e)
bs = call(tok, "GET", A + f"/builds?filter[app]={app['id']}&sort=-uploadedDate&limit=5&fields[builds]=version,processingState,uploadedDate,expired")
for b in bs["data"]:
    a = b["attributes"]; print("Build", a.get("version"), a.get("processingState"), a.get("uploadedDate"), "abgelaufen" if a.get("expired") else "")
