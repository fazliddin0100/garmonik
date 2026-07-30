import bcrypt from 'bcryptjs';

export { staffHomePath } from './staff-home';

export function hashStaffPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}
