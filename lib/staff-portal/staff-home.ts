import type { StaffRole } from './types';

export function staffHomePath(role: StaffRole): string {
  switch (role) {
    case 'doctor':
    case 'shifokor':
      return '/doctor';
    case 'laboratory':
      return '/labaratoriya';
    case 'nurse':
      return '/hamshiralar';
    case 'head_nurse':
      return '/bosh-hamshira';
    case 'kabinet':
      return '/kabinet';
    case 'specialist':
      return '/mutaxassis';
    case 'farmatsevt':
      return '/farmatsevt';
    case 'oshpaz':
      return '/oshxona';
  }
}
