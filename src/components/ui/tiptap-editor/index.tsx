import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { MenuBar } from "./menu-bar";
import { AISuggestion } from "./ai-suggestion";
import { toast } from "sonner";

export interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  maxWords?: number;
  aiEndpoint?: string;
  aiContext?: {
    title?: string;
    ctaText?: string;
    ctaUrl?: string;
  };
  showAIButton?: boolean;
  wrapText?: boolean;
}

export function TiptapEditor({
  value,
  onChange,
  placeholder = "Write something...",
  className,
  maxLength = 340,
  maxWords = 50,
  aiEndpoint = "/api/ai/summary",
  aiContext,
  showAIButton = true,
  wrapText = false,
}: TiptapEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAIGenerate = async () => {
    try {
      setIsGenerating(true);
      const response = await fetch(aiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: aiContext?.title,
          currentDescription: editor?.getHTML(),
          ctaText: aiContext?.ctaText,
          ctaUrl: aiContext?.ctaUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate content");
      }

      const data = await response.json();
      if (data.summary) {
        editor?.commands.setContent(data.summary);
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
      AISuggestion.configure({
        generateContent: async ({ title, content }) => {
          const response = await fetch(aiEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: title || aiContext?.title,
              currentDescription: content,
              ctaText: aiContext?.ctaText,
              ctaUrl: aiContext?.ctaUrl,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to generate content");
          }

          const data = await response.json();
          return data.summary || "";
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[120px] w-full rounded-none bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          wrapText && "whitespace-normal break-words",
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

  const characterCount = editor?.getText().length ?? 0;
  const wordCount = editor?.getText().split(/\s+/).filter(Boolean).length ?? 0;

  return (
    <div className="relative w-full">
      <div className="min-h-[120px] w-full rounded-md border border-input bg-background overflow-hidden">
        <MenuBar
          editor={editor}
          onAIGenerate={showAIButton ? handleAIGenerate : undefined}
          isGenerating={isGenerating}
        />
        <EditorContent editor={editor} className="px-3 py-2" />
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
