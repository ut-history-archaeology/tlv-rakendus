"""
TLV protokollilehtede TIF-ide teisendamine veebi jaoks.

TIF-id on mustvalged (1-bit). Need vähendatakse ja salvestatakse mustvalge
PNG-na, mis on veebis kõige väiksem ja kõikides brauserites kuvatav.

Tulemus:
  <VALJUND>/1200/<aasta>/<nimi>.png   -- lehe vaade
  <VALJUND>/300/<aasta>/<nimi>.png    -- eelvaade

Kasutamine (macOS Terminal):
  python3 -m venv ~/pildi-env
  source ~/pildi-env/bin/activate
  pip install pillow
  python teisenda_pildid.py ~/Desktop/tif ~/Desktop/pildid

Kasutamine (Windows PowerShell):
  pip install pillow
  python teisenda_pildid.py C:\\Users\\liisi\\Desktop\\tif C:\\Users\\liisi\\Desktop\\pildid

Juba olemas olevaid faile ei teisendata uuesti, nii et katkestamise järel
võib skripti lihtsalt uuesti käivitada.
"""
import os
import sys
from concurrent.futures import ProcessPoolExecutor

from PIL import Image

LAIUSED = [1200, 300]   # väljundi laiused pikslites
LAVI = 140              # 0-255; väiksem = heledam tulemus (õhem kiri)


def teisenda(argumendid):
    lahte, valjund, suht = argumendid
    tehtud = 0
    try:
        im = None
        for w in LAIUSED:
            siht = os.path.join(valjund, str(w), os.path.splitext(suht)[0] + ".png")
            if os.path.exists(siht):
                continue
            if im is None:
                im = Image.open(lahte)
                im.load()
                hall = im.convert("L")
            h = round(hall.height * w / hall.width)
            uus = hall.resize((w, h), Image.LANCZOS)
            mv = uus.point(lambda p: 255 if p > LAVI else 0).convert("1")
            os.makedirs(os.path.dirname(siht), exist_ok=True)
            mv.save(siht, "PNG", optimize=True)
            tehtud += 1
        return suht, tehtud, None
    except Exception as e:  # noqa: BLE001
        return suht, tehtud, str(e)


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    tif_kaust, valjund = sys.argv[1], sys.argv[2]

    tood = []
    for juur, _, failid in os.walk(tif_kaust):
        for f in sorted(failid):
            # "._" algusega failid on macOS-i peidetud abifailid, mitte pildid
            if f.lower().endswith((".tif", ".tiff")) and not f.startswith("._"):
                lahte = os.path.join(juur, f)
                tood.append((lahte, valjund, os.path.relpath(lahte, tif_kaust)))
    print(f"Leitud {len(tood)} TIF-faili")

    vead = []
    with ProcessPoolExecutor() as ex:
        for i, (suht, tehtud, viga) in enumerate(ex.map(teisenda, tood, chunksize=8), 1):
            if viga:
                vead.append(f"{suht}: {viga}")
            if i % 250 == 0 or i == len(tood):
                print(f"  {i}/{len(tood)}")

    for w in LAIUSED:
        kokku = 0
        for juur, _, failid in os.walk(os.path.join(valjund, str(w))):
            kokku += sum(os.path.getsize(os.path.join(juur, f)) for f in failid)
        print(f"{w} px: {kokku / 1024 / 1024:.1f} MB")
    if vead:
        print(f"\nVigu {len(vead)}:")
        print("\n".join(vead))
    else:
        print("Valmis, vigu polnud.")


if __name__ == "__main__":
    main()
