export default function SeoTools() {
  const title = "SEO Checker - Optimize & Analyze Your Website";
  const description =
    "Analyze and optimize your website's SEO performance with our powerful SEO Checker. Get insights, recommendations, and improve search rankings effortlessly.";
  return (
    <>
      <header className="flex w-full items-center justify-between gap-2 overflow-auto bg-background p-6 mb-4 border rounded-lg">
        <nav className="flex flex-col justify-start items-start gap-2 relative">
          <h2 className="text-2xl mb-0 title-header font-bold">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </nav>
      </header>
    </>
  );
}
