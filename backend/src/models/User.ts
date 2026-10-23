import { Schema, model, Document } from 'mongoose'; // Correto: importando do Mongoose

/**
 * Interface TypeScript que define o formato do objeto Usuário no código.
 * Estende o 'Document' do Mongoose para herdar métodos do banco de dados.
 */
export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string; // Por segurança, nunca salvamos a senha pura, apenas o hash criptografado
  balance: number;      // Saldo da conta bancária digital
  createdAt: Date;
}

/**
 * Schema do Mongoose: Define a estrutura e as regras dos dados
 * que serão salvos na coleção de usuários do MongoDB.
 */
const UserSchema = new Schema<IUser>({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,   // Garante que não teremos e-mails duplicados
    lowercase: true 
  },
  passwordHash: { 
    type: String, 
    required: true 
  },
  balance: { 
    type: Number, 
    default: 0.00   // Todo novo usuário começa com saldo zerado
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Exporta o Model para ser usado nas regras de negócio (Controllers)
export const User = model<IUser>('User', UserSchema);