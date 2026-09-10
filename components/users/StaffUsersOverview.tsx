'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { UzPhoneInput } from '@/components/ui/uz-phone-input';
import { adminDisplayName, type AdminUser } from '@/lib/admins/types';
import {
  fetchClinicResource,
  saveClinicResource,
} from '@/lib/clinic-data/client';
import type { DoctorRow } from '@/lib/doctors/types';
import type { LaboratoryStaffRow } from '@/lib/laboratory-staff/types';
import type { NurseRow } from '@/lib/nurses/types';
import { isValidUzPhoneE164 } from '@/lib/phone/uz-phone';
import type { PharmacistRow } from '@/lib/pharmacists/types';
import type { ReceptionUser } from '@/lib/reception/types';
import {
  DEFAULT_CLINIC_SETTINGS,
  type ClinicSettings,
} from '@/lib/settings/types';
import {
  BUILTIN_ADMIN_SUPPORT_ROLES,
  isSuperAdminRoleName,
  normalizeRoleKey,
  rolesMatch,
  type AdminSupportRoleDef,
} from '@/lib/users/admin-support-roles';
import {
  buildCoreTeamCards,
  findCoreTeamCard,
  resolveMedicalStaffKind,
  type CoreTeamKey,
  type MedicalStaffKind,
} from '@/lib/users/core-team-config';
import {
  createMedicalStaffAccount,
  deleteMedicalStaffAccount,
  surgeryVariantConfig,
  updateMedicalStaffAccount,
  type SurgeryVariant,
} from '@/lib/users/medical-staff-api';
import {
  allOverviewMembers,
  findMembersByKeywords,
  includesAny,
  type StaffOverviewData,
  type StaffTeamMember,
} from '@/lib/users/staff-overview-teams';
import { generateStaffPassword } from '@/lib/staff-portal/generate-password';
import {
  Activity,
  Ambulance,
  BadgeDollarSign,
  BriefcaseBusiness,
  ClipboardCheck,
  FlaskConical,
  HandHeart,
  HeartPulse,
  Laptop,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Pill,
  Plus,
  ScanHeart,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react';
import { startTransition, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type TeamCard = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  members: StaffTeamMember[];
  /** Ma'muriy bo‘lim — xodim qo‘shish mumkin */
  manageable?: boolean;
  roleLabel?: string;
  teamKey?: CoreTeamKey;
  staffKind?: MedicalStaffKind | 'mixed';
  defaultSpecialty?: string;
  defaultPosition?: string;
  defaultDepartment?: string;
  defaultRoleName?: string;
};

type MedicalCreateForm = {
  fullName: string;
  specialty: string;
  department: string;
  contact: string;
  login: string;
  password: string;
};

function emptyMedicalForm(): MedicalCreateForm {
  return {
    fullName: '',
    specialty: '',
    department: '',
    contact: '',
    login: '',
    password: generateStaffPassword(),
  };
}

type CreateForm = {
  firstName: string;
  lastName: string;
  fatherName: string;
  age: number;
  username: string;
  phone: string;
  password: string;
};

function emptyCreateForm(): CreateForm {
  return {
    firstName: '',
    lastName: '',
    fatherName: '',
    age: 25,
    username: '',
    phone: '',
    password: generateStaffPassword(),
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function adminSupportIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes('kadr') || t.includes('hr')) return UserCog;
  if (t.includes('moliya') || t.includes('buxgalter')) return BadgeDollarSign;
  if (t.includes('yurist') || t.includes('shartnoma')) return ClipboardCheck;
  if (t.includes('it') || t.includes('texnik')) return Laptop;
  if (t.includes('xavfsizlik')) return ShieldCheck;
  return BriefcaseBusiness;
}

const CORE_TEAM_ICONS: Record<
  CoreTeamKey,
  React.ComponentType<{ className?: string }>
> = {
  chief_doctors: UserCog,
  general_doctors: Stethoscope,
  surgery_team: Activity,
  general_nurses: HeartPulse,
  lab_staff: FlaskConical,
  reception: Users,
  pharmacists: Pill,
};

function matchAdminToRole(
  member: StaffTeamMember,
  role: AdminSupportRoleDef,
): boolean {
  if (rolesMatch(member.role, role.roleLabel)) return true;
  if (rolesMatch(member.role, role.title)) return true;
  return includesAny(
    [member.role, member.department].join(' '),
    role.keywords,
  );
}

async function fetchStaffItems<T>(url: string): Promise<T[]> {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: T[] };
  return Array.isArray(data.items) ? data.items : [];
}

async function loadStaffOverviewData(): Promise<StaffOverviewData> {
  const [doctors, nurses, labStaff, reception, pharmacists] = await Promise.all([
    fetchClinicResource<DoctorRow[]>('doctors').catch(() => [] as DoctorRow[]),
    fetchStaffItems<NurseRow>('/api/nurses/staff'),
    fetchStaffItems<LaboratoryStaffRow>('/api/laboratory/staff'),
    fetchStaffItems<ReceptionUser>('/api/reception/staff'),
    fetchStaffItems<PharmacistRow>('/api/pharmacists/staff'),
  ]);

  return {
    doctors: asArray(doctors),
    nurses,
    labStaff,
    reception: asArray(reception),
    pharmacists: asArray(pharmacists),
  };
}

