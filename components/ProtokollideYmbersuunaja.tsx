"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { protokollideNimekirjaUusUrl } from "@/lib/ymbersuunamine";

/** UX-09: `/protokollid/` → `/koosolekud/?…#otsing` (JS-ita kasutaja näeb linki). */
export default function ProtokollideYmbersuunaja() {
  const router = useRouter();
  useEffect(() => {
    router.replace(protokollideNimekirjaUusUrl(window.location.search));
  }, [router]);
  return (
    <p className="py-10 text-center text-stone-600">
      Protokollide nimekiri on nüüd koosolekute lehel:{" "}
      <Link href="/koosolekud/#otsing" className="text-blue-700 underline">
        Koosolekud ja protokollid →
      </Link>
    </p>
  );
}
