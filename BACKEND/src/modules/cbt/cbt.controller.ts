import { Request, Response } from 'express';
import { cbtService } from './cbt.service.js';

export class CbtController {
  // ==========================================
  // Question Bank Handlers
  // ==========================================

  public static async getQuestionBanks(req: Request, res: Response): Promise<void> {
    try {
      const { subject, classLevel } = req.query;
      const banks = await cbtService.getQuestionBanks(
        subject as string | undefined,
        classLevel as string | undefined
      );
      res.json({
        success: true,
        data: banks,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async createQuestionBank(req: Request, res: Response): Promise<void> {
    try {
      const { title, subject, classLevel, description } = req.body;
      if (!title || !subject || !classLevel) {
        res.status(400).json({ success: false, error: 'title, subject, and classLevel are required.' });
        return;
      }

      const bank = await cbtService.createQuestionBank({
        title,
        subject,
        classLevel,
        description,
        createdBy: (req as any).user?.email || 'Academic Directorate',
      });

      res.status(201).json({
        success: true,
        data: bank,
        message: 'Question bank created successfully.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async getQuestionsByBank(req: Request, res: Response): Promise<void> {
    try {
      const { bankId } = req.params;
      const questions = await cbtService.getQuestionsByBank(bankId);
      res.json({
        success: true,
        data: questions,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async addQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { bankId } = req.params;
      const { questionText, questionType, options, correctAnswer, explanation, marks, difficulty } = req.body;

      if (!questionText || !questionType || !options || !correctAnswer) {
        res.status(400).json({
          success: false,
          error: 'questionText, questionType, options, and correctAnswer are required.',
        });
        return;
      }

      const question = await cbtService.addQuestion({
        bankId,
        questionText,
        questionType,
        options,
        correctAnswer,
        explanation,
        marks: marks ? Number(marks) : 2,
        difficulty,
      });

      res.status(201).json({
        success: true,
        data: question,
        message: 'Question item created successfully.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // Assessment Lifecycle Handlers
  // ==========================================

  public static async getAssessments(req: Request, res: Response): Promise<void> {
    try {
      const { classLevel, subject, status } = req.query;
      const assessments = await cbtService.getAssessments(
        classLevel as string | undefined,
        subject as string | undefined,
        status as string | undefined
      );
      res.json({
        success: true,
        data: assessments,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async getAssessmentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const redact = req.query.redact === 'true';
      const assessment = await cbtService.getAssessmentById(id, redact);

      if (!assessment) {
        res.status(404).json({ success: false, error: 'Assessment not found.' });
        return;
      }

      res.json({
        success: true,
        data: assessment,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async createAssessment(req: Request, res: Response): Promise<void> {
    try {
      const {
        title,
        subject,
        classLevel,
        term,
        durationMinutes,
        passPercentage,
        shuffleQuestions,
        shuffleOptions,
        maxTabSwitches,
        instructions,
        questionIds,
      } = req.body;

      if (!title || !subject || !classLevel) {
        res.status(400).json({
          success: false,
          error: 'title, subject, and classLevel are required.',
        });
        return;
      }

      const assessment = await cbtService.createAssessment({
        title,
        subject,
        classLevel,
        term,
        durationMinutes: durationMinutes ? Number(durationMinutes) : 30,
        passPercentage: passPercentage ? Number(passPercentage) : 50,
        shuffleQuestions,
        shuffleOptions,
        maxTabSwitches: maxTabSwitches ? Number(maxTabSwitches) : 3,
        instructions,
        questionIds,
        createdBy: (req as any).user?.email || 'Academic Directorate',
      });

      res.status(201).json({
        success: true,
        data: assessment,
        message: 'Assessment configured in draft status.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async publishAssessment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const assessment = await cbtService.publishAssessment(id);
      res.json({
        success: true,
        data: assessment,
        message: 'Assessment published and activated for candidate sessions.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ==========================================
  // Student Test Taker Handlers
  // ==========================================

  public static async startSession(req: Request, res: Response): Promise<void> {
    try {
      const { assessmentId, studentId, studentName, studentClass, admissionNo } = req.body;

      if (!assessmentId || !studentId || !studentName || !studentClass) {
        res.status(400).json({
          success: false,
          error: 'assessmentId, studentId, studentName, and studentClass are required.',
        });
        return;
      }

      const sessionData = await cbtService.startSession({
        assessmentId,
        studentId,
        studentName,
        studentClass,
        admissionNo,
      });

      res.status(200).json({
        success: true,
        data: sessionData,
        message: 'Assessment session initialized.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async submitAnswer(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { questionId, studentAnswer } = req.body;

      if (!questionId || studentAnswer === undefined) {
        res.status(400).json({
          success: false,
          error: 'questionId and studentAnswer are required.',
        });
        return;
      }

      const answer = await cbtService.submitAnswer(sessionId, {
        questionId,
        studentAnswer,
      });

      res.json({
        success: true,
        data: answer,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async recordAntiCheat(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { flagType, details } = req.body;

      if (!flagType) {
        res.status(400).json({ success: false, error: 'flagType is required.' });
        return;
      }

      const result = await cbtService.recordAntiCheatInfraction(sessionId, {
        flagType,
        details,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async submitSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const session = await cbtService.submitSession(sessionId);

      res.json({
        success: true,
        data: session,
        message: 'Assessment completed and auto-graded.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async getSessionResult(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const result = await cbtService.getSessionResult(sessionId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async getAssessmentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const analytics = await cbtService.getAssessmentAnalytics(id);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  public static async getStudentSessions(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const sessions = await cbtService.getStudentSessions(studentId);

      res.json({
        success: true,
        data: sessions,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
