import type { Metadata } from "next";
import ProtokollideYmbersuunaja from "@/components/ProtokollideYmbersuunaja";

export const metadata: Metadata = {
  title: "Protokollid",
  robots: { index: false },
};

/** UX-09: protokollide nimekiri elab nüüd `/koosolekud/` lehel; see leht suunab ümber. */
export default function ProtokollidLeht() {
  return <ProtokollideYmbersuunaja />;
}
