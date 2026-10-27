"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { normaliseeriParing, normaliseeriTekst, OTSINGU_MIN_PIKKUS } from "@/lib/protokollid/otsing";
import { kopeeriViide, type ViiteBaas } from "@/lib/protokollid/viide-klient";

/**
 * Protokollilehe kliendipoolne käitumine (PT-03/PT-04/PT-09), töötab serveris renderdatud DOM-i peal:
 * - "Ava kõik" / "Sule kõik";
 * - URL `#p<nr>` avab punkti ja kerib sinna (ka hashchange);
 * - `?q=` tõstab päringu vasted esile (<mark>) ja avab neid sisaldavad plokid;
 * - `?isik=<id>` tõstab isiku olemid tugevamalt esile ja avab plokid;
 * - `beforeprint` avab kõik plokid, `afterprint` taastab;
 * - päevakorrapunkti "viide"-nupp (delegeeritud) ja teadete (toast) kuvamine.
 */
export default function ProtokollJuht({ viide }: { viide: ViiteBaas }) {
  const [teade, setTeade] = useState<string | null>(null);
  const [otsing, setOtsing] = useState<{ q: string; vasteid: number } | null>(null);
  const [isik, setIsik] = useState<{ id: string; nimi: string; arv: number } | null>(null);

  const avaKoik = useCallback((open: boolean) => {
    document.querySelectorAll<HTMLDetailsElement>("details.plokk").forEach((d) => (d.open = open));
  }, []);

  // toast
  useEffect(() => {
    function kuula(e: Event) {
      setTeade((e as CustomEvent<string>).detail);
    }
    window.addEventListener("tlv-teade", kuula);
    return () => window.removeEventListener("tlv-teade", kuula);
  }, []);
  useEffect(() => {
    if (!teade) return;
    const t = setTimeout(() => setTeade(null), 2500);
    return () => clearTimeout(t);
  }, [teade]);

  // #p<nr>; ?q= ja ?isik=. Rakendatakse mount'is ja uuesti, kui tekst renderdatakse kliendis
  // ümber (kirjakuju-lüliti saadab `tlv-tekst-uuendatud`), sest vana DOM koos märgistusega asendub.
  useEffect(() => {
    function hash(keri: boolean) {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      const d = el.closest("details");
      if (d) d.open = true;
      if (keri) requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
    }
    function paring(keri: boolean) {
      const p = new URLSearchParams(window.location.search);
      const root = document.getElementById("protokoll-tekst");
      if (!root) return;
      const q = p.get("q");
      if (q && normaliseeriParing(q).length >= OTSINGU_MIN_PIKKUS) {
        const n = tostaEsile(root, q);
        setOtsing({ q, vasteid: n });
        const esimene = root.querySelector("mark.otsing-vaste");
        if (keri && esimene && !window.location.hash) requestAnimationFrame(() => esimene.scrollIntoView({ block: "center" }));
      }
      const isikId = p.get("isik");
      if (isikId && /^\d+$/.test(isikId)) {
        const olemid = root.querySelectorAll<HTMLElement>(`[data-isik="${isikId}"]`);
        olemid.forEach((o) => {
          o.classList.add("olem-aktiivne");
          const d = o.closest("details");
          if (d) d.open = true;
        });
        const tip = olemid[0]?.dataset.tip ?? "";
        const nimi = /— (?:tõenäoliselt )?([^(]+?) \(/.exec(tip)?.[1] ?? `isik ${isikId}`;
        setIsik({ id: isikId, nimi: nimi.trim(), arv: olemid.length });
        if (keri && olemid[0] && !window.location.hash && !q) requestAnimationFrame(() => olemid[0].scrollIntoView({ block: "center" }));
      }
    }
    hash(true);
    paring(true);
    const hashMuutus = () => hash(true);
    const tekstUuendatud = () => {
      hash(false);
      paring(false);
    };
    window.addEventListener("hashchange", hashMuutus);
    window.addEventListener("tlv-tekst-uuendatud", tekstUuendatud);
    return () => {
      window.removeEventListener("hashchange", hashMuutus);
      window.removeEventListener("tlv-tekst-uuendatud", tekstUuendatud);
    };
  }, []);

  // print
  useEffect(() => {
    let enne: boolean[] = [];
    function before() {
      const d = Array.from(document.querySelectorAll<HTMLDetailsElement>("details.plokk"));
      enne = d.map((x) => x.open);
      d.forEach((x) => (x.open = true));
    }
    function after() {
      const d = Array.from(document.querySelectorAll<HTMLDetailsElement>("details.plokk"));
      d.forEach((x, i) => (x.open = enne[i] ?? x.open));
    }
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  // punkti "viide"-nupp (delegeeritud; summary sees → toggle'it ei tohi käivitada)
  useEffect(() => {
    function klikk(e: MouseEvent) {
      const nupp = (e.target as HTMLElement).closest<HTMLElement>("button[data-viide]");
      if (!nupp) return;
      e.preventDefault();
      e.stopPropagation();
      void kopeeriViide(viide, Number(nupp.dataset.viide));
    }
    document.addEventListener("click", klikk);
    return () => document.removeEventListener("click", klikk);
  }, [viide]);

  return (
    <div className="no-print space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={() => avaKoik(true)} className="rounded-md border border-stone-300 bg-white px-2.5 py-1 hover:bg-stone-50">
          Ava kõik
        </button>
        <button type="button" onClick={() => avaKoik(false)} className="rounded-md border border-stone-300 bg-white px-2.5 py-1 hover:bg-stone-50">
          Sule kõik
        </button>
      </div>
      {otsing && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
          Otsing „{otsing.q}“: {otsing.vasteid === 0 ? "selles protokollis vasteid ei leitud" : `${otsing.vasteid} vastet esile tõstetud`}.{" "}
          <Link href={`/protokollid/?q=${encodeURIComponent(otsing.q)}`} className="underline">
            Tagasi otsingusse
          </Link>
        </p>
      )}
      {isik && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
          {isik.arv === 0 ? (
            <>Isikut {isik.id} selles protokollis ei mainita.</>
          ) : (
            <>
              Esile tõstetud: <Link href={`/isikud/${isik.id}/`} className="underline">{isik.nimi}</Link> — {isik.arv} mainimist (automaatne seos).
            </>
          )}
        </p>
      )}
      {teade && (
        <div role="status" aria-live="polite" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-stone-800 px-4 py-2 text-sm text-white shadow-lg">
          {teade}
        </div>
      )}
    </div>
  );
}

/** Päringu vasted tekstisõlmede sees → <mark>; tagastab vastete arvu. Avab sisaldavad plokid. Varasemad märgid eemaldatakse. */
function tostaEsile(root: HTMLElement, q: string): number {
  const qn = normaliseeriParing(q);
  root.querySelectorAll("mark.otsing-vaste").forEach((m) => m.replaceWith(...Array.from(m.childNodes)));
  root.normalize();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const solmed: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) solmed.push(n as Text);
  let arv = 0;
  for (const solm of solmed) {
    if (solm.parentElement?.closest(".lehemarker, .kone-silt, button, sup")) continue;
    const norm = normaliseeriTekst(solm.data);
    let i = norm.indexOf(qn);
    if (i < 0) continue;
    const frag = document.createDocumentFragment();
    let viimane = 0;
    while (i >= 0) {
      frag.append(solm.data.slice(viimane, i));
      const m = document.createElement("mark");
      m.className = "otsing-vaste";
      m.textContent = solm.data.slice(i, i + qn.length);
      frag.append(m);
      viimane = i + qn.length;
      arv++;
      i = norm.indexOf(qn, viimane);
    }
    frag.append(solm.data.slice(viimane));
    const d = solm.parentElement?.closest("details");
    if (d) d.open = true;
    solm.replaceWith(frag);
  }
  return arv;
}
