import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const authRoutes = Router();
const authController = new AuthController();

// Rota de Cadastro: POST /api/auth/register
authRoutes.post('/register', authController.register);

// Rota de Login: POST /api/auth/login
authRoutes.post('/login', authController.login);

export { authRoutes };