"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { cn } from "@/lib/utils";
import React, { useState } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Unlink,
  Sparkles,
} from "lucide-react";
import { Button } from "./button";
import { Toggle } from "./toggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Input } from "./input";
import { toast } from "sonner";

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  maxWords?: number;
  aiContext?: {
    title?: string;
    sub_title?: string;
    description?: string;
    ctaText?: string;
    ctaUrl?: string;
    event_name?: string;
    event_category_name?: string;
    banner_heading?: string;
    banner_sub_heading?: string;
  };
  showAIButton?: boolean;
  wrapText?: boolean;
  /** When true, the editor is view-only (no toolbar, no edits). */
  readOnly?: boolean;
}

export function TiptapEditor({
  value,
  onChange,
  placeholder = "Write something...",
  className,
  maxLength = 340,
  maxWords = 50,
  aiContext,
  showAIButton = true,
  wrapText = false,
  readOnly = false,
}: TiptapEditorProps) {
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount.configure({
        limit: maxLength,
      }),
      TextAlign.configure({
        types: ["paragraph"],
        alignments: ["left", "center", "right"],
      }),
      Underline,
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class:
            "text-[var(--color-primary)] underline hover:text-[var(--color-primary-hover)]",
          target: "_blank",
          rel: "noopener noreferrer",
        },
        validate: (href) => /^https?:\/\//.test(href),
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html); // Ensure onChange is called on updates
    },
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[120px] w-full rounded-none bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 overflow-x-hidden max-w-full",
          wrapText && "whitespace-normal break-all",
          className
        ),
      },
    },
  });

  // Update editor content when value prop changes
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  React.useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  const setLink = () => {
    if (!linkUrl) return;

    // Add https:// if no protocol is specified
    const url = /^https?:\/\//.test(linkUrl) ? linkUrl : `https://${linkUrl}`;

    editor?.chain().focus().setLink({ href: url }).run();
    setLinkUrl("");
    setIsLinkDialogOpen(false);
  };

  const handleAIGenerate = async () => {
    if (!editor) return;

    try {
      setIsGenerating(true);
      const response = await fetch("/api/ai/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: aiContext?.title,
          currentDescription: editor.getHTML(),
          sub_title: aiContext?.sub_title,
          ctaText: aiContext?.ctaText,
          ctaUrl: aiContext?.ctaUrl,
          description: aiContext?.description,
          event_name: aiContext?.event_name,
          event_category_name: aiContext?.event_category_name,
          banner_heading: aiContext?.banner_heading,
          banner_sub_heading: aiContext?.banner_sub_heading,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate content");
      }

      const data = await response.json();
      if (data.summary) {
        editor.commands.setContent(data.summary); // Update editor content
        onChange(data.summary); // Explicitly call onChange to sync with parent
        toast.success("Content generated successfully!");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate content"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const characterCount = editor?.getText().length ?? 0;
  const wordCount = editor?.getText().split(/\s+/).filter(Boolean).length ?? 0;

  if (!editor) {
    return null;
  }

  return (
    <div className="relative w-full">
      <div className="min-h-[120px] w-full rounded-md border border-input bg-background overflow-hidden">
        {!readOnly && (
        <div className="flex flex-wrap gap-1 p-1 border-b border-input bg-background">
          <Toggle
            size="sm"
            pressed={editor.isActive("bold")}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("italic")}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("underline")}
            onPressedChange={() =>
              editor.chain().focus().toggleUnderline().run()
            }
          >
            <UnderlineIcon className="h-4 w-4" />
          </Toggle>

          <div className="w-px h-full bg-border mx-1" />

          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: "left" })}
            onPressedChange={() =>
              editor.chain().focus().setTextAlign("left").run()
            }
          >
            <AlignLeft className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: "center" })}
            onPressedChange={() =>
              editor.chain().focus().setTextAlign("center").run()
            }
          >
            <AlignCenter className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: "right" })}
            onPressedChange={() =>
              editor.chain().focus().setTextAlign("right").run()
            }
          >
            <AlignRight className="h-4 w-4" />
          </Toggle>

          <div className="w-px h-full bg-border mx-1" />

          <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
            <DialogTrigger asChild>
              <Toggle size="sm" pressed={editor.isActive("link")}>
                <LinkIcon className="h-4 w-4" />
              </Toggle>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-black">Add Link</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="Enter URL"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setLink();
                    }
                  }}
                />
                <Button variant="event-primary" onClick={setLink}>
                  Add
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {editor.isActive("link") && (
            <Toggle
              size="sm"
              pressed={false}
              onPressedChange={() => editor.chain().focus().unsetLink().run()}
            >
              <Unlink className="h-4 w-4" />
            </Toggle>
          )}

          <div className="w-px h-full bg-border mx-1" />
          {showAIButton && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAIGenerate}
              disabled={isGenerating || !aiContext?.title}
              className="gap-1"
            >
              <Sparkles className="h-4 w-4" />
              {isGenerating ? "Generating..." : "Suggest with AI"}
            </Button>
          )}
        </div>
        )}
        <EditorContent
          editor={editor}
          className="px-3 py-2 overflow-x-hidden max-w-full"
        />
      </div>
      <div className="text-xs text-muted-foreground mt-2 flex justify-between">
        <span className={characterCount > maxLength ? "text-destructive" : ""}>
          {characterCount}/{maxLength} characters
        </span>
        <span className={wordCount > maxWords ? "text-destructive" : ""}>
          {wordCount}/{maxWords} words
        </span>
      </div>
    </div>
  );
}
