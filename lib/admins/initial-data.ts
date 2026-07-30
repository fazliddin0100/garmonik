import type { AdminUser } from './types';

/** Namunaviy ma’lumotlar; asosiy manba — Mongo `admins` resursi */
export const INITIAL_ADMINS: AdminUser[] = [
  {
    id: '25041',
    firstName: 'Admin',
    lastName: 'Programist',
    fatherName: 'Dasturchi',
    age: 32,
    username: 'gp.admin',
    roleName: 'Super administrator',
    phone: '+998901112233',
    password: 'Admin@123',
    securityPin: '1111',
  },
  {
    id: '25053',
    firstName: 'Bobir',
    lastName: 'Umurov',
    fatherName: 'Umar o‘g‘li',
    age: 45,
    username: 'gp.umurov',
    roleName: 'Klinika direktori',
    phone: '+998904445566',
    password: 'Admin@123',
    securityPin: '1111',
  },
];
