"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { aktiivneLeht, leiaLeht, naaberLeht, samaPildiLehed, transkribusLeheUrl, type MarkeriKoht } from "@/lib/protokollid/lehed";
import { BASE_PATH } from "@/lib/protokollid/laadi";
import { pildiUrl } from "@/lib/protokollid/lehed";
import type { Leht } from "@/lib/protokollid/types";
import { kopeeri, kopeeriViide, leheUrl, type ViiteBaas } from "@/lib/protokollid/viide-klient";
import LehePilt from "./LehePilt";
import LehtedeRiba from "./LehtedeRiba";

const LUKK_MS = 600;
const LAIUS_MIN = 30;
const LAIUS_MAX = 70;

interface Props {
  lehed: Leht[];
  /** eesti kujul kuupäev(ad) alt-tekstidesse */
  kuupaevTekst: string;
  arhiiviviide: string;
  transkribusUrl: string;
  viide: ViiteBaas;
  /** lk → ploki id, mis tuleb lehe valimisel avada */
  leheplokid: Record<string, string>;
  /** serveris renderdatud tekstivaade (ProtokollTekst) */
  children: ReactNode;
}

/**
 * PT-05 paralleelvaade: vasakul tekst (children), paremal pildipaneel; töölaual (≥ 1024 px)
 * kõrvuti koos lohistatava jaoturiga, kitsamal sakid "Tekst" / "Originaal".
 * Sünkroonimine: tekst → pilt (kerimine, nähtavad markerid, `aktiivneLeht`), pilt → tekst
 * (lehe valimine avab ploki ja kerib markerile; lukk ~600 ms tagasisünki vastu).
 */
