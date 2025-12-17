import { Editor, Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface AISuggestionOptions {
  generateContent: (context: {
    title?: string;
    content?: string;
  }) => Promise<string>;
  char?: string;
  startOfLine?: boolean;
}

export const AISuggestion = Extension.create<AISuggestionOptions>({
  name: "ai-suggestion",

  addOptions() {
    return {
      generateContent: async () => "",
      char: "/",
      startOfLine: true,
    };
  },

  addProseMirrorPlugins() {
    const plugin = new Plugin({
      key: new PluginKey("ai-suggestion"),
      props: {
        handleClick: (view) => {
          const { state } = view;
          const { selection } = state;
          const { empty } = selection;

          if (!empty) {
            return false;
          }

          return false;
        },
      },
    });

    return [plugin];
  },

  addCommands() {
    return {
      generateAIContent:
        () =>
        async ({ editor }: { editor: Editor }) => {
          try {
            // Show loading state
            editor.setEditable(false);
            const content = editor.getHTML();
            const title = editor.getText().split("\n")[0]; // First line as title

            const generatedContent = await this.options.generateContent({
              title,
              content,
            });

            if (generatedContent) {
              editor.commands.setContent(generatedContent);
              return true;
            }

            return false;
          } catch (error) {
            console.error("Error generating AI content:", error);
            return false;
          } finally {
            editor.setEditable(true);
          }
        },
    };
  },
});
