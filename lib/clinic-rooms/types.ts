export type ClinicRoom = {
  id: string;
  name: string;
  kind: string;
  capacity: number;
  occupied: number;
};

export const ROOMS_STORAGE_KEY = "garmonik-clinic-rooms-v2";
