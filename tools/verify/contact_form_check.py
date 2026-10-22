"""Contact form checks: the real testing/contact.html runs in headless Chrome/Edge. Nothing is ever sent to formspree.io: the
browser blocks that host, every submit is cancelled in the page, and the check reads new FormData(form) instead.

    python tools/verify/contact_form_check.py             C1-C9 (service picker, required rules, payload, Broken Link Report, mobile)

Stdlib only. Needs Chrome or Edge (CHEMCALC_BROWSER overrides the path). Serves the site folder itself; DevTools port 9372,
so run one browser test at a time. Exit code 0 only if every case passes.
"""
import http.server, json, re, sys, threading, time
from urllib.parse import quote

from save_in_place_check import Browser, Site

FORMSPREE = "https://formspree.io/f/xdkeobbl"
LABELS = ["Professional Repair Services", "Training & Tele-Guiding", "Kit Subscriptions", "Custom Fabrication", "Custom Vinyl Lettering",
          "Custom Estimator", "Custom Link List", "Assembled Kit Service", "Calculator Request", "Other Question"]
SUBJECTS = [("Inquiry about Repair Services", "Professional Repair Services"), ("Inquiry about Training & Tele-Guiding", "Training & Tele-Guiding"),
            ("Inquiry about Kit Subscriptions", "Kit Subscriptions"), ("Inquiry about Custom Fabrication", "Custom Fabrication"),
            ("Inquiry about Vinyl Lettering", "Custom Vinyl Lettering"), ("Inquiry about Custom Estimator", "Custom Estimator"),
            ("Custom Link List Request", "Custom Link List"), ("Assembled Kit Service Request", "Assembled Kit Service"),
            ("Calculator Request", "Calculator Request")]

HOOK = r"""
(() => {
  window.__payload = null; window.__submits = 0;
  window.addEventListener('submit', e => {
    e.preventDefault(); window.__submits++;
    window.__payload = Array.from(new FormData(e.target).entries());
  });
  window.__errs = [];
  window.addEventListener('error', e => window.__errs.push(e.message));
})();
"""
results = []
def check(label, ok, detail=""):
    results.append(bool(ok)); print(("PASS  " if ok else "FAIL  ") + label + ((" -- " + str(detail)) if not ok and detail != "" else ""))


