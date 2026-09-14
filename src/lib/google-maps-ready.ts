export type GoogleMapsLoadAction = "init" | "wait-script" | "inject";

/**
 * Address search often injects Maps without `data-loaded`. If we only listen
 * for `load` after that event already fired, the map stays blank forever.
 */
export function resolveGoogleMapsLoadAction(input: {
  hasMapsApi: boolean;
  scriptExists: boolean;
  scriptMarkedLoaded: boolean;
}): GoogleMapsLoadAction {
  if (input.hasMapsApi || input.scriptMarkedLoaded) return "init";
  if (input.scriptExists) return "wait-script";
  return "inject";
}

export function isGoogleMapsApiReady(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      window.google?.maps &&
      typeof window.google.maps.Map === "function",
  );
}
