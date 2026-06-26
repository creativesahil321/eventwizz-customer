import { ThemeTester } from "@/components/theme-tester";

export default function ThemeTestPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold text-center mb-4">
        Dynamic Theme System
      </h1>
      <p className="text-center mb-8 max-w-2xl mx-auto">
        This page demonstrates the EventWizz theme system. It shows how the
        theme is automatically loaded and applied based on the domain. Visit
        this page with different subdomains to see the theme change.
      </p>

      <div className="my-8">
        <ThemeTester />
      </div>

      <div className="text-center text-sm text-muted-foreground mt-10">
        <p>Try accessing with different domains:</p>
        <ul className="space-y-1 mt-2">
          <li>
            <code className="bg-muted p-1 rounded">
              http://vendor.eventwizz.local:3000/theme-test
            </code>
          </li>
          <li>
            <code className="bg-muted p-1 rounded">
              http://customer.eventwizz.local:3000/theme-test
            </code>
          </li>
          <li>
            <code className="bg-muted p-1 rounded">
              http://partner.eventwizz.local:3000/theme-test
            </code>
          </li>
          <li>
            <code className="bg-muted p-1 rounded">
              http://admin.eventwizz.local:3000/theme-test
            </code>
          </li>
        </ul>
      </div>
    </div>
  );
}
