"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input value to allow uploading the same file again
    event.target.value = "";

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreview(result);

      // In a real implementation, you would upload to server here
      // For now, we'll just use the base64 data URL
      setIsLoading(true);
      setTimeout(() => {
        // Simulate server upload
        onChange(result);
        setIsLoading(false);
      }, 1000);
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onRemove();
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className="relative flex items-center justify-center border-2 border-dashed rounded-md p-4 h-40"
        style={{ borderColor: preview ? "transparent" : undefined }}
      >
        {preview ? (
          <div className="relative w-full h-full">
            <img
              src={preview}
              alt="Uploaded image"
              className="absolute inset-0 w-full h-full object-contain rounded-md"
            />
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || isLoading}
              className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1 shadow-sm hover:bg-destructive/90"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Upload size={24} />
            <p className="text-sm">Drag & drop or click to upload</p>
          </div>
        )}
        {!preview && (
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleUpload}
            disabled={disabled || isLoading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        )}
      </div>

      {!preview && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            document
              .querySelector<HTMLInputElement>('input[type="file"]')
              ?.click()
          }
          disabled={disabled || isLoading}
          className="w-full"
        >
          {isLoading ? "Uploading..." : "Select Image"}
        </Button>
      )}
    </div>
  );
}
