import mongoose from 'mongoose';

/**
 * Função responsável por estabelecer a conexão com o banco de dados MongoDB
 * utilizando a biblioteca Mongoose.
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/banco-digital';
    
    // Tenta conectar ao MongoDB usando a URI definida nas variáveis de ambiente
    await mongoose.connect(mongoUri);
    
    console.log(' Conectado ao MongoDB com sucesso!');
  } catch (error) {
    console.error(' Erro ao conectar ao MongoDB:', error);
    // Encerra o processo da aplicação caso falhe a conexão com o banco de dados
    process.exit(1);
  }
};