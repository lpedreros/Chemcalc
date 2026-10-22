"""Save-in-place checks for the estimate page: the REAL testing/auth.js, estimate.js and trello.js run in headless Chrome/Edge
against a fake Supabase client that records every call. Nothing touches a live database; nobody signs in.

    python tools/verify/save_in_place_check.py            T1-T12 (save in place) plus six smoke checks on estimate.html

Stdlib only. Needs Chrome or Edge (set CHEMCALC_BROWSER to the executable if it is not in a default location).
Serves the site folder itself on a free local port. Exit code 0 only if every check passes.
"""
import base64, datetime, http.server, json, os, re, shutil, socket, struct, subprocess, sys, tempfile, threading, time, urllib.request
from pathlib import Path

from common import SITE

PORT = 9372  # DevTools port; one run at a time
BROWSERS = [os.environ.get("CHEMCALC_BROWSER", ""),
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]


class WS:
    """Minimal DevTools websocket client."""
    def __init__(self, url):
        rest = url.replace("ws://", "")
        hostport, path = rest.split("/", 1)
        host, port = hostport.split(":")
        self.s = socket.create_connection((host, int(port)), timeout=30)
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall(("GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n" % (path, hostport, key)).encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.s.recv(4096)
        self.rest = buf.split(b"\r\n\r\n", 1)[1]
        self.id = 0

    def _read(self, n):
        while len(self.rest) < n:
            chunk = self.s.recv(65536)
            if not chunk:
                raise RuntimeError("socket closed")
            self.rest += chunk
        out, self.rest = self.rest[:n], self.rest[n:]
        return out

    def call(self, method, params=None):
        self.id += 1
        data = json.dumps({"id": self.id, "method": method, "params": params or {}}).encode()
        hdr = bytearray([0x81]); ln = len(data)
        if ln < 126: hdr.append(0x80 | ln)
        elif ln < 65536: hdr.append(0x80 | 126); hdr += struct.pack(">H", ln)
        else: hdr.append(0x80 | 127); hdr += struct.pack(">Q", ln)
        mask = os.urandom(4)
        self.s.sendall(bytes(hdr) + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))
        while True:
            m = self._msg()
            if m.get("id") == self.id:
                if "error" in m: raise RuntimeError("%s: %s" % (method, m["error"]))
                return m.get("result", {})

    def wait_event(self, name, timeout=30):
        end = time.time() + timeout
        while time.time() < end:
            if self._msg().get("method") == name: return

    def _msg(self):
        msg = b""
        while True:
            b1, b2 = self._read(2); fin, op, ln = b1 & 0x80, b1 & 0x0F, b2 & 0x7F
            if ln == 126: ln = struct.unpack(">H", self._read(2))[0]
            elif ln == 127: ln = struct.unpack(">Q", self._read(8))[0]
            payload = self._read(ln)
            if op in (0x1, 0x0):
                msg += payload
                if fin: return json.loads(msg.decode())
            elif op == 0x8: raise RuntimeError("websocket closed")


