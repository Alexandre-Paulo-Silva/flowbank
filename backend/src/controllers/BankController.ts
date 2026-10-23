import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { io } from '../server'; // Importa a instância do Socket.io para envio em tempo real

export class BankController {

  /**
   * 👤 CONSULTAR SALDO E DADOS DO USUÁRIO
   */
  async getProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const user = await User.findById(userId).select('-passwordHash'); // Exclui a senha por segurança

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      return res.json(user);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar dados da conta.' });
    }
  }

  /**
   * 📄 CONSULTAR EXTRATO DE TRANSAÇÕES
   */
  async getStatement(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;

      // Busca todas as transações onde o usuário é o remetente ou o destinatário
      const transactions = await Transaction.find({
        $or: [{ sender: userId }, { receiver: userId }]
      })
      .sort({ createdAt: -1 }) // Transações mais recentes primeiro
      .populate('sender', 'name email')
      .populate('receiver', 'name email');

      // Formata os dados para o Front-End
      const formattedTransactions = transactions.map((tx: any) => {
        let type: 'deposit' | 'transfer_in' | 'transfer_out' = 'deposit';
        let description = 'Depósito em conta';

        if (tx.type === 'TRANSFER') {
          if (tx.sender && tx.sender._id.toString() === userId) {
            type = 'transfer_out';
            description = `Transferência para ${tx.receiver?.name || tx.receiver?.email || 'Usuário'}`;
          } else {
            type = 'transfer_in';
            description = `Transferência de ${tx.sender?.name || tx.sender?.email || 'Usuário'}`;
          }
        }

        return {
          id: tx._id,
          type,
          amount: tx.amount,
          description,
          createdAt: tx.createdAt,
        };
      });

      return res.json({ transactions: formattedTransactions });
    } catch (error) {
      console.error('Erro ao buscar extrato:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar extrato.' });
    }
  }

  /**
   * 💵 REALIZAR DEPÓSITO (Adicionar saldo na própria conta)
   */
  async deposit(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.userId;
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Informe um valor válido para depósito.' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      // Atualiza o saldo
      user.balance += Number(amount);
      await user.save();

      // Registra a transação
      await Transaction.create({
        receiver: user._id,
        amount: Number(amount),
        type: 'DEPOSIT'
      });

      // ⚡ WEBSOCKET: Emite o novo saldo em tempo real para a sala privada do usuário
      io.to(String(user._id)).emit('balance_update', { balance: user.balance });

      return res.json({
        message: 'Depósito realizado com sucesso!',
        newBalance: user.balance
      });
    } catch (error) {
      console.error('Erro no depósito:', error);
      return res.status(500).json({ error: 'Erro interno ao realizar depósito.' });
    }
  }

  /**
   * 🔄 TRANSFERÊNCIA ENTRE CONTAS
   */
  async transfer(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const senderId = req.userId;
      const { receiverEmail, amount } = req.body;

      if (!receiverEmail || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Informe o e-mail do destinatário e um valor válido.' });
      }

      // Busca o remetente
      const sender = await User.findById(senderId);
      if (!sender) {
        return res.status(404).json({ error: 'Remetente não encontrado.' });
      }

      // Verifica se o saldo é suficiente
      if (sender.balance < amount) {
        return res.status(400).json({ error: 'Saldo insuficiente para realizar a transferência.' });
      }

      // Busca o destinatário pelo e-mail
      const receiver = await User.findOne({ email: receiverEmail });
      if (!receiver) {
        return res.status(404).json({ error: 'Conta de destino (e-mail) não encontrada.' });
      }

      // Impede transferências para si mesmo
      if (sender._id.equals(receiver._id)) {
        return res.status(400).json({ error: 'Você não pode transferir dinheiro para si mesmo.' });
      }

      // Realiza a movimentação financeira
      sender.balance -= Number(amount);
      receiver.balance += Number(amount);

      await sender.save();
      await receiver.save();

      // Registra a transação no histórico
      await Transaction.create({
        sender: sender._id,
        receiver: receiver._id,
        amount: Number(amount),
        type: 'TRANSFER'
      });

      // ⚡ WEBSOCKET: Atualiza o saldo de AMBOS em tempo real nas respectivas salas privadas
      io.to(String(sender._id)).emit('balance_update', { balance: sender.balance });
      io.to(String(receiver._id)).emit('balance_update', { balance: receiver.balance });

      return res.json({
        message: 'Transferência realizada com sucesso!',
        senderNewBalance: sender.balance
      });
    } catch (error) {
      console.error('Erro na transferência:', error);
      return res.status(500).json({ error: 'Erro interno ao realizar transferência.' });
    }
  }
}