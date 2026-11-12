"""TE4-01: scripts/excel-csv.py teisendusreeglid.  python3 -m unittest scripts/test_excel_csv.py"""
import datetime as dt
import importlib.util
import json
import os
import tempfile
import unittest

_SPEC = importlib.util.spec_from_file_location(
    "excel_csv", os.path.join(os.path.dirname(os.path.abspath(__file__)), "excel-csv.py"))
x = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(x)


class Kuupaevad(unittest.TestCase):
    def test_osaline_jaab_osaliseks(self):
        self.assertEqual(x.kuupaev(1871, None, None), "1871")
        self.assertEqual(x.kuupaev(1871, 9, None), "1871-09")
        self.assertEqual(x.kuupaev(1871, 9, 17), "1871-09-17")
        self.assertEqual(x.kuupaev("1899 või varem", None, None), "1899 või varem")
        self.assertEqual(x.kuupaev(None, None, None), "")

    def test_mitmepaevane(self):
        self.assertEqual(x.vahemik(1921, 2, "12,13"), ("1921-02-12", "1921-02-13"))
        self.assertEqual(x.vahemik(1917, 8, 20), ("1917-08-20", "1917-08-20"))

    def test_mottekriips_sidekriipsuks(self):
        self.assertEqual(x.kriips("1917–1919"), "1917-1919")

    def test_nadalapaev(self):
        self.assertEqual(x.nadalapaev("1918-02-22"), "reede")
        self.assertEqual(x.nadalapaev("1920-03-29"), "esmaspäev")

    def test_tekst(self):
        self.assertEqual(x.tekst(38.0), "38")
        self.assertEqual(x.tekst(dt.datetime(1901, 5, 25)), "1901-05-25")
        self.assertEqual(x.tekst("#REF!"), "")
        self.assertEqual(x.tekst(" 30.05.1881"), " 30.05.1881")


class KoosseisuMaaraja(unittest.TestCase):
    def test_vahemikud(self):
        m = x.KoosseisuMaaraja([
            {"koosseis_id": "A", "esimene_koosolek": ""},
            {"koosseis_id": "B", "esimene_koosolek": "1919-06-06"},
        ])
        self.assertEqual(m("1918-01-11"), "A")
        self.assertEqual(m("1919-06-06"), "B")


class Aliased(unittest.TestCase):
    def test_301_257(self):
        loendur = x.Counter()
        self.assertEqual(x.rakenda_alias("301", {"301": 257}, "t", loendur), "257")
        self.assertEqual(x.rakenda_alias("300", {"301": 257}, "t", loendur), "300")
        self.assertEqual(loendur["t"], 1)

    def test_aliaste_fail(self):
        self.assertEqual(x.loe_aliased(), {"301": 257})


class Parandused(unittest.TestCase):
    def _fail(self, kirjed):
        f = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
        json.dump({"parandused": kirjed}, f)
        f.close()
        self.addCleanup(os.unlink, f.name)
        return f.name

    def setUp(self):
        x.hoiatused.clear()

    def test_rakendub(self):
        t = {"koosolekud": [{"koosolek_id": "K026", "kuupaev": "1920-02-29"}]}
        tee = self._fail([{"nr": "AP-01", "tabel": "koosolekud", "votmed": {"koosolek_id": "K026"},
                           "vana": {"kuupaev": "1920-02-29"}, "uus": {"kuupaev": "1920-03-29"}}])
        x.rakenda_parandused(t, tee)
        self.assertEqual(t["koosolekud"][0]["kuupaev"], "1920-03-29")
        self.assertEqual(x.hoiatused, [])

    def test_allikas_juba_parandatud(self):
        t = {"koosolekud": [{"koosolek_id": "K026", "kuupaev": "1920-03-29"}]}
        tee = self._fail([{"nr": "AP-01", "tabel": "koosolekud", "votmed": {"koosolek_id": "K026"},
                           "vana": {"kuupaev": "1920-02-29"}, "uus": {"kuupaev": "1920-03-29"}}])
        x.rakenda_parandused(t, tee)
        self.assertTrue(any("parandus on allikas juba sees — eemalda" in h for h in x.hoiatused))

    def test_lisa_rida_ja_juba_olemas(self):
        t = {"koosolekud": [{"koosolek_id": "K001", "kuupaev": ""}]}
        tee = self._fail([{"nr": "AP-02", "tabel": "koosolekud", "votmed": ["koosolek_id"],
                           "lisa": {"koosolek_id": "K338", "kuupaev": "1940-11-13"}}])
        x.rakenda_parandused(t, tee)
        self.assertEqual(t["koosolekud"][-1]["koosolek_id"], "K338")
        x.rakenda_parandused(t, tee)
        self.assertEqual(len(t["koosolekud"]), 2)
        self.assertTrue(any("juba sees" in h for h in x.hoiatused))

    def test_parandusfail_kehtib(self):
        with open(x.PARANDUSED, encoding="utf-8") as f:
            nrid = [p["nr"] for p in json.load(f)["parandused"]]
        self.assertEqual(nrid, ["AP-01", "AP-02", "AP-03"])


