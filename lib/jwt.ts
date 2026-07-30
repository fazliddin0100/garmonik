// lib/auth/jwt.ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '1d';

export interface JWTPayload {
  id: string;
}

/**
 * JWT Token yaratish
 */
export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * JWT Tokenni tekshirish
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verify error:', error);
    return null;
  }
}

/**
 * Tokenni decode qilish (tekshirmasdan)
 */
export function decodeToken(token: string) {
  try {
    return jwt.decode(token) as JWTPayload | null;
  } catch {
    return null;
  }
}

/**
 * Authorization headerdan token olish
 */
export function getTokenFromHeader(authHeader?: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // "Bearer " ni olib tashlaydi
}

/**
 * Cookie dan token olish (agar kerak bo'lsa)
 */
export function getTokenFromCookie(
  cookieHeader?: string | null,
): string | null {
  if (!cookieHeader) return null;

  const tokenCookie = cookieHeader
    .split(';')
    .find((c) => c.trim().startsWith('auth-token='));

  if (!tokenCookie) return null;

  return tokenCookie.split('=')[1];
}