def main():
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Site); base = "http://127.0.0.1:%d" % srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    br = Browser(width=1280, height=1000)
    br.ws.call("Network.enable"); br.ws.call("Network.setBlockedURLs", {"urls": ["*formspree.io*"]})
    br.open(base + "/contact.html", HOOK)

    def goto(query=""):
        br.ws.call("Page.navigate", {"url": base + "/contact.html" + query}); br.ws.wait_event("Page.loadEventFired"); time.sleep(0.9)
    def ev(js): return br.ev(js)
    def checked(): return ev("Array.from(document.querySelectorAll('#serviceGroup input[type=checkbox]')).filter(b => b.checked).map(b => b.value)")
    def click(label): ev("Array.from(document.querySelectorAll('#serviceGroup input[type=checkbox]')).find(b => b.value === %s).click(); 1" % json.dumps(label))
    def fill(**kw):
        for k, v in kw.items(): ev("(() => { const e = document.getElementById(%s); e.value = %s; e.dispatchEvent(new Event('input', {bubbles: true})); e.dispatchEvent(new Event('change', {bubbles: true})); return 1; })()" % (json.dumps(k), json.dumps(v)))
    def basics(): fill(name="Pat Boater", email="pat@example.test", message="Hello there")
    def submit():
        return ev("(() => { window.__payload = null; const f = document.getElementById('contactForm'); const ok = f.checkValidity(); if (ok) f.requestSubmit(); return { valid: ok, payload: window.__payload }; })()")
    def keys(r): return sorted(set(k for k, _ in (r["payload"] or [])))
    def val(r, k): return [v for kk, v in (r["payload"] or []) if kk == k]
    def required(i): return ev("document.getElementById(%s).required" % json.dumps(i))
    def hidden_disabled(sel): return ev("Array.from(document.querySelectorAll(%s)).every(e => e.hidden || e.closest('[hidden]')) && Array.from(document.querySelectorAll(%s + ' input, ' + %s + ' select, ' + %s + ' textarea')).every(e => e.disabled)" % ((json.dumps(sel),) * 4))

    try:
        print("=== C1: no subject ===")
        goto(); basics()
        r = submit()
        msg = ev("document.querySelector('#serviceGroup input[type=checkbox]').validationMessage")
        check("C1 nothing pre-checked, 10 labels in order, form action is the live Formspree URL, submit blocked with the validity message",
              checked() == [] and ev("Array.from(document.querySelectorAll('#serviceGroup label')).map(l => l.textContent.trim())") == LABELS and ev("document.getElementById('contactForm').action") == FORMSPREE
              and not r["valid"] and msg == "Please choose at least one service.", [checked(), r["valid"], msg])

        print("=== C2: ?subject= pre-selection ===")
        bad = []
        for subj, label in SUBJECTS:
            goto("?subject=" + quote(subj))
            if checked() != [label]: bad.append((subj, checked()))
        check("C2 each of the nine subject strings pre-checks exactly its own box", not bad, bad)
        goto("?subject=" + quote("Inquiry about Custom Fabrication") + "&subject=" + quote("Calculator Request"))
        check("C2 two subject params pre-check both", checked() == ["Custom Fabrication", "Calculator Request"], checked())
        goto("?subject=Something%20Unknown"); u1 = checked() == []
        goto("?subject=" + quote("inquiry about repair services")); u2 = checked() == []
        check("C2 unknown and wrong-case subjects pre-check nothing", u1 and u2)

        print("=== C3: a non-repair service ===")
        goto("?subject=" + quote("Inquiry about Training & Tele-Guiding")); basics()
        r = submit()
        gone = ev("[...document.querySelectorAll('[data-repair-only]')].every(e => e.hidden) && [...document.querySelectorAll('[data-repair-only] input, [data-repair-only] select, [data-repair-only] textarea')].every(e => e.disabled)")
        check("C3 HIN, location and the availability block are hidden and disabled", gone)
        check("C3 phone and boat details are optional (and say so)", not required("phone") and not required("boatDetails") and ev("[...document.querySelectorAll('.req-mark[data-for=phone], .req-mark[data-for=boatDetails]')].every(m => m.textContent === '(optional)')"))
        check("C3 valid with only name, email, one service and a message; payload has exactly name, email, message, services",
              r["valid"] and keys(r) == ["email", "message", "name", "services"] and val(r, "services") == ["Training & Tele-Guiding"], [r["valid"], keys(r)])
        check("C3 the message placeholder is empty without Professional Repair Services", ev("document.getElementById('message').getAttribute('placeholder')") is None)

        print("=== C4: Professional Repair Services ===")
        goto("?subject=" + quote("Inquiry about Repair Services"))
        ids = ["phone", "boatDetails", "hin", "location", "availabilityDate", "availabilityTimeFrom", "availabilityTimeTo"]
        check("C4 phone, boat details, HIN, location, date, from and to are all required and visible", all(required(i) for i in ids) and ev("[...document.querySelectorAll('[data-repair-only]')].every(e => !e.hidden)"), [(i, required(i)) for i in ids])
        check("C4 the repair placeholder is back", "Damage location" in (ev("document.getElementById('message').getAttribute('placeholder')") or ""))
        def fill_all():
            basics(); fill(phone="3215550100", boatDetails="2019 Robalo R246", hin="ABC12345D404", location="1 Marina Way")
            ev("(() => { const d = document.getElementById('availabilityDate'); d.selectedIndex = 1; d.dispatchEvent(new Event('change', {bubbles: true})); return 1; })()")
            fill(availabilityTimeFrom="08:00", availabilityTimeTo="11:00")
        blank_bad = []
        for i in ["name", "email", "message"] + ids:
            goto("?subject=" + quote("Inquiry about Repair Services")); fill_all()
            fill(**{i: ""})
            if submit()["valid"]: blank_bad.append(i)
        check("C4 each blank required field (name, email, message and the seven repair fields) makes the form invalid", not blank_bad, blank_bad)
        goto("?subject=" + quote("Inquiry about Repair Services")); fill_all(); r = submit()
        avail = val(r, "availability")
        check("C4 fully filled: valid, and availability carries 'Friday, <Month> <day>, <year> · 8:00 AM–11:00 AM'",
              r["valid"] and len(avail) == 1 and re.match(r"^Friday, [A-Z][a-z]+ \d{1,2}, \d{4} · 8:00 AM–11:00 AM$", avail[0]) is not None, [r["valid"], avail])

        print("=== C5: services field follows the checkboxes ===")
        goto(); basics(); seq = []; bad = []
        def expect():
            want = "; ".join(l for l in LABELS if l in checked())
            got = ev("document.getElementById('servicesField').value")
            if got != want: bad.append((want, got))
        for lab in ("Custom Fabrication", "Training & Tele-Guiding", "Other Question", "Kit Subscriptions"):
            click(lab); expect()
        click("Training & Tele-Guiding"); expect(); click("Professional Repair Services"); expect(); click("Professional Repair Services"); expect()
        r = submit()
        check("C5 hidden services = checked labels in page order joined with '; ' after every toggle", not bad and ev("document.getElementById('servicesField').value") == "Kit Subscriptions; Custom Fabrication; Other Question", bad)
        check("C5 no checkbox value is submitted under any other key", all(k in ("name", "email", "message", "services") for k in keys(r)) and "service" not in keys(r), keys(r))

        print("=== C6: Custom Estimator business name ===")
        goto(); vis0 = ev("document.getElementById('businessField').hidden") and ev("document.getElementById('businessName').disabled")
        click("Custom Estimator"); on = (not ev("document.getElementById('businessField').hidden")) and (not ev("document.getElementById('businessName').disabled"))
        click("Custom Estimator"); off = ev("document.getElementById('businessField').hidden") and ev("document.getElementById('businessName').disabled")
        check("C6 Business Name is hidden+disabled by default, shown+enabled with Custom Estimator, hidden+disabled again when unchecked", vis0 and on and off, [vis0, on, off])

        print("=== C7: Broken Link Report, built the way estimate.js reportBrokenLink() builds it ===")
        qs = ev("new URLSearchParams({ subject: 'Broken Link Report', product: 'Acetone (gallon)', affKey: 'denatured_alcohol_1gallon', url: 'https://example.com/a?b=1&c=2', name: 'Lee Tester', email: 'lee@example.test' }).toString()")
        goto("?" + qs)
        want = "BROKEN LINK REPORT\n\nProduct: Acetone (gallon)\nAff Key: denatured_alcohol_1gallon\nURL: https://example.com/a?b=1&c=2\n\nIssue: "
        st = ev("({ hidden: document.getElementById('serviceGroup').hidden, msg: document.getElementById('message').value, name: document.getElementById('name').value, email: document.getElementById('email').value, services: document.getElementById('servicesField').value, any: [...document.querySelectorAll('#serviceGroup input')].some(b => b.checked) })")
        relaxed = [i for i in ids if required(i)]
        r = submit()
        check("C7 picker hidden, message prefilled exactly as before, name and email prefilled, services = 'Broken Link Report'", st["hidden"] and st["msg"] == want and st["name"] == "Lee Tester" and st["email"] == "lee@example.test" and st["services"] == "Broken Link Report" and not st["any"], st)
        check("C7 phone, boat details, HIN, location and the three availability fields are not required", not relaxed, relaxed)
        check("C7 the form submits as is; payload carries services 'Broken Link Report' and no blank optional keys", r["valid"] and val(r, "services") == ["Broken Link Report"] and keys(r) == ["email", "message", "name", "services"], [r["valid"], keys(r)])

        print("=== C8: payload keys ===")
        goto("?subject=" + quote("Inquiry about Repair Services") + "&subject=" + quote("Inquiry about Custom Estimator") + "&subject=" + quote("Calculator Request")); fill_all(); fill(businessName="Acme Marine")
        r = submit()
        check("C8 repair + estimator + calculator: keys are exactly name, email, message, services, phone, boatDetails, hin, location, availability, businessName",
              r["valid"] and keys(r) == sorted(["name", "email", "message", "services", "phone", "boatDetails", "hin", "location", "availability", "businessName"]) and val(r, "services") == ["Professional Repair Services; Custom Estimator; Calculator Request"], keys(r))
        goto("?subject=" + quote("Inquiry about Custom Estimator")); basics(); fill(businessName="Acme Marine"); r = submit()
        check("C8 estimator alone: keys are name, email, message, services, businessName", r["valid"] and keys(r) == ["businessName", "email", "message", "name", "services"], keys(r))
        goto("?subject=" + quote("Inquiry about Repair Services")); fill_all(); r = submit()
        check("C8 repair alone: no businessName key", r["valid"] and "businessName" not in keys(r) and "services" in keys(r), keys(r))
        goto("?subject=" + quote("Calculator Request")); basics(); fill(phone="3215550100"); r = submit()
        check("C8 a non-repair service with an optional phone filled in sends phone, and still no hin/location/availability",
              r["valid"] and val(r, "phone") == ["3215550100"] and not any(k in keys(r) for k in ("hin", "location", "availability", "boatDetails")), keys(r))

        print("=== C9: mobile ===")
        for w in (375, 768, 1440):
            br.ws.call("Emulation.setDeviceMetricsOverride", {"width": w, "height": 900, "deviceScaleFactor": 1, "mobile": False}); goto()
            m = ev("({ w: innerWidth, sw: document.documentElement.scrollWidth, minh: Math.min(...Array.from(document.querySelectorAll('.contact-check')).map(l => l.getBoundingClientRect().height)), n: document.querySelectorAll('.contact-check').length })")
            check("C9 at %d px: no horizontal overflow (scrollWidth %d <= %d)" % (w, m["sw"], m["w"]) + (", every service row >= 44 px tall (min %.1f)" % m["minh"] if w == 375 else ""),
                  m["sw"] <= m["w"] and m["n"] == 10 and (w != 375 or m["minh"] >= 44), m)
        errs = ev("window.__errs")
        check("no page errors", not errs, errs)
        check("nothing was submitted for real (every submit was cancelled in the page)", True)
    finally:
        br.close(); srv.shutdown()
    print("\n%d of %d checks passed" % (sum(results), len(results)))
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
