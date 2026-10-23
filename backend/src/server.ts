import express, { Request, Response } from 'express';
import http from 'http'; // Módulo HTTP nativo do Node.js
import { Server } from 'socket.io'; // Biblioteca de WebSocket
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { authRoutes } from './routes/authRoutes'; // Importação das rotas de Autenticação (Cadastro e Login)
import { bankRoutes } from './routes/bankRoutes'; // Importação

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Criamos o servidor HTTP explicitamente para o Express e o Socket.io compartilharem a mesma porta
const server = http.createServer(app);

// Inicializamos o Socket.io permitindo conexões de qualquer origem (CORS aberto para desenvolvimento)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Gerenciamento de conexões WebSocket em tempo real
io.on('connection', (socket) => {
  console.log(`⚡ Novo cliente conectado via WebSocket: ${socket.id}`);

  // Evento para o usuário se "conectar à sua própria sala" baseada no ID dele
  socket.on('join_user_room', (userId: string) => {
    socket.join(userId);
    console.log(`Usuário ${userId} entrou na sua sala WebSocket privada.`);
  });

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});

// Exportamos o 'io' para que possamos usá-lo nos Controllers (ex: atualizações de saldo em tempo real)
export { io };

// 🔗 Registrando as rotas da API com o prefixo /api/auth
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3333;

app.get('/', (req: Request, res: Response) => {
  return res.json({ message: 'API do Banco Digital com WebSocket rodando com sucesso!' });
});

// Conecta ao banco de dados e só inicia o servidor HTTP/WebSocket após sucesso
connectDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Servidor e WebSocket rodando na porta ${PORT}`);
  });
});

app.use('/api/bank', bankRoutes); // Registro das rotas protegidas do banco