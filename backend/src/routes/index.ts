import { Router } from 'express';
import authRoutes from './auth.routes';
import patientRoutes from './patient.routes';
import therapistRoutes from './therapist.routes';
import userRoutes from './user.routes';
import adminRoutes from './admin.routes';
import cbtSessionRoutes from './cbt-session.routes';
import presenceRoutes from './presence.routes';
import dashboardRoutes from './dashboard.routes';
import paymentRoutes from './payment.routes';
import subscriptionRoutes from './subscription.routes';
import webhookRoutes from './webhook.routes';
import leadRoutes from './lead.routes';
import patientV1Routes from './patient-v1.routes';
import patientSelfRoutes from './patient-self.routes';
import certificationRoutes from './certification.routes';
import landingRoutes from './landing.routes';
import chatRoutes from './chat.routes';
import riskAnalyticsRoutes from './riskAnalytics.routes';

const router = Router();

router.get('/health', (_req, res) => {
	res.status(200).json({
		status: 'ok',
		server: 'running',
		ok: true,
		service: 'manas360-backend',
		timestamp: new Date().toISOString(),
	});
});

router.use('/auth', authRoutes);
router.use('/v1/auth', authRoutes);
router.use('/v1', patientV1Routes);
router.use('/patient', patientSelfRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/patients', patientRoutes);
router.use('/v1/therapists', therapistRoutes);
router.use('/v1/therapist', therapistRoutes);
router.use('/v1/admin', adminRoutes);
router.use('/v1/cbt-sessions', cbtSessionRoutes);
router.use('/v1/presence', presenceRoutes);
router.use('/v1/therapist/dashboard', dashboardRoutes);
router.use('/v1/therapists/dashboard', dashboardRoutes);
router.use('/v1/payments', paymentRoutes);
router.use('/v1/subscriptions', subscriptionRoutes);
router.use('/v1/leads', leadRoutes);
router.use('/certifications', certificationRoutes);
router.use('/v1/certifications', certificationRoutes);
router.use('/landing', landingRoutes);
router.use('/v1/landing', landingRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/chat', chatRoutes);
router.use('/v1', riskAnalyticsRoutes);

export default router;

