import { redirect } from 'next/navigation';

/** Dashboard ichidagi xodimlar — barcha rollar /users ostida */
export default function DashboardXodimlarPage() {
  redirect('/users');
}
