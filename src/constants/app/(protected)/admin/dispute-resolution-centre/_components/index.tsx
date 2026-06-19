export default function DisputeResolutionCentre() {
  const title = "Dispute Resolution Centre";
  const description =
    "Manage and resolve disputes between users and vendors efficiently.";
  return (
    <header className="flex w-full items-center justify-between gap-2 overflow-auto bg-background p-6 mb-4 border rounded-lg">
      <nav className="flex flex-col justify-start items-start gap-2 relative">
        <h2 className="text-2xl mb-0 title-header font-bold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </nav>
    </header>
  );
}
