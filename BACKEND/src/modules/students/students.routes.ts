import { Router } from 'express';
import { StudentsController } from './students.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { requirePermission } from '../../common/middleware/rbac.middleware.js';
import { Permissions } from '../../common/types/rbac.types.js';

const router = Router();

router.use(authenticate);

// Student Directory & CRUD
router.get('/', requirePermission(Permissions.STUDENTS_VIEW), StudentsController.list);
router.get('/:id', requirePermission(Permissions.STUDENTS_VIEW), StudentsController.getById);
router.post('/', requirePermission(Permissions.STUDENTS_CREATE), StudentsController.create);
router.put('/:id', requirePermission(Permissions.STUDENTS_UPDATE), StudentsController.update);
router.patch('/:id/status', requirePermission(Permissions.STUDENTS_STATUS_UPDATE), StudentsController.updateStatus);

// Student 360 Subsystem Endpoints
router.get('/:id/360', requirePermission(Permissions.STUDENTS_VIEW), StudentsController.getStudent360);
router.post('/:id/documents', requirePermission(Permissions.STUDENTS_UPDATE), StudentsController.addDocument);
router.post('/:id/behaviour', requirePermission(Permissions.STUDENTS_UPDATE), StudentsController.addBehaviour);

export default router;
