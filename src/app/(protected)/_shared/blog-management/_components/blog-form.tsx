"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Save, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/ui/file-uploader";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBlogStore } from "../_lib/blog-store";
import {
  blogFormSchema,
  type BlogFormValues,
  slugifyTitle,
} from "../_lib/schema";
import type { BlogPost } from "@/lib/blogs";
import { BlogCardPreview } from "./blog-card-preview";

interface BlogFormProps {
  mode: "create" | "edit";
  initialPost?: BlogPost;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function BlogForm({ mode, initialPost }: BlogFormProps) {
  const router = useRouter();
  const createPost = useBlogStore((s) => s.createPost);
  const updatePost = useBlogStore((s) => s.updatePost);

  const [coverFiles, setCoverFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const objectUrlRef = React.useRef<string | null>(null);

  const form = useForm<BlogFormValues>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: {
      title: initialPost?.title ?? "",
      excerpt: initialPost?.excerpt ?? "",
      content: initialPost?.content ?? "",
      cover_image: initialPost?.cover_image ?? "",
      status: initialPost?.status ?? "draft",
      published_at: initialPost?.published_at ?? todayIsoDate(),
      meta_title: initialPost?.meta_title ?? "",
      meta_description: initialPost?.meta_description ?? "",
      meta_keywords: initialPost?.meta_keywords ?? "",
    },
  });

  const watched = form.watch();
  const slugPreview = slugifyTitle(watched.title || "untitled-post");

  React.useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleCoverChange = async (files: File[]) => {
    setCoverFiles(files);
    const file = files[0];
    if (!file) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      form.setValue("cover_image", "", { shouldValidate: true });
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    form.setValue("cover_image", url, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleRemoveCover = () => {
    setCoverFiles([]);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    form.setValue("cover_image", "", {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const persist = async (
    values: BlogFormValues,
    nextStatus?: "draft" | "published",
  ) => {
    setIsSubmitting(true);
    try {
      const payload = {
        title: values.title,
        excerpt: values.excerpt,
        content: values.content,
        cover_image: values.cover_image,
        published_at: values.published_at,
        status: nextStatus ?? values.status,
        meta_title: values.meta_title ?? "",
        meta_description: values.meta_description ?? "",
        meta_keywords: values.meta_keywords ?? "",
      };

      if (mode === "edit" && initialPost) {
        const updated = updatePost(initialPost.id, payload);
        if (!updated) {
          toast.error("Post not found");
          return;
        }
        toast.success(
          payload.status === "published"
            ? "Blog post published"
            : "Blog post saved as draft",
        );
      } else {
        const created = createPost(payload);
        toast.success(
          payload.status === "published"
            ? "Blog post published"
            : "Draft created",
        );
        router.push(`/admin/blog-management/edit/${created.id}`);
        return;
      }

      router.push("/admin/blog-management");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = form.handleSubmit((values) => persist(values));

  const saveAsDraft = form.handleSubmit((values) =>
    persist({ ...values, status: "draft" }, "draft"),
  );

  const publish = form.handleSubmit((values) =>
    persist({ ...values, status: "published" }, "published"),
  );

  const coverImage = watched.cover_image;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <section className="rounded-lg border border-[var(--color-border)] bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-semibold text-foreground">
                Post details
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                These fields power the public “Latest News & Articles” cards.
                Section headings still come from Site Essentials.
              </p>

              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Article title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="How to Plan a Perfect Corporate Christmas Party"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        URL slug preview:{" "}
                        <span className="font-mono text-xs">
                          /blog/{slugPreview}
                        </span>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="published_at"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publication date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Short excerpt</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="A short summary shown on the news card (2–3 lines)."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length ?? 0}/280 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="rounded-lg border border-[var(--color-border)] bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-semibold text-foreground">
                Featured image
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Recommended 16:9 landscape (about 1200×675). Shown on the card
                grid and article header.
              </p>

              <FormField
                control={form.control}
                name="cover_image"
                render={() => (
                  <FormItem>
                    <FormControl>
                      {coverImage ? (
                        <div className="space-y-3">
                          <div className="relative h-52 w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-slate-50">
                            <Image
                              src={coverImage}
                              alt="Featured cover"
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 720px"
                              unoptimized={
                                coverImage.startsWith("blob:") ||
                                coverImage.startsWith("data:")
                              }
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCover}
                            className="text-sm text-red-500 underline"
                          >
                            Remove image
                          </button>
                        </div>
                      ) : (
                        <FileUploader
                          value={coverFiles}
                          onValueChange={(files) =>
                            void handleCoverChange(files)
                          }
                          maxFileCount={1}
                          maxSize={5 * 1024 * 1024}
                          accept={{
                            "image/png": [],
                            "image/jpeg": [],
                            "image/webp": [],
                          }}
                          onRemove={handleRemoveCover}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <section className="rounded-lg border border-[var(--color-border)] bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-semibold text-foreground">
                Article body
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Use headings, lists, links, and the image button to place
                pictures between paragraphs.
              </p>

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <TiptapEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Write your article content..."
                        enableRichBlocks
                        enableImages
                        showAIButton={false}
                        className="min-h-[280px]"
                        maxLength={50000}
                        maxWords={8000}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <section className="rounded-lg border border-[var(--color-border)] bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-semibold text-foreground">
                Meta management
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                SEO fields for search results and social previews. Leave blank
                to fall back to the article title and excerpt.
              </p>

              <div className="grid gap-5">
                <FormField
                  control={form.control}
                  name="meta_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            watched.title
                              ? `${watched.title} | EventWizz`
                              : "SEO title for browser tabs & Google"
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length ?? 0}/70 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="meta_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta description</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder={
                            watched.excerpt ||
                            "Short summary shown in search results"
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length ?? 0}/160 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="meta_keywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta keywords</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="event planning, venue tickets, christmas party"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Comma-separated keywords (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
              <h2 className="mb-1 text-sm font-semibold text-foreground">
                Card preview
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Live preview of how this post appears in the 3-column news grid.
              </p>
              <BlogCardPreview
                title={watched.title}
                excerpt={watched.excerpt}
                publishedAt={watched.published_at}
                coverImage={watched.cover_image}
              />
            </div>

            <div className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs text-muted-foreground">
                Demo mode — changes are saved in this browser only. API wiring
                comes next.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="event-primary"
                  disabled={isSubmitting}
                  className="w-full gap-2"
                  onClick={() => void publish()}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {mode === "edit" ? "Save & publish" : "Publish"}
                </Button>
                <Button
                  type="button"
                  variant="event-outline"
                  disabled={isSubmitting}
                  className="w-full gap-2"
                  onClick={() => void saveAsDraft()}
                >
                  <Save className="h-4 w-4" />
                  Save as draft
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSubmitting}
                  className="w-full"
                  onClick={() => router.push("/admin/blog-management")}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </Form>
  );
}
