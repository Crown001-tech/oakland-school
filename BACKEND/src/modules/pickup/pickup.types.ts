export interface AuthorizedPerson {
  id: string;
  studentId: string;
  fullName: string;
  relationship: string;
  phone: string;
  nationalId?: string;
  photoUrl?: string;
  qrToken: string;
  isActive: boolean;
  createdAt: string;
}

export type VerificationMethod = 'qr_scan' | 'manual_code' | 'emergency_override';
export type PickupStatus = 'cleared' | 'flagged_unauthorized';

export interface PickupLog {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  authorizedPersonId?: string;
  pickedUpByName: string;
  relationship: string;
  verifiedByName: string;
  verificationMethod: VerificationMethod;
  status: PickupStatus;
  notes?: string;
  pickupTime: string;
}

export interface VerifyPickupDTO {
  qrToken?: string;
  studentId?: string;
  authorizedPersonId?: string;
  pickedUpByName?: string;
  relationship?: string;
  verificationMethod?: VerificationMethod;
  verifiedByName?: string;
  notes?: string;
}

export interface RegisterAuthorizedPersonDTO {
  studentId: string;
  fullName: string;
  relationship: string;
  phone: string;
  nationalId?: string;
  photoUrl?: string;
}
