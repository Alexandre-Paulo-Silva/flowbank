import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export class AuthController {
  
  /**
   * 📝 REGISTRO DE NOVO USUÁRIO
   * Cria uma conta no banco com senha criptografada (hash) e saldo inicial zero.
   */
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { name, email, password } = req.body;

      // 1. Validação básica de campos obrigatórios
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
      }

      // 2. Verifica se já existe um usuário cadastrado com este e-mail
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
      }

      // 3. SEGURANÇA: Criptografando a senha (Hash com salt de 10 rounds)
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // 4. Criação e salvamento do usuário no MongoDB
      const newUser = new User({
        name,
        email,
        passwordHash,
        balance: 0.00 // Conta começa zerada
      });

      await newUser.save();

      // Omitimos o passwordHash na resposta por segurança
      return res.status(201).json({
        message: 'Usuário cadastrado com sucesso!',
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          balance: newUser.balance
        }
      });

    } catch (error) {
      console.error('Erro no registro:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao cadastrar usuário.' });
    }
  }

  /**
   * 🔑 LOGIN DE USUÁRIO
   * Valida as credenciais e emite um Token JWT para acessar as rotas protegidas.
   */
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      // 1. Validação básica
      if (!email || !password) {
        return res.status(400).json({ error: 'Informe o e-mail e a senha.' });
      }

      // 2. Busca o usuário no banco pelo e-mail
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
      }

      // 3. SEGURANÇA: Compara a senha digitada com o Hash salvo no banco
      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
      }

      // 4. SEGURANÇA: Gera o Token JWT contendo o ID do usuário (expira em 7 dias)
      const secret = process.env.JWT_SECRET || 'default_secret';
      const token = jwt.sign({ id: user._id }, secret, { expiresIn: '7d' });

      // 5. Retorna o token e os dados básicos do usuário
      return res.json({
        message: 'Login realizado com sucesso!',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          balance: user.balance
        }
      });

    } catch (error) {
      console.error('Erro no login:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao realizar login.' });
    }
  }
}