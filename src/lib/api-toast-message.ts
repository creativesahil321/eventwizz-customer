/** Backend placeholders such as `The step - 1 has been successfully saved.` */
export function humanizeApiToastMessage(message: string): string {
  const trimmed = message.trim();
  if (/^The step\s*-\s*\d+\s+has been successfully saved\.?$/i.test(trimmed)) {
    return "Saved";
  }
  return message;
}
