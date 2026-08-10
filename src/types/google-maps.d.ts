/// <reference types="google.maps" />

export {};

declare global {
  // Runtime Maps script attaches to `window.google`.
  interface Window {
    google: typeof google;
  }
}
