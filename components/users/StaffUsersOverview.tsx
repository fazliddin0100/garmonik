'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { adminDisplayName, type AdminUser } from '@/lib/admins/types';
import { fetchClinicResource } from '@/lib/clinic-data/client';
import type { DoctorRow } from '@/lib/doctors/types';
import type { LaboratoryStaffRow } from '@/lib/laboratory-staff/types';
import type { NurseRow } from '@/lib/nurses/types';
import type { PharmacistRow } from '@/lib/pharmacists/types';
import type { ReceptionUser } from '@/lib/reception/types';
import {
  allOverviewMembers,
  buildCoreTeamMembers,
  findMembersByKeywords,
  type StaffOverviewData,
  type StaffTeamMember,
} from '@/lib/users/staff-overview-teams';
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
  Pill,
  ScanHeart,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Users,
} from 'lucide-react';
import { startTransition, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type TeamCard = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  members: StaffTeamMember[];
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
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
    fetchClinicResource<PharmacistRow[]>('pharmacists').catch(
      () => [] as PharmacistRow[],
    ),
  ]);

  return {
    doctors: asArray(doctors),
    nurses,
    labStaff,
    reception: asArray(reception),
    pharmacists: asArray(pharmacists),
  };
}

function TeamMembersTable({ members }: { members: StaffTeamMember[] }) {
  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-slate-100 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50/95 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">F.I.SH</th>
            <th className="px-4 py-3">Lavozim</th>
            <th className="px-4 py-3">Bo&apos;lim</th>
            <th className="px-4 py-3">Login</th>
            <th className="px-4 py-3">Bog&apos;lanish</th>
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
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamCard | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      startTransition(() => {
        void (async () => {
          try {
            const [overview, adminsRaw] = await Promise.all([
              loadStaffOverviewData(),
              fetchClinicResource<AdminUser[]>('admins').catch(
                () => [] as AdminUser[],
              ),
            ]);
            if (cancelled) return;
            setStaffData(overview);
            setAdmins(asArray(adminsRaw));
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

  const coreTeams = useMemo((): TeamCard[] => {
    const teams = buildCoreTeamMembers(staffData);
    return [
      {
        title: 'Bosh shifokor / Tibbiy direktor',
        icon: UserCog,
        members: teams.chiefDoctors,
      },
      {
        title:
          'Shifokorlar (terapevt, endokrinolog, kardiolog, nevrolog, ginekolog, pediatr)',
        icon: Stethoscope,
        members: teams.generalDoctors,
      },
      {
        title: 'Jarrohlik jamoasi (jarroh, anesteziolog, operatsion hamshira)',
        icon: Activity,
        members: teams.surgeryTeam,
      },
      {
        title: 'Hamshiralar (statsionar, ambulator, muolaja xonasi)',
        icon: HeartPulse,
        members: teams.generalNurses,
      },
      {
        title: 'Laboratoriya xodimlari (laborant, bioximik, PCR mutaxassisi)',
        icon: FlaskConical,
        members: teams.labStaff,
      },
      {
        title: 'Qabulxona va registratura xodimlari',
        icon: Users,
        members: teams.reception,
      },
      {
        title: "Farmatsevtlar va dori ombori mas'ullari",
        icon: Pill,
        members: teams.pharmacists,
      },
    ];
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
      .filter((row) => row.firstName.trim() || row.lastName.trim())
      .map((row) => ({
        id: row.id,
        fullName: adminDisplayName(row),
        role: row.roleName.trim() || 'Administrator',
        department: "Ma'muriyat",
        login: row.username.trim(),
        contact: row.phone.trim(),
      }));

    const supplyMembers = findMembersByKeywords(adminMembers, [
      "ta'minot",
      'xarid',
      'ombor',
    ]);

    return [
      {
        title: "Kadrlar bo'limi (HR)",
        icon: UserCog,
        members: findMembersByKeywords(adminMembers, ['kadrlar', 'hr', 'xodimlar']),
      },
      {
        title: 'Moliya va buxgalteriya',
        icon: BadgeDollarSign,
        members: findMembersByKeywords(adminMembers, [
          'moliya',
          'buxgalter',
          'hisob',
          'finance',
        ]),
      },
      {
        title: 'Yurist va shartnoma mutaxassisi',
        icon: ClipboardCheck,
        members: findMembersByKeywords(adminMembers, ['yurist', 'shartnoma', 'huquq']),
      },
      {
        title: 'IT administrator / texnik yordam',
        icon: Laptop,
        members: findMembersByKeywords(adminMembers, ['it', 'texnik', 'dastur']),
      },
      {
        title: "Xo'jalik bo'limi (tozalik, kir yuvish, sterilizatsiya)",
        icon: BriefcaseBusiness,
        members: findMembersByKeywords(adminMembers, [
          "xo'jalik",
          'tozalik',
          'steril',
          'xizmat',
        ]),
      },
      {
        title: 'Xavfsizlik xizmati',
        icon: ShieldCheck,
        members: findMembersByKeywords(adminMembers, ['xavfsizlik', 'qo\'riqlash']),
      },
      {
        title: "Ta'minot va xarid bo'limi",
        icon: BriefcaseBusiness,
        members: supplyMembers.length > 0 ? supplyMembers : adminMembers,
      },
    ];
  }, [admins]);

  const memberCountLabel = (count: number) =>
    loading ? 'Yuklanmoqda…' : `Xodimlar soni: ${count}`;

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
            Xodimlar bo&apos;limidagi haqiqiy ma&apos;lumotlar asosida
            to&apos;ldiriladi.
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
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            <BriefcaseBusiness className="size-3.5" />
            Operatsion bo&apos;lim
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
                  className="group rounded-xl border border-slate-100 bg-white/90 px-3 py-2 text-sm text-slate-700 transition-all duration-200 hover:border-amber-200 hover:shadow-sm">
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
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
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
                {loading ?
                  <p className="mt-2 text-sm text-slate-500">
                    Xodimlar yuklanmoqda…
                  </p>
                : selectedTeam.members.length === 0 ?
                  <p className="mt-2 text-sm text-slate-500">
                    Bu rol uchun hozircha xodim ma&apos;lumoti biriktirilmagan.
                    Xodimlar bo&apos;limida tegishli mutaxassislik yoki lavozim
                    bilan xodim qo&apos;shing.
                  </p>
                : <TeamMembersTable members={selectedTeam.members} />}
              </div>
            </>
          : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
