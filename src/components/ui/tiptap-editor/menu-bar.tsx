import { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Unlink,
  Sparkles,
} from "lucide-react";
import { Button } from "../button";
import { Toggle } from "@/components/ui/toggle";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../dialog";
import { Input } from "../input";
import { cn } from "@/lib/utils";

interface MenuBarProps {
  editor: Editor | null;
  onAIGenerate?: () => Promise<void>;
  isGenerating?: boolean;
  className?: string;
}

export function MenuBar({
  editor,
  onAIGenerate,
  isGenerating,
  className,
}: MenuBarProps) {
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  if (!editor) {
    return null;
  }

  const setLink = () => {
    if (!linkUrl) return;

    // Add https:// if no protocol is specified
    const url = /^https?:\/\//.test(linkUrl) ? linkUrl : `https://${linkUrl}`;

    editor.chain().focus().setLink({ href: url }).run();
    setLinkUrl("");
    setIsLinkDialogOpen(false);
  };

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 p-1 border-b border-input bg-background",
        className
      )}
    >
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
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
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

      {onAIGenerate && (
        <>
          <div className="w-px h-full bg-border mx-1" />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAIGenerate}
            disabled={isGenerating}
            className="gap-1"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Suggest with AI"}
          </Button>
        </>
      )}
    </div>
  );
}
