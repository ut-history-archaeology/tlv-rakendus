"use client";

/**
 * Kliendipoolne "Kopeeri viide" (PT-09): koostab viite, kopeerib lõikelauale ja
 * saadab teate (`tlv-teade` sündmus), mida ProtokollJuht kuvab.
 */
import { koostaViide, type ViiteAndmed } from "./viide";

export type ViiteBaas = Omit<ViiteAndmed, "leheUrl" | "punktNr" | "vaadatud">;

export function leheUrl(): string {
  return window.location.origin + window.location.pathname;
}

export function teade(tekst: string) {
  window.dispatchEvent(new CustomEvent("tlv-teade", { detail: tekst }));
}

export async function kopeeri(tekst: string, kinnitus: string) {
  try {
    await navigator.clipboard.writeText(tekst);
    teade(kinnitus);
  } catch {
    window.prompt("Kopeeri käsitsi:", tekst);
  }
}

/** Päevakorrapunkt viitesse: URL-i #p<nr>, muidu ainsana avatud punkt, muidu puudub. */
export function aktiivnePunkt(): number | null {
  const m = /^#p(\d+)/.exec(window.location.hash);
  if (m) return Number(m[1]);
  const avatud = Array.from(document.querySelectorAll<HTMLDetailsElement>("details.plokk[data-nr][open]"));
  if (avatud.length === 1) return Number(avatud[0].dataset.nr);
  return null;
}

export function kopeeriViide(baas: ViiteBaas, punktNr: number | null, lisa?: Partial<ViiteAndmed>) {
  const tekst = koostaViide({ ...baas, leheUrl: leheUrl(), punktNr, ...lisa });
  return kopeeri(tekst, "Viide kopeeritud");
}
