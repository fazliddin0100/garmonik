import type { DepartmentGroup } from "./types";

function g(
  id: string,
  title: string,
  description: string,
  itemTitles: string[],
): DepartmentGroup {
  return {
    id,
    title,
    description,
    items: itemTitles.map((titleText, idx) => ({
      id: `${id}-sub-${idx + 1}`,
      title: titleText,
      note: "",
    })),
  };
}

/** Endokrinologiya klinikasi uchun boshlang‘ich bo‘limlar tuzilmasi */
export const INITIAL_DEPARTMENT_GROUPS: DepartmentGroup[] = [
  g("dep-grp-qabul", "Qabul (registratura)", "", [
    "Bemorlarni ro'yxatga olish",
    "Navbatni boshqarish",
    "Shifokor qabul xonalari",
  ]),
  g("dep-grp-kabinet", "Endokrinolog shifokorlar ishlaydigan kabinetlar", "", [
    "Konsultatsiya va ko‘rik uchun",
  ]),
  g("dep-grp-lab", "Laboratoriya", "", [
    "Qon tahlillari (gormonlar: insulin, TSH, T3, T4 va boshqalar)",
    "Biokimyoviy tekshiruvlar",
  ]),
  g("dep-grp-diag", "Diagnostika xonasi", "", [
    "UZI (ultratovush tekshiruvi, ayniqsa qalqonsimon bez uchun)",
    "EKG (zarurat bo‘lsa)",
    "Boshqa instrumental tekshiruvlar",
  ]),
  g("dep-grp-proc", "Protsedura xonasi", "", [
    "Qon olish",
    "Inyeksiya va tomchilatib davolash",
  ]),
  g("dep-grp-stat", "Statsionar bo‘lim (agar mavjud bo‘lsa)", "", [
    "Yotib davolanish uchun palatalar",
    "Og‘ir holatdagi bemorlar uchun",
  ]),
  g("dep-grp-day", "Kunduzgi statsionar (day care)", "", [
    "Qisqa muddatli davolanish (masalan, infuziya terapiyasi)",
  ]),
  g("dep-grp-nurse", "Hamshiralar posti", "", [
    "Bemorlarni kuzatish va xizmat ko‘rsatish",
  ]),
  g("dep-grp-pharm", "Dori vositalari xonasi / mini-apteka", "", [
    "Dori saqlash va tarqatish",
  ]),
  g("dep-grp-admin", "Ma’muriy bo‘lim", "", [
    "Boshqaruv, hujjatlar yuritish",
  ]),
];
