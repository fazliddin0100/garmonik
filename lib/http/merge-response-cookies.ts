import type { NextResponse } from 'next/server';

/** `createServerClient` cookie yangilanishlarini JSON javobga qo‘shish */
export function mergeResponseCookies(from: NextResponse, to: NextResponse): NextResponse {
  const getSetCookie = (
    from.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;
  const list = typeof getSetCookie === 'function' ? getSetCookie.call(from.headers) : [];

  if (list.length > 0) {
    for (const c of list) {
      to.headers.append('Set-Cookie', c);
    }
    return to;
  }

  // Ba'zi runtime'larda `getSetCookie()` yo'q bo'ladi, lekin header mavjud bo'ladi.
  const rawSetCookie = from.headers.get('set-cookie');
  if (rawSetCookie) {
    to.headers.append('Set-Cookie', rawSetCookie);
    return to;
  }

  // Oxirgi fallback: cookie nom-qiymat juftliklarini ko'chirish.
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie.name, cookie.value);
  }

  return to;
}
