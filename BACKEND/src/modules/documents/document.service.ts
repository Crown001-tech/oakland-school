import { SchoolDocument, CreateDocumentDTO, DocumentFilterDTO } from './document.types.js';
import { prisma } from '../../config/prisma.js';
import { EventBus } from '../../common/events/event-bus.js';
import { AppEvents, DocumentUploadedPayload } from '../../common/events/event-types.js';
import crypto from 'crypto';

export class DocumentService {
  private static instance: DocumentService;

  // In-memory document vault (clean start for real operations)
  private documents: SchoolDocument[] = [];


  public static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  /**
   * Search and filter documents
   */
  async getDocuments(filters?: DocumentFilterDTO): Promise<SchoolDocument[]> {
    let result = [...this.documents];

    if (filters?.documentType) {
      result = result.filter((d) => d.documentType === filters.documentType);
    }

    if (filters?.associatedStudentId) {
      result = result.filter((d) => d.associatedStudentId === filters.associatedStudentId);
    }

    if (filters?.associatedStaffId) {
      result = result.filter((d) => d.associatedStaffId === filters.associatedStaffId);
    }

    if (filters?.status) {
      result = result.filter((d) => d.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.fileName.toLowerCase().includes(q) ||
          (d.associatedStudentName && d.associatedStudentName.toLowerCase().includes(q)) ||
          (d.associatedStaffName && d.associatedStaffName.toLowerCase().includes(q)) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Newest first
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Retrieve document by ID
   */
  async getDocumentById(id: string): Promise<SchoolDocument | null> {
    const doc = this.documents.find((d) => d.id === id);
    return doc || null;
  }

  /**
   * Upload / Register new document
   */
  async createDocument(dto: CreateDocumentDTO, createdBy?: string): Promise<SchoolDocument> {
    const newDoc: SchoolDocument = {
      id: crypto.randomUUID(),
      title: dto.title,
      documentType: dto.documentType,
      fileUrl: dto.fileUrl,
      fileName: dto.fileName,
      fileSizeBytes: dto.fileSizeBytes || 500000,
      mimeType: dto.mimeType || 'application/pdf',
      associatedStudentId: dto.associatedStudentId,
      associatedStudentName: dto.associatedStudentName,
      associatedStaffId: dto.associatedStaffId,
      associatedStaffName: dto.associatedStaffName,
      status: dto.status || 'published',
      version: dto.version || 1,
      tags: dto.tags || [],
      metadata: dto.metadata || {},
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.documents.unshift(newDoc);

    // Persist to DB
    try {
      await prisma.document.create({
        data: {
          id: newDoc.id,
          title: newDoc.title,
          documentType: newDoc.documentType,
          fileUrl: newDoc.fileUrl,
          fileName: newDoc.fileName,
          fileSizeBytes: newDoc.fileSizeBytes ? BigInt(newDoc.fileSizeBytes) : undefined,
          mimeType: newDoc.mimeType,
          associatedStudentId: newDoc.associatedStudentId || undefined,
          uploadedBy: createdBy || undefined,
        },
      });
    } catch {}

    // Emit event
    const payload: DocumentUploadedPayload = {
      documentId: newDoc.id,
      title: newDoc.title,
      documentType: newDoc.documentType,
      fileUrl: newDoc.fileUrl,
      associatedStudentId: newDoc.associatedStudentId,
      associatedStaffId: newDoc.associatedStaffId,
    };

    EventBus.getInstance().publish(
      AppEvents.DOCUMENT_UPLOADED,
      payload,
      { source: 'DocumentService' }
    );

    return newDoc;
  }

  /**
   * Automatically index a newly generated fee receipt into the document vault
   */
  async indexGeneratedReceipt(params: {
    receiptNo: string;
    studentId: string;
    studentName: string;
    amount: number;
    fileUrl?: string;
  }): Promise<SchoolDocument> {
    return this.createDocument({
      title: `Official Fee Payment Receipt #${params.receiptNo} (${params.studentName})`,
      documentType: 'receipt',
      fileUrl:
        params.fileUrl ||
        `https://gxkywfgoitfjyuipkmqj.supabase.co/storage/v1/object/public/receipts/${params.receiptNo.toLowerCase()}.pdf`,
      fileName: `Receipt_${params.receiptNo}_${params.studentName.replace(/\s+/g, '_')}.pdf`,
      fileSizeBytes: 320000,
      mimeType: 'application/pdf',
      associatedStudentId: params.studentId,
      associatedStudentName: params.studentName,
      status: 'published',
      tags: ['receipt', 'fees', 'bursary'],
      metadata: { receiptNo: params.receiptNo, amount: params.amount, currency: 'NGN' },
    });
  }

  /**
   * Delete or archive a document
   */
  async deleteDocument(id: string): Promise<boolean> {
    const index = this.documents.findIndex((d) => d.id === id);
    if (index === -1) return false;

    this.documents.splice(index, 1);

    try {
      await prisma.document.delete({ where: { id } });
    } catch {}

    return true;
  }

  /**
   * Get all documents associated with a specific student
   */
  async getStudentDocuments(studentId: string): Promise<SchoolDocument[]> {
    return this.getDocuments({ associatedStudentId: studentId });
  }
}
