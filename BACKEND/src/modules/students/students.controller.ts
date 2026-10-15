import { Response } from 'express';
import { StudentsModel } from './students.model.js';
import { StudentsView } from './students.view.js';
import { Student360Service } from './student-360.service.js';
import { ResponseUtil } from '../../common/utils/response.util.js';
import { AuthenticatedRequest } from '../../common/middleware/auth.middleware.js';

export class StudentsController {
  static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { status, search } = req.query;
      const schoolId = req.user?.school_id;

      const rawStudents = await StudentsModel.list({
        schoolId,
        status: status as string | undefined,
        search: search as string | undefined,
      });

      const formatted = StudentsView.formatList(rawStudents);
      ResponseUtil.success(res, formatted, 'Students list retrieved successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch students', err);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const student = await StudentsModel.findById(id);

      if (!student) {
        ResponseUtil.notFound(res, 'Student not found');
        return;
      }

      const formatted = StudentsView.formatDetail(student);
      ResponseUtil.success(res, formatted, 'Student details retrieved successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch student details', err);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.user?.school_id;
      const studentData = {
        ...req.body,
        school_id: schoolId || req.body.school_id,
        admission_number: req.body.admission_number || `OAK-${Math.floor(1000 + Math.random() * 9000)}`,
        status: req.body.status || 'active',
      };

      const newStudent = await StudentsModel.create(studentData);
      ResponseUtil.created(res, newStudent, 'Student registered successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to create student', err);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updated = await StudentsModel.update(id, req.body);
      ResponseUtil.success(res, updated, 'Student profile updated successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to update student', err);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        ResponseUtil.error(res, 'Status is required', 400);
        return;
      }

      const updated = await StudentsModel.updateStatus(id, status);
      ResponseUtil.success(res, updated, `Student status updated to ${status}`);
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to update student status', err);
    }
  }

  /**
   * Retrieves the comprehensive 8-dimension Student 360 institutional profile.
   */
  static async getStudent360(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const profile = await Student360Service.getStudent360(id);

      if (!profile) {
        ResponseUtil.notFound(res, 'Student 360 profile not found');
        return;
      }

      ResponseUtil.success(res, profile, 'Student 360 profile loaded successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to fetch Student 360 profile', err);
    }
  }

  /**
   * Attaches an institutional document to the student's dossier.
   */
  static async addDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, category, file_url, file_type, file_size_bytes } = req.body;

      if (!title || !file_url) {
        ResponseUtil.badRequest(res, 'Title and file_url are required.');
        return;
      }

      const doc = await Student360Service.addDocument(id, {
        title,
        category: category || 'general',
        file_url,
        file_type: file_type || 'application/pdf',
        file_size_bytes,
        uploaded_by: req.user?.id,
      });

      ResponseUtil.created(res, doc, 'Document attached to student profile successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to attach student document', err);
    }
  }

  /**
   * Logs a behavioural commendation or pastoral note.
   */
  static async addBehaviour(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { type, title, description, incident_date, points, action_taken } = req.body;

      if (!title || !description) {
        ResponseUtil.badRequest(res, 'Title and description are required.');
        return;
      }

      const behaviour = await Student360Service.addBehaviour(id, {
        type: type || 'commendation',
        title,
        description,
        incident_date,
        points: Number(points || 0),
        action_taken,
        recorded_by: req.user?.id,
        recorded_by_name: req.user?.email || 'Staff Member',
      });

      ResponseUtil.created(res, behaviour, 'Behaviour record logged successfully');
    } catch (err) {
      ResponseUtil.serverError(res, 'Failed to record student behaviour', err);
    }
  }
}

