import type { PatientRow } from "./types";
import { SERVICE_PRICE_ROWS, servicePriceKey } from "@/lib/services/pricing-data";

const PAID_OR_LAB_POOL = SERVICE_PRICE_ROWS.filter(
  (r) => r.group === "pullik-xizmat" || r.group === "laboratoriya",
);

function previousPaidKeysForIndex(i: number): string[] | undefined {
  if (i % 4 === 0) return undefined;
  const pick = (j: number) => servicePriceKey(PAID_OR_LAB_POOL[j % PAID_OR_LAB_POOL.length]);
  const keys = [pick(i * 7), pick(i * 7 + 3)];
  if (i % 4 !== 1) keys.push(pick(i * 7 + 11));
  return [...new Set(keys)];
}

/** Klinika (endokrinologiya) bo‘yicha namunaviy kasallik turlari — ro‘yxat indeksiga qarab tanlanadi */
const DISEASE_TYPES = [
  "Diabet mellitus 2 turi",
  "Tireotoksikoz (Graves)",
  "Gipotireoz",
  "Hashimoto tireoiditi",
  "Polikistik over sindromi (PCOS)",
  "Semirish (obesitet)",
  "Osteoporoz",
  "Metabolik sindrom / gipertoniya",
  "Diabetik nevropatiya",
  "Bolalar endokrinologiyasi",
  "Profilaktik tekshiruv",
];

function p(
  id: string,
  fullName: string,
  gender: string,
  birthDate: string,
  address: string,
  documentNumber: string,
  country: string,
  region: string,
  district: string,
  contact: string,
  diseaseType: string,
  jshshir = "",
  previousPaidServiceKeys?: string[],
): PatientRow {
  return {
    id,
    fullName,
    gender,
    birthDate,
    diseaseType,
    address,
    documentType: "Паспорт Узбекистана",
    documentNumber,
    jshshir,
    country,
    region,
    district,
    contact,
    population: "Да",
    ...(previousPaidServiceKeys && previousPaidServiceKeys.length > 0
      ? { previousPaidServiceKeys }
      : {}),
  };
}

