export interface Hogar {
  id: string;
  nombre: string;
  ownerId: string;
  inviteCode: string;
  adminPasswordHash: string | null;
  createdAt: string;
}
