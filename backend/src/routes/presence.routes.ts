import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { heartbeat, unloadBeacon, getSessionPresence } from '../controllers/presence.controller';

const router = Router();

router.post('/heartbeat', requireAuth, heartbeat);
router.post('/unload', requireAuth, unloadBeacon);
router.get('/session/:id', requireAuth, getSessionPresence);

export default router;
