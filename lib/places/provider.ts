import "server-only";

// The single place that picks which address-autocomplete provider is
// active. Everything else imports from here, never from a specific
// provider module — so switching providers (e.g. to Photon, per
// CLAUDE.md's fallback plan if Geoapify ever asks for a card) means
// changing this one export.
export { searchAddresses, reverseGeocode } from "@/lib/places/geoapify";
