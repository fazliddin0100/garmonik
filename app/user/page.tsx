import { redirect } from 'next/navigation';

/** Eski /user manzili — bir vaqtning o‘zida /users ishlatiladi */
export default function LegacyUserPathPage() {
  redirect('/users');
}
