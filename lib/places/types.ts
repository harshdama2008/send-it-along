export type AddressSuggestion = {
  formattedAddress: string;
  lat: number;
  lng: number;
};

// The contract every provider (Geoapify, Photon, ...) must satisfy, so the
// route handler and callers never need to know which one is active.
export type SearchAddresses = (query: string) => Promise<AddressSuggestion[]>;
export type ReverseGeocode = (lat: number, lng: number) => Promise<AddressSuggestion | null>;
