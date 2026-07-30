import bcrypt from 'bcryptjs';
import { query, queryOne } from './query';

export type AppUserRow = {
  id: string;
  email: string;
  password_hash: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

const APP_USER_COLUMNS =
  'id, email, password_hash, email_verified_at, created_at, updated_at';

export async function findAppUserByEmail(
  email: string,
): Promise<AppUserRow | null> {
  return queryOne<AppUserRow>(
    `select ${APP_USER_COLUMNS}
     from public.app_users
     where lower(email) = lower($1)
     limit 1`,
    [email.trim()],
  );
}

export async function findAppUserById(id: string): Promise<AppUserRow | null> {
  return queryOne<AppUserRow>(
    `select ${APP_USER_COLUMNS}
     from public.app_users
     where id = $1
     limit 1`,
    [id],
  );
}

export async function createAppUser(input: {
  email: string;
  password: string;
  id?: string;
}): Promise<AppUserRow> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const row =
    input.id ?
      await queryOne<AppUserRow>(
        `insert into public.app_users (id, email, password_hash, email_verified_at)
         values ($1, $2, $3, now())
         returning ${APP_USER_COLUMNS}`,
        [input.id, email, passwordHash],
      )
    : await queryOne<AppUserRow>(
        `insert into public.app_users (email, password_hash, email_verified_at)
         values ($1, $2, now())
         returning ${APP_USER_COLUMNS}`,
        [email, passwordHash],
      );
  if (!row) throw new Error('Foydalanuvchi yaratilmadi');
  return row;
}

export async function deleteAppUser(id: string): Promise<void> {
  await query('delete from public.app_users where id = $1', [id]);
}

export async function verifyAppUserPassword(
  user: AppUserRow,
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, user.password_hash);
}

export async function updateAppUserPassword(
  userId: string,
  password: string,
): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12);
  await query(
    `update public.app_users
     set password_hash = $2, updated_at = now()
     where id = $1`,
    [userId, passwordHash],
  );
}
