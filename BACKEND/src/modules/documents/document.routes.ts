import { Router } from 'express';
import { DocumentController } from './document.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { requirePermission } from '../../common/middleware/rbac.middleware.js';
import { Permissions } from '../../common/types/rbac.types.js';

const router = Router();
const controller = new DocumentController();

router.use(authenticate);

// Anyone with DOCUMENTS_VIEW can view documents (parents see their students, staff see institutional docs)
router.get('/', requirePermission(Permissions.DOCUMENTS_VIEW), controller.getDocuments);
router.get('/student/:studentId', requirePermission(Permissions.DOCUMENTS_VIEW), controller.getStudentDocuments);
router.get('/:id', requirePermission(Permissions.DOCUMENTS_VIEW), controller.getDocumentById);

// Staff with DOCUMENTS_UPLOAD / DOCUMENTS_MANAGE
router.post('/', requirePermission(Permissions.DOCUMENTS_UPLOAD), controller.createDocument);
router.delete('/:id', requirePermission(Permissions.DOCUMENTS_MANAGE), controller.deleteDocument);

export default router;
