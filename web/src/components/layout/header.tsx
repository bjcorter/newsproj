export function Header() {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="bg-background">
      <div className="mx-auto max-w-5xl px-4">
        {/* Dateline strip */}
        <div className="flex items-center justify-between border-b border-foreground/40 py-2 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <span className="absolute left-1/2 -translate-x-1/2">{date}</span>
        </div>

        {/* Nameplate */}
        <div className="py-5 text-center">
          <h1 className="font-masthead text-5xl leading-none sm:text-7xl">
            Just Some News
          </h1>
          <p className="mt-2 text-[0.7rem] uppercase tracking-[0.3em] text-muted-foreground">
            That&apos;s really all it is. Just the news.
          </p>
        </div>
      </div>

      {/* Double rule */}
      <div className="mx-auto max-w-5xl px-4">
        <div className="border-t-2 border-foreground" />
        <div className="mt-[3px] border-t border-foreground" />
      </div>
    </header>
  );
}
