import type { StaffAccount } from './types';

/**
 * Demo parollar: doctor123, lab123, hamshira123 (bosh hamshira ham shu),
 * kabinet123 — kadrlar bo‘limi o‘zgartirishi mumkin.
 */
export const INITIAL_STAFF_ACCOUNTS: StaffAccount[] = [
  {
    id: 'staff-demo-doctor',
    fullName: 'Dr. Azimov Jahongir',
    role: 'shifokor',
    login: 'doctor',
    passwordHash: '$2b$10$kql75kPaWKTztN4oJFB32OLewtTz5WfPw.O6earOGvU.Y9dE3a5uq',
    department: 'Endokrinologiya',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-demo-lab',
    fullName: 'Tursunova Dilnoza',
    role: 'laboratory',
    login: 'laborant',
    passwordHash: '$2b$10$TFZpoQu9T05FKAJlQf1I5.rlHjrG9S4SkK785y7u0/ND9TOieLvlC',
    department: 'Laboratoriya',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-demo-nurse',
    fullName: 'Karimova Madina',
    role: 'nurse',
    login: 'hamshira',
    passwordHash: '$2b$10$fxpZMITUEizwblX7hCgg9uTHoyNKKlFEPHOwYthLq3zyiiLmmcixe',
    department: 'Protsedura kabineti',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-demo-head-nurse',
    fullName: 'Ismoilova Nilufar',
    role: 'head_nurse',
    login: 'boshhamshira',
    passwordHash: '$2b$10$fxpZMITUEizwblX7hCgg9uTHoyNKKlFEPHOwYthLq3zyiiLmmcixe',
    department: 'Hamshiralik',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-demo-kabinet',
    fullName: 'Sodiqova Lola',
    role: 'kabinet',
    login: 'kabinet',
    passwordHash: '$2b$10$CPEZ0/5n.EFscBd8DK36i.xAjVarZx1sE52bU1cCAMF5YsmId0Lpe',
    department: 'Qabul',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];
