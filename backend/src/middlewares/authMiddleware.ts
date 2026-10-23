import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Interface para estender o Request do Express e permitir armazenar o ID do usuário autenticado
export interface AuthRequest extends Request {
  userId?: string;
}

/**
 *  MIDDLEWARE DE AUTENTICAÇÃO JWT
 * Intercepta rotas protegidas para verificar se o usuário possui um token válido.
 */
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  // O token geralmente é enviado no header Authorization no formato: "Bearer SEU_TOKEN_AQUI"
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Erro no formato do token.' });
  }

  const [scheme, token] = parts;

  // Verifica se a palavra 'Bearer' está presente no cabeçalho
  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: 'Token mal formatado.' });
  }

  // Valida o token usando a chave secreta configurada no .env
  const secret = process.env.JWT_SECRET || 'default_secret';

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    // Se o token for válido, salvamos o ID do usuário na requisição para uso posterior no Controller
    const tokenPayload = decoded as { id: string };
    req.userId = tokenPayload.id;

    return next(); // Permite que a requisição siga para a rota desejada
  });
};