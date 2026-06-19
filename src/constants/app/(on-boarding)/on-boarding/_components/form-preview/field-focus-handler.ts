import { useFormContext } from "../form-provider";
import { useEffect } from "react";

/**
 * A custom hook to handle field focusing and cleanup across all step components
 * @returns A focus handler function and cleanup effect
 */
export function useFieldFocusHandler() {
  const { setActiveField } = useFormContext();

  // Clear active field when component unmounts
  useEffect(() => {
    return () => {
      setActiveField(null);
    };
  }, [setActiveField]);

  // Function to track which field is being focused
  const handleFieldFocus = (fieldName: string) => {
    setActiveField(fieldName);
  };

  return {
    handleFieldFocus,
    clearActiveField: () => setActiveField(null),
  };
}