export default function ParalleelVaade({ lehed, kuupaevTekst, arhiiviviide, transkribusUrl, viide, leheplokid, children }: Props) {
  const [mounted, setMounted] = useState(false);
  const [lai, setLai] = useState(true);
  const [avatud, setAvatud] = useState(true);
  const [sakk, setSakk] = useState<"tekst" | "originaal">("tekst");
  const [laius, setLaius] = useState(55);
  const [aktiivne, setAktiivne] = useState<string>(lehed[0]?.lk ?? "");
  const [teade, setTeade] = useState<string | null>(null);
  const lukk = useRef(0);
  /** scrollY lehe käsitsi valimisel: kerimissünk ei kirjuta valikut üle enne, kui kasutaja on tegelikult kerinud */
  const valikuScrollY = useRef<number | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const paneel = useRef<HTMLElement>(null);
  const jaoturLohistus = useRef(false);

  const leht = leiaLeht(lehed, aktiivne) ?? lehed[0];
  const paneelNahtav = mounted && (lai ? avatud : sakk === "originaal");

  // --- seaded ja ekraanilaius ---
  useEffect(() => {
    setMounted(true);
    try {
      const s = localStorage.getItem("tlv-pildipaneel");
      if (s === "0") setAvatud(false);
      const l = Number(localStorage.getItem("tlv-pildipaneel-laius"));
      if (l >= LAIUS_MIN && l <= LAIUS_MAX) setLaius(l);
    } catch {
      /* localStorage puudub */
    }
    const mq = window.matchMedia("(min-width: 1024px)");
    setLai(mq.matches);
    const f = (e: MediaQueryListEvent) => setLai(e.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem("tlv-pildipaneel", avatud ? "1" : "0");
      localStorage.setItem("tlv-pildipaneel-laius", String(laius));
    } catch {
      /* ignoreeri */
    }
  }, [avatud, laius, mounted]);

  // --- pilt → tekst: lehe valimine ---
  const keriMarkerile = useCallback(
    (lk: string) => {
      const plokkId = leheplokid[lk];
      const plokk = plokkId ? document.getElementById(plokkId) : null;
      if (plokk instanceof HTMLDetailsElement) plokk.open = true;
      requestAnimationFrame(() => {
        const marker = document.getElementById(`lk-${lk}`);
        marker?.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    },
    [leheplokid]
  );

  const valiLeht = useCallback(
    (lk: string, keri: boolean) => {
      if (!leiaLeht(lehed, lk)) return;
      lukk.current = Date.now() + LUKK_MS + (keri ? 600 : 0);
      valikuScrollY.current = keri ? null : window.scrollY;
      setAktiivne(lk);
      setTeade(null);
      if (keri) keriMarkerile(lk);
    },
    [lehed, keriMarkerile]
  );

  // --- URL ?lk= mount'is ---
  useEffect(() => {
    if (!mounted) return;
    const p = new URLSearchParams(window.location.search);
    const lk = p.get("lk");
    if (!lk) return;
    if (leiaLeht(lehed, lk)) {
      valiLeht(lk, true);
      if (!lai) setSakk("originaal");
    } else {
      setTeade(`Lehte ${lk} selles protokollis ei ole.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // --- aktiivne leht → URL (replaceState; muud parameetrid ja # jäävad) ---
  useEffect(() => {
    if (!mounted) return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("lk") === aktiivne) return;
    if (!p.has("lk") && aktiivne === lehed[0]?.lk) return; // vaikimisi esimene leht: URL-i ei risusta
    p.set("lk", aktiivne);
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}${window.location.hash}`);
  }, [aktiivne, mounted, lehed]);

  // --- tekst → pilt: kerimine ---
  useEffect(() => {
    if (!mounted) return;
    let raf = 0;
    function arvuta() {
      raf = 0;
      if (Date.now() < lukk.current) return;
      if (!lai && sakk !== "tekst") return;
      if (valikuScrollY.current !== null) {
        if (Math.abs(window.scrollY - valikuScrollY.current) < 40) return;
        valikuScrollY.current = null;
      }
      const markerid: MarkeriKoht[] = [];
      document.querySelectorAll<HTMLElement>("a.lehemarker[data-lk]").forEach((el) => {
        if (el.closest("details:not([open])")) return; // kokkuklapitud punkti sees → nähtamatu (Chrome'i content-visibility tõttu ei saa offsetParent-it usaldada)
        markerid.push({ lk: el.dataset.lk ?? "", offset: el.getBoundingClientRect().top });
      });
      const lk = aktiivneLeht(lehed, markerid, window.innerHeight / 3);
      if (lk) setAktiivne((a) => (a === lk ? a : lk));
    }
    function ajasta() {
      if (!raf) raf = requestAnimationFrame(arvuta);
    }
    window.addEventListener("scroll", ajasta, { passive: true });
    window.addEventListener("resize", ajasta);
    document.addEventListener("toggle", ajasta, true);
    ajasta();
    return () => {
      window.removeEventListener("scroll", ajasta);
      window.removeEventListener("resize", ajasta);
      document.removeEventListener("toggle", ajasta, true);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mounted, lehed, lai, sakk]);

  // --- markeri klõps tekstis ---
  useEffect(() => {
    function klikk(e: MouseEvent) {
      const m = (e.target as HTMLElement).closest<HTMLElement>("a.lehemarker[data-lk]");
      if (!m) return;
      e.preventDefault();
      const lk = m.dataset.lk ?? "";
      valiLeht(lk, false);
      if (lai) setAvatud(true);
      else setSakk("originaal");
      requestAnimationFrame(() => paneel.current?.focus());
    }
    document.addEventListener("click", klikk);
    return () => document.removeEventListener("click", klikk);
  }, [valiLeht, lai]);

  // --- naaberlehtede eellaadimine: ainult avatud paneelil ja alles pärast esimest lehevahetust
  // (lehe avamisel laetakse ≤ 1 suur pilt + nähtavad eelvaated) ---
  const lehevahetusi = useRef(0);
  useEffect(() => {
    if (!paneelNahtav || !leht) return;
    lehevahetusi.current++;
    if (lehevahetusi.current <= 1) return;
    for (const suund of [-1, 1] as const) {
      const n = naaberLeht(lehed, leht.lk, suund);
      if (n) new Image().src = pildiUrl(BASE_PATH, 1200, n.pilt);
    }
  }, [paneelNahtav, leht, lehed]);

  // --- jaotur ---
  function jaoturPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    jaoturLohistus.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function jaoturPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!jaoturLohistus.current || !wrapper.current) return;
    const r = wrapper.current.getBoundingClientRect();
    const pct = ((e.clientX - r.left) / r.width) * 100;
    setLaius(Math.round(Math.min(LAIUS_MAX, Math.max(LAIUS_MIN, pct))));
  }
  function jaoturPointerUp() {
    jaoturLohistus.current = false;
  }
  function jaoturKlahv(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowLeft") setLaius((l) => Math.max(LAIUS_MIN, l - 5));
    else if (e.key === "ArrowRight") setLaius((l) => Math.min(LAIUS_MAX, l + 5));
    else return;
    e.preventDefault();
  }

  // --- paneeli klaviatuur ---
  function paneeliKlahv(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const n = naaberLeht(lehed, aktiivne, e.key === "ArrowLeft" ? -1 : 1);
    if (n) {
      e.preventDefault();
      valiLeht(n.lk, true);
    }
  }

  function vahetaSakk(s: "tekst" | "originaal") {
    setSakk(s);
    if (s === "tekst") {
      lukk.current = Date.now() + LUKK_MS;
      requestAnimationFrame(() => keriMarkerile(aktiivne));
    }
  }

  const esimene = lehed[0]?.lk ?? "";
  const viimane = lehed[lehed.length - 1]?.lk ?? "";
  const eelmine = leht ? naaberLeht(lehed, leht.lk, -1) : null;
  const jargmine = leht ? naaberLeht(lehed, leht.lk, 1) : null;
  const transkribusLehe = leht ? transkribusLeheUrl(transkribusUrl, leht.transkribus_lk) : transkribusUrl;
  const samad = leht ? samaPildiLehed(lehed, leht) : [];
  const nupp = "rounded border border-stone-300 bg-white px-2 py-0.5 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-40";

  const paneeliSisu = leht && (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <button type="button" onClick={() => eelmine && valiLeht(eelmine.lk, true)} disabled={!eelmine} className={nupp} aria-label="Eelmine leht">
          ← eelmine
        </button>
        <span className="font-medium">
          lk {leht.lk} <span className="text-stone-500">/ {esimene}–{viimane} · {arhiiviviide}</span>
        </span>
        <button type="button" onClick={() => jargmine && valiLeht(jargmine.lk, true)} disabled={!jargmine} className={nupp} aria-label="Järgmine leht">
          järgmine →
        </button>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <a href={transkribusLehe} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
          Ava Transkribuses ↗
        </a>
        <button
          type="button"
          className="text-blue-700 hover:underline"
          onClick={() => void kopeeri(`${leheUrl()}?lk=${encodeURIComponent(leht.lk)}`, "Lehe link kopeeritud")}
        >
          Kopeeri lehe link
        </button>
        <button
          type="button"
          className="text-blue-700 hover:underline"
          onClick={() =>
            void kopeeriViide(viide, null, {
              esimeneLk: leht.lk,
              viimaneLk: leht.lk,
              transkribusUrl: transkribusLehe,
              leheUrl: `${leheUrl()}?lk=${encodeURIComponent(leht.lk)}`,
            })
          }
        >
          Kopeeri viide
        </button>
      </div>
      <LehePilt
        leht={leht}
        alt={`Protokolli ${kuupaevTekst} originaal, lk ${leht.lk}`}
        kirjeldus={leht.tekstita ? "tekstita leht" : samad.length ? `sama leht kui ${samad.join(", ")}` : undefined}
      />
      <LehtedeRiba lehed={lehed} aktiivne={leht.lk} vali={(lk) => valiLeht(lk, true)} kuupaev={kuupaevTekst} />
      <p className="text-[11px] text-stone-500">
        Originaalid: Rahvusarhiiv, {arhiiviviide.split(".").slice(0, 2).join(".")}; täislahutuses Transkribuses. Pilt on 1200 px laiune mustvalge koopia.
      </p>
    </div>
  );

  return (
    <div className="space-y-2">
      {/* tööriistariba: töölaual lüliti, kitsal sakid */}
      <div className="no-print flex flex-wrap items-center gap-2 text-sm">
        <div className="hidden lg:block">
          <button
            type="button"
            onClick={() => setAvatud((a) => !a)}
            aria-pressed={avatud}
            aria-controls="pildipaneel"
            className="rounded-md border border-stone-300 bg-white px-2.5 py-1 hover:bg-stone-50"
          >
            {avatud ? "Peida originaal" : "Originaal"}
          </button>
        </div>
        <div className="flex gap-1 lg:hidden" role="tablist" aria-label="Vaade">
          {(["tekst", "originaal"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={sakk === s}
              onClick={() => vahetaSakk(s)}
              className={`rounded-md px-3 py-1 ${sakk === s ? "bg-stone-800 text-white" : "border border-stone-300 bg-white text-stone-700"}`}
            >
              {s === "tekst" ? "Tekst" : `Originaal (lk ${aktiivne})`}
            </button>
          ))}
        </div>
        {teade && (
          <span role="status" className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
            {teade}
          </span>
        )}
      </div>

      <div ref={wrapper} className="lg:flex lg:items-start">
        <div
          data-tekstipaneel
          className={`min-w-0 ${!lai && sakk === "originaal" ? "hidden" : ""}`}
          style={lai && avatud ? { width: `${laius}%` } : undefined}
        >
          {children}
        </div>
        {lai && avatud && (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Paneelide laius"
              aria-valuenow={laius}
              aria-valuemin={LAIUS_MIN}
              aria-valuemax={LAIUS_MAX}
              tabIndex={0}
              onPointerDown={jaoturPointerDown}
              onPointerMove={jaoturPointerMove}
              onPointerUp={jaoturPointerUp}
              onPointerCancel={jaoturPointerUp}
              onKeyDown={jaoturKlahv}
              className="no-print mx-1 hidden w-2 shrink-0 cursor-col-resize self-stretch rounded bg-stone-200 hover:bg-stone-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500 lg:block"
              style={{ touchAction: "none", minHeight: "8rem" }}
            />
            <aside
              id="pildipaneel"
              ref={paneel}
              tabIndex={-1}
              onKeyDown={paneeliKlahv}
              aria-label="Originaali pildipaneel"
              className="no-print sticky top-14 hidden min-w-0 flex-1 rounded-lg border border-stone-200 bg-white p-3 lg:block"
            >
              {paneelNahtav ? paneeliSisu : <div className="h-[calc(100vh-16rem)]" />}
            </aside>
          </>
        )}
        {!lai && sakk === "originaal" && (
          <section
            ref={paneel as React.RefObject<HTMLElement>}
            tabIndex={-1}
            onKeyDown={paneeliKlahv}
            aria-label="Originaali pildipaneel"
            className="no-print rounded-lg border border-stone-200 bg-white p-3 lg:hidden"
          >
            {paneelNahtav && paneeliSisu}
          </section>
        )}
      </div>
    </div>
  );
}