class Browser:
    def __init__(self, width=1280, height=900):
        exe = next((b for b in BROWSERS if b and os.path.exists(b)), None)
        if not exe: raise SystemExit("no Chrome/Edge found; set CHEMCALC_BROWSER")
        self.prof = tempfile.mkdtemp(prefix="savecheck-")
        self.proc = subprocess.Popen([exe, "--headless=new", "--disable-gpu", "--remote-debugging-port=%d" % PORT, "--remote-allow-origins=*",
                                      "--user-data-dir=" + self.prof, "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        page = None
        for _ in range(60):
            try:
                page = [t for t in json.load(urllib.request.urlopen("http://127.0.0.1:%d/json" % PORT, timeout=2)) if t.get("type") == "page"][0]; break
            except Exception: time.sleep(0.5)
        self.ws = WS(page["webSocketDebuggerUrl"])
        for m in ("Page.enable", "Runtime.enable"): self.ws.call(m)
        self.ws.call("Emulation.setDeviceMetricsOverride", {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": False})
        self.ws.call("Emulation.setFocusEmulationEnabled", {"enabled": True})

    def open(self, url, inject):
        self.ws.call("Page.addScriptToEvaluateOnNewDocument", {"source": inject})
        self.ws.call("Page.navigate", {"url": url}); self.ws.wait_event("Page.loadEventFired"); time.sleep(2.5)
        self.ws.call("Page.bringToFront")

    def ev(self, expr, wait=False):
        r = self.ws.call("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": wait})
        if "exceptionDetails" in r: raise RuntimeError(json.dumps(r["exceptionDetails"])[:400])
        return r["result"].get("value")

    def close(self):
        if os.name == "nt": subprocess.run(["taskkill", "/PID", str(self.proc.pid), "/T", "/F"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else: self.proc.terminate()
        time.sleep(1.0); shutil.rmtree(self.prof, ignore_errors=True)


# ---- fake Supabase client: records every call, never touches the network -------------------------------------------
FAKE = r"""
(() => {
  const cfg = %s;
  const st = window.__mock = { user: cfg.user, profile: cfg.profile, rows: cfg.rows, data: cfg.data, calls: [], updateMode: 'ok', next: 1, cards: 0 };
  window.__errs = [];
  window.addEventListener('error', e => window.__errs.push('error: ' + e.message));
  window.addEventListener('unhandledrejection', e => window.__errs.push('rejection: ' + (e.reason && e.reason.message || e.reason)));
  const ce = console.error; console.error = function () { window.__errs.push('console.error: ' + Array.from(arguments).join(' ')); return ce.apply(console, arguments); };
  window.__alerts = []; window.__confirm = true;
  window.alert = m => { window.__alerts.push(String(m)); }; window.confirm = () => window.__confirm;
  const session = () => st.user ? { user: st.user, access_token: 't', expires_at: 4102444800 } : null;
  function query(table) {
    const q = { table, op: 'select', filters: [], payload: null, single: false, sel: false };
    const api = {
      select() { q.sel = true; return api; }, eq(k, v) { q.filters.push([k, v]); return api; }, not() { return api; }, order() { return api; }, limit() { return api; },
      single() { q.single = true; return api; },
      insert(p) { q.op = 'insert'; q.payload = p; return api; }, update(p) { q.op = 'update'; q.payload = p; return api; }, delete() { q.op = 'delete'; return api; },
      then(res, rej) { return Promise.resolve().then(() => run(q)).then(res, rej); }
    };
    return api;
  }
  function run(q) {
    st.calls.push({ table: q.table, op: q.op, payload: q.payload, filters: q.filters, sel: q.sel, single: q.single });
    const f = k => { const x = q.filters.find(a => a[0] === k); return x ? x[1] : undefined; };
    if (q.table === 'profiles') return { data: st.profile, error: null };
    if (q.table !== 'estimates') return { data: q.single ? null : [], error: null };
    if (q.op === 'insert') { const row = Object.assign({ id: 'new-' + (st.next++) }, q.payload); st.rows.unshift(row); return { data: q.single ? row : [row], error: null }; }
    if (q.op === 'update') {
      if (q.payload && q.payload.trello_card_id) return { data: null, error: null };
      if (st.updateMode === 'error') return { data: null, error: { message: 'boom: update failed' } };
      if (st.updateMode === 'zero') return { data: [], error: null };
      return { data: [Object.assign({ id: f('id') }, q.payload)], error: null };
    }
    if (q.op === 'select' && q.single && st.data[f('id')]) return { data: { estimate_data: st.data[f('id')] }, error: null };
    if (q.op === 'select') return { data: st.rows.map(r => Object.assign({}, r)), error: null };
    return { data: null, error: null };
  }
  const client = {
    auth: { getSession: async () => ({ data: { session: session() }, error: null }), getUser: async () => ({ data: { user: st.user }, error: null }),
            onAuthStateChange: cb => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({ error: null }) },
    from: query,
    functions: { invoke: async (name, o) => { st.calls.push({ table: 'fn:' + name, op: 'invoke', payload: o && o.body }); st.cards++; return { data: { card: { id: 'card-' + st.cards } }, error: null }; } },
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) }
  };
  Object.defineProperty(window, 'supabase', { configurable: true, get() { return { createClient: () => client }; }, set() {} });
  if (cfg.dup) { try { sessionStorage.setItem('chemcalc_duplicate', JSON.stringify(cfg.dup)); } catch (e) {} }
})();
"""

USER = {"id": "11111111-1111-1111-1111-111111111111", "email": "tester@example.test", "app_metadata": {"provider": "email"}}
PRO = {"id": USER["id"], "tier": "pro", "subscription_status": "active", "full_name": "Tester Pro"}
FREE = {"id": USER["id"], "tier": "free", "subscription_status": None, "full_name": "Tester Free"}


def saved(num="TE-20261007-1078", markup="0", row_markup=0):
    return {"estimateNumber": num, "estimateDate": "10/07/2026", "estimateValidUntil": "10/17/2026", "estimateName": "", "clientFirst": "Ada", "clientLast": "Lovelace",
            "clientCompany": "", "clientPhone": "", "clientEmail": "", "boatMake": "Robalo", "boatModel": "R246", "boatName": "", "boatYear": "2019", "boatHIN": "",
            "hourlyRate": "100", "materialsMarkup": markup, "scopeNotes": "Scope", "tier": "pro",
            "materials": [{"name": "Acetone", "cost": 200, "qty": 1, "markup": row_markup, "source": "amz", "affKey": None},
                          {"name": "Resin", "cost": 20, "qty": 2.5, "markup": row_markup, "source": "wm", "affKey": None}],
            "tasks": [{"name": "Gelcoat Repair", "rows": [{"name": "Grind", "hours": 1}, {"name": "Shoot", "hours": 1.5}], "scope": ""},
                      {"name": "Fiberglass Patch", "rows": [{"name": "Glass", "hours": 2}], "scope": "note"},
                      {"name": "Topcoat", "rows": [{"name": "Spray", "hours": 1}], "scope": ""}], "grandTotal": 0}


class Site(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(SITE), **k)
    def log_message(self, *a): pass
    def end_headers(self): self.send_header("Cache-Control", "no-store"); super().end_headers()


results = []
def check(label, ok, detail=""):
    results.append(bool(ok)); print(("PASS  " if ok else "FAIL  ") + label + ((" -- " + str(detail)) if not ok and detail != "" else ""))


def main():
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Site); base = "http://127.0.0.1:%d" % srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    br = Browser()
    EST = {"E1": saved()}
    ROWS = [{"id": "E1", "estimate_number": "TE-20261007-1078", "estimate_name": "", "customer_first": "Ada", "customer_last": "Lovelace", "boat_make": "Robalo", "boat_model": "R246",
             "grand_total": 3070, "created_at": "2026-10-07T12:00:00Z", "status": "draft"}]

    def page(path="/estimate.html", user=USER, profile=PRO, dup=None):
        cfg = {"user": user, "profile": profile, "rows": [dict(r) for r in ROWS], "data": EST, "dup": dup}
        br.open(base + path, FAKE % json.dumps(cfg))
    def calls(table="estimates", op=None):
        return [c for c in br.ev("window.__mock.calls") if c["table"] == table and (op is None or c["op"] == op)]
    def clear(): br.ev("window.__mock.calls.length = 0; window.__alerts.length = 0; 1")
    def cid(): return br.ev("typeof currentEstimateId === 'undefined' ? '(not defined)' : currentEstimateId")
    def edit_client(v): br.ev("(() => { const e = document.getElementById('clientFirst'); e.value = %s; e.dispatchEvent(new Event('input', {bubbles: true})); return 1; })()" % json.dumps(v))
    def save(): br.ev("proSaveDraft(); 1"); time.sleep(0.6)
    def pair(fn): return fn(calls(op="insert")), fn(calls(op="update"))

    try:
        print("=== T1-T2, T11: new estimate saves once, then updates in place ===")
        page(); clear(); edit_client("New Client"); save()
        ins, upd = len(calls(op="insert")), len(calls(op="update"))
        check("T1 new estimate, Save -> exactly 1 insert, 0 updates, id remembered", ins == 1 and upd == 0 and cid() == "new-1", [ins, upd, cid()])
        num = br.ev("document.getElementById('estimateNumber').value")
        check("T11 success alert is exactly 'Estimate saved: <number>'", br.ev("window.__alerts") == ["Estimate saved: " + num], br.ev("window.__alerts"))
        clear(); edit_client("Changed"); save()
        u = calls(op="update")
        check("T2 Save again -> exactly 1 update on that id, 0 extra inserts", len(calls(op="insert")) == 0 and len(u) == 1 and ["id", "new-1"] in u[0]["filters"], [len(u), u[0]["filters"] if u else None])

        print("=== T3: each load path, edit, Save -> update with that id ===")
        for label in ("Load Estimate modal", "history-preview link", "?draft= link"):
            if label.startswith("?draft"): page("/estimate.html?draft=E1")
            else: page()
            if label.startswith("Load"):
                br.ev("openLoadDraftModal(); 1"); time.sleep(0.8); br.ev("document.querySelector('#savedEstimatesList .saved-item').click(); 1")
            elif label.startswith("history"):
                time.sleep(0.5); br.ev("document.querySelector('.est-history-ref').click(); 1")
            time.sleep(1.2); clear(); edit_client("Edited " + label); save()
            u = calls(op="update")
            check("T3 %s: Save -> 1 update with id E1, 0 inserts" % label, cid() == "E1" and len(u) == 1 and ["id", "E1"] in u[0]["filters"] and len(calls(op="insert")) == 0, [cid(), len(u), len(calls(op="insert"))])
            if label.startswith("Load"):
                p = u[0]["payload"] if u else {}
                gone = [k for k in ("id", "user_id", "status", "created_at", "trello_card_id", "trello_synced_at") if k in p]
                check("T4 update payload has none of id/user_id/status/created_at/trello_card_id/trello_synced_at", not gone, gone)
                check("T4 ...but has estimate_data and the totals", all(k in p for k in ("estimate_data", "materials_total", "paint_total", "labor_total", "grand_total", "estimate_number", "valid_until", "notes")), sorted(p))
                check("T4 ...and filters on id AND user_id", ["id", "E1"] in u[0]["filters"] and ["user_id", USER["id"]] in u[0]["filters"], u[0]["filters"])
                check("T4 ...and estimate_data carries no id", "id" not in p.get("estimate_data", {}) and "currentEstimateId" not in p.get("estimate_data", {}))

        print("=== T5: Duplicate saves as a new row ===")
        page("/estimate.html?duplicate=1", dup=saved()); time.sleep(1.5); clear(); edit_client("Dup");
        check("T5 duplicate load leaves the id null", cid() is None, cid())
        save()
        check("T5 ?duplicate=1 load, Save -> 1 insert, 0 updates", len(calls(op="insert")) == 1 and len(calls(op="update")) == 0, [len(calls(op="insert")), len(calls(op="update"))])

        print("=== T6: New Estimate ===")
        page(); br.ev("openLoadDraftModal(); 1"); time.sleep(0.8); br.ev("document.querySelector('#savedEstimatesList .saved-item').click(); 1"); time.sleep(1.0)
        br.ev("window.__confirm = false; newEstimate(); 1")
        check("T6 New Estimate with confirm declined -> id unchanged", cid() == "E1", cid())
        br.ev("window.__confirm = true; newEstimate(); 1"); time.sleep(0.4); clear(); save()
        check("T6 accepted -> id cleared and the next Save inserts", len(calls(op="insert")) == 1 and len(calls(op="update")) == 0, [len(calls(op="insert")), len(calls(op="update"))])

        print("=== T7-T8: stale id, update error ===")
        page(); br.ev("openLoadDraftModal(); 1"); time.sleep(0.8); br.ev("document.querySelector('#savedEstimatesList .saved-item').click(); 1"); time.sleep(1.0)
        br.ev("window.__mock.updateMode = 'zero'; 1"); clear(); save()
        check("T7 update returns zero rows -> falls back to 1 insert, new id replaces the stale one", len(calls(op="update")) == 1 and len(calls(op="insert")) == 1 and cid() == "new-1", [len(calls(op="update")), len(calls(op="insert")), cid()])
        page(); br.ev("openLoadDraftModal(); 1"); time.sleep(0.8); br.ev("document.querySelector('#savedEstimatesList .saved-item').click(); 1"); time.sleep(1.0)
        br.ev("window.__mock.updateMode = 'error'; 1"); clear(); save()
        check("T8 update error -> alert 'Save failed: <message>', no insert, id unchanged", br.ev("window.__alerts") == ["Save failed: boom: update failed"] and len(calls(op="insert")) == 0 and cid() == "E1", [br.ev("window.__alerts"), len(calls(op="insert")), cid()])

        print("=== T9: Add to Trello on a loaded estimate ===")
        page(); br.ev("openLoadDraftModal(); 1"); time.sleep(0.8); br.ev("document.querySelector('#savedEstimatesList .saved-item').click(); 1"); time.sleep(1.0)
        br.ev("_trelloConnected = true; _trelloListId = 'L1'; _trelloListName = 'List'; _trelloBoardName = 'Board'; 1"); clear()
        br.ev("addToTrello(); 1"); time.sleep(1.2)
        ups = calls(op="update"); fn = calls("fn:trello")
        link_ok = bool(fn) and fn[0]["payload"]["desc"].rstrip().endswith("[View Estimate on ChemCalc](https://chemcalc.co/estimate.html?draft=E1)")
        tr = [c for c in ups if c["payload"].get("trello_card_id")]
        check("T9 Add to Trello on a loaded estimate -> 0 inserts, 1 content update on E1, 1 card, card link ends ?draft=E1, trello_card_id update targets E1",
              len(calls(op="insert")) == 0 and len([c for c in ups if "estimate_data" in c["payload"]]) == 1 and len(fn) == 1 and link_ok and len(tr) == 1 and ["id", "E1"] in tr[0]["filters"],
              [len(calls(op="insert")), len(ups), len(fn), link_ok, len(tr)])

        print("=== T10, T12: free user, not logged in ===")
        page(profile=FREE); clear(); br.ev("proSaveDraft(); 1"); time.sleep(0.4)
        check("T10 Free user -> upgrade modal opens, zero estimates calls", br.ev("getComputedStyle(document.getElementById('upgradeModal')).display") == "flex" and len(calls()) == 0, len(calls()))
        page(user=None, profile=None)
        r = br.ev("window.saveEstimateToSupabase({estimateNumber: 'X'}, 'E1')", True)
        r2 = br.ev("window.saveCurrentEstimate()", True)
        check("T12 not logged in -> { error: { message: 'Not logged in.' } } from both save functions, no calls", r == {"error": {"message": "Not logged in."}} and r2 == {"error": {"message": "Not logged in."}} and len(calls()) == 0, [r, r2])

        print("=== T13-T15: double-click guard ===")
        page(); clear(); br.ev("proSaveDraft(); proSaveDraft(); 1"); time.sleep(0.8)
        check("T13 two Saves in the same tick on a new estimate -> exactly 1 insert and 1 success alert", len(calls(op="insert")) == 1 and len(br.ev("window.__alerts")) == 1, [len(calls(op="insert")), br.ev("window.__alerts")])
        clear(); save()
        check("T13 ...and a later Save -> exactly 1 update on that id, 0 inserts", len(calls(op="update")) == 1 and len(calls(op="insert")) == 0, [len(calls(op="update")), len(calls(op="insert"))])
        page(); clear()
        r = br.ev("(async () => { const a = saveCurrentEstimate(), b = saveCurrentEstimate(); const [x, y] = await Promise.all([a, b]); return { same: a === b, xid: x.data && x.data.id, yid: y.data && y.data.id }; })()", True)
        check("T14 saveCurrentEstimate() called again while a save runs (Add to Trello path) -> same promise and result, 1 insert", r["same"] and r["xid"] == r["yid"] and len(calls(op="insert")) == 1 and len(calls(op="update")) == 0, [r, len(calls(op="insert"))])
        page(); br.ev("openLoadDraftModal(); 1"); time.sleep(0.8); br.ev("document.querySelector('#savedEstimatesList .saved-item').click(); 1"); time.sleep(1.0)
        br.ev("window.__mock.updateMode = 'error'; 1"); save(); clear(); br.ev("window.__mock.updateMode = 'ok'; 1"); save()
        check("T15 after an error result the in-flight flag is clear: the next Save runs normally (1 update)", len(calls(op="update")) == 1 and br.ev("window.__alerts") == ["Estimate saved: TE-20261007-1078"], [len(calls(op="update")), br.ev("window.__alerts")])
        br.ev("window.__origSave = window.saveEstimateToSupabase; window.saveEstimateToSupabase = () => Promise.reject(new Error('network down')); saveCurrentEstimate().catch(() => 0); 1"); time.sleep(0.3)
        br.ev("window.saveEstimateToSupabase = window.__origSave; 1"); clear(); save()
        check("T15 after a rejected promise the flag is clear too: the next Save runs normally (1 update)", len(calls(op="update")) == 1, len(calls(op="update")))

        print("=== T16-T20: hourly rate 0 stays 0 ===")
        LAB = r"(() => Array.from(document.querySelector('.est-summary-card').innerText.matchAll(/\(Labor\)\s*\$([\d,]+\.\d\d)/g)).map(m => parseFloat(m[1].replace(/,/g, ''))))()"
        def rate_case(val):
            page(); fx = saved(); fx["hourlyRate"] = "100"
            br.ev("loadDraft(%s); 1" % json.dumps(fx))
            br.ev("(() => { const e = document.getElementById('hourlyRate'); e.value = %s; e.dispatchEvent(new Event('input', {bubbles: true})); return 1; })()" % json.dumps(val))
            time.sleep(0.3); labor = br.ev(LAB); clear(); save()
            ins = calls(op="insert")[0]["payload"]
            return labor, ins, br.ev("collectEstimateData().hourlyRate")
        labor, ins, hr = rate_case("0")
        check("T16 hourly rate 0 -> every summary labor line $0.00, saved hourly_rate 0 and labor_total 0, collectEstimateData().hourlyRate '0'", labor == [0, 0, 0] and ins["hourly_rate"] == 0 and ins["labor_total"] == 0 and hr == "0", [labor, ins["hourly_rate"], ins["labor_total"], hr])
        labor, ins, hr = rate_case("")
        check("T17 blank rate -> labor at 100 (summary 250/200/100, saved labor_total 550)", labor == [250, 200, 100] and ins["labor_total"] == 550, [labor, ins["labor_total"], ins["hourly_rate"]])
        labor, ins, hr = rate_case("85")
        check("T18 rate 85 -> unchanged (summary 212.5/170/85, saved labor_total 467.5, hourly_rate 85)", labor == [212.5, 170, 85] and ins["labor_total"] == 467.5 and ins["hourly_rate"] == 85, [labor, ins["labor_total"], ins["hourly_rate"]])
        page()
        for val, want in (("0", [0, 0, 0]), ("100", [250, 200, 100])):
            fx = saved(); fx["hourlyRate"] = val
            br.ev("loadDraft(%s); 1" % json.dumps(fx)); time.sleep(0.3)
            check("T19 estimate loaded with hourlyRate %r keeps it in the field and the summary" % val, br.ev("document.getElementById('hourlyRate').value") == val and br.ev(LAB) == want, [br.ev("document.getElementById('hourlyRate').value"), br.ev(LAB)])
        page()
        have_pdf = br.ev("typeof window.jspdf !== 'undefined' || typeof window.jsPDF !== 'undefined'")
        if not have_pdf:
            print("NOTE  T20 NOT TESTED: jsPDF did not load (no network?). Read instead: trello.js hourlyRateOrDefault at the 4 former '|| 100' sites")
        else:
            fx = saved(); fx["hourlyRate"] = "0"
            br.ev("loadDraft(%s); 1" % json.dumps(fx))
            br.ev("window.__pdf = []; const J = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF; const W = function (...a) { const d = new J(...a); const t = d.text.bind(d); d.text = (s, ...r) => { window.__pdf.push(String(s)); return t(s, ...r); }; return d; }; W.prototype = J.prototype; if (window.jspdf) window.jspdf.jsPDF = W; else window.jsPDF = W; 1")
            br.ev("_generateEstimatePDF('summary').catch(e => window.__pdf.push('ERR ' + e.message)); 1"); time.sleep(2.5)
            txt = br.ev("window.__pdf")
            lines = [t for t in txt if "/hr" in t and " x " in t]
            check("T20 trello.js PDF labor figures with rate 0 use $0/hr = $0.00 (summary style), not 100", bool(lines) and all("$0/hr" in t and "$0.00" in t for t in lines), lines[:3] or txt[:5])

        print("=== Smoke checks on estimate.html ===")
        page(); errs = [e for e in br.ev("window.__errs") if "presets" not in e.lower() and "affiliate" not in e.lower() and "supabase fetch" not in e.lower()]
        check("(a) page loads with no console errors", br.ev("!!document.getElementById('estimateNumber').value") and not errs, errs)
        br.ev("(() => { const e = document.getElementById('estimateDate'); e.value = '2026-11-05'; e.dispatchEvent(new Event('change', {bubbles: true})); return 1; })()")
        check("(b) editing the date moves Valid Until +10 days", br.ev("getEstDate('estimateDate') + ' ' + getEstDate('estimateValidUntil')") == "11/05/2026 11/15/2026")
        today = datetime.date.today(); fmt = lambda d: d.strftime("%m/%d/%Y")
        page("/estimate.html?duplicate=1", dup=saved())
        time.sleep(1.5)
        d = br.ev("({ n: document.getElementById('estimateNumber').value, d: getEstDate('estimateDate'), v: getEstDate('estimateValidUntil'), t: document.querySelectorAll('.repair-card').length, banner: !document.getElementById('expiryWarning').classList.contains('d-none') })")
        check("(c) Duplicate carries 3 tasks, a new number and fresh dates, no expired banner", d["t"] == 3 and d["n"] != "TE-20261007-1078" and re.match(r"^[A-Z0-9]+-\d{8}-\d{4}$", d["n"]) and d["d"] == fmt(today) and d["v"] == fmt(today + datetime.timedelta(days=10)) and not d["banner"], d)
        page(); br.ev("openLoadDraftModal(); 1"); time.sleep(0.8); br.ev("document.querySelector('#savedEstimatesList .saved-item').click(); 1"); time.sleep(1.0)
        m = br.ev("({ f: document.getElementById('materialsMarkup').value, rows: Array.from(document.querySelectorAll('#materialsBody .markup-row-input')).map(e => e.value), sub: document.getElementById('materialsSubtotal').textContent })")
        check("(d) a loaded estimate keeps its saved markup (0% stays 0%, materials $250.00)", m["f"] == "0" and set(m["rows"]) == {"0"} and m["sub"] == "$250.00", m)
        br.ev("newEstimate(); 1"); time.sleep(0.3)
        check("(e) New Estimate resets markup to 40", br.ev("document.getElementById('materialsMarkup').value") == "40")
        br.ev("document.querySelector(\"[onclick*='helpEstimateInfo']\").click(); 1")
        opened = br.ev("document.getElementById('helpEstimateInfo').classList.contains('help-popover--open')")
        br.ev("document.body.click(); 1")
        check("(f) a help popover opens and closes", opened and not br.ev("document.getElementById('helpEstimateInfo').classList.contains('help-popover--open')"))
    finally:
        br.close(); srv.shutdown()
    print("\n%d of %d checks passed" % (sum(results), len(results)))
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
