import { redirect } from 'next/navigation';

/** Eski havola; bitta kirish: `/auth/login`. */
export default function SuperadminLoginRedirectPage() {
  redirect('/auth/login');
}
