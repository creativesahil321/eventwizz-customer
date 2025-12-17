"use client";

import { useDomain } from "@/providers/domain-provider/domain-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Phone,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
} from "lucide-react";

export const ThemeTester = () => {
  const { settings, domain, website_role, isLoading, isDomainRequest } =
    useDomain();

  if (isLoading) {
    return (
      <div className="animate-pulse p-6 bg-muted rounded-lg">
        Loading theme settings...
      </div>
    );
  }

  if (!isDomainRequest || !settings) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Default Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No domain-specific theme detected.</p>
          <p className="text-xs text-muted-foreground mt-2">
            Using default EventWizz theme.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{settings.name || "EventWizz"} Theme</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <Badge variant="outline">Domain: {domain}</Badge>
          {website_role && (
            <Badge variant="outline">Role: {website_role}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="colors">
          <TabsList className="mb-4">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="typography">Typography</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="contact">Contact Details</TabsTrigger>
          </TabsList>

          <TabsContent value="colors">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <ColorSwatch name="Primary" color={settings.colors?.primary} />
              <ColorSwatch
                name="Secondary"
                color={settings.colors?.secondary}
              />
              <ColorSwatch
                name="Background"
                color={settings.colors?.background}
              />
              <ColorSwatch name="Surface" color={settings.colors?.surface} />
              <ColorSwatch name="Text" color={settings.colors?.text} />
              <ColorSwatch
                name="Text Dimmed"
                color={settings.colors?.textDimmed}
              />
            </div>
          </TabsContent>

          <TabsContent value="typography">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium mb-2">Font Families</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-md">
                    <div className="text-sm text-muted-foreground mb-2">
                      Heading Font
                    </div>
                    <div className="font-heading text-2xl">Aa Bb Cc 123</div>
                    <div className="text-sm mt-1 text-muted-foreground">
                      {settings.typography?.fontFamily?.heading || "Default"}
                    </div>
                  </div>
                  <div className="p-4 border rounded-md">
                    <div className="text-sm text-muted-foreground mb-2">
                      Body Font
                    </div>
                    <div className="font-sans text-base">Aa Bb Cc 123</div>
                    <div className="text-sm mt-1 text-muted-foreground">
                      {settings.typography?.fontFamily?.body || "Default"}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-medium mb-2">
                  Typography Examples
                </h2>
                <div className="space-y-4">
                  <div>
                    <h1 className="text-4xl font-heading font-bold">
                      Heading 1
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      font-heading, text-4xl, font-bold
                    </p>
                  </div>
                  <div>
                    <h2 className="text-3xl font-heading font-semibold">
                      Heading 2
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      font-heading, text-3xl, font-semibold
                    </p>
                  </div>
                  <div>
                    <h3 className="text-2xl font-heading font-medium">
                      Heading 3
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      font-heading, text-2xl, font-medium
                    </p>
                  </div>
                  <div>
                    <p className="text-base font-sans">
                      This is a paragraph of text that demonstrates the body
                      font. The font family is set to use the custom body font
                      if provided in the theme, or fall back to the default
                      sans-serif font.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      font-sans, text-base
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="components">
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-medium mb-2">Buttons</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Hover over buttons to see scaling, color transitions, and
                  other interactive effects.
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  <Button variant="event-primary">Primary</Button>
                  <Button variant="event-secondary">Secondary</Button>
                  <Button variant="event-outline">Outline</Button>
                  <Button variant="event-ghost">Ghost</Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="p-4 border rounded-md">
                    <div className="text-sm text-muted-foreground mb-2">
                      Primary Button
                    </div>
                    <Button variant="event-primary" className="w-full">
                      Hover Me
                    </Button>
                    <div className="text-xs mt-2 text-muted-foreground">
                      Scale + Color Change
                    </div>
                  </div>
                  <div className="p-4 border rounded-md">
                    <div className="text-sm text-muted-foreground mb-2">
                      Secondary Button
                    </div>
                    <Button variant="event-secondary" className="w-full">
                      Hover Me
                    </Button>
                    <div className="text-xs mt-2 text-muted-foreground">
                      Scale + Color Change
                    </div>
                  </div>
                  <div className="p-4 border rounded-md">
                    <div className="text-sm text-muted-foreground mb-2">
                      Outline Button
                    </div>
                    <Button variant="event-outline" className="w-full">
                      Hover Me
                    </Button>
                    <div className="text-xs mt-2 text-muted-foreground">
                      Scale + Background Change
                    </div>
                  </div>
                  <div className="p-4 border rounded-md">
                    <div className="text-sm text-muted-foreground mb-2">
                      Ghost Button
                    </div>
                    <Button variant="event-ghost" className="w-full">
                      Hover Me
                    </Button>
                    <div className="text-xs mt-2 text-muted-foreground">
                      Underline + Color Change
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-medium mb-2">Cards</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Card Title</CardTitle>
                    </CardHeader>
                    <CardContent>
                      This card demonstrates the themed card component.
                    </CardContent>
                  </Card>
                  <Card className="bg-surface border-primary/20">
                    <CardHeader>
                      <CardTitle>Surface Card</CardTitle>
                    </CardHeader>
                    <CardContent>
                      This card uses the surface color as background.
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-medium mb-2">Badges</h2>
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contact">
            <div className="space-y-6">
              {settings.contactDetails && (
                <>
                  <div>
                    <h2 className="text-lg font-medium mb-3">
                      Contact Information
                    </h2>
                    <div className="space-y-2">
                      {settings.contactDetails.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-primary" />
                          <span>{settings.contactDetails.email}</span>
                        </div>
                      )}
                      {settings.contactDetails.alternativeEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-primary" />
                          <span>
                            {settings.contactDetails.alternativeEmail}
                          </span>
                        </div>
                      )}
                      {settings.contactDetails.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-primary" />
                          <span>{settings.contactDetails.phoneNumber}</span>
                        </div>
                      )}
                      {settings.contactDetails.alternativePhoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-primary" />
                          <span>
                            {settings.contactDetails.alternativePhoneNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {settings.contactDetails.socialMedia &&
                    Object.keys(settings.contactDetails.socialMedia).length >
                      0 && (
                      <div>
                        <h2 className="text-lg font-medium mb-3">
                          Social Media
                        </h2>
                        <div className="flex gap-4">
                          {settings.contactDetails.socialMedia.facebook && (
                            <a
                              href={
                                settings.contactDetails.socialMedia.facebook
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:text-primary/80"
                            >
                              <Facebook className="w-5 h-5" />
                            </a>
                          )}
                          {settings.contactDetails.socialMedia.twitter && (
                            <a
                              href={settings.contactDetails.socialMedia.twitter}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:text-primary/80"
                            >
                              <Twitter className="w-5 h-5" />
                            </a>
                          )}
                          {settings.contactDetails.socialMedia.instagram && (
                            <a
                              href={
                                settings.contactDetails.socialMedia.instagram
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:text-primary/80"
                            >
                              <Instagram className="w-5 h-5" />
                            </a>
                          )}
                          {settings.contactDetails.socialMedia.linkedin && (
                            <a
                              href={
                                settings.contactDetails.socialMedia.linkedin
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:text-primary/80"
                            >
                              <Linkedin className="w-5 h-5" />
                            </a>
                          )}
                          {settings.contactDetails.socialMedia.youtube && (
                            <a
                              href={settings.contactDetails.socialMedia.youtube}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:text-primary/80"
                            >
                              <Youtube className="w-5 h-5" />
                            </a>
                          )}

                          {/* Handle other social platforms */}
                          {Object.entries(settings.contactDetails.socialMedia)
                            .filter(
                              ([key]) =>
                                ![
                                  "facebook",
                                  "twitter",
                                  "instagram",
                                  "linkedin",
                                  "youtube",
                                ].includes(key)
                            )
                            .map(([platform, url]) => (
                              <a
                                key={platform}
                                href={url as string}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:text-primary/80 flex items-center justify-center w-5 h-5 rounded-full border border-current"
                                title={
                                  platform.charAt(0).toUpperCase() +
                                  platform.slice(1)
                                }
                              >
                                {platform.charAt(0).toUpperCase()}
                              </a>
                            ))}
                        </div>
                      </div>
                    )}
                </>
              )}

              {(!settings.contactDetails ||
                (!settings.contactDetails.email &&
                  !settings.contactDetails.alternativeEmail &&
                  !settings.contactDetails.phoneNumber &&
                  !settings.contactDetails.alternativePhoneNumber &&
                  (!settings.contactDetails.socialMedia ||
                    Object.keys(settings.contactDetails.socialMedia).length ===
                      0))) && (
                <div className="p-4 bg-muted rounded-md text-muted-foreground">
                  No contact details provided in theme settings.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const ColorSwatch = ({ name, color }: { name: string; color?: string }) => {
  if (!color) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 rounded border border-dashed border-muted-foreground flex items-center justify-center text-muted-foreground text-xs">
          Not Set
        </div>
        <span className="mt-2 text-sm">{name}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className="w-16 h-16 rounded border"
        style={{ backgroundColor: color }}
      />
      <span className="mt-2 text-sm">{name}</span>
      <span className="text-xs text-muted-foreground">{color}</span>
    </div>
  );
};
