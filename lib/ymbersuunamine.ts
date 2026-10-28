/** UX-09: endise protokollide nimekirja (`/protokollid/`) uus aadress — päringuparameetrid säilivad. */
export function protokollideNimekirjaUusUrl(search: string): string {
  const qs = search && search !== "?" ? (search.startsWith("?") ? search : "?" + search) : "";
  return `/koosolekud/${qs}#otsing`;
}
