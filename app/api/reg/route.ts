import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
import {
  findStaffRegistrationByLogin,
  insertStaffRegistration,
} from '@/lib/db/staff-registrations';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

type DepartmentType =
  | 'umumiy'
  | 'bosh_shifokor'
  | 'shifokor'
  | 'hamshiralik'
  | 'moliya'
  | 'xodimlar'
  | 'kabinet';

type RoleType =
  | 'user'
  | 'bosh_doctor'
  | 'doctor'
  | 'shifokor'
  | 'bosh_hamshira'
  | 'hamshira'
  | 'kassir'
  | 'bugalter'
  | 'marketolog'
  | 'xodim'
  | 'kabinet';

const departmentRoleMap: Record<DepartmentType, RoleType> = {
  umumiy: 'user',
  bosh_shifokor: 'bosh_doctor',
  shifokor: 'shifokor',
  hamshiralik: 'hamshira',
  moliya: 'kassir',
  xodimlar: 'xodim',
  kabinet: 'kabinet',
};

const validDepartments: DepartmentType[] = [
  'umumiy',
  'bosh_shifokor',
  'shifokor',
  'hamshiralik',
  'moliya',
  'xodimlar',
  'kabinet',
];

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Ro'yxatdan o'tish faqat administrator uchun" },
        { status: 401 },
      );
    }

    const {
      login,
      password,
      name,
      fName,
      sName,
      age,
      gender,
      department,
      phone,
      role,
    } = await request.json();

    if (
      !login ||
      !password ||
      !name ||
      !fName ||
      !sName ||
      !age ||
      !department ||
      !phone
    ) {
      return NextResponse.json(
        { error: 'Barcha maydonlar kiritilishi kerak' },
        { status: 400 },
      );
    }

    const phoneRegex = /^\+998\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: "Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak" },
        { status: 400 },
      );
    }

    if (!validDepartments.includes(department)) {
      return NextResponse.json(
        { error: "Noto'g'ri bo'lim tanlandi" },
        { status: 400 },
      );
    }

    const overridableRoles: Partial<Record<DepartmentType, RoleType[]>> = {
      hamshiralik: ['bosh_hamshira', 'hamshira'],
      moliya: ['kassir', 'bugalter'],
      xodimlar: ['xodim', 'marketolog'],
      shifokor: ['doctor', 'shifokor'],
    };

    let assignedRole: RoleType =
      departmentRoleMap[department as DepartmentType];

    if (
      role &&
      overridableRoles[department as DepartmentType]?.includes(role)
    ) {
      assignedRole = role;
    }

    const exists = await findStaffRegistrationByLogin(login);
    if (exists) {
      return NextResponse.json(
        { error: 'Bu login allaqachon mavjud' },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const clinicId = await getDefaultClinicId();

    const row = await insertStaffRegistration({
      clinic_id: clinicId,
      login,
      password_hash: hashedPassword,
      name,
      f_name: fName,
      s_name: sName,
      age: age ?? 18,
      gender: gender ?? null,
      department,
      phone,
      role_name: assignedRole,
      role_label: assignedRole,
    });

    return NextResponse.json(
      {
        message: "Ro'yxatdan o'tish muvaffaqiyatli!",
        user: {
          id: row.id,
          login,
          role: assignedRole,
          department,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Serverda xatolik yuz berdi' },
      { status: 500 },
    );
  }
}