class Osavott(unittest.TestCase):
    ISIKUD = [
        {"isik_id": "1", "perenimi": "Rütli", "alt_perenimi": "Rüütli", "eesnimi": "Oskar", "alt_eesnimi": "Johan Oskar"},
        {"isik_id": "2", "perenimi": "Walter", "alt_perenimi": "", "eesnimi": "Alfred", "alt_eesnimi": ""},
        {"isik_id": "3", "perenimi": "Walter", "alt_perenimi": "", "eesnimi": "Arthur", "alt_eesnimi": ""},
        {"isik_id": "4", "perenimi": "Klement", "alt_perenimi": "", "eesnimi": "Jaan", "alt_eesnimi": ""},
        {"isik_id": "5", "perenimi": "Tubin", "alt_perenimi": "", "eesnimi": "Villem", "alt_eesnimi": ""},
        {"isik_id": "6", "perenimi": "Raudsepp", "alt_perenimi": "", "eesnimi": "Jaan", "alt_eesnimi": ""},
    ]

    def siduja(self, liikmed):
        return x.Siduja(self.ISIKUD, {"K": set(liikmed)})

    def test_parsi(self):
        self.assertEqual(x.parsi_nimi("J.O.Rütli"), ("Rütli", ["j", "o"], False))
        self.assertEqual(x.parsi_nimi("Dr.Sõber"), ("Sõber", [], False))
        self.assertEqual(x.parsi_nimi("H. Pe terson"), ("Peterson", ["h"], False))
        self.assertEqual(x.parsi_nimi("Raudsepp II"), ("Raudsepp", [], True))
        self.assertEqual(x.parsi_nimi("0. Luck")[0], "")

    def test_koosseisust_korge(self):
        self.assertEqual(self.siduja(["1"]).seo("J.O.Rütli", "K"), ("1", "kõrge"))
        self.assertEqual(self.siduja(["5"]).seo("W.Tubin", "K"), ("5", "kõrge"))  # w→v

    def test_kogu_tabelist_keskmine(self):
        self.assertEqual(self.siduja([]).seo("O.Rütli", "K"), ("1", "keskmine"))

    def test_mitmene_ja_puudub(self):
        self.assertEqual(self.siduja(["2", "3"]).seo("A.Walter", "K"), ("", "mitmene"))
        self.assertEqual(self.siduja(["2", "3"]).seo("Alf.Walter", "K"), ("2", "kõrge"))
        self.assertEqual(self.siduja(["6"]).seo("Raudsepp II", "K"), ("", "mitmene"))
        self.assertEqual(self.siduja(["1"]).seo("Beganitskaja", "K"), ("", "puudub"))

    def test_ocr_topelttahed_ainult_koosseisus(self):
        self.assertEqual(self.siduja(["4"]).seo("Kleement", "K"), ("4", "kõrge"))
        self.assertEqual(self.siduja([]).seo("Kleement", "K"), ("", "puudub"))


if __name__ == "__main__":
    unittest.main()
