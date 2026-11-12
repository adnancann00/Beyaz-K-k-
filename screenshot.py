#!/usr/bin/env python3
"""
CLAUDE.md'deki screenshot.mjs'in karşılığı (Node olmayan bu Mac için, Chrome headless ile).

Kullanım:
  python3 screenshot.py http://localhost:8000            # masaüstü (1440 px)
  python3 screenshot.py http://localhost:8000 etiket     # screenshot-N-etiket.png
  python3 screenshot.py http://localhost:8000 etiket --mobile   # telefon (390 px)

Çıktı: "temporary screenshots/screenshot-N[-etiket].png" (tam sayfa, numara otomatik artar,
üzerine yazılmaz) ve inceleme için ekran boyunda dilimler: screenshot-N[-etiket]-parca-K.png
"""
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "temporary screenshots")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def run_chrome(args):
    # Her çekimde temiz profil: eski CSS ve görseller önbellekten okunmasın
    import shutil
    profile = tempfile.mkdtemp(prefix="bk-shot-")
    base = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
            f"--user-data-dir={profile}", "--virtual-time-budget=15000"]
    try:
        return subprocess.run(base + args, capture_output=True, text=True).stdout
    finally:
        shutil.rmtree(profile, ignore_errors=True)


def next_name(label):
    os.makedirs(OUT, exist_ok=True)
    nums = [int(m.group(1)) for f in os.listdir(OUT) if (m := re.match(r"screenshot-(\d+)", f))]
    n = max(nums, default=0) + 1
    return f"screenshot-{n}" + (f"-{label}" if label else "")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    mobile = "--mobile" in sys.argv
    if not args:
        sys.exit(__doc__)
    url = args[0].rstrip("/") + "/"
    if "localhost" not in url and "127.0.0.1" not in url:
        sys.exit("Kural: yalnızca localhost'tan ekran görüntüsü alınır.")
    label = args[1] if len(args) > 1 else ""
    width, view_h = (390, 844) if mobile else (1440, 900)

    # Aynı kaynaktan bir çerçeve sayfası: tembel yüklenen görselleri hemen yükletir,
    # telefon açılışını gerçek ekran boyunda sabitler, sonra tam sayfa boyunu ölçer.
    frame = os.path.join(ROOT, "_shot_frame.html")
    hero_fix = f".hero__inner{{min-height:{view_h - 64}px!important}}" if mobile else ""
    with open(frame, "w", encoding="utf-8") as fh:
        fh.write(f"""<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff">
<iframe id="f" src="{url}" style="width:{width}px;height:{view_h}px;border:0;display:block;margin:0 auto"></iframe>
<script>
f.onload=async()=>{{const d=f.contentDocument;const s=d.createElement('style');s.textContent='{hero_fix}';d.head.appendChild(s);
 const imgs=[...d.querySelectorAll('img')];imgs.forEach(i=>{{i.loading='eager';i.decoding='sync';}});
 f.style.height=d.documentElement.scrollHeight+'px';
 const wait=(p)=>Promise.race([p,new Promise(r=>setTimeout(r,5000))]);
 await wait(Promise.all(imgs.map(i=>i.complete?0:new Promise(r=>{{i.addEventListener('load',r);i.addEventListener('error',r);}}))));
 await wait(Promise.all(imgs.map(i=>i.decode().catch(()=>{{}}))));
 f.style.height=d.documentElement.scrollHeight+'px';
 document.title='H'+d.documentElement.scrollHeight;}};
</script>""")
    try:
        frame_url = url + "_shot_frame.html"
        dom = run_chrome([f"--window-size={max(width, 600)},{view_h}", "--dump-dom", frame_url])
        m = re.search(r"<title>H(\d+)</title>", dom)
        if not m:
            t = re.search(r"<title>(.*?)</title>", dom)
            sys.exit("Sayfa yüksekliği ölçülemedi. Başlık: " + (t.group(1) if t else 'yok') + " | " + dom[:200])
        height = int(m.group(1))
        name = next_name(label)
        raw = os.path.join(OUT, f"_{name}_raw.png")
        run_chrome([f"--window-size={max(width, 600)},{height}", f"--screenshot={raw}", frame_url])
    finally:
        os.remove(frame)

    full = os.path.join(OUT, f"{name}.png")
    # sips -c ortadan kırpar; çerçeve ortalandığı için tam sayfa genişliği elde edilir
    subprocess.run(["sips", "-c", str(height), str(width), raw, "--out", full], capture_output=True)
    os.remove(raw)

    parts = 0
    # Not: sips 0 kaydırmasını yok sayıp ortadan kırpar; bu yüzden en az 1 px kaydırılır
    for k, top in enumerate(range(0, height, view_h), start=1):
        h = min(view_h, height - top - 1)
        if h < 50:
            break
        part = os.path.join(OUT, f"{name}-parca-{k}.png")
        subprocess.run(["sips", "-c", str(h), str(width), "--cropOffset", str(max(top, 1)), "0", full, "--out", part],
                       capture_output=True)
        parts = k
    print(f"{full}  ({width}x{height}, {parts} parça)")


if __name__ == "__main__":
    main()
