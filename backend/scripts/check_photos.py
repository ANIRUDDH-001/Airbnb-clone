"""One-off check that every seed photo URL resolves. Run: python scripts/check_photos.py"""

import sys
import urllib.request

from app.seed.photos import EXTERIOR, INTERIOR

failures = 0
for pool in (*EXTERIOR.values(), *INTERIOR.values()):
    for url in pool:
        request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "seed-check"})
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                ok = response.status == 200
        except Exception:  # noqa: BLE001 — report and continue
            ok = False
        if not ok:
            failures += 1
            print("BROKEN", url)
print("all photos OK" if not failures else f"{failures} broken")
sys.exit(1 if failures else 0)
