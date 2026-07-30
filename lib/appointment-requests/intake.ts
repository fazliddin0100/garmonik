export type AppointmentRequestIntakePayload = {
  firstName: string;
  lastName: string;
  fatherName: string;
  gender: string;
  age: number | null;
  address: string;
  phone: string;
  diseaseType: string;
  referredDoctorUserId: string;
};

function normalizeText(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function parseAppointmentRequestIntake(
  body: unknown,
): AppointmentRequestIntakePayload | { error: string } {
  const raw =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

  const firstName = normalizeText(raw.firstName);
  const lastName = normalizeText(raw.lastName);
  const fatherName = normalizeText(raw.fatherName);
  const gender = normalizeText(raw.gender);
  const address = normalizeText(raw.address);
  const phone = normalizeText(raw.phone);
  const diseaseType = normalizeText(raw.diseaseType);
  const referredDoctorUserId = normalizeText(raw.referredDoctorUserId);
  const ageRaw =
    typeof raw.age === 'number' ? raw.age : Number.parseInt(String(raw.age ?? ''), 10);
  const age =
    Number.isFinite(ageRaw) && ageRaw > 0 ? Math.floor(ageRaw) : null;

  if (!firstName || !lastName) {
    return { error: 'Ism va familiya majburiy' };
  }
  if (!phone) {
    return { error: 'Telefon majburiy' };
  }
  if (!fatherName) {
    return { error: 'Otasining ismi majburiy' };
  }
  if (!gender) {
    return { error: 'Jinsini kiriting' };
  }
  if (age === null) {
    return { error: 'Yoshni kiriting' };
  }
  if (!referredDoctorUserId) {
    return { error: 'Shifokorni tanlang' };
  }

  return {
    firstName,
    lastName,
    fatherName,
    gender,
    age,
    address,
    phone,
    diseaseType,
    referredDoctorUserId,
  };
}
