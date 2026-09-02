"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SortVeerg {
  key: string;
  desc: boolean;
}

/**
 * Tabelivaadete jagatud seis: filtrid + sorteerimine + leht.
 * - filtrid/sort/leht sünkroonitakse URL-i query-parameetritesse (UN-04)
 * - "Minu vaade" salvestus localStorage'i (UN-08)
 * - mitme veeru sort Shift+klõpsuga, max 3 (UN-05, UN-06)
 */
export function useTabeliSeis(
  vaikeFiltrid: Record<string, string>,
  storageKey: string
) {
  const [filtrid, setFiltridRaw] = useState<Record<string, string>>(vaikeFiltrid);
  const [sort, setSort] = useState<SortVeerg[]>([]);
  const [leht, setLeht] = useState(1);
  const [laetud, setLaetud] = useState(false);
  const [salvestatudOlemas, setSalvestatudOlemas] = useState(false);
  const vaikimisi = useRef(vaikeFiltrid);

  // Mount: loe seis URL-ist (staatilise ekspordi puhul alles kliendis)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const f: Record<string, string> = { ...vaikimisi.current };
    let muudetud = false;
    for (const k of Object.keys(vaikimisi.current)) {
      const v = p.get(k);
      if (v !== null) {
        f[k] = v;
        muudetud = true;
      }
    }
    if (muudetud) setFiltridRaw(f);
    const s = p.get("sort");
    if (s) {
      setSort(
        s.split(",").flatMap((osa) => {
          const [key, suund] = osa.split(":");
          return key ? [{ key, desc: suund === "desc" }] : [];
        }).slice(0, 3)
      );
    }
    const l = Number(p.get("leht"));
    if (l > 1) setLeht(l);
    setSalvestatudOlemas(localStorage.getItem(storageKey) !== null);
    setLaetud(true);
  }, [storageKey]);

  // Seis → URL (replaceState, et ajalugu mitte risustada)
  useEffect(() => {
    if (!laetud) return;
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(filtrid)) {
      if (v !== "" && v !== vaikimisi.current[k]) p.set(k, v);
    }
    if (sort.length > 0) {
      p.set("sort", sort.map((s) => `${s.key}:${s.desc ? "desc" : "asc"}`).join(","));
    }
    if (leht > 1) p.set("leht", String(leht));
    const qs = p.toString();
    const url = window.location.pathname + (qs ? "?" + qs : "");
    window.history.replaceState(null, "", url);
  }, [filtrid, sort, leht, laetud]);

  const setFilter = useCallback((key: string, value: string) => {
    setFiltridRaw((f) => ({ ...f, [key]: value }));
    setLeht(1);
  }, []);

  const tyhjendaFiltrid = useCallback(() => {
    setFiltridRaw({ ...vaikimisi.current });
    setLeht(1);
  }, []);

  /** Veerupäise klõps: tavaline = ainus sortiveerg (asc→desc), Shift = teisene (max 3). */
  const sordi = useCallback((key: string, shift: boolean) => {
    setSort((praegune) => {
      const olemas = praegune.find((s) => s.key === key);
      if (!shift) {
        if (olemas && praegune[0]?.key === key) {
          return [{ key, desc: !olemas.desc }];
        }
        return [{ key, desc: false }];
      }
      if (olemas) {
        return praegune.map((s) => (s.key === key ? { ...s, desc: !s.desc } : s));
      }
      return [...praegune, { key, desc: false }].slice(0, 3);
    });
  }, []);

  const salvestaVaade = useCallback(() => {
    localStorage.setItem(storageKey, JSON.stringify({ filtrid, sort }));
    setSalvestatudOlemas(true);
  }, [filtrid, sort, storageKey]);

  const avaSalvestatudVaade = useCallback(() => {
    const s = localStorage.getItem(storageKey);
    if (!s) return;
    try {
      const { filtrid: f, sort: so } = JSON.parse(s);
      setFiltridRaw({ ...vaikimisi.current, ...f });
      if (Array.isArray(so)) setSort(so);
      setLeht(1);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  return {
    filtrid, setFilter, tyhjendaFiltrid,
    sort, sordi,
    leht, setLeht,
    laetud,
    salvestaVaade, avaSalvestatudVaade, salvestatudOlemas,
  };
}

/** Rakenda mitmetasemeline sort (UN-05/06); võrdlus stringidele lokaadituntlik. */
export function multiSort<T>(
  read: T[],
  sort: SortVeerg[],
  vaartus: (rida: T, key: string) => string | number | null
): T[] {
  if (sort.length === 0) return read;
  const koopia = [...read];
  koopia.sort((a, b) => {
    for (const s of sort) {
      const va = vaartus(a, s.key);
      const vb = vaartus(b, s.key);
      let cmp = 0;
      if (va === null && vb === null) cmp = 0;
      else if (va === null) cmp = 1;
      else if (vb === null) cmp = -1;
      else if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb), "et");
      if (cmp !== 0) return s.desc ? -cmp : cmp;
    }
    return 0;
  });
  return koopia;
}

/** Tekstiotsingu debounce 300 ms (UN-01). */
export function useDebounce(vaartus: string, ms = 300): string {
  const [tulemus, setTulemus] = useState(vaartus);
  useEffect(() => {
    const t = setTimeout(() => setTulemus(vaartus), ms);
    return () => clearTimeout(t);
  }, [vaartus, ms]);
  return tulemus;
}