const RAW = [
  ["12625223", "Ortiqova Gulnoza Toymurodovna", "Женский", "24.05.1993", "", "", "УЗБЕКИСТАН", "Бухарская", "г. Каган", "88 219-23-33"],
  ["12625045", "Xayitova Maxsuda Abdullayevna", "Женский", "01.01.2018", "GALA OSIYO", "AB7513438", "УЗБЕКИСТАН", "Бухарская", "Бухарский", "88 181-04-81"],
  ["12625025", "Murtazayeva Zaynab Atoyevna", "Женский", "27.03.1970", "HALILI", "FA7647826", "УЗБЕКИСТАН", "Бухарская", "Жандарский", "93 470-98-81"],
  ["12624913", "Haydarova Feruza Ravshanovna", "Женский", "07.08.1988", "SARMIJON", "AD6648487", "УЗБЕКИСТАН", "Бухарская", "Гиждуванский", "91 412-35-56"],
  ["12624832", "Astanova Dildora Davronjonovna", "Женский", "30.10.1991", "TOKIMACHI BOZOR", "AB5430107", "УЗБЕКИСТАН", "Бухарская", "г. Бухара", "91 411-35-29"],
  ["12624540", "Rajabova Gulbaxor Boltayevna", "Женский", "21.04.1974", "geofizika", "", "УЗБЕКИСТАН", "Бухарская", "г. Каган", "91 400-33-16"],
  ["12623491", "Babajov Baxrom Yusupovich", "Мужской", "11.06.1964", "SHUHRAT 10-UY", "AE2447765", "УЗБЕКИСТАН", "Республика Каракалпакстан", "Берунийский", "97 569-30-40"],
  ["12622549", "Haydarova Sharora Sharof qizi", "Женский", "05.04.2006", "YANGI HAYOT 5 UY", "AD1559141", "УЗБЕКИСТАН", "Бухарская", "г. Каган", "97 864-07-70"],
  ["12622442", "Muhiddinova Charos Jamshid qizi", "Женский", "09.05.2010", "SHARQ 243", "", "УЗБЕКИСТАН", "Бухарская", "Гиждуванский", "90 513-73-93"],
  ["12622306", "Holiqov Sohib Sultonovich", "Мужской", "03.04.1977", "tog 2/4", "AD9586444", "УЗБЕКИСТАН", "Навоийская", "Учкудукский", "93 319-77-57"],
  ["12622079", "Xafizova Umida Zoirovna", "Женский", "19.09.1988", "OBID UBAYDOV 63", "", "УЗБЕКИСТАН", "Бухарская", "Бухарский", "97 300-02-33"],
  ["12621935", "Hamroyeva Umida Hotam qizi", "Женский", "05.10.1998", "Mustaqillik ko'chasi", "", "УЗБЕКИСТАН", "Бухарская", "г. Бухара", "33 321-14-18"],
  ["12621714", "Roziyeva Olima Amrullayevna", "Женский", "15.02.1962", "olinxoja 73/1", "", "УЗБЕКИСТАН", "Бухарская", "г. Бухара", "33 321-14-18"],
  ["12621246", "Artikova Mohira Rashidovna", "Женский", "30.05.1969", "ESKI SHAHAR", "AD3143405", "УЗБЕКИСТАН", "Бухарская", "г. Бухара", "90 299-49-00"],
  ["12621184", "Mamajonov Karimberdi Nazirjonovich", "Мужской", "14.12.1961", "", "AD7064596", "УЗБЕКИСТАН", "Андижанская", "Шахриханский", "773831781"],
  ["12620577", "Nematova Flora Baxtiyor kizi", "Женский", "19.05.1997", "JOME 8/3", "AE1271825", "УЗБЕКИСТАН", "Бухарская", "г. Бухара", "91 977-75-77"],
  ["12620561", "Baybutayev Umidjon Shavkatovich", "Мужской", "18.02.1983", "PIRIDASKIR", "AD2300771", "УЗБЕКИСТАН", "Бухарская", "г. Бухара", "90 710-70-00"],
  ["12620252", "Ochilova Manzura Nurulloyevna", "Женский", "25.06.1953", "A.somiy 4/9 a Kv 8", "", "УЗБЕКИСТАН", "Бухарская", "г. Бухара", "91 977-54-00"],
  ["12620082", "Rashidova Roziya Hikmatovna", "Женский", "10.03.1954", "6-MIKRAYON", "", "УЗБЕКИСТАН", "Бухарская", "г. Бухара", "93 479-81-41"],
  ["12620013", "Islomova Nazira Bafoyevna", "Женский", "28.08.1958", "SHARK-1", "AE2243071", "УЗБЕКИСТАН", "Бухарская", "Бухарский", "91 400-10-20"],
  ["12619618", "Ergasheva Vazira Baxtiyorovna", "Женский", "21.10.1990", "SULTON JORAYEV 36", "AE1038679", "УЗБЕКИСТАН", "Бухарская", "г. Бухара", "91 441-66-69"],
  ["12619576", "Boshmonova Dilrabo Isomiddinovna", "Женский", "03.08.1978", "BERUNIY-33 38-XONA", "AB7152551", "УЗБЕКИСТАН", "Самаркандская", "Самаркандский", "90 199-98-96"],
  ["12619545", "Dolboyeva Xursan Shamurotovna", "Женский", "11.05.1965", "YANGIOBOD 140", "AD4341496", "УЗБЕКИСТАН", "Сурхандарьинская", "Джаркурганский", "99 208-81-65"],
  ["12619021", "Nazarov Murod Zoyirovich", "Мужской", "28.05.1965", "ISTIQLOL MFY", "AE5641526", "УЗБЕКИСТАН", "Бухарская", "Бухарский", "88 065-65-28"],
  ["12618926", "Xojiqurbonov Jahongir Shermatovich", "Мужской", "28.10.2012", "CHORBAKR", "", "УЗБЕКИСТАН", "Бухарская", "Бухарский", "91 404-50-55"],
  ["12618573", "Ochilova Habiba Murodjonovna", "Женский", "01.01.2018", "BOGI AMIR-31", "", "УЗБЕКИСТАН", "Бухарская", "г. Бухара", "91 419-10-10"],
  ["12618536", "Norboyeva Nazira Ibragimovna", "Женский", "08.05.1961", "GOZAL-3", "AB9082139", "УЗБЕКИСТАН", "Кашкадарьинская", "г. Карши", "97 556-70-10"],
  ["12618363", "Quldoshev Baxodir Maxmudovich", "Мужской", "04.03.1973", "OLTIN DALA MFY", "AE5719564", "УЗБЕКИСТАН", "Кашкадарьинская", "Чиракчинский", "93 603-09-70"],
  ["12617776", "Safarova Nigora Baxodirovna", "Женский", "26.05.1994", "RABOTI BOLO 87", "AD9183721", "УЗБЕКИСТАН", "Бухарская", "Бухарский", "90 299-30-20"],
  ["12617747", "Chariyeva Oysha Arabovna", "Женский", "17.04.1963", "MUSTAKILLIK", "AD7695782", "УЗБЕКИСТАН", "Кашкадарьинская", "г. Карши", "99 748-51-21"],
];

export const INITIAL_PATIENTS: PatientRow[] = RAW.map((row, i) => {
  const [id, fullName, gender, birthDate, address, documentNumber, country, region, district, contact] = row;
  const diseaseType = DISEASE_TYPES[i % DISEASE_TYPES.length];
  return p(
    id,
    fullName,
    gender,
    birthDate,
    address,
    documentNumber,
    country,
    region,
    district,
    contact,
    diseaseType,
    "",
    previousPaidKeysForIndex(i),
  );
});
