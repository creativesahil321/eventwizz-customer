/**
 * Cart Utility Functions
 * Centralized utility functions to reduce code duplication
 */

import { CART_CONSTANTS } from "../constants/cart.constants";

/**
 * Normalize slug for comparison (handles URL encoding)
 */
export const normalizeSlug = (slug: string): string => {
  return decodeURIComponent(slug).toLowerCase().trim();
};

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number): string => {
  return `£${amount.toFixed(2)}`;
};

/**
 * Calculate total (no fees)
 */
export const calculateTotal = (amount: number): number => {
  return amount;
};

/**
 * Validate quantity within limits
 */
export const validateQuantity = (quantity: number): boolean => {
  return (
    quantity >= CART_CONSTANTS.MIN_QUANTITY &&
    quantity <= CART_CONSTANTS.MAX_QUANTITY
  );
};

/**
 * Format date for display
 */
export const formatEventDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Check if item is out of stock
 */
export const isOutOfStock = (availableQuantity: number): boolean => {
  return availableQuantity === 0;
};

/**
 * Check if item is low stock
 */
export const isLowStock = (availableQuantity: number): boolean => {
  return availableQuantity > 0 && availableQuantity <= 5;
};

/**
 * Get stock status color class
 */
export const getStockStatusColor = (availableQuantity: number): string => {
  if (isOutOfStock(availableQuantity)) return "text-red-500";
  if (isLowStock(availableQuantity)) return "text-orange-500";
  return "text-gray-500";
};

/**
 * Generate unique key for cart items
 */
export const generateCartItemKey = (
  type: string,
  id: string | number,
  date: string
): string => {
  return `${type}-${id}-${date}`;
};

/**
 * Debounce function for API calls
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
