# 🏦 FlowBank Black — Banco Digital VIP

> Uma aplicação bancária full-stack de alto nível com design moderno **Black & Gold VIP**, atualizações de saldo em tempo real, transações Pix, máscaras monetárias inteligentes e geração de comprovantes detalhados.

---

## 📸 Demonstração do Sistema

![Dashboard FlowBank Black](./frontend/assets/dashboard-preview.png)
*(Substitua o caminho acima pela imagem ou GIF da tela principal do seu sistema)*

---

## ✨ Recursos do Sistema

* 🔐 **Autenticação Segura**: Cadastro e Login de usuários com tratamento completo de erros visuais em tempo real (ex: e-mail duplicado, credenciais incorretas).
* ⚡ **Saldo Ao Vivo (Real-Time)**: Atualização instantânea do saldo bancário através de WebSockets (**Socket.io**).
* 💸 **Área Pix & QR Code**:
  * Gerador de QR Code personalizado para cobrança.
  * Leitor e processador de código Pix com resumo e confirmação antes do envio.
  * Bloqueio inteligente contra auto-transferências.
* 💵 **Máscara Monetária nos Centavos**: Input de valores em padrão financeiro brasileiro (`R$ 0,00`) com formatação automática durante a digitação.
* 📄 **Extrato com Comprovante VIP**:
  * Histórico de depósitos e transferências.
  * Visualização de comprovante estilo recibo com ID de autenticação único.
  * Opção de compartilhamento de comprovante via texto/redes sociais.

---

## 🛠️ Tecnologias Utilizadas

### **Front-end (Mobile & Web)**
* **Expo** (SDK 51+) / **React Native**
* **TypeScript**
* **Socket.io-client** (Comunicação em tempo real)
* **Axios** (Integração com API REST)
* **@expo/vector-icons** & **react-native-qrcode-svg**

### **Back-end**
* **Node.js** com **Express**
* **MongoDB** (Mongoose)
* **Socket.io** (Servidor WebSocket)
* **JWT (JSON Web Token)** & **Bcrypt** (Autenticação e Criptografia)

---

## 🚀 Como Executar o Projeto Localmente

### 📋 Pré-requisitos
* **Node.js** (v18 ou superior)
* **npm** ou **yarn**
* Instância do **MongoDB** rodando (local ou MongoDB Atlas)

---

### 1️⃣ Clonar o Repositório
```bash
git clone [https://github.com/Alexandre-Paulo-Silva/flowbank.git](https://github.com/Alexandre-Paulo-Silva/flowbank.git)
cd flowbank
