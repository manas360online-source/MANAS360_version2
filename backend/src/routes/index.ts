import { Router } from 'express';
import authRoutes from './auth.routes';
import patientRoutes from './patient.routes';
import therapistRoutes from './therapist.routes';
import userRoutes from './user.routes';
import adminRoutes from './admin.routes';
import cbtSessionRoutes from './cbt-session.routes';
import presenceRoutes from './presence.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

router.get('/health', (_req, res) => {
	res.status(200).json({
		ok: true,
		service: 'manas360-backend',
		timestamp: new Date().toISOString(),
	});
});

router.use('/auth', authRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/patients', patientRoutes);
router.use('/v1/therapists', therapistRoutes);
router.use('/v1/admin', adminRoutes);
router.use('/v1/cbt-sessions', cbtSessionRoutes);
router.use('/v1/presence', presenceRoutes);
router.use('/api/v1/therapist/dashboard', dashboardRoutes);

export default router;

