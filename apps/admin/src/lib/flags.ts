/**
 * Build-time visibility gate. Surfaces that are designed but not yet backed by
 * real data stay invisible in a release build so the shipped plugin never shows
 * a half-built screen (the WP.org "no coming-soon screens" rule). Flip to true
 * during development to see the in-progress surfaces (currently the Library and
 * the Dashboard Library row from the Phase 1 business-model work).
 */
export const SHOW_UPCOMING = false;
