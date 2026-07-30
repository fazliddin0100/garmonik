import type { VerifiedSession } from '@/lib/auth/session-jwt';

import { insertAccessAuditLog } from '@/lib/db/logs';

import { getDefaultClinicId } from '@/lib/server/default-clinic';

import type { NextRequest } from 'next/server';



type DeniedAuditInput = {

  request: NextRequest;

  session: VerifiedSession | null;

  resourceKey: string;

  method: 'GET' | 'PUT';

  reason: string;

};



function firstHeader(v: string | null): string {

  if (!v) return '';

  const idx = v.indexOf(',');

  return (idx >= 0 ? v.slice(0, idx) : v).trim();

}



export async function logClinicDataDeniedAccess(input: DeniedAuditInput): Promise<void> {

  try {

    const ip =

      firstHeader(input.request.headers.get('x-forwarded-for')) ||

      firstHeader(input.request.headers.get('x-real-ip')) ||

      '';

    const userAgent = input.request.headers.get('user-agent') ?? '';



    if (!input.session) {

      let clinicId = process.env.DEFAULT_CLINIC_ID?.trim();

      if (!clinicId) {

        try {

          clinicId = await getDefaultClinicId();

        } catch {

          return;

        }

      }

      await insertAccessAuditLog({

        clinic_id: clinicId,

        actor_kind: 'anonymous',

        resource_key: input.resourceKey,

        method: input.method,

        pathname: input.request.nextUrl.pathname,

        ip,

        user_agent: userAgent,

        reason: input.reason,

      });

      return;

    }



    if (input.session.kind === 'admin') {

      await insertAccessAuditLog({

        clinic_id: input.session.clinicId,

        actor_kind: 'admin',

        actor_id: input.session.id,

        actor_login: input.session.login,

        actor_role: input.session.roleLabel,

        route_group: input.session.routeGroup,

        resource_key: input.resourceKey,

        method: input.method,

        pathname: input.request.nextUrl.pathname,

        ip,

        user_agent: userAgent,

        reason: input.reason,

      });

      return;

    }



    await insertAccessAuditLog({

      clinic_id: input.session.clinicId,

      actor_kind: 'staff',

      actor_id: input.session.id,

      actor_login: input.session.login,

      actor_role: input.session.role,

      resource_key: input.resourceKey,

      method: input.method,

      pathname: input.request.nextUrl.pathname,

      ip,

      user_agent: userAgent,

      reason: input.reason,

    });

  } catch (e) {

    console.error('audit-log: clinic-data deny write failed', e);

  }

}


