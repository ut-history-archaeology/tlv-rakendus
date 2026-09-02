export default function Footer() {
  return (
    <footer className="no-print mt-16 border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-stone-600 md:flex-row md:items-center md:justify-between">
        <p>
          Andmeallikad: Tartu Linnavolikogu andmestik, 2026; Rahvusarhiiv.
        </p>
        <a
          href="/tlv-andmestik.zip"
          download
          className="font-medium text-stone-800 underline decoration-stone-400 hover:decoration-stone-800"
        >
          ↓ Laadi alla kogu andmestik (ZIP, CSV-failid)
        </a>
      </div>
    </footer>
  );
}
