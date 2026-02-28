import { Request, Response } from 'express';
import { cbtSessionService } from '../services/cbt-session.service';
import { prisma } from '../config/db';

// Prisma enum/type shims - runtime validation is lightweight here.
type QuestionType = string;
type BranchingConditionOperator = string;

export class CBTSessionController {
  // ============ TEMPLATE ENDPOINTS ============

  /**
   * POST /api/cbt-sessions/templates
   * Create new session template
   */
  async createTemplate(req: Request, res: Response) {
    try {
      const { title, description, category, targetAudience, estimatedDuration } = req.body;
      const therapistId = String(req.user?.id); // From auth middleware

      const template = await cbtSessionService.createTemplate(therapistId, {
        title,
        description,
        category,
        targetAudience,
        estimatedDuration,
      });

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/cbt-sessions/templates/:id
   * Get template with all questions and branching rules
   */
  async getTemplate(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const template = await cbtSessionService.getTemplateWithQuestions(id);

      if (!template) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /api/cbt-sessions/templates/:id/publish
   * Publish template (lock version)
   */
  async publishTemplate(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const template = await cbtSessionService.publishTemplate(id);

      res.json({
        success: true,
        message: 'Template published successfully',
        data: template,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/cbt-sessions/templates/:id/new-version
   * Create new version of template
   */
  async createNewVersion(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { changeNotes } = req.body;

      const template = await cbtSessionService.createNewVersion(id, changeNotes);

      res.json({
        success: true,
        message: 'New version created',
        data: template,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/cbt-sessions/templates/:id/history
   * Get version history
   */
  async getVersionHistory(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const versions = await cbtSessionService.getTemplateVersionHistory(id);

      res.json({
        success: true,
        data: versions,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/cbt-sessions/templates/:id/versions/:versionId/duplicate
   */
  async duplicateVersion(req: Request, res: Response) {
    try {
      const { versionId } = req.params; // id is templateId
      const authorId = String(req.user?.id);
      const { publish } = req.body;

      const newVersion = await cbtSessionService.duplicateVersion(String(versionId), authorId, { publish });

      res.status(201).json({ success: true, data: newVersion });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/cbt-sessions/templates/:id/versions/compare?v1=1&v2=2
   */
  async compareVersions(req: Request, res: Response) {
    try {
      const id = String(req.params.id); // template id
      const v1 = Number(req.query.v1);
      const v2 = Number(req.query.v2);
      if (!v1 || !v2) return res.status(400).json({ success: false, error: 'v1 and v2 query params required' });

      const diff = await cbtSessionService.compareVersions(id, v1, v2);

      res.json({ success: true, data: diff });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // ============ QUESTION ENDPOINTS ============

  /**
   * POST /api/cbt-sessions/templates/:id/questions
   * Add question to template
   */
  async addQuestion(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { type, prompt, description, orderIndex, isRequired, helpText, metadata } = req.body;

      if (typeof type !== 'string') {
        return res.status(400).json({ success: false, error: 'Invalid question type' });
      }

      const question = await cbtSessionService.addQuestion(id, {
        type,
        prompt,
        description,
        orderIndex,
        isRequired,
        helpText,
        metadata,
      });

      res.status(201).json({
        success: true,
        data: question,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /api/cbt-sessions/questions/:id
   * Update question
   */
  async updateQuestion(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const question = await cbtSessionService.updateQuestion(id, req.body);

      res.json({
        success: true,
        data: question,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /api/cbt-sessions/questions/:id
   * Delete question
   */
  async deleteQuestion(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await cbtSessionService.deleteQuestion(id);

      res.json({
        success: true,
        message: 'Question deleted successfully',
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // ============ BRANCHING ENDPOINTS ============

  /**
   * POST /api/cbt-sessions/branching-rules
   * Create branching rule
   */
  async createBranchingRule(req: Request, res: Response) {
    try {
      const { fromQuestionId, toQuestionId, operator, conditionValue, complexCondition } = req.body;

      if (typeof operator !== 'string') {
        return res.status(400).json({ success: false, error: 'Invalid operator' });
      }

      const rule = await cbtSessionService.createBranchingRule(
        String(fromQuestionId),
        String(toQuestionId),
        {
          operator,
          conditionValue,
          complexCondition,
        }
      );

      res.status(201).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/cbt-sessions/library
   * List templates in library with filters
   */
  async listLibrary(req: Request, res: Response) {
    try {
      const { q, tags, visibility, page, limit } = req.query as any;
      const tagArr = tags ? String(tags).split(',').map(s => s.trim()) : undefined;
      const results = await cbtSessionService.searchLibrary({ q, tags: tagArr, visibility, page: Number(page) || 1, limit: Number(limit) || 20 });
      res.json({ success: true, data: results });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/cbt-sessions/library/clone
   */
  async cloneTemplate(req: Request, res: Response) {
    try {
      const { templateId, makePrivate, title } = req.body;
      const therapistId = String(req.user?.id);
      const tpl = await cbtSessionService.cloneTemplate(String(templateId), therapistId, { makePrivate, title });
      res.status(201).json({ success: true, data: tpl });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // ============ PATIENT SESSION ENDPOINTS ============

  /**
   * POST /api/cbt-sessions/start
   * Start patient session from template
   */
  async startSession(req: Request, res: Response) {
    try {
      const { templateId, versionId } = req.body;
      const patientId = String(req.user?.id);

      const session = await cbtSessionService.startPatientSession(patientId, String(templateId), String(versionId));

      // Get first question
      const currentQuestion = await cbtSessionService.getCurrentQuestion(session.id);

      res.status(201).json({
        success: true,
        data: {
          sessionId: session.id,
          currentQuestion,
        },
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/cbt-sessions/:id/current-question
   * Get current question for session
   */
  async getCurrentQuestion(req: Request, res: Response) {
    try {
      const id = String(req.params.id);

      const question = await cbtSessionService.getCurrentQuestion(id);

      if (!question) {
        return res.json({
          success: true,
          data: null,
          message: 'Session complete',
        });
      }

      res.json({
        success: true,
        data: question,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/cbt-sessions/:id/respond
   * Record patient response and advance session
   */
  async respondToQuestion(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { questionId, responseData, timeSpentSeconds } = req.body;
      const patientId = String(req.user?.id);

      const result = await cbtSessionService.recordResponse(
        id,
        patientId,
        questionId,
        responseData,
        timeSpentSeconds
      );

      let nextQuestion = null;
      if (result.nextQuestionId) {
        // Fetch next question details
        // Optionally include branching info
      }

      res.json({
        success: true,
        data: {
          ...result,
          nextQuestion,
        },
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/cbt-sessions/:id/summary
   * Get session summary with all responses
   */
  async getSessionSummary(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const summary = await cbtSessionService.getSessionSummary(id);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/cbt-sessions/:id/events?since={timestamp}
   * Return missed session events (responses) since a given timestamp (ms).
   * Returns 410 if session is completed/abandoned.
   */
  async getSessionEvents(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const since = req.query.since ? Number(req.query.since) : 0;

      // check session
      const session = await prisma.patientSession.findUnique({ where: { id } });
      if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

      // consider COMPLETED or ABANDONED as stale
      if (session.status === 'COMPLETED' || session.status === 'ABANDONED') {
        return res.status(410).json({ success: false, error: 'Session ended' });
      }

      const events = await prisma.patientSessionResponse.findMany({
        where: { sessionId: id, answeredAt: { gt: new Date(since) } },
        orderBy: { answeredAt: 'asc' },
      });

      const out = events.map((r: any) => ({
        messageId: r.id,
        from: r.patientId,
        questionId: r.questionId,
        answer: r.responseData,
        at: r.answeredAt ? new Date(r.answeredAt).getTime() : Date.now(),
        sessionId: r.sessionId,
      }));

      return res.json({ success: true, events: out });
    } catch (error) {
      return res.status(400).json({ success: false, error: String(error) });
    }
  }

  /**
   * PUT /api/cbt-sessions/:id/status
   * Update session status (pause/abandon)
   */
  async updateSessionStatus(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const { status } = req.body;

      if (!['PAUSED', 'ABANDONED'].includes(status)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Status must be PAUSED or ABANDONED' 
        });
      }

      const session = await cbtSessionService.updateSessionStatus(id, status);

      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // ============ ANALYTICS ENDPOINTS ============

  /**
   * GET /api/cbt-sessions/questions/:id/analytics
   * Get question response analytics
   */
  async getQuestionAnalytics(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const analytics = await cbtSessionService.getQuestionAnalytics(id);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/cbt-sessions/templates/:id/stats
   * Get template usage statistics
   */
  async getTemplateStats(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const stats = await cbtSessionService.getTemplateStats(id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

export const cbtSessionController = new CBTSessionController();
