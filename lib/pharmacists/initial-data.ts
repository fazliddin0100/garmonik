import type { PharmacistRow } from './types';

function p(
  id: string,
  code: string,
  fullName: string,
  specialty: string,
  degree: string,
  department: string,
  contact: string,
  login: string,
): PharmacistRow {
  return {
    id,
    code,
    fullName,
    specialty,
    degree,
    department,
    contact,
    login,
    status: 'Актив',
  };
}

export const INITIAL_PHARMACISTS: PharmacistRow[] = [
  p(
    '23111',
    'P-001',
    'Ismoilova Malika Sherzod qizi',
    'Farmatsevt',
    '1-toifa',
    "Ambulator qabul bo'limi",
    '+998901112233',
    'gp.malika',
  ),
  p(
    '23112',
    'P-002',
    'Raximov Azizbek Otabek o‘g‘li',
    'Katta farmatsevt',
    'Oliy toifa',
    "Statsionar bo'limi",
    '+998907778899',
    'gp.azizbek',
  ),
  p(
    '23113',
    'P-003',
    'Yunusova Nargiza Alisherovna',
    'Retsept nazorati',
    '2-toifa',
    "Ambulator qabul bo'limi",
    '+998935551122',
    'gp.nargiza.ph',
  ),
];
