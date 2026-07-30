import type { VerifiedSession } from '@/lib/auth/session-jwt';

import { insertSecurityEventLog } from '@/lib/db/logs';

import { getDefaultClinicId } from '@/lib/server/default-clinic';

import type { NextRequest } from 'next/server';



type SecurityEventType =

  | 'admin_login_success'

  | 'admin_login_failed'

  | 'staff_login_success'

  | 'staff_login_failed'

  | 'logout'

  | 'clinic_data_write';



function firstHeader(v: string | null): string {

  if (!v) return '';

  const idx = v.indexOf(',');

  return (idx >= 0 ? v.slice(0, idx) : v).trim();

}



export function clientIpFromRequest(request: NextRequest): string {

  return (

    firstHeader(request.headers.get('x-forwarded-for')) ||

    firstHeader(request.headers.get('x-real-ip')) ||

    ''

  );

}



type SecurityLogInput = {

  request: NextRequest;

  session: VerifiedSession | null;

  eventType: SecurityEventType;

  target?: string;

  meta?: Record<string, unknown>;

};



export async function logSecurityEvent(input: SecurityLogInput): Promise<void> {

  try {

    const ip = clientIpFromRequest(input.request);

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

      await insertSecurityEventLog({

        clinic_id: clinicId,

        event_type: input.eventType,

        actor_kind: 'anonymous',

        target: input.target ?? '',

        ip,

        user_agent: userAgent,

        meta: input.meta ?? {},

      });

      return;

    }



    if (input.session.kind === 'admin') {

      await insertSecurityEventLog({

        clinic_id: input.session.clinicId,

        event_type: input.eventType,

        actor_kind: 'admin',

        actor_id: input.session.id,

        actor_login: input.session.login,

        actor_role: input.session.roleLabel,

        route_group: input.session.routeGroup,

        target: input.target ?? '',

        ip,

        user_agent: userAgent,

        meta: input.meta ?? {},

      });

      return;

    }



    await insertSecurityEventLog({

      clinic_id: input.session.clinicId,

      event_type: input.eventType,

      actor_kind: 'staff',

      actor_id: input.session.id,

      actor_login: input.session.login,

      actor_role: input.session.role,

      target: input.target ?? '',

      ip,

      user_agent: userAgent,

      meta: input.meta ?? {},

    });

  } catch (e) {

    console.error('security-log write failed', e);

  }

}


