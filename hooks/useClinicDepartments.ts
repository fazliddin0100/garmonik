'use client';

import { fetchClinicResource } from '@/lib/clinic-data/client';
import {
  normalizeDepartmentGroups,
  resolveDepartmentDisplay,
} from '@/lib/clinic-departments/roles';
import type { DepartmentGroup } from '@/lib/clinic-departments/types';
import { useEffect, useMemo, useState } from 'react';

export function useClinicDepartments() {
  const [departments, setDepartments] = useState<DepartmentGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await fetchClinicResource<unknown>('departments');
        if (cancelled) return;
        setDepartments(normalizeDepartmentGroups(raw));
      } catch {
        if (!cancelled) setDepartments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = useMemo(() => {
    const map = new Map<string, DepartmentGroup>();
    for (const d of departments) map.set(d.id, d);
    return map;
  }, [departments]);

  function labelFor(department: string | null | undefined): string {
    return resolveDepartmentDisplay(departments, department).title;
  }

  function forRoleKey(roleKey: string): DepartmentGroup[] {
    const key = roleKey.trim();
    if (!key) return departments;
    return departments.filter((d) => !d.roleKey || d.roleKey === key);
  }

  return { departments, byId, loading, labelFor, forRoleKey };
}
