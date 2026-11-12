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


class Koosseisud(unittest.TestCase):
    """TE4-01/AN-04: volikogu suurus ja selle muutus."""

    def setUp(self):
        x.hoiatused.clear()

    def test_65_33(self):
        self.assertEqual(x.volikogu_suurus("65/33"), ("65", "33"))
        self.assertEqual(x.volikogu_suurus("60"), ("60", ""))
        self.assertEqual(x.volikogu_suurus("-"), ("", ""))
        self.assertEqual(x.volikogu_suurus("umbes 60"), ("", ""))
        self.assertTrue(x.hoiatused)

    def test_muutuse_kuupaev(self):
        k = [{"koosseis_id": "A", "volikogu_suurus_hiljem": "33"}]
        kk = [{"koosseis_id": "A", "kuupaev": "1934-04-30", "koosseis_arv": "33"},
              {"koosseis_id": "A", "kuupaev": "1934-03-02", "koosseis_arv": "65"},
              {"koosseis_id": "A", "kuupaev": "1934-04-09", "koosseis_arv": "33"}]
        x.maara_suuruse_muutus(k, kk)
        self.assertEqual(k[0]["volikogu_suurus_muutus"], "1934-04-09")

    def test_hyperlink_url_veergu(self):
        r = {"aastad_koosolekud": "1927–1929", "aasta_valimised": 1926, "valimised_aasta": 1926, "valimised_kuu": 12,
             "valimised_päev": "18,19", **{f"{a}_{b}": None for a in ("esimene_koosolek", "viimane_koosolek")
                                           for b in ("aasta", "kuu", "päev")},
             "valimised_allikas": None, "valimistulemuste_nimekiri_allikas": "Riigi Teataja, nr. 6, 24 jaanuar 1927",
             "volinike_kandidaatide_nimekiri_allikas": None, "volikogu_suurus": 55, "hääled_allikas": "ERA.40.1.457"}
        url = "https://dea.digar.ee/article/AKriigiteataja/1927/01/24/12"
        [k] = x.tee_koosseisud([r], {(0, "valimistulemuste_nimekiri_allikas"): url})
        self.assertEqual(k["valimistulemuste_allikas_url"], url)
        self.assertEqual(k["kandidaatide_allikas_url"], "")
        self.assertEqual(k["koosseis_id"], "1927-1929")


class ValimiseAllikas(unittest.TestCase):
    """VK-02: rea allikas."""

    def test_reeglid(self):
        self.assertEqual(x.valimise_allikas({"roll_allikas": "valitud", "aasta": 1917, "perenimi": "Allik"}), "tulemused")
        self.assertEqual(x.valimise_allikas({"roll_allikas": "valitav", "aasta": 1917, "perenimi": "Алликъ"}),
                         "kandidaadid_vene")
        self.assertEqual(x.valimise_allikas({"roll_allikas": "valitav", "aasta": 1917, "perenimi": "Allik"}), "kandidaadid")
        self.assertEqual(x.valimise_allikas({"roll_allikas": "valitav", "aasta": 1926, "perenimi": "Aavik"}), "kandidaadid")

    def test_exceli_veerg_eelistatakse(self):
        self.assertEqual(x.valimise_allikas({"allikas": "kandidaadid_vene", "roll_allikas": "valitav", "aasta": 1917,
                                             "perenimi": "Allik"}), "kandidaadid_vene")


class Nimekirjad(unittest.TestCase):
    """TE4-03: nimekirjade sidumine vastete tabeli järgi."""
    VASTED = {("1926", "", "Eesti rahvaerakonna nimekiri"): {"id": "7", "kontrollida": False},
              ("1923", "7", "Linna rentnikute rühm"): {"id": "20", "kontrollida": True}}

    def rida(self, aasta, nr, nimi):
        return {"aasta": aasta, "nimekiri_nr": nr, "nimekiri_nimi": nimi}

    def test_seotakse_ja_tuhikud_ei_sega(self):
        v = [self.rida("1926", "", " Eesti rahvaerakonna nimekiri\xa0"), self.rida("1923", "7", "Linna rentnikute rühm")]
        x.seo_nimekirjad(v, self.VASTED)
        self.assertEqual([(r["nimekiri_id"], r["nimekiri_kontrollida"]) for r in v], [("7", ""), ("20", "jah")])

    def test_puuduv_toorkuju_katkestab(self):
        v = [self.rida("1926", "", "Rahvaerakonna uus kuju")]
        with self.assertRaises(x.NimekirjaViga) as e:
            x.seo_nimekirjad(v, self.VASTED)
        self.assertIn("Rahvaerakonna uus kuju", str(e.exception))

    def test_1939_tuhi(self):
        v = [{"aasta": "1939", "nimekiri_nr": "", "nimekiri_nimi": "", "ringkond_nr": "2"}]
        x.seo_nimekirjad(v, self.VASTED)
        self.assertEqual(v[0]["nimekiri_id"], "")

    def test_vastete_fail_kehtib(self):
        vasted = x.loe_nimekirjade_vasted()
        self.assertEqual(len(vasted), 139)
        self.assertEqual(sum(v["kontrollida"] for v in vasted.values()), 3)

    def test_ametlikud_nimekirjad_1929_alamnimekirjad(self):
        kan = [{"nimekiri_id": "26", **{f"{v}_{a}": "" for a in x.NIMEKIRJAD_AASTAD for v in ("nr", "nimi")}}]
        kan[0]["nimi_1929"] = "Tartu majaomanikud"
        kan[0]["nr_1923"] = "5"
        read = [{"aasta_valimised": 1929, "nimekiri_nr": None, "nimekiri_nimi": "Tartu majaomanikud (eesotsas J. O. Rütli)",
                 "hääled": 736, **{f"wikidata_{i}": None for i in range(1, 5)}},
                {"aasta_valimised": 1923, "nimekiri_nr": 5, "nimekiri_nimi": "Majaomanikud", "hääled": 3126,
                 **{f"wikidata_{i}": None for i in range(1, 5)}}]
        out = x.tee_valimisnimekirjad(read, kan)
        self.assertEqual([r["nimekiri_id"] for r in out], ["26", "26"])


if __name__ == "__main__":
    unittest.main()
