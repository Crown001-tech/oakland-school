import { Request, Response } from 'express';
import { DocumentService } from './document.service.js';

export class DocumentController {
  private documentService = DocumentService.getInstance();

  /**
   * GET /api/v1/documents
   */
  getDocuments = async (req: Request, res: Response) => {
    try {
      const { documentType, studentId, staffId, status, search } = req.query;
      const docs = await this.documentService.getDocuments({
        documentType: documentType as any,
        associatedStudentId: studentId as string,
        associatedStaffId: staffId as string,
        status: status as any,
        search: search as string,
      });

      res.status(200).json({
        success: true,
        data: docs,
        count: docs.length,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/documents/:id
   */
  getDocumentById = async (req: Request, res: Response) => {
    try {
      const doc = await this.documentService.getDocumentById(req.params.id);
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Document not found.' });
      }
      res.status(200).json({ success: true, data: doc });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * GET /api/v1/documents/student/:studentId
   */
  getStudentDocuments = async (req: Request, res: Response) => {
    try {
      const docs = await this.documentService.getStudentDocuments(req.params.studentId);
      res.status(200).json({
        success: true,
        data: docs,
        count: docs.length,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * POST /api/v1/documents
   */
  createDocument = async (req: Request, res: Response) => {
    try {
      const { title, documentType, fileUrl, fileName } = req.body;
      if (!title || !documentType || !fileUrl || !fileName) {
        return res.status(400).json({
          success: false,
          message: 'title, documentType, fileUrl, and fileName are required fields.',
        });
      }

      const created = await this.documentService.createDocument(req.body, (req as any).user?.id);
      res.status(201).json({
        success: true,
        message: 'Document stored in Oakland Document Centre.',
        data: created,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  /**
   * DELETE /api/v1/documents/:id
   */
  deleteDocument = async (req: Request, res: Response) => {
    try {
      const success = await this.documentService.deleteDocument(req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, message: 'Document not found.' });
      }
      res.status(200).json({
        success: true,
        message: 'Document archived from registry.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
