export function Header() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-3xl items-center px-4 py-4">
        <h1 className="text-xl font-semibold tracking-tight">NewsProj</h1>
        <p className="ml-3 text-sm text-muted-foreground">
          News from across the spectrum
        </p>
      </div>
    </header>
  );
}
