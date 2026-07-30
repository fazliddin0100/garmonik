export const PHARMACY_CATEGORY_DEFS = [
  { id: "diabetes", label: "Qandli diabet dorilari" },
  { id: "blood_pressure", label: "Bosim dorilari" },
  { id: "pain", label: "Og'riq qoldiruvchilar" },
  { id: "infusions", label: "Infuziyalar" },
  { id: "emergency", label: "Shoshilinch yordam dorilari" },
  { id: "consumables", label: "Sarf materiallari" },
  { id: "thyroid", label: "Qalqonsimon bez dorilari" },
] as const;

export type PharmacyCategoryId = (typeof PHARMACY_CATEGORY_DEFS)[number]["id"];

export type PharmacyProduct = {
  id: string;
  barcode: string;
  rowNum: number;
  name: string;
  unit: string;
  group: string;
  type: string;
  packageCount: number;
  status: string;
  category: PharmacyCategoryId;
};

export const PHARMACY_STORAGE_KEY = "garmonik-pharmacy-products-v1";
