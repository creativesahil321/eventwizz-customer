/**
 * Reusable Loading State Components
 * Centralized loading components to reduce duplication
 */

import { motion } from "framer-motion";
import { CART_ANIMATION_VARIANTS } from "@/lib/constants/cart.constants";
import { CART_CONSTANTS } from "@/lib/constants/cart.constants";

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner = ({
  message = CART_CONSTANTS.LOADING.CART_DATA,
  size = "md",
  className = "",
}: LoadingStateProps) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-16 w-16",
    lg: "h-32 w-32",
  };

  return (
    <motion.div
      className={`text-center py-12 ${className}`}
      {...CART_ANIMATION_VARIANTS.FADE_IN_UP}
    >
      <div
        className={`animate-spin rounded-full border-b-2 border-[var(--color-primary)] mx-auto mb-4 ${sizeClasses[size]}`}
      ></div>
      <h3 className="text-xl font-semibold text-gray-600 mb-2">{message}</h3>
      <p className="text-gray-500">Please wait while we process your request</p>
    </motion.div>
  );
};

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState = ({
  title = "Something went wrong",
  message = "There was an error processing your request",
  onRetry,
  className = "",
}: ErrorStateProps) => {
  return (
    <motion.div
      className={`text-center py-12 ${className}`}
      {...CART_ANIMATION_VARIANTS.FADE_IN_UP}
    >
      <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-red-600 text-2xl">⚠️</span>
      </div>
      <h3 className="text-xl font-semibold text-red-600 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white px-4 py-2 rounded-md"
        >
          Try Again
        </button>
      )}
    </motion.div>
  );
};

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  className?: string;
}

export const EmptyState = ({
  icon,
  title = "No items found",
  message = "There are no items to display",
  className = "",
}: EmptyStateProps) => {
  return (
    <motion.div
      className={`text-center py-12 ${className}`}
      {...CART_ANIMATION_VARIANTS.FADE_IN_UP}
    >
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-xl font-semibold text-gray-600 mb-2">{title}</h3>
      <p className="text-gray-500">{message}</p>
    </motion.div>
  );
};
