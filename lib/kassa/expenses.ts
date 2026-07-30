export const OTHER_EXPENSE_CATEGORY = "Boshqa";

export function getExpenseCategoryLabel(expense: {
  category: string;
  categoryDetail?: string | null;
}) {
  if (expense.category === OTHER_EXPENSE_CATEGORY && expense.categoryDetail) {
    return `${expense.category}: ${expense.categoryDetail}`;
  }
  return expense.category;
}

export const EXPENSE_CATEGORIES = [
  "Kommunal xarajatlar",
  "Xodimlar oylik maoshi",
  "Oylik maosh",
  "Tibbiy asbob-uskunalar",
  "Diagnostika",
  "Dori-darmonlar",
  "Ijara",
  "Arenda",
  "Oziq-ovqat",
  "Maishiy ehtiyojlar",
  "Shaxsiy xarajatlar",
  "Ta'mirlash",
  "Marketing",
  OTHER_EXPENSE_CATEGORY,
] as const;
