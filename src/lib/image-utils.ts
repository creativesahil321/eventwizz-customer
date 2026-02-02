/**
 * Utilities for handling user-uploaded images with cache busting
 */

/**
 * Adds cache busting query parameter to image URL
 * @param url - The image URL
 * @param updated_at - Optional timestamp (ISO string or number) to use for versioning
 * @returns URL with cache busting parameter
 */
export function addCacheBusting(url: string | null | undefined, updated_at?: string | number | null): string {
  if (!url) return "";
  
  try {
    // If URL is a data URL or blob, return as-is (local preview)
    if (url.startsWith("data:") || url.startsWith("blob:")) {
      return url;
    }
    
    // Parse URL to check if it already has query params
    const urlObj = new URL(url, window.location.origin);
    
    // Determine cache busting value
    let cacheValue: string;
    if (updated_at) {
      // Use updated_at timestamp if available
      cacheValue = typeof updated_at === 'number' 
        ? updated_at.toString() 
        : new Date(updated_at).getTime().toString();
    } else {
      // Fallback to current timestamp
      cacheValue = Date.now().toString();
    }
    
    // Add or update the version parameter
    urlObj.searchParams.set('v', cacheValue);
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, append query param manually
    const separator = url.includes('?') ? '&' : '?';
    const cacheValue = updated_at 
      ? (typeof updated_at === 'number' ? updated_at : new Date(updated_at).getTime())
      : Date.now();
    return `${url}${separator}v=${cacheValue}`;
  }
}

/**
 * Gets cache busted URL for user-uploaded images
 * For SSR/SSG contexts where window is not available
 */
export function addCacheBustingSSR(url: string | null | undefined, updated_at?: string | number | null): string {
  if (!url) return "";
  
  // If URL is a data URL or blob, return as-is
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  
  // Determine cache busting value
  let cacheValue: string;
  if (updated_at) {
    cacheValue = typeof updated_at === 'number' 
      ? updated_at.toString() 
      : new Date(updated_at).getTime().toString();
  } else {
    cacheValue = Date.now().toString();
  }
  
  // Simple query param append
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${cacheValue}`;
}
