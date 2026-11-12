import { ABI } from "@/lib/abitekstid";

/** NK-02: ajutise nimekirjavaste märge ("vaste kontrollimisel"). */
export default function KontrollimiselMark() {
  return (
    <span
      className="ml-1.5 whitespace-nowrap rounded bg-amber-100 px-1 py-px align-middle text-[10px] font-medium text-amber-800"
      title={ABI.nimekiriKontrollimisel}
    >
      vaste kontrollimisel
    </span>
  );
}
