import { Schema, model, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  sender?: Types.ObjectId | string;     // ID do usuário remetente
  receiver: Types.ObjectId | string;    // ID do usuário destinatário
  amount: number;                       // Valor da transação
  type: 'DEPOSIT' | 'TRANSFER';         // Tipo da transação
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['DEPOSIT', 'TRANSFER'], required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Transaction = model<ITransaction>('Transaction', TransactionSchema);