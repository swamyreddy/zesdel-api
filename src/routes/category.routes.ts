import { Router } from 'express';
import { listCategories } from '../controllers/product.controller';

const router = Router();
router.get('/', listCategories);
export default router;