function TeamMembersTable({
  members,
  manageable,
  onEdit,
  onDelete,
}: {
  members: StaffTeamMember[];
  manageable?: boolean;
  onEdit?: (member: StaffTeamMember) => void;
  onDelete?: (member: StaffTeamMember) => void;
}) {
  return (
    <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-100 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-slate-50/95 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">F.I.SH</th>
            <th className="px-4 py-3">Lavozim</th>
            <th className="px-4 py-3">Bo&apos;lim</th>
            <th className="px-4 py-3">Login</th>
            <th className="px-4 py-3">Bog&apos;lanish</th>
            {manageable ?
              <th className="px-4 py-3 text-right">Amallar</th>
            : null}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr
              key={member.id}
              className="border-t border-slate-100 text-slate-700 transition-colors hover:bg-violet-50/40">
              <td className="px-4 py-2.5 font-medium text-slate-800">
                {member.fullName}
              </td>
              <td className="px-4 py-2.5">
                <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">
                  {member.role}
                </span>
              </td>
              <td className="px-4 py-2.5 text-slate-600">
                {member.department || <span className="text-slate-400">—</span>}
              </td>
              <td className="px-4 py-2.5">
                {member.login ?
                  <code className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                    {member.login}
                  </code>
                : <span className="text-slate-400">—</span>}
              </td>
              <td className="px-4 py-2.5 text-slate-600">
                {member.contact || <span className="text-slate-400">—</span>}
              </td>
              {manageable ?
                <td className="px-4 py-2.5 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-slate-500 hover:bg-amber-100 hover:text-amber-800"
                      onClick={() => onEdit?.(member)}
                      aria-label="Tahrirlash">
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => onDelete?.(member)}
                      aria-label="O‘chirish">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StaffUsersOverview() {
  const [staffData, setStaffData] = useState<StaffOverviewData>({
    doctors: [],
    nurses: [],
    labStaff: [],
    reception: [],
    pharmacists: [],
  });
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [customRoleTitles, setCustomRoleTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamCard | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingLogin, setEditingLogin] = useState('');
  const [createRoleLabel, setCreateRoleLabel] = useState('');
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
  const [createError, setCreateError] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(true);
  const [savedCredentials, setSavedCredentials] = useState<{
    login: string;
    password: string;
    roleName: string;
  } | null>(null);
  const [deleteMember, setDeleteMember] = useState<StaffTeamMember | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newRoleError, setNewRoleError] = useState('');
  const [newRoleSaving, setNewRoleSaving] = useState(false);

  const [medicalCreateOpen, setMedicalCreateOpen] = useState(false);
  const [editingMedicalId, setEditingMedicalId] = useState<string | null>(null);
  const [medicalTeamKey, setMedicalTeamKey] = useState<CoreTeamKey | null>(null);
  const [medicalStaffKind, setMedicalStaffKind] =
    useState<MedicalStaffKind>('doctor');
  const [medicalForm, setMedicalForm] = useState<MedicalCreateForm>(emptyMedicalForm);
  const [medicalError, setMedicalError] = useState('');
  const [medicalSaving, setMedicalSaving] = useState(false);
  const [surgeryVariant, setSurgeryVariant] =
    useState<SurgeryVariant>('surgeon');

  async function reloadStaffOverview() {
    const overview = await loadStaffOverviewData();
    setStaffData(overview);
    setSelectedTeam((prev) => {
      if (!prev?.teamKey) return prev;
      const card = findCoreTeamCard(overview, prev.teamKey);
      if (!card) return prev;
      return {
        ...prev,
        members: card.members,
      };
    });
    return overview;
  }

  async function reloadAdminsAndSettings() {
    const [adminsRaw, settingsRaw] = await Promise.all([
      fetchClinicResource<AdminUser[]>('admins').catch(() => [] as AdminUser[]),
      fetchClinicResource<ClinicSettings>('clinic-settings').catch(
        () => DEFAULT_CLINIC_SETTINGS,
      ),
    ]);
    setAdmins(asArray(adminsRaw));
    const titles = Array.isArray(settingsRaw?.adminSupportRoleTitles)
      ? settingsRaw.adminSupportRoleTitles
          .map((t) => (typeof t === 'string' ? t.trim() : ''))
          .filter(Boolean)
      : [];
    setCustomRoleTitles(titles);
  }

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      startTransition(() => {
        void (async () => {
          try {
            const [overview] = await Promise.all([
              loadStaffOverviewData(),
              reloadAdminsAndSettings(),
            ]);
            if (cancelled) return;
            setStaffData(overview);
          } catch {
            if (!cancelled) {
              toast.error('Xodimlar ma’lumotini yuklab bo‘lmadi');
            }
          } finally {
            if (!cancelled) setLoading(false);
          }
        })();
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const supportRoleDefs = useMemo((): AdminSupportRoleDef[] => {
    const builtin = BUILTIN_ADMIN_SUPPORT_ROLES;
    const seen = new Set(builtin.map((r) => normalizeRoleKey(r.roleLabel)));
    const custom: AdminSupportRoleDef[] = [];
    for (const title of customRoleTitles) {
      const key = normalizeRoleKey(title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      custom.push({
        title,
        roleLabel: title,
        keywords: [title],
      });
    }
    return [...builtin, ...custom];
  }, [customRoleTitles]);

  const coreTeams = useMemo((): TeamCard[] => {
    return buildCoreTeamCards(staffData).map((team) => ({
      ...team,
      icon: CORE_TEAM_ICONS[team.teamKey],
      manageable: true,
    }));
  }, [staffData]);

  const allMembers = useMemo(() => allOverviewMembers(staffData), [staffData]);

  const supportTeams = useMemo(
    (): TeamCard[] => [
      {
        title: 'Radiologiya (UZI, rentgen, KT/MRT operatorlari)',
        icon: ScanHeart,
        members: findMembersByKeywords(allMembers, [
          'radiolog',
          'uzi',
          'rentgen',
          'kt',
          'mrt',
          'sonograf',
        ]),
      },
      {
        title: 'Reabilitolog, fizioterapevt, massaj mutaxassisi',
        icon: HandHeart,
        members: findMembersByKeywords(allMembers, [
          'reabilit',
          'fizioterap',
          'massaj',
          'lfc',
        ]),
      },
      {
        title: 'Infeksiya nazorati hamshirasi / epidemiolog',
        icon: ShieldCheck,
        members: findMembersByKeywords(allMembers, [
          'infeksiya',
          'epidemiolog',
          'sanitar',
        ]),
      },
      {
        title: "Dietolog va ovqatlanish bo'yicha mutaxassis",
        icon: ClipboardCheck,
        members: findMembersByKeywords(allMembers, ['dietolog', 'ovqatlanish']),
      },
      {
        title: 'Psixolog / psixoterapevt',
        icon: BriefcaseBusiness,
        members: findMembersByKeywords(allMembers, ['psixolog', 'psixoterap']),
      },
      {
        title: 'Ijtimoiy xodim va bemor navigatori',
        icon: Users,
        members: findMembersByKeywords(allMembers, ['ijtimoiy', 'navigator']),
      },
      {
        title: 'Tez yordam / transport xizmati navbatchilari',
        icon: Ambulance,
        members: findMembersByKeywords(allMembers, [
          'tez yordam',
          'transport',
          'ambulans',
        ]),
      },
    ],
    [allMembers],
  );

  const adminTeams = useMemo((): TeamCard[] => {
    const adminMembers: StaffTeamMember[] = admins
      .filter((row) => {
        if (!row.firstName.trim() && !row.lastName.trim()) return false;
        if (isSuperAdminRoleName(row.roleName)) return false;
        return true;
      })
      .map((row) => ({
        id: row.id,
        fullName: adminDisplayName(row),
        role: row.roleName.trim() || 'Administrator',
        department: "Ma'muriyat",
        login: row.username.trim(),
        contact: row.phone.trim(),
      }));

    return supportRoleDefs.map((role) => ({
      title: role.title,
      icon: adminSupportIcon(role.title),
      roleLabel: role.roleLabel,
      manageable: true,
      members: adminMembers.filter((m) => matchAdminToRole(m, role)),
    }));
  }, [admins, supportRoleDefs]);

  const memberCountLabel = (count: number) =>
    loading ? 'Yuklanmoqda…' : `Xodimlar soni: ${count}`;

  function findAdminForMember(member: StaffTeamMember): AdminUser | null {
    const byId = admins.find((a) => a.id === member.id);
    if (byId) return byId;
    const login = member.login.trim().toLowerCase();
    if (!login) return null;
    return (
      admins.find((a) => a.username.trim().toLowerCase() === login) ?? null
    );
  }

  function openCreateForTeam(team: TeamCard) {
    if (!team.manageable) return;

    if (team.teamKey && team.staffKind) {
      setEditingMedicalId(null);
      setMedicalTeamKey(team.teamKey);
      setMedicalStaffKind(
        team.staffKind === 'mixed' ? surgeryVariantConfig('surgeon').kind : team.staffKind,
      );
      setSurgeryVariant('surgeon');
      setMedicalForm({
        ...emptyMedicalForm(),
        specialty: team.defaultSpecialty ?? team.defaultRoleName ?? '',
        department: team.defaultDepartment ?? '',
      });
      setMedicalError('');
      setMedicalCreateOpen(true);
      return;
    }

    if (!team.roleLabel) return;
    setEditingMemberId(null);
    setEditingLogin('');
    setCreateRoleLabel(team.roleLabel);
    setCreateForm(emptyCreateForm());
    setShowCreatePassword(true);
    setCreateError('');
    setCreateOpen(true);
  }

  function openEditMedicalMember(member: StaffTeamMember, team: TeamCard) {
    if (!team.teamKey) return;
    const kind =
      resolveMedicalStaffKind(team.teamKey, member.id, staffData) ??
      (team.staffKind !== 'mixed' ? team.staffKind : null);
    if (!kind) {
      toast.error('Xodim turini aniqlab bo‘lmadi');
      return;
    }

    setMedicalTeamKey(team.teamKey);
    setMedicalStaffKind(kind);
    setEditingMedicalId(member.id);

    if (team.teamKey === 'surgery_team') {
      if (kind === 'nurse') setSurgeryVariant('or_nurse');
      else if (includesAny(member.role, ['anestez'])) {
        setSurgeryVariant('anesthesiologist');
      } else {
        setSurgeryVariant('surgeon');
      }
    }

    const doctor = staffData.doctors.find((row) => row.id === member.id);
    const nurse = staffData.nurses.find((row) => row.id === member.id);
    const lab = staffData.labStaff.find((row) => row.id === member.id);
    const reception = staffData.reception.find((row) => row.id === member.id);
    const pharmacist = staffData.pharmacists.find((row) => row.id === member.id);

    setMedicalForm({
      fullName: member.fullName,
      specialty:
        doctor?.specialty ||
        nurse?.specialty ||
        lab?.specialty ||
        reception?.roleName ||
        pharmacist?.specialty ||
        member.role,
      department:
        doctor?.department ||
        nurse?.department ||
        lab?.department ||
        pharmacist?.department ||
        member.department,
      contact:
        doctor?.contact ||
        nurse?.contact ||
        pharmacist?.contact ||
        reception?.email ||
        member.contact,
      login: member.login,
      password: '',
    });
    setMedicalError('');
    setMedicalCreateOpen(true);
  }

  function openEditMember(member: StaffTeamMember) {
    if (selectedTeam?.teamKey) {
      openEditMedicalMember(member, selectedTeam);
      return;
    }

    const admin = findAdminForMember(member);
    const nameParts = member.fullName.trim().split(/\s+/).filter(Boolean);
    setEditingMemberId(admin?.id || member.id);
    setEditingLogin((admin?.username || member.login).trim().toLowerCase());
    setCreateRoleLabel(
      admin?.roleName.trim() ||
        selectedTeam?.roleLabel ||
        member.role ||
        '',
    );
    setCreateForm({
      firstName: admin?.firstName || nameParts[0] || '',
      lastName: admin?.lastName || nameParts[1] || '',
      fatherName:
        admin?.fatherName && admin.fatherName !== '—' ?
          admin.fatherName
        : nameParts.slice(2).join(' ') || '',
      age: admin?.age && admin.age > 0 ? admin.age : 25,
      username: admin?.username || member.login,
      phone: admin?.phone || member.contact || '',
      password: '',
    });
    setShowCreatePassword(false);
    setCreateError('');
    setCreateOpen(true);
  }

  function refreshSelectedTeamMembers(nextAdmins: AdminUser[]) {
    setSelectedTeam((prev) => {
      if (!prev?.manageable || !prev.roleLabel) return prev;
      const role: AdminSupportRoleDef = {
        title: prev.title,
        roleLabel: prev.roleLabel,
        keywords: [prev.roleLabel, prev.title],
      };
      const adminMembers: StaffTeamMember[] = nextAdmins
        .filter((row) => {
          if (!row.firstName.trim() && !row.lastName.trim()) return false;
          if (isSuperAdminRoleName(row.roleName)) return false;
          return true;
        })
        .map((row) => ({
          id: row.id,
          fullName: adminDisplayName(row),
          role: row.roleName.trim() || 'Administrator',
          department: "Ma'muriyat",
          login: row.username.trim(),
          contact: row.phone.trim(),
        }))
        .filter((m) => matchAdminToRole(m, role));
      return { ...prev, members: adminMembers };
    });
  }

  async function saveMedicalStaffMember() {
    if (!medicalTeamKey) return;

    const team = coreTeams.find((row) => row.teamKey === medicalTeamKey);
    const fullName = medicalForm.fullName.trim();
    const specialty = medicalForm.specialty.trim();
    const department = medicalForm.department.trim();
    const contact = medicalForm.contact.trim();
    const login = medicalForm.login.trim().toLowerCase();
    const password = medicalForm.password.trim();
    const isEdit = Boolean(editingMedicalId);

    let kind = medicalStaffKind;
    let position = team?.defaultPosition;
    let roleName = team?.defaultRoleName;
    let staffRole: 'nurse' | 'head_nurse' | undefined;

    if (team?.staffKind === 'mixed') {
      const variant = surgeryVariantConfig(surgeryVariant);
      kind = variant.kind;
      position = variant.position;
      staffRole = variant.staffRole;
    }

    if (!fullName) {
      setMedicalError('F.I.SH kiriting.');
      return;
    }
    if (!specialty && kind !== 'reception') {
      setMedicalError('Mutaxassislik / lavozim kiriting.');
      return;
    }
    if (!login) {
      setMedicalError('Login kiriting.');
      return;
    }
    if (!isEdit && password.length < 6) {
      setMedicalError('Parol kamida 6 belgidan iborat bo‘lsin.');
      return;
    }
    if (isEdit && password && password.length < 6) {
      setMedicalError('Yangi parol kamida 6 belgidan iborat bo‘lsin.');
      return;
    }

    setMedicalSaving(true);
    setMedicalError('');
    try {
      const payload = {
        fullName,
        specialty:
          kind === 'reception' ?
            (roleName || specialty || 'Registrator')
          : specialty,
        department,
        contact,
        login,
        password: password || undefined,
        position,
        roleName: roleName || specialty,
        staffRole,
      };

      const result =
        isEdit && editingMedicalId ?
          await updateMedicalStaffAccount(kind, editingMedicalId, payload)
        : await createMedicalStaffAccount(kind, payload);

      if (result.error) {
        setMedicalError(result.error);
        toast.error(result.error);
        return;
      }

      await reloadStaffOverview();
      toast.success(isEdit ? 'Xodim yangilandi' : 'Xodim qo‘shildi');
      setMedicalCreateOpen(false);
      setEditingMedicalId(null);
      setMedicalTeamKey(null);
    } catch {
      setMedicalError('Tarmoq xatoligi');
      toast.error('Tarmoq xatoligi');
    } finally {
      setMedicalSaving(false);
    }
  }

  async function saveStaffMember() {
    const firstName = createForm.firstName.trim();
    const lastName = createForm.lastName.trim();
    const fatherName = createForm.fatherName.trim();
    const age = Math.round(Number(createForm.age));
    const loginInput = createForm.username.trim();
    const phone = createForm.phone.trim();
    const password = createForm.password.trim();
    const roleName = createRoleLabel.trim();
    const isEdit = Boolean(editingMemberId || editingLogin);

    if (!roleName) {
      setCreateError('Rol topilmadi.');
      return;
    }
    if (!firstName || !lastName) {
      setCreateError('Ism va familiyani kiriting.');
      return;
    }
    if (!fatherName) {
      setCreateError('Otasining ismini kiriting.');
      return;
    }
    if (!Number.isFinite(age) || age < 1 || age > 120) {
      setCreateError('Yosh 1–120 orasida bo‘lsin.');
      return;
    }
    if (!loginInput) {
      setCreateError('Login kiriting.');
      return;
    }
    if (!isValidUzPhoneE164(phone)) {
      setCreateError('+998 dan keyin 9 ta raqam kiriting.');
      return;
    }
    if (!isEdit && password.length < 6) {
      setCreateError('Parol kamida 6 belgidan iborat bo‘lsin.');
      return;
    }
    if (isEdit && password && password.length < 6) {
      setCreateError('Yangi parol kamida 6 belgidan iborat bo‘lsin.');
      return;
    }

    setCreateSaving(true);
    setCreateError('');
    try {
      if (isEdit) {
        const res = await fetch('/api/admin/update-portal-admin', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: editingMemberId || undefined,
            login: editingLogin || loginInput.toLowerCase(),
            newLogin: loginInput.toLowerCase(),
            firstName,
            lastName,
            fatherName,
            age,
            roleName,
            phone,
            ...(password.length >= 6 ? { password } : {}),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          userId?: string;
          login?: string;
        };
        if (!res.ok) {
          setCreateError(data.error || 'Yangilab bo‘lmadi');
          toast.error(data.error || 'Yangilab bo‘lmadi');
          return;
        }

        const resolvedId =
          typeof data.userId === 'string' && data.userId.trim() ?
            data.userId.trim()
          : editingMemberId || '';
        const resolvedLogin =
          typeof data.login === 'string' ? data.login : loginInput.toLowerCase();

        const nextAdmins = (() => {
          const idx = admins.findIndex(
            (a) =>
              a.id === editingMemberId ||
              a.username.trim().toLowerCase() === editingLogin ||
              a.username.trim().toLowerCase() === loginInput.toLowerCase(),
          );
          const row: AdminUser = {
            id: resolvedId || (idx >= 0 ? admins[idx].id : `id-${Date.now()}`),
            firstName,
            lastName,
            fatherName,
            age,
            username: resolvedLogin,
            roleName,
            phone,
            password: password || (idx >= 0 ? admins[idx].password : ''),
            securityPin: idx >= 0 ? admins[idx].securityPin : '1111',
          };
          if (idx >= 0) {
            const copy = [...admins];
            copy[idx] = row;
            return copy;
          }
          return [...admins, row];
        })();

        await saveClinicResource('admins', nextAdmins);
        setAdmins(nextAdmins);
        refreshSelectedTeamMembers(nextAdmins);
        toast.success('Xodim ma’lumotlari yangilandi');
        setCreateOpen(false);
        setEditingMemberId(null);
        setEditingLogin('');
        return;
      }

      const res = await fetch('/api/admin/create-portal-admin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          fatherName,
          age,
          roleName,
          login: loginInput,
          password,
          phone,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        userId?: string;
        login?: string;
        firstName?: string;
        lastName?: string;
        fatherName?: string;
        age?: number;
        roleName?: string;
        phone?: string;
      };
      if (!res.ok) {
        setCreateError(data.error || 'Yaratib bo‘lmadi');
        toast.error(data.error || 'Xatolik');
        return;
      }

      const resolvedLogin =
        typeof data.login === 'string' ? data.login : loginInput.toLowerCase();
      const id =
        typeof data.userId === 'string' && data.userId.trim() ?
          data.userId.trim()
        : typeof crypto !== 'undefined' && 'randomUUID' in crypto ?
          crypto.randomUUID()
        : `id-${Date.now()}`;

      const nextAdmin: AdminUser = {
        id,
        firstName:
          typeof data.firstName === 'string' ? data.firstName : firstName,
        lastName: typeof data.lastName === 'string' ? data.lastName : lastName,
        fatherName:
          typeof data.fatherName === 'string' ? data.fatherName : fatherName,
        age: typeof data.age === 'number' ? data.age : age,
        username: resolvedLogin,
        roleName: typeof data.roleName === 'string' ? data.roleName : roleName,
        phone: typeof data.phone === 'string' ? data.phone : phone,
        password,
        securityPin: '1111',
      };

      const nextAdmins = [...admins, nextAdmin];
      await saveClinicResource('admins', nextAdmins);
      setAdmins(nextAdmins);
      refreshSelectedTeamMembers(nextAdmins);

      setCreateOpen(false);
      setSavedCredentials({
        login: resolvedLogin,
        password,
        roleName: nextAdmin.roleName,
      });
      toast.success('Xodim qo‘shildi — login va parolni saqlab qo‘ying');
    } catch {
      setCreateError('Tarmoq xatoligi');
      toast.error('Tarmoq xatoligi');
    } finally {
      setCreateSaving(false);
    }
  }

  async function confirmDeleteMember() {
    if (!deleteMember) return;
    setDeleteSaving(true);
    try {
      if (selectedTeam?.teamKey) {
        const kind = resolveMedicalStaffKind(
          selectedTeam.teamKey,
          deleteMember.id,
          staffData,
        );
        if (!kind) {
          toast.error('Xodim turini aniqlab bo‘lmadi');
          return;
        }
        const result = await deleteMedicalStaffAccount(kind, deleteMember.id);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        await reloadStaffOverview();
        toast.success('Xodim o‘chirildi');
        return;
      }

      const admin = findAdminForMember(deleteMember);
      const res = await fetch('/api/admin/update-portal-admin', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: admin?.id || deleteMember.id,
          login: (admin?.username || deleteMember.login).trim().toLowerCase(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || 'O‘chirib bo‘lmadi');
        return;
      }
      const nextAdmins = admins.filter(
        (a) =>
          a.id !== (admin?.id || deleteMember.id) &&
          a.username.trim().toLowerCase() !==
            deleteMember.login.trim().toLowerCase(),
      );
      await saveClinicResource('admins', nextAdmins);
      setAdmins(nextAdmins);
      refreshSelectedTeamMembers(nextAdmins);
      toast.success('Xodim o‘chirildi');
    } catch {
      toast.error('Tarmoq xatoligi');
    } finally {
      setDeleteSaving(false);
      setDeleteMember(null);
    }
  }

  async function saveNewRole() {
    const title = newRoleTitle.trim();
    if (!title) {
      setNewRoleError('Rol nomini kiriting.');
      return;
    }
    if (isSuperAdminRoleName(title)) {
      setNewRoleError('Bu rol qo‘shib bo‘lmaydi.');
      return;
    }
    const key = normalizeRoleKey(title);
    if (supportRoleDefs.some((r) => normalizeRoleKey(r.title) === key || normalizeRoleKey(r.roleLabel) === key)) {
      setNewRoleError('Bunday rol allaqachon mavjud.');
      return;
    }

    setNewRoleSaving(true);
    setNewRoleError('');
    try {
      const current = await fetchClinicResource<ClinicSettings>(
        'clinic-settings',
      ).catch(() => ({ ...DEFAULT_CLINIC_SETTINGS }));
      const existing = Array.isArray(current.adminSupportRoleTitles)
        ? current.adminSupportRoleTitles
        : [];
      const nextTitles = [...existing, title];
      await saveClinicResource('clinic-settings', {
        ...DEFAULT_CLINIC_SETTINGS,
        ...current,
        adminSupportRoleTitles: nextTitles,
      });
      setCustomRoleTitles(nextTitles);
      toast.success('Yangi rol qo‘shildi');
      setNewRoleOpen(false);
      setNewRoleTitle('');

      const team: TeamCard = {
        title,
        icon: BriefcaseBusiness,
        roleLabel: title,
        manageable: true,
        members: [],
      };
      setSelectedTeam(team);
      openCreateForTeam(team);
    } catch {
      setNewRoleError('Saqlab bo‘lmadi');
      toast.error('Rolni saqlab bo‘lmadi');
    } finally {
      setNewRoleSaving(false);
    }
  }

  return (
    <>
      <div className="mt-3 grid gap-5 lg:grid-cols-3">
        <section className="rounded-3xl border border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/60 p-6 shadow-xl backdrop-blur lg:col-span-2">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
            <Stethoscope className="size-3.5" />
            Asosiy bo&apos;lim
          </div>
          <h2 className="text-lg font-semibold text-slate-800">
            Asosiy tibbiy jamoa
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Klinikada doimiy ishlashi zarur bo&apos;lgan birlamchi tibbiy rollar.
            Har bir rol ichida xodimlarni ko&apos;rish va yo&apos;q bo&apos;lsa
            shu yerda qo&apos;shish mumkin.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {coreTeams.map((team) => {
              const Icon = team.icon;
              return (
                <button
                  type="button"
                  key={team.title}
                  onClick={() => setSelectedTeam(team)}
                  className="group rounded-xl border border-slate-100 bg-white/90 px-4 py-3 text-left text-sm text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-violet-100 p-2 text-violet-700 transition-colors group-hover:bg-violet-600 group-hover:text-white">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p>{team.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {memberCountLabel(team.members.length)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/60 p-6 shadow-xl backdrop-blur">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="size-3.5" />
            KPI
          </div>
          <p className="text-sm text-slate-500">Xodimlar bo&apos;yicha qamrov</p>
          <p className="mt-2 text-4xl font-bold text-slate-800">
            {loading ? '…' : allMembers.length}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Xodimlar bo&apos;limida ro&apos;yxatdan o&apos;tgan tibbiy va yordamchi
            xodimlar soni.
          </p>
        </section>

        <section className="rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-white to-sky-50/60 p-6 shadow-xl backdrop-blur lg:col-span-2">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
            <Users className="size-3.5" />
            Qo&apos;shimcha mutaxassislar
          </div>
          <h2 className="text-lg font-semibold text-slate-800">
            Qo&apos;llab-quvvatlovchi mutaxassislar
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Tibbiy sifatni va bemor tajribasini kuchaytiruvchi qo&apos;shimcha
            rollar.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {supportTeams.map((team) => {
              const Icon = team.icon;
              return (
                <button
                  type="button"
                  key={team.title}
                  onClick={() => setSelectedTeam(team)}
                  className="group rounded-xl border border-slate-100 bg-white/90 px-4 py-3 text-sm text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-sky-100 p-2 text-sky-700 transition-colors group-hover:bg-sky-600 group-hover:text-white">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p>{team.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {memberCountLabel(team.members.length)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-amber-100 bg-gradient-to-br from-white via-white to-amber-50/60 p-6 shadow-xl backdrop-blur">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              <BriefcaseBusiness className="size-3.5" />
              Operatsion bo&apos;lim
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 border-amber-200 bg-white/90 text-amber-800 hover:bg-amber-50"
              onClick={() => {
                setNewRoleTitle('');
                setNewRoleError('');
                setNewRoleOpen(true);
              }}>
              <Plus className="size-3.5" />
              Yangi rol
            </Button>
          </div>
          <h2 className="text-lg font-semibold text-slate-800">
            Ma&apos;muriy va xizmat ko&apos;rsatish
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Klinikani uzluksiz ishlatish uchun zarur bo&apos;lgan no-tibbiy
            rollar.
          </p>
          <div className="mt-4 space-y-2">
            {adminTeams.map((team) => {
              const Icon = team.icon;
              return (
                <button
                  type="button"
                  key={team.title}
                  onClick={() => setSelectedTeam(team)}
                  className="group w-full rounded-xl border border-slate-100 bg-white/90 px-3 py-2 text-left text-sm text-slate-700 transition-all duration-200 hover:border-amber-200 hover:shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <Icon className="mt-0.5 size-4 text-amber-600" />
                    <div>
                      <p>{team.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {memberCountLabel(team.members.length)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <Sheet
        open={!!selectedTeam}
        onOpenChange={(open) => !open && setSelectedTeam(null)}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-[50vw]">
          {selectedTeam ?
            <>
              <SheetHeader>
                <SheetTitle>Tanlangan rol bo&apos;yicha xodimlar</SheetTitle>
                <SheetDescription>
                  {selectedTeam.title}
                  {!loading ?
                    ` · ${selectedTeam.members.length} ta xodim`
                  : ''}
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4">
                {selectedTeam.manageable ?
                  <div className="mb-3 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => openCreateForTeam(selectedTeam)}>
                      <Plus className="size-3.5" />
                      Xodim qo&apos;shish
                    </Button>
                  </div>
                : null}

                {loading ?
                  <p className="mt-2 text-sm text-slate-500">
                    Xodimlar yuklanmoqda…
                  </p>
                : selectedTeam.members.length === 0 ?
                  <div className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Bu rol uchun hali xodim yo&apos;q
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedTeam.manageable ?
                        'Pastdagi tugma orqali shu rolga xodim qo‘shing.'
                      : "Xodimlar bo'limida tegishli mutaxassislik yoki lavozim bilan xodim qo'shing."}
                    </p>
                    {selectedTeam.manageable ?
                      <Button
                        type="button"
                        className="mt-4 gap-1.5"
                        onClick={() => openCreateForTeam(selectedTeam)}>
                        <Plus className="size-4" />
                        Xodim qo&apos;shish
                      </Button>
                    : null}
                  </div>
                : <TeamMembersTable
                    members={selectedTeam.members}
                    manageable={selectedTeam.manageable}
                    onEdit={openEditMember}
                    onDelete={setDeleteMember}
                  />}
              </div>
            </>
          : null}
        </SheetContent>
      </Sheet>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setEditingMemberId(null);
            setEditingLogin('');
            setCreateError('');
          }
        }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMemberId || editingLogin ?
                'Xodimni tahrirlash'
              : "Xodim qo'shish"}
            </DialogTitle>
            <DialogDescription>
              Rol: <strong>{createRoleLabel}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sa-first">Ism</Label>
              <Input
                id="sa-first"
                value={createForm.firstName}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, firstName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-last">Familiya</Label>
              <Input
                id="sa-last"
                value={createForm.lastName}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, lastName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sa-father">Otasining ismi</Label>
              <Input
                id="sa-father"
                value={createForm.fatherName}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, fatherName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-age">Yosh</Label>
              <Input
                id="sa-age"
                type="number"
                min={1}
                max={120}
                value={createForm.age || ''}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    age: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-login">Login</Label>
              <Input
                id="sa-login"
                className="font-mono"
                autoComplete="off"
                name="staff-portal-login"
                value={createForm.username}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, username: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sa-pass">
                {editingMemberId || editingLogin ?
                  'Yangi parol (ixtiyoriy)'
                : 'Parol'}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="sa-pass"
                  type={showCreatePassword ? 'text' : 'password'}
                  className="font-mono"
                  autoComplete="new-password"
                  name="staff-portal-password"
                  placeholder={
                    editingMemberId || editingLogin ?
                      'O‘zgartirmasangiz bo‘sh qoldiring'
                    : undefined
                  }
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setShowCreatePassword((v) => !v)}
                  aria-label={showCreatePassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}>
                  {showCreatePassword ?
                    <EyeOff className="size-4" />
                  : <Eye className="size-4" />}
                </Button>
                {!editingMemberId && !editingLogin ?
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() =>
                      setCreateForm((f) => ({
                        ...f,
                        password: generateStaffPassword(),
                      }))
                    }>
                    Yangilash
                  </Button>
                : null}
              </div>
              {!editingMemberId && !editingLogin ?
                <p className="text-xs text-slate-500">
                  Parol avtomatik yaratildi. Kirishda shu login/paroldan foydalaning
                  (`/auth/login`).
                </p>
              : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Telefon</Label>
              <UzPhoneInput
                value={createForm.phone}
                onChange={(full) =>
                  setCreateForm((f) => ({ ...f, phone: full }))
                }
                className="max-w-none"
              />
            </div>
          </div>
          {createError ?
            <p className="text-sm text-rose-600">{createError}</p>
          : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={createSaving}
              onClick={() => setCreateOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              disabled={createSaving}
              onClick={() => void saveStaffMember()}>
              {createSaving ?
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saqlanmoqda…
                </>
              : 'Saqlash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!savedCredentials}
        onOpenChange={(open) => {
          if (!open) setSavedCredentials(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xodim bazaga yozildi</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  {savedCredentials?.roleName} hisobi yaratildi. Kirish:{' '}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800">
                    /auth/login
                  </code>
                </p>
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      Login:{' '}
                      <code className="font-mono font-semibold text-slate-900">
                        {savedCredentials?.login}
                      </code>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          savedCredentials?.login || '',
                        );
                        toast.success('Login nusxalandi');
                      }}>
                      <Copy className="mr-1 size-3.5" />
                      Nusxa
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      Parol:{' '}
                      <code className="font-mono font-semibold text-slate-900">
                        {savedCredentials?.password}
                      </code>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          savedCredentials?.password || '',
                        );
                        toast.success('Parol nusxalandi');
                      }}>
                      <Copy className="mr-1 size-3.5" />
                      Nusxa
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-amber-700">
                  Parolni hozir yozib oling — keyin ro‘yxatda ko‘rinmaydi.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSavedCredentials(null)}>
              Tushundim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={medicalCreateOpen}
        onOpenChange={(open) => {
          setMedicalCreateOpen(open);
          if (!open) {
            setEditingMedicalId(null);
            setMedicalTeamKey(null);
            setMedicalError('');
          }
        }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingMedicalId ? 'Xodimni tahrirlash' : "Xodim qo'shish"}
            </DialogTitle>
            <DialogDescription>
              {medicalTeamKey ?
                coreTeams.find((team) => team.teamKey === medicalTeamKey)?.title
              : null}
            </DialogDescription>
          </DialogHeader>

          {medicalTeamKey === 'surgery_team' && !editingMedicalId ?
            <div className="space-y-1.5">
              <Label>Jamoa roli</Label>
              <Select
                value={surgeryVariant}
                onValueChange={(value) => {
                  const variant = value as SurgeryVariant;
                  setSurgeryVariant(variant);
                  const cfg = surgeryVariantConfig(variant);
                  setMedicalStaffKind(cfg.kind);
                  setMedicalForm((form) => ({
                    ...form,
                    specialty: cfg.specialty,
                  }));
                }}>
                <SelectTrigger>
                  <SelectValue placeholder="Rolni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="surgeon">Jarroh (shifokor)</SelectItem>
                  <SelectItem value="anesthesiologist">
                    Anesteziolog (shifokor)
                  </SelectItem>
                  <SelectItem value="or_nurse">Operatsion hamshira</SelectItem>
                </SelectContent>
              </Select>
            </div>
          : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="med-full">F.I.SH</Label>
              <Input
                id="med-full"
                value={medicalForm.fullName}
                onChange={(e) =>
                  setMedicalForm((form) => ({ ...form, fullName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-spec">
                {medicalStaffKind === 'reception' ? 'Lavozim' : 'Mutaxassislik'}
              </Label>
              <Input
                id="med-spec"
                value={medicalForm.specialty}
                onChange={(e) =>
                  setMedicalForm((form) => ({ ...form, specialty: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-dept">Bo&apos;lim</Label>
              <Input
                id="med-dept"
                value={medicalForm.department}
                onChange={(e) =>
                  setMedicalForm((form) => ({ ...form, department: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="med-contact">
                {medicalStaffKind === 'reception' ? 'Email' : 'Telefon'}
              </Label>
              {medicalStaffKind === 'reception' ?
                <Input
                  id="med-contact"
                  type="email"
                  value={medicalForm.contact}
                  onChange={(e) =>
                    setMedicalForm((form) => ({ ...form, contact: e.target.value }))
                  }
                />
              : <UzPhoneInput
                  value={medicalForm.contact}
                  onChange={(full) =>
                    setMedicalForm((form) => ({ ...form, contact: full }))
                  }
                  className="max-w-none"
                />
              }
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-login">Login</Label>
              <Input
                id="med-login"
                className="font-mono"
                value={medicalForm.login}
                onChange={(e) =>
                  setMedicalForm((form) => ({ ...form, login: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="med-pass">
                {editingMedicalId ? 'Yangi parol (ixtiyoriy)' : 'Parol'}
              </Label>
              <Input
                id="med-pass"
                type="password"
                placeholder={
                  editingMedicalId ? 'O‘zgartirmasangiz bo‘sh qoldiring' : undefined
                }
                value={medicalForm.password}
                onChange={(e) =>
                  setMedicalForm((form) => ({ ...form, password: e.target.value }))
                }
              />
            </div>
          </div>

          {medicalError ?
            <p className="text-sm text-rose-600">{medicalError}</p>
          : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={medicalSaving}
              onClick={() => setMedicalCreateOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              disabled={medicalSaving}
              onClick={() => void saveMedicalStaffMember()}>
              {medicalSaving ?
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saqlanmoqda…
                </>
              : 'Saqlash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteMember)}
        onOpenChange={(open) => {
          if (!open && !deleteSaving) setDeleteMember(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xodimni o‘chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMember ?
                `${deleteMember.fullName} (${deleteMember.login}) hisobi o‘chiriladi.`
              : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Bekor</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSaving}
              className="bg-rose-600 hover:bg-rose-700"
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteMember();
              }}>
              {deleteSaving ? 'O‘chirilmoqda…' : 'O‘chirish'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={newRoleOpen} onOpenChange={setNewRoleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi rol turi</DialogTitle>
            <DialogDescription>
              Ma&apos;muriy bo&apos;limga yangi lavozim/rol qo&apos;shiladi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="new-role-title">Rol nomi</Label>
            <Input
              id="new-role-title"
              placeholder="Masalan: Marketing mutaxassisi"
              value={newRoleTitle}
              onChange={(e) => setNewRoleTitle(e.target.value)}
            />
          </div>
          {newRoleError ?
            <p className="text-sm text-rose-600">{newRoleError}</p>
          : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={newRoleSaving}
              onClick={() => setNewRoleOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              disabled={newRoleSaving}
              onClick={() => void saveNewRole()}>
              {newRoleSaving ?
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saqlanmoqda…
                </>
              : 'Qo‘shish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
