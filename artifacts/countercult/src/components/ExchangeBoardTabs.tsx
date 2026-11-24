type Board = "exchange" | "adverts";

const tabs: { id: Board; label: string; href: string }[] = [
  { id: "exchange", label: "Exchange", href: "/residency" },
  { id: "adverts", label: "Adverts", href: "/adverts" },
];

export function ExchangeBoardTabs({ active }: { active: Board }) {
  return (
    <nav aria-label="Exchange boards" className="border-b border-black/15 bg-white px-4 py-3 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl">
        <div className="inline-flex w-full border-2 border-black bg-white p-1 shadow-[3px_3px_0_#000] sm:w-auto">
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <a
              key={tab.id}
              href={tab.href}
              aria-current={selected ? "page" : undefined}
              className={`inline-flex min-h-11 min-w-0 flex-1 items-center justify-center px-5 py-3 font-mono text-xs uppercase tracking-[0.14em] transition-colors sm:min-w-[150px] sm:flex-none sm:text-sm ${
                selected
                  ? "bg-black font-black text-[#c6ff3d]"
                  : "bg-white font-bold text-black/65 hover:bg-[#f2f2ee] hover:text-black"
              }`}
            >
              {tab.label}
            </a>
          );
        })}
        </div>
      </div>
    </nav>
  );
}
