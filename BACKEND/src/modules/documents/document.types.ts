export type DocumentType =
  | 'report_card'
  | 'receipt'
  | 'admission_letter'
  | 'query_letter'
  | 'certificate'
  | 'policy'
  | 'official_notice'
  | 'curriculum'
  | 'other';

export type DocumentStatus = 'draft' | 'published' | 'archived';

export interface SchoolDocument {
  id: string;
  title: string;
  documentType: DocumentType;
  fileUrl: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  associatedStudentId?: string;
  associatedStudentName?: string;
  associatedStaffId?: string;
  associatedStaffName?: string;
  status: DocumentStatus;
  version: number;
  tags: string[];
  metadata?: Record<string, any>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentDTO {
  title: string;
  documentType: DocumentType;
  fileUrl: string;
  fileName: string;
  fileSizeBytes?: number;
  mimeType?: string;
  associatedStudentId?: string;
  associatedStudentName?: string;
  associatedStaffId?: string;
  associatedStaffName?: string;
  status?: DocumentStatus;
  version?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface DocumentFilterDTO {
  documentType?: DocumentType;
  associatedStudentId?: string;
  associatedStaffId?: string;
  status?: DocumentStatus;
  search?: string;
}
