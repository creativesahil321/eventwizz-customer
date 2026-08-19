"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Crop, Save, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/ui/file-uploader";
import { CropDialog, type CroppedImage } from "@/components/ui/image-cropper";
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
import {
  useCreateAdminBlog,
  useUpdateAdminBlog,
} from "@/services/admin/blogs";
import {
  BLOG_EXCERPT_MAX,
  BLOG_FEATURED_IMAGE_ACCEPT,
  BLOG_FEATURED_IMAGE_MAX_BYTES,
  BLOG_META_DESCRIPTION_MAX,
  BLOG_META_TITLE_MAX,
  BLOG_TITLE_MAX,
  blogAdminPaths,
  slugifyTitle,
  type BlogPost,
  type BlogStatus,
} from "@/lib/blogs";
import {
  BLOG_FEATURED_IMAGE_CROP,
  BLOG_FEATURED_UPLOAD_HINT,
} from "@/lib/event-image-crop-presets";
import { shouldUseNextImageOptimization } from "@/lib/image-utils";
import {
  blogFormSchema,
  getBlogImageError,
  type BlogFormValues,
} from "../_lib/schema";
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
  const createBlog = useCreateAdminBlog();
  const updateBlog = useUpdateAdminBlog();

  const [coverFiles, setCoverFiles] = React.useState<File[]>([]);
  const [removedCover, setRemovedCover] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [cropSource, setCropSource] = React.useState<File | null>(null);
  const [isPreparingCrop, setIsPreparingCrop] = React.useState(false);
  const objectUrlRef = React.useRef<string | null>(null);

  const form = useForm<BlogFormValues>({
    resolver: zodResolver(blogFormSchema),
    shouldFocusError: true,
    defaultValues: {
      title: initialPost?.title ?? "",
      excerpt: initialPost?.excerpt ?? "",
      content: initialPost?.content ?? "",
      cover_image: initialPost?.cover_image ?? "",
      status: initialPost?.status ?? "draft",
      published_at: initialPost?.published_at ?? todayIsoDate(),
      meta_title: initialPost?.meta_title ?? "",
      meta_description: initialPost?.meta_description ?? "",
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

  const applyCoverFile = (file: File, previewUrl?: string) => {
    const imageError = getBlogImageError(file);
    if (imageError) {
      form.setError("cover_image", { type: "manual", message: imageError });
      return;
    }

    form.clearErrors("cover_image");
    setCoverFiles([file]);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const url = previewUrl ?? URL.createObjectURL(file);
    objectUrlRef.current = url;
    setRemovedCover(false);
    form.setValue("cover_image", url, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleCoverChange = async (files: File[]) => {
    const file = files[0];
    if (!file) {
      setCoverFiles([]);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setRemovedCover(Boolean(initialPost?.cover_image));
      form.setValue("cover_image", "", { shouldValidate: true });
      return;
    }

    applyCoverFile(file);
  };

  const handleRemoveCover = () => {
    setCoverFiles([]);
    setCropSource(null);
    setRemovedCover(true);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    form.setValue("cover_image", "", {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const openCropAdjuster = async () => {
    if (coverFiles[0]) {
      setCropSource(coverFiles[0]);
      return;
    }

    if (!coverImage) return;

    setIsPreparingCrop(true);
    try {
      const sourceUrl =
        coverImage.startsWith("blob:") || coverImage.startsWith("data:")
          ? coverImage
          : `/api/blog-media?url=${encodeURIComponent(coverImage)}`;
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error("Failed to load image");
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) {
        throw new Error("Not an image");
      }
      const extension = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
      setCropSource(
        new File([blob], `featured-image.${extension}`, {
          type: blob.type || "image/jpeg",
        }),
      );
    } catch {
      toast.error("Unable to adjust this image. Upload it again to crop.");
    } finally {
      setIsPreparingCrop(false);
    }
  };

  const handleCropComplete = (cropped: CroppedImage) => {
    applyCoverFile(cropped.file, cropped.previewUrl);
    setCropSource(null);
  };

  const persist = async (
    values: BlogFormValues,
    nextStatus: BlogStatus,
  ) => {
    const featuredImage = coverFiles[0] ?? null;
    if (featuredImage) {
      const imageError = getBlogImageError(featuredImage);
      if (imageError) {
        form.setError("cover_image", { type: "manual", message: imageError });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: values.title.trim(),
        excerpt: values.excerpt.trim(),
        content: values.content,
        published_at: values.published_at || undefined,
        status: nextStatus,
        meta_title: values.meta_title.trim(),
        meta_description: values.meta_description.trim(),
        featured_image: featuredImage,
        remove_featured_image: removedCover && !featuredImage,
      };

      if (mode === "edit" && initialPost) {
        await updateBlog.mutateAsync({
          slug: initialPost.slug,
          payload,
        });
        router.push(blogAdminPaths.list);
        return;
      }

      await createBlog.mutateAsync(payload);
      router.push(blogAdminPaths.list);
    } catch {
      // Error toast handled by Axios interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitWithStatus = (status: BlogStatus) => {
    form.setValue("status", status, { shouldDirty: true });
    void form.handleSubmit((values) => persist(values, status))();
  };

  const coverImage = watched.cover_image;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => persist(values, values.status))}
        className="space-y-4 pb-24 sm:space-y-6 xl:pb-0"
      >
        <div className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="order-2 space-y-4 sm:space-y-6 xl:order-1">
            <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm sm:p-6">
              <h2 className="mb-1 text-base font-semibold text-foreground sm:text-lg">
                Post details
              </h2>
              <p className="mb-4 text-sm text-muted-foreground sm:mb-5">
                These fields power the public “Latest News & Articles” cards.
                Section headings still come from Site Essentials.
              </p>

              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>
                        Article title{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter the article title"
                          maxLength={BLOG_TITLE_MAX}
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
                      <FormLabel>
                        Publication date{" "}
                        {watched.status === "published" ? (
                          <span className="text-destructive">*</span>
                        ) : null}
                      </FormLabel>
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
                      <FormLabel>
                        Status <span className="text-destructive">*</span>
                      </FormLabel>
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
                      <FormLabel>
                        Short excerpt{" "}
                        {watched.status === "published" ? (
                          <span className="text-destructive">*</span>
                        ) : null}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          maxLength={BLOG_EXCERPT_MAX}
                          placeholder="A short summary shown on the news card (2–3 lines)."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length ?? 0}/{BLOG_EXCERPT_MAX} characters.
                        Required to publish.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm sm:p-6">
              <h2 className="mb-1 text-base font-semibold text-foreground sm:text-lg">
                Featured image <span className="text-destructive">*</span>
              </h2>
              <p className="mb-4 text-sm text-muted-foreground sm:mb-5">
                {BLOG_FEATURED_UPLOAD_HINT} Required.
              </p>

              <FormField
                control={form.control}
                name="cover_image"
                render={() => (
                  <FormItem>
                    <FormControl>
                      {coverImage ? (
                        <div className="space-y-3">
                          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-slate-50">
                            <Image
                              src={coverImage}
                              alt="Featured cover"
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 720px"
                              unoptimized={
                                !shouldUseNextImageOptimization(coverImage)
                              }
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <button
                              type="button"
                              onClick={() => void openCropAdjuster()}
                              disabled={isPreparingCrop}
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] underline disabled:opacity-50"
                            >
                              {isPreparingCrop ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Crop className="h-3.5 w-3.5" />
                              )}
                              Adjust crop
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveCover}
                              className="text-sm text-red-500 underline"
                            >
                              Remove image
                            </button>
                          </div>
                        </div>
                      ) : (
                        <FileUploader
                          value={coverFiles}
                          onValueChange={(files) =>
                            void handleCoverChange(files)
                          }
                          maxFileCount={1}
                          maxSize={BLOG_FEATURED_IMAGE_MAX_BYTES}
                          accept={BLOG_FEATURED_IMAGE_ACCEPT}
                          onRemove={handleRemoveCover}
                          enableCropping
                          aspectRatio={BLOG_FEATURED_IMAGE_CROP.aspectRatio}
                          cropConfig={BLOG_FEATURED_IMAGE_CROP}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {cropSource ? (
                <CropDialog
                  image={cropSource}
                  config={BLOG_FEATURED_IMAGE_CROP}
                  onComplete={handleCropComplete}
                  onCancel={() => setCropSource(null)}
                />
              ) : null}
            </section>

            <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm sm:p-6">
              <h2 className="mb-1 text-base font-semibold text-foreground sm:text-lg">
                Article body{" "}
                {watched.status === "published" ? (
                  <span className="text-destructive">*</span>
                ) : null}
              </h2>
              <p className="mb-4 text-sm text-muted-foreground sm:mb-5">
                Use headings, lists, links, and the image button to place
                pictures between paragraphs. Required to publish.
              </p>

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <TiptapEditor
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        placeholder="Write your article content..."
                        enableRichBlocks
                        enableImages
                        showAIButton={false}
                        className="min-h-[220px] sm:min-h-[280px]"
                        maxLength={50000}
                        maxWords={8000}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm sm:p-6">
              <h2 className="mb-1 text-base font-semibold text-foreground sm:text-lg">
                Meta management
              </h2>
              <p className="mb-4 text-sm text-muted-foreground sm:mb-5">
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
                          maxLength={BLOG_META_TITLE_MAX}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length ?? 0}/{BLOG_META_TITLE_MAX}{" "}
                        characters
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
                          maxLength={BLOG_META_DESCRIPTION_MAX}
                          placeholder={
                            watched.excerpt ||
                            "Short summary shown in search results"
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length ?? 0}/{BLOG_META_DESCRIPTION_MAX}{" "}
                        characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>
          </div>

          <aside className="order-1 space-y-4 xl:order-2 xl:sticky xl:top-24 xl:self-start">
            <div className="hidden rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm sm:block">
              <h2 className="mb-1 text-sm font-semibold text-foreground">
                Card preview
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Live preview of how this post appears in the 3-column news grid.
              </p>
              <BlogCardPreview
                title={watched.title}
                excerpt={watched.excerpt ?? ""}
                publishedAt={watched.published_at}
                coverImage={watched.cover_image ?? ""}
              />
            </div>

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-white/95 p-3 backdrop-blur sm:static sm:z-auto sm:rounded-lg sm:border sm:bg-white sm:p-4 sm:shadow-sm sm:backdrop-blur-none">
              <p className="mb-2 hidden text-xs text-muted-foreground sm:mb-3 sm:block">
                Featured image, excerpt, and meta appear on the public news
                cards and article SEO.
              </p>
              <div className="flex gap-2 sm:flex-col">
                <Button
                  type="button"
                  variant="event-primary"
                  disabled={isSubmitting}
                  className="h-10 flex-1 gap-2 sm:w-full"
                  onClick={() => submitWithStatus("published")}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="sm:hidden">Publish</span>
                  <span className="hidden sm:inline">
                    {mode === "edit" ? "Save & publish" : "Publish"}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="event-outline"
                  disabled={isSubmitting}
                  className="h-10 flex-1 gap-2 sm:w-full"
                  onClick={() => submitWithStatus("draft")}
                >
                  <Save className="h-4 w-4" />
                  <span className="sm:hidden">Draft</span>
                  <span className="hidden sm:inline">Save as draft</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSubmitting}
                  className="hidden h-10 w-full sm:flex"
                  onClick={() => router.push(blogAdminPaths.list)}
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
