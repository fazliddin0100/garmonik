export const PLATFORM_LABELS: Record<string, string> = {
  CASH: "Naqt pul",
  HUMO: "Humo",
  VISA: "Visa",
  UZCARD: "UzCard",
  TERMINAL: "Terminal",
  CLICK: "Click",
  PAYME: "Payme",
  CUSTOM: "Boshqa",
};

export const PERIOD_OPTIONS = [
  { value: "day", label: "Kunlik" },
  { value: "month", label: "Oylik" },
  { value: "half_year", label: "Yarim yillik" },
  { value: "year", label: "Yillik" },
] as const;
