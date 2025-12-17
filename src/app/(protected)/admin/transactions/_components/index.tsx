export default function Transactions() {
  const title = "Transactions";
  const description = "View and manage transactions for all vendors.";
  return (
    <header className="flex w-full items-center justify-between gap-2 overflow-auto bg-background p-6 mb-4 border rounded-lg">
      <nav className="flex flex-col justify-start items-start gap-2 relative">
        <h2 className="text-2xl mb-0 title-header font-bold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </nav>
    </header>
  );
}
