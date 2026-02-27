import { Router } from 'express';
import { cbtSessionController } from '../controllers/cbt-session.controller';
import { sessionExportController } from '../controllers/session-export.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// ============ TEMPLATE ROUTES ============

// Create template (therapist only)
router.post('/templates', requireRole('therapist'), (req, res) =>
  cbtSessionController.createTemplate(req, res)
);

// Get template details
router.get('/templates/:id', (req, res) =>
  cbtSessionController.getTemplate(req, res)
);

// Publish template
router.put('/templates/:id/publish', requireRole('therapist'), (req, res) =>
  cbtSessionController.publishTemplate(req, res)
);

// Create new version
router.post('/templates/:id/new-version', requireRole('therapist'), (req, res) =>
  cbtSessionController.createNewVersion(req, res)
);

// Get version history
router.get('/templates/:id/history', (req, res) =>
  cbtSessionController.getVersionHistory(req, res)
);

// Library listing and search
router.get('/library', (req, res) => cbtSessionController.listLibrary(req, res));

// Clone template from library
router.post('/library/clone', requireRole('therapist'), (req, res) => cbtSessionController.cloneTemplate(req, res));

// Duplicate a version (create new version from existing)
router.post('/templates/:id/versions/:versionId/duplicate', requireRole('therapist'), (req, res) =>
  cbtSessionController.duplicateVersion(req, res)
);

// Compare two versions
router.get('/templates/:id/versions/compare', requireRole('therapist'), (req, res) =>
  cbtSessionController.compareVersions(req, res)
);

// ============ QUESTION ROUTES ============

// Add question to template
router.post('/templates/:id/questions', requireRole('therapist'), (req, res) =>
  cbtSessionController.addQuestion(req, res)
);

// Update question
router.put('/questions/:id', requireRole('therapist'), (req, res) =>
  cbtSessionController.updateQuestion(req, res)
);

// Delete question
router.delete('/questions/:id', requireRole('therapist'), (req, res) =>
  cbtSessionController.deleteQuestion(req, res)
);

// ============ BRANCHING ROUTES ============

// Create branching rule
router.post('/branching-rules', requireRole('therapist'), (req, res) =>
  cbtSessionController.createBranchingRule(req, res)
);

// ============ PATIENT SESSION ROUTES ============

// Start session
router.post('/start', requireRole('patient'), (req, res) =>
  cbtSessionController.startSession(req, res)
);

// Get current question
router.get('/:id/current-question', (req, res) =>
  cbtSessionController.getCurrentQuestion(req, res)
);

// Record response
router.post('/:id/respond', (req, res) =>
  cbtSessionController.respondToQuestion(req, res)
);

// Get session summary
router.get('/:id/summary', (req, res) =>
  cbtSessionController.getSessionSummary(req, res)
);

// Update session status
router.put('/:id/status', (req, res) =>
  cbtSessionController.updateSessionStatus(req, res)
);

// Get missed events for client resync
router.get('/:id/events', (req, res) => cbtSessionController.getSessionEvents(req, res));

// ============ ANALYTICS ROUTES ============

// Get question analytics
router.get('/questions/:id/analytics', requireRole('therapist'), (req, res) =>
  cbtSessionController.getQuestionAnalytics(req, res)
);

// Get template stats
router.get('/templates/:id/stats', requireRole('therapist'), (req, res) =>
  cbtSessionController.getTemplateStats(req, res)
);

// ============ EXPORT ROUTES ============

// Export to PDF
router.post('/:id/export/pdf', (req, res) =>
  sessionExportController.exportToPDF(req, res)
);

// Export to CSV
router.post('/:id/export/csv', (req, res) =>
  sessionExportController.exportToCSV(req, res)
);

// Export to JSON
router.post('/:id/export/json', (req, res) =>
  sessionExportController.exportToJSON(req, res)
);

// Get export history
router.get('/:id/exports', (req, res) =>
  sessionExportController.getExportHistory(req, res)
);

export default router;
