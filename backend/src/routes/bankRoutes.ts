import { Router } from 'express';
import { BankController } from '../controllers/BankController';
import { authMiddleware } from '../middlewares/authMiddleware';

const bankRoutes = Router();
const bankController = new BankController();

// Todas as rotas abaixo exigem que o usuário esteja autenticado (passam pelo authMiddleware)
bankRoutes.use(authMiddleware);

bankRoutes.get('/profile', bankController.getProfile);   // Consultar dados/saldo
bankRoutes.get('/statement', bankController.getStatement);
bankRoutes.post('/deposit', bankController.deposit);     // Fazer depósito
bankRoutes.post('/transfer', bankController.transfer);   // Fazer transferência

export { bankRoutes };