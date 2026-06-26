"use client";

import { useDomain } from "@/providers/domain-provider/domain-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const DomainThemeDisplay = () => {
  const { domain, website_role, settings, isLoading, isDomainRequest } =
    useDomain();

  if (isLoading) {
    return <div>Loading theme settings...</div>;
  }

  if (!isDomainRequest || !settings) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Default Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No domain-specific theme detected.</p>
          <p className="text-xs text-muted-foreground mt-2">
            Using default EventWizz theme.
          </p>

          <div className="flex gap-2 mt-4">
            <Button variant="event-primary">Primary Button</Button>
            <Button variant="event-secondary">Secondary Button</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{settings.name || "EventWizz"} Theme</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p>
            <strong>Domain:</strong> {domain}
          </p>
          <p>
            <strong>User Type:</strong> {website_role}
          </p>
          <p>
            <strong>Colors:</strong>
          </p>
          <div className="flex gap-2">
            <div
              className="w-10 h-10 rounded border"
              style={{ backgroundColor: settings.colors?.primary }}
              title={`Primary: ${settings.colors?.primary}`}
            />
            <div
              className="w-10 h-10 rounded border"
              style={{ backgroundColor: settings.colors?.secondary }}
              title={`Secondary: ${settings.colors?.secondary}`}
            />
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="event-primary">Primary Button</Button>
            <Button variant="event-secondary">Secondary Button</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
