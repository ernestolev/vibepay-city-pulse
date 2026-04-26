/**
 * Main column: phone width on small screens; in `lg` desktop layout this becomes
 * full width of the flex main area (sidebar sits beside it).
 */
export const SHELL_INNER_MAX =
  "mx-auto w-full max-w-md md:max-w-2xl lg:mx-0 lg:max-w-none";

/** Caps content width on very wide monitors (desktop web app main pane). */
export const DESKTOP_CONTENT_MAX =
  "lg:mx-auto lg:w-full lg:max-w-6xl xl:max-w-7xl";

/** Fixed overlays (simulator backdrop, toasts) start after the `lg` sidebar (w-56). */
export const DESKTOP_MAIN_LEFT = "lg:left-56";
