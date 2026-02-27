import { prisma } from '../config/db';
import BranchingEngine from '../lib/branching/engine';

// Prisma-generated types are not available in this workspace snapshot.
// Provide lightweight aliases so TypeScript can compile while we continue
// working on migration/typing. Replace with real Prisma types when available.
type CBTSessionTemplate = any;
type CBTQuestion = any;
type PatientSession = any;
type PatientSessionResponse = any;
type QuestionBranchingRule = any;
type SessionStatus = string;
type QuestionType = string;
type BranchingConditionOperator = string;

export class CBTSessionService {
  // ============ TEMPLATE MANAGEMENT ============

  /**
   * Create a new CBT session template
   */
  async createTemplate(
    therapistId: string,
    data: {
      title: string;
      description?: string;
      category?: string;
      targetAudience?: string;
      estimatedDuration?: number;
    }
  ): Promise<CBTSessionTemplate> {
    return prisma.cBTSessionTemplate.create({
      data: {
        ...data,
        therapistId,
        status: 'DRAFT',
        version: 1,
      },
    });
  }

  /**
   * Get template by ID with all relations
   */
  async getTemplateWithQuestions(templateId: string) {
    return prisma.cBTSessionTemplate.findUnique({
      where: { id: templateId },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            branchingRules: {
              include: {
                toQuestion: true,
              },
            },
          },
        },
        therapist: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Publish a template (lock version)
   */
  async publishTemplate(templateId: string): Promise<CBTSessionTemplate> {
    const template = await prisma.cBTSessionTemplate.findUnique({
      where: { id: templateId },
      include: { questions: true },
    });

    if (!template) throw new Error('Template not found');
    if (template.questions.length === 0) {
      throw new Error('Cannot publish template without questions');
    }

    // Create and publish a new version snapshot (increment version)
    const snapshot = template;
    const createdBy = template.therapistId;

    const version = await this.createTemplateVersion(templateId, createdBy, snapshot, {
      publish: true,
      changeNotes: undefined,
    });

    // Return updated template
    return prisma.cBTSessionTemplate.findUnique({ where: { id: templateId } });
  }

  /**
   * Create a new version of existing template
   */
  async createNewVersion(templateId: string, changeNotes?: string) {
    const template = await prisma.cBTSessionTemplate.findUnique({
      where: { id: templateId },
      include: { questions: true },
    });

    if (!template) throw new Error('Template not found');
    // Create a new draft version snapshot (increment version)
    const createdBy = template.therapistId;
    const snapshot = template;

    const version = await this.createTemplateVersion(templateId, createdBy, snapshot, {
      publish: false,
      changeNotes,
    });

    // Return updated template
    return prisma.cBTSessionTemplate.findUnique({ where: { id: templateId } });
  }

  /**
   * Create a new TemplateVersion row and bump template.version atomically
   */
  async createTemplateVersion(
    templateId: string,
    authorId: string,
    snapshotData: any,
    opts: { publish?: boolean; changeNotes?: string } = { publish: false }
  ) {
    return prisma.$transaction(async (tx: any) => {
      const tpl = await tx.cBTSessionTemplate.findUnique({ where: { id: templateId } });
      if (!tpl) throw new Error('Template not found');

      const nextVersion = (tpl.version || 0) + 1;
      const checksum = require('crypto').createHash('sha256').update(JSON.stringify(snapshotData)).digest('hex');

      const created = await tx.cBTSessionVersion.create({
        data: {
          sessionId: templateId,
          version: nextVersion,
          snapshotData,
          changeNotes: opts.changeNotes,
          createdBy: authorId,
          publishedAt: opts.publish ? new Date() : null,
          isDraft: !opts.publish,
          checksum,
        },
      });

      // bump template.version and optionally update status/publishedAt
      await tx.cBTSessionTemplate.update({
        where: { id: templateId },
        data: {
          version: nextVersion,
          status: opts.publish ? 'PUBLISHED' : 'DRAFT',
          publishedAt: opts.publish ? new Date() : undefined,
          updatedAt: new Date(),
        },
      });

      return created;
    });
  }

  /**
   * Duplicate an existing version (creates a new version with same snapshot)
   */
  async duplicateVersion(versionId: string, authorId: string, opts: { publish?: boolean; title?: string } = { publish: false }) {
    const source = await prisma.cBTSessionVersion.findUnique({ where: { id: versionId } });
    if (!source) throw new Error('Version not found');

    return this.createTemplateVersion(source.sessionId, authorId, source.snapshotData, { publish: !!opts.publish, changeNotes: `Duplicated from ${versionId}` });
  }

  /**
   * Compare two versions and return a JSON-patch style diff
   */
  async compareVersions(templateId: string, versionA: number, versionB: number) {
    const a = await prisma.cBTSessionVersion.findFirst({ where: { sessionId: templateId, version: versionA } });
    const b = await prisma.cBTSessionVersion.findFirst({ where: { sessionId: templateId, version: versionB } });

    if (!a || !b) throw new Error('One or both versions not found');

    // Simple deep diff implementation returning operations
    function diff(aObj: any, bObj: any, path = ''): any[] {
      const ops: any[] = [];
      const aKeys = aObj && typeof aObj === 'object' ? Object.keys(aObj) : [];
      const bKeys = bObj && typeof bObj === 'object' ? Object.keys(bObj) : [];
      const allKeys = Array.from(new Set([...aKeys, ...bKeys]));
      for (const key of allKeys) {
        const p = path + '/' + key;
        if (!(key in aObj)) {
          ops.push({ op: 'add', path: p, value: bObj[key] });
        } else if (!(key in bObj)) {
          ops.push({ op: 'remove', path: p });
        } else {
          const va = aObj[key];
          const vb = bObj[key];
          if (typeof va === 'object' && va !== null && typeof vb === 'object' && vb !== null) {
            ops.push(...diff(va, vb, p));
          } else if (va !== vb) {
            ops.push({ op: 'replace', path: p, value: vb });
          }
        }
      }
      return ops;
    }

    return diff(a.snapshotData, b.snapshotData, '');
  }

  /**
   * Get template version history
   */
  async getTemplateVersionHistory(templateId: string) {
    return prisma.cBTSessionVersion.findMany({
      where: { sessionId: templateId },
      orderBy: { version: 'desc' },
    });
  }

  // ============ QUESTION MANAGEMENT ============

  // ============ LIBRARY & TAGS ============

  /**
   * Search library templates with filters: q, tags[], visibility, page, limit
   */
  async searchLibrary(opts: { q?: string; tags?: string[]; visibility?: string; page?: number; limit?: number }) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    // basic text search on title/description
    const where: any = {};
    if (opts.q) {
      where.OR = [
        { title: { contains: opts.q, mode: 'insensitive' } },
        { description: { contains: opts.q, mode: 'insensitive' } },
      ];
    }
    if (opts.visibility) where.visibility = opts.visibility;

    // tags filter: inner join via TemplateTagOnTemplate -> TemplateTag
    let templates;
    if (opts.tags && opts.tags.length) {
      templates = await prisma.cBTSessionTemplate.findMany({
        where: {
          AND: [where, { tags: { some: { tag: { name: { in: opts.tags } } } } }],
        },
        include: { tags: { include: { tag: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    } else {
      templates = await prisma.cBTSessionTemplate.findMany({
        where,
        include: { tags: { include: { tag: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    }

    // map tags to names
    const mapped = templates.map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      isOfficial: t.isOfficial,
      visibility: t.visibility,
      tags: (t.tags || []).map((tt: any) => tt.tag.name),
      createdAt: t.createdAt,
      latestPublishedVersionId: t.latestPublishedVersionId,
    }));
    return mapped;
  }

  /**
   * Clone a template into a new template owned by therapist
   */
  async cloneTemplate(templateId: string, therapistId: string, opts?: { makePrivate?: boolean; title?: string }) {
    const src = await prisma.cBTSessionTemplate.findUnique({ where: { id: templateId }, include: { versions: { orderBy: { version: 'desc' }, take: 1 }, tags: { include: { tag: true } } } });
    if (!src) throw new Error('Template not found');

    const latest = src.versions && src.versions[0];
    const newTpl = await prisma.cBTSessionTemplate.create({
      data: {
        title: opts?.title ?? `${src.title} (copy)` ,
        description: src.description,
        therapistId,
        status: 'DRAFT',
        version: 1,
        isOfficial: false,
        originTemplateId: templateId,
        visibility: opts?.makePrivate ? 'PRIVATE' : 'ORG',
      },
    });

    // copy tags
    for (const tt of src.tags || []) {
      await prisma.templateTagOnTemplate.create({ data: { templateId: newTpl.id, tagId: tt.tag.id } as any });
    }

    // create initial version from latest snapshot (if exists)
    if (latest) {
      await prisma.cBTSessionVersion.create({ data: { sessionId: newTpl.id, version: 1, snapshotData: latest.snapshotData, createdBy: therapistId, isDraft: true, checksum: latest.checksum } });
    }

    return newTpl;
  }


  /**
   * Add question to template
   */
  async addQuestion(
    sessionId: string,
    data: {
      type: QuestionType;
      prompt: string;
      description?: string;
      orderIndex: number;
      isRequired?: boolean;
      helpText?: string;
      metadata?: any;
    }
  ): Promise<CBTQuestion> {
    // Shift existing questions with same or higher orderIndex
    const questionsToShift = await prisma.cBTQuestion.findMany({
      where: {
        sessionId,
        orderIndex: { gte: data.orderIndex },
      },
    });

    // Update all affected questions
    await Promise.all(
      questionsToShift.map((q: any) =>
        prisma.cBTQuestion.update({
          where: { id: q.id },
          data: { orderIndex: q.orderIndex + 1 },
        })
      )
    );

    return prisma.cBTQuestion.create({
      data: {
        sessionId,
        ...data,
      },
    });
  }

  /**
   * Update question
   */
  async updateQuestion(questionId: string, data: Partial<CBTQuestion>) {
    return prisma.cBTQuestion.update({
      where: { id: questionId },
      data,
    });
  }

  /**
   * Delete question (maintain orderIndex integrity)
   */
  async deleteQuestion(questionId: string) {
    const question = await prisma.cBTQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) throw new Error('Question not found');

    // Delete branching rules
    await prisma.questionBranchingRule.deleteMany({
      where: {
        OR: [
          { fromQuestionId: questionId },
          { toQuestionId: questionId },
        ],
      },
    });

    // Delete question
    await prisma.cBTQuestion.delete({
      where: { id: questionId },
    });

    // Shift remaining questions
    await prisma.cBTQuestion.updateMany({
      where: {
        sessionId: question.sessionId,
        orderIndex: { gt: question.orderIndex },
      },
      data: {
        orderIndex: { decrement: 1 },
      },
    });
  }

  // ============ BRANCHING LOGIC ============

  /**
   * Create branching rule (if answer = X → go to question Y)
   */
  async createBranchingRule(
    fromQuestionId: string,
    toQuestionId: string,
    data: {
      operator: BranchingConditionOperator;
      conditionValue: string;
      complexCondition?: any;
    }
  ): Promise<QuestionBranchingRule> {
    return prisma.questionBranchingRule.create({
      data: {
        fromQuestionId,
        toQuestionId,
        ...data,
        condition: {
          operator: data.operator,
          value: data.conditionValue,
        },
      },
    });
  }

  /**
   * Evaluate branching logic for patient response
   */
  async evaluateBranchingLogic(
    questionId: string,
    responseValue: any
  ): Promise<string | null> {
    const rules = await prisma.questionBranchingRule.findMany({
      where: { 
        fromQuestionId: questionId,
        isActive: true,
      },
      include: { toQuestion: true },
    });

    for (const rule of rules) {
      if (this.evaluateCondition(rule, responseValue)) {
        return rule.toQuestionId;
      }
    }

    return null; // Continue to next question in order
  }

  /**
   * Evaluate individual branching condition
   */
  private evaluateCondition(rule: QuestionBranchingRule, responseValue: any): boolean {
    const { operator, conditionValue, complexCondition } = rule;

    // Handle complex conditions (multiple AND conditions)
    if (complexCondition?.conditions && Array.isArray(complexCondition.conditions)) {
      return complexCondition.conditions.every((cond: any) =>
        this.compareValues(responseValue, operator, cond.value)
      );
    }

    return this.compareValues(responseValue, operator, conditionValue);
  }

  /**
   * Compare response value with condition value
   */
  private compareValues(value: any, operator: BranchingConditionOperator, compareWith: any): boolean {
    switch (operator) {
      case 'EQUALS':
        return value === compareWith;
      case 'NOT_EQUALS':
        return value !== compareWith;
      case 'CONTAINS':
        return String(value).includes(String(compareWith));
      case 'GREATER_THAN':
        return Number(value) > Number(compareWith);
      case 'LESS_THAN':
        return Number(value) < Number(compareWith);
      case 'IN_ARRAY':
        return Array.isArray(compareWith) ? compareWith.includes(value) : false;
      default:
        return false;
    }
  }

  // ============ PATIENT SESSION MANAGEMENT ============

  /**
   * Start a patient session from template
   */
  async startPatientSession(
    patientId: string,
    templateId: string,
    versionId?: string
  ): Promise<PatientSession> {
    const template = await prisma.cBTSessionTemplate.findUnique({
      where: { id: templateId },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!template) throw new Error('Template not found');

    // determine which version to use: explicit versionId (templateVersionId) preferred,
    // otherwise use latest published version for this template
    let versionRecord = null;
    if (versionId) {
      versionRecord = await prisma.cBTSessionVersion.findUnique({ where: { id: versionId } });
      if (!versionRecord) throw new Error('Requested template version not found');
      if (!versionRecord.publishedAt) {
        // allow starting from draft only for therapists/admins; for patients require published
        // For now, enforce published requirement
        throw new Error('Cannot start session from an unpublished draft');
      }
    } else {
      // Find latest published version for template
      versionRecord = await prisma.cBTSessionVersion.findFirst({ where: { sessionId: templateId, publishedAt: { not: null } }, orderBy: { version: 'desc' } });
      if (!versionRecord) throw new Error('No published version available for this template');
    }

    return prisma.patientSession.create({
      data: {
        patientId,
        templateId,
        templateVersion: versionRecord.version,
        templateVersionId: versionRecord.id,
        templateSnapshot: versionRecord.snapshotData,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });
  }

  /**
   * Get current question for patient session
   */
  async getCurrentQuestion(sessionId: string) {
    const session = await prisma.patientSession.findUnique({
      where: { id: sessionId },
      include: {
        template: {
          include: {
            questions: { 
              orderBy: { orderIndex: 'asc' },
              include: {
                branchingRules: true,
              },
            },
          },
        },
      },
    });

    if (!session) throw new Error('Session not found');

    const questions = session.template.questions;
    if (session.currentQuestionIndex >= questions.length) {
      return null; // Session complete
    }

    return questions[session.currentQuestionIndex];
  }

  /**
   * Record patient response and advance session
   */
  async recordResponse(
    sessionId: string,
    patientId: string,
    questionId: string,
    responseData: any,
    timeSpentSeconds?: number
  ): Promise<{ nextQuestionId: string | null; sessionComplete: boolean }> {
    // Store response
    const response = await prisma.patientSessionResponse.create({
      data: {
        sessionId,
        patientId,
        questionId,
        responseData,
        timeSpentSeconds,
      },
    });

    // Evaluate branching logic using compiled template snapshot when available
    let nextQuestionIdFromBranching: string | null = null;
    let usedRuleId: string | null = null;

    const session = await prisma.patientSession.findUnique({
      where: { id: sessionId },
      include: { template: { include: { questions: true } } },
    });

    if (!session) throw new Error('Session not found');

    const snapshot = (session as any).templateSnapshot;
    if (snapshot) {
      try {
        const engine = new BranchingEngine(snapshot as any);
        // reconstruct execution state from previous responses
        const prevResponses = await prisma.patientSessionResponse.findMany({
          where: { sessionId },
          orderBy: { answeredAt: 'asc' },
        });
        const state: any = { visited: new Set<string>(), answers: {}, step: 0 };
        for (const r of prevResponses) {
          state.answers[r.questionId] = r.responseData;
          state.visited.add(r.questionId);
          state.step += 1;
        }

        const decision = engine.runStep(questionId, responseData, state);
        nextQuestionIdFromBranching = decision.nextQuestionId || null;
        usedRuleId = decision.usedRuleId || null;

        // persist a branching audit entry for traceability
        try {
          await prisma.sessionAuditLog.create({
            data: {
              sessionId,
              userId: patientId,
              action: 'BRANCH_DECISION',
              entityType: 'PATIENT_SESSION',
              entityId: sessionId,
              changes: {
                fromQuestionId: questionId,
                toQuestionId: nextQuestionIdFromBranching,
                usedRuleId,
              },
            },
          } as any);
        } catch (e) {
          // non-fatal: continue even if audit log fails
        }
      } catch (err: any) {
        // engine-level errors (loop, maxdepth) — fall back to legacy rule evaluation
        try {
          await prisma.sessionAuditLog.create({ data: { sessionId, userId: patientId, action: 'BRANCH_ERROR', entityType: 'PATIENT_SESSION', entityId: sessionId, changes: { error: String(err?.message || err) } } } as any);
        } catch (_) {}
        nextQuestionIdFromBranching = await this.evaluateBranchingLogic(questionId, responseData);
      }
    } else {
      // no snapshot available — fall back to legacy DB-driven rules
      nextQuestionIdFromBranching = await this.evaluateBranchingLogic(questionId, responseData);
    }

    const questions = session.template.questions.sort((a: any, b: any) => a.orderIndex - b.orderIndex);
    let nextQuestionIndex = session.currentQuestionIndex + 1;

    // Handle branching
    if (nextQuestionIdFromBranching) {
      const nextQuestion = questions.find((q: any) => q.id === nextQuestionIdFromBranching);
      if (nextQuestion) {
        nextQuestionIndex = nextQuestion.orderIndex;
      }
    }

    // Check if session is complete
    const sessionComplete = nextQuestionIndex >= questions.length;

    // Update session
    const updateData: any = {
      currentQuestionIndex: nextQuestionIndex,
    };

    if (sessionComplete) {
      updateData.status = 'COMPLETED';
      updateData.completedAt = new Date();
    }

    await prisma.patientSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    const nextQuestion = questions[nextQuestionIndex] || null;

    return {
      nextQuestionId: nextQuestion?.id || null,
      sessionComplete,
    };
  }

  /**
   * Get session summary with all responses
   */
  async getSessionSummary(sessionId: string) {
    const session = await prisma.patientSession.findUnique({
      where: { id: sessionId },
      include: {
        template: {
          include: {
            questions: { orderBy: { orderIndex: 'asc' } },
          },
        },
        responses: {
          include: { question: true },
          orderBy: { answeredAt: 'asc' },
        },
      },
    });

    if (!session) throw new Error('Session not found');

    return {
      sessionId: session.id,
      patientId: session.patientId,
      templateId: session.templateId,
      templateVersion: session.templateVersion,
      status: session.status,
      totalQuestions: session.template.questions.length,
      completedQuestions: session.responses.length,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      responses: session.responses.map((r: any) => ({
        questionId: r.questionId,
        questionPrompt: r.question.prompt,
        responseData: r.responseData,
        timeSpentSeconds: r.timeSpentSeconds,
        answeredAt: r.answeredAt,
      })),
    };
  }

  /**
   * Abandon or pause session
   */
  async updateSessionStatus(
    sessionId: string,
    status: 'PAUSED' | 'ABANDONED'
  ) {
    return prisma.patientSession.update({
      where: { id: sessionId },
      data: {
        status,
        abandonedAt: status === 'ABANDONED' ? new Date() : undefined,
      },
    });
  }

  // ============ ANALYTICS & INSIGHTS ============

  /**
   * Get aggregated response statistics for a question
   */
  async getQuestionAnalytics(questionId: string) {
    const responses = await prisma.patientSessionResponse.findMany({
      where: { questionId },
      include: { question: true },
    });

    const totalResponses = responses.length;
    const question = responses[0]?.question;

    if (!question || totalResponses === 0) {
      return { questionId, totalResponses: 0, analytics: {} };
    }

    let analytics: any = {};

    switch (question.type) {
      case 'MULTIPLE_CHOICE':
      case 'CHECKBOX':
        // Count option selections
        const optionCounts: Record<string, number> = {};
          responses.forEach((r: any) => {
            const optionId = r.responseData.selectedOptionId || r.responseData.selectedOptions?.[0];
            if (optionId) {
              optionCounts[optionId] = (optionCounts[optionId] || 0) + 1;
            }
          });
        analytics = {
          optionCounts,
          mostCommon: Object.entries(optionCounts).sort(([, a], [, b]) => b - a)[0]?.[0],
        };
        break;

      case 'SLIDER':
        // Calculate statistics
        const values = responses
          .map((r: any) => Number(r.responseData.value))
          .filter((v: number) => !isNaN(v));
        analytics = {
          average: values.length ? values.reduce((a: number, b: number) => a + b) / values.length : 0,
          min: Math.min(...values),
          max: Math.max(...values),
          median: values.length ? values.sort((a: number, b: number) => a - b)[Math.floor(values.length / 2)] : 0,
        };
        break;

      case 'TEXT':
        // Store average length, sample responses
        const lengths = responses.map((r: any) => (r.responseData.text || '').length);
        analytics = {
          averageLength: lengths.reduce((a: number, b: number) => a + b, 0) / lengths.length,
          samples: responses.slice(0, 5).map((r: any) => r.responseData.text),
        };
        break;
    }

    // Update PatientResponse model with analytics
    await prisma.patientResponse.upsert({
      where: { questionId },
      create: {
        questionId,
        responseStats: analytics,
        totalResponses,
      },
      update: {
        responseStats: analytics,
        totalResponses,
      },
    });

    return {
      questionId,
      totalResponses,
      analytics,
    };
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(templateId: string) {
    const [sessions, completedCount, averageCompletionRate] = await Promise.all([
      prisma.patientSession.count({ where: { templateId } }),
      prisma.patientSession.count({
        where: { templateId, status: 'COMPLETED' },
      }),
      prisma.patientSession.aggregate({
        where: { templateId },
        _avg: { currentQuestionIndex: true },
      }),
    ]);

    return {
      templateId,
      totalSessions: sessions,
      completedSessions: completedCount,
      completionRate: sessions > 0 ? (completedCount / sessions) * 100 : 0,
      averageQuestionsAnswered: averageCompletionRate._avg?.currentQuestionIndex || 0,
    };
  }
}

export const cbtSessionService = new CBTSessionService();
