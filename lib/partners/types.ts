export type Partner = {
  id: string;
  name: string;
  stir: string;
  contact: string;
  status: string;
};

export type PartnerSortKey = "id" | "name" | "stir" | "contact" | "status";

export const PARTNERS_STORAGE_KEY = "garmonik-partners-v1";
