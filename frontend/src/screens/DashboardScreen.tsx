import React, { useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  Alert, 
  ScrollView, 
  StatusBar,
  Modal,
  FlatList,
  ActivityIndicator,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../services/api';
import { socket } from '../services/socket';
import { theme } from '../styles/theme';

interface DashboardProps {
  token: string;
  user: any;
  onLogout: () => void;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'transfer_in' | 'transfer_out';
  amount: number;
  description: string;
  createdAt: string;
  receiverEmail?: string;
  senderEmail?: string;
}

export const DashboardScreen: React.FC<DashboardProps> = ({ token, user, onLogout }) => {
  const [balance, setBalance] = useState(user.balance || 0);
  const [hideBalance, setHideBalance] = useState(false);
  
  const [depositCents, setDepositCents] = useState(0);
  const [transferCents, setTransferCents] = useState(0);
  const [qrCents, setQrCents] = useState(0);

  const [receiverEmail, setReceiverEmail] = useState('');

  // Estados do Modal de Extrato
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // Estado do Modal de Comprovante VIP
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Estados do Modal de QR Code / Pix
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [generatedQrCode, setGeneratedQrCode] = useState<string | null>(null);

  const [scannedInput, setScannedInput] = useState('');
  const [paymentPreview, setPaymentPreview] = useState<{ email: string; amount: number } | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const depositRef = useRef<View>(null);
  const transferRef = useRef<View>(null);

  useEffect(() => {
    socket.emit('join_user_room', user.id);

    socket.on('balance_update', (data: { balance: number }) => {
      setBalance(data.balance);
      if (isStatementOpen) fetchStatement();
    });

    return () => {
      socket.off('balance_update');
    };
  }, [user.id, isStatementOpen]);

  const formatCentsToCurrency = (cents: number): string => {
    if (!cents || cents === 0) return '';
    const realValue = cents / 100;
    return realValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleAmountChange = (text: string, setCents: (val: number) => void) => {
    const cleanNumbers = text.replace(/\D/g, '');
    if (!cleanNumbers) {
      setCents(0);
      return;
    }
    setCents(parseInt(cleanNumbers, 10));
  };

  const fetchStatement = async () => {
    setLoadingStatement(true);
    try {
      const response = await api.get('/bank/statement', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data.transactions || []);
    } catch (error: any) {
      setTransactions([
        { id: '1', type: 'deposit', amount: balance, description: 'Depósito Inicial / Saldo Atual', createdAt: new Date().toISOString() }
      ]);
    } finally {
      setLoadingStatement(false);
    }
  };

  const handleOpenStatement = () => {
    setIsStatementOpen(true);
    fetchStatement();
  };

  const scrollToDeposit = () => {
    depositRef.current?.measureLayout(
      scrollViewRef.current as any,
      (x, y) => scrollViewRef.current?.scrollTo({ y, animated: true }),
      () => {}
    );
  };

  const scrollToTransfer = () => {
    transferRef.current?.measureLayout(
      scrollViewRef.current as any,
      (x, y) => scrollViewRef.current?.scrollTo({ y, animated: true }),
      () => {}
    );
  };

  const handleDeposit = async () => {
    const numericAmount = depositCents / 100;
    if (numericAmount <= 0) {
      return Alert.alert('Atenção', 'Informe um valor válido para depósito.');
    }
    try {
      const response = await api.post('/bank/deposit', { amount: numericAmount }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newTx: Transaction = {
        id: response.data.transaction?.id || String(Date.now()),
        type: 'deposit',
        amount: numericAmount,
        description: 'Depósito na Conta',
        createdAt: new Date().toISOString()
      };

      setDepositCents(0);
      setSelectedTransaction(newTx);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao depositar.');
    }
  };

  const handleTransfer = async () => {
    const numericAmount = transferCents / 100;
    if (!receiverEmail || numericAmount <= 0) {
      return Alert.alert('Atenção', 'Preencha o e-mail e um valor válido para transferir.');
    }
    try {
      const response = await api.post('/bank/transfer', {
        receiverEmail,
        amount: numericAmount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newTx: Transaction = {
        id: response.data.transaction?.id || String(Date.now()),
        type: 'transfer_out',
        amount: numericAmount,
        description: `Transferência para ${receiverEmail}`,
        receiverEmail,
        senderEmail: user.email,
        createdAt: new Date().toISOString()
      };

      setTransferCents(0);
      setReceiverEmail('');
      setSelectedTransaction(newTx);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao transferir.');
    }
  };

  const handleGenerateQr = () => {
    const numericAmount = qrCents / 100;
    if (numericAmount <= 0) {
      return Alert.alert('Atenção', 'Informe um valor válido para gerar a cobrança.');
    }
    const payload = JSON.stringify({ email: user.email, amount: numericAmount });
    setGeneratedQrCode(payload);
  };

  const handleProcessScannedCode = (codeData: string) => {
    try {
      const parsed = JSON.parse(codeData);
      if (parsed.email && parsed.amount) {
        if (parsed.email === user.email) {
          return Alert.alert('Atenção', 'Não pode pagar um QR Code gerado por você mesmo.');
        }
        setPaymentPreview({ email: parsed.email, amount: Number(parsed.amount) });
        setScannedInput('');
      } else {
        Alert.alert('Erro', 'O código QR não contém os dados válidos do Pix.');
      }
    } catch (e) {
      Alert.alert('Erro', 'Formato de QR Code inválido.');
    }
  };

  const handleConfirmPixPayment = async () => {
    if (!paymentPreview) return;
    try {
      const response = await api.post('/bank/transfer', {
        receiverEmail: paymentPreview.email,
        amount: paymentPreview.amount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newTx: Transaction = {
        id: response.data.transaction?.id || String(Date.now()),
        type: 'transfer_out',
        amount: paymentPreview.amount,
        description: `Pix enviado para ${paymentPreview.email}`,
        receiverEmail: paymentPreview.email,
        senderEmail: user.email,
        createdAt: new Date().toISOString()
      };

      setIsQrModalOpen(false);
      setPaymentPreview(null);
      setGeneratedQrCode(null);
      setQrCents(0);
      setSelectedTransaction(newTx);
    } catch (error: any) {
      Alert.alert('Erro no Pagamento', error.response?.data?.error || 'Não foi possível concluir a transferência.');
    }
  };

  const handleShareReceipt = async () => {
    if (!selectedTransaction) return;
    const message = `
✨ COMPROVANTE FLOWBANK BLACK ✨
--------------------------------
Tipo: ${selectedTransaction.description}
Valor: R$ ${selectedTransaction.amount.toFixed(2)}
Data: ${new Date(selectedTransaction.createdAt).toLocaleString('pt-BR')}
ID Transação: ${selectedTransaction.id}
--------------------------------
FlowBank - O seu banco digital VIP.
    `;
    try {
      await Share.share({ message });
    } catch (error) {
      console.log('Erro ao compartilhar', error);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
      
      {/* HEADER BLACK & GOLD */}
      <View style={styles.header}>
        <View style={styles.userAvatar}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setHideBalance(!hideBalance)} style={styles.iconButton}>
            <Ionicons name={hideBalance ? "eye-off-outline" : "eye-outline"} size={20} color="#D4AF37" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>Olá, <Text style={styles.goldText}>{user.name}</Text> ✨</Text>

        {/* CARTÃO DE SALDO */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Conta FlowBank Black</Text>
            <View style={styles.liveBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.liveIndicator}>Ao vivo</Text>
            </View>
          </View>
          <Text style={styles.balanceValue}>
            {hideBalance ? 'R$ ••••••' : `R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          </Text>
          <Text style={styles.balanceSubtext}>Rendimento exclusivo de 120% do CDI</Text>
        </View>

        {/* ATALHOS RÁPIDOS */}
        <View style={styles.shortcutsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcutsScroll}>
            <TouchableOpacity style={styles.shortcutItem} onPress={scrollToDeposit}>
              <View style={styles.shortcutCircle}>
                <Ionicons name="add-circle-outline" size={26} color="#D4AF37" />
              </View>
              <Text style={styles.shortcutText}>Depositar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shortcutItem} onPress={scrollToTransfer}>
              <View style={styles.shortcutCircle}>
                <Ionicons name="swap-horizontal-outline" size={26} color="#D4AF37" />
              </View>
              <Text style={styles.shortcutText}>Transferir</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shortcutItem} onPress={() => setIsQrModalOpen(true)}>
              <View style={styles.shortcutCircle}>
                <Ionicons name="qr-code-outline" size={26} color="#D4AF37" />
              </View>
              <Text style={styles.shortcutText}>Pix QR</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shortcutItem} onPress={handleOpenStatement}>
              <View style={styles.shortcutCircle}>
                <Ionicons name="document-text-outline" size={26} color="#D4AF37" />
              </View>
              <Text style={styles.shortcutText}>Extrato</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shortcutItem} onPress={() => Alert.alert('Benefícios VIP', 'Sua conta Black dá acesso a Cashback de 2% e salas VIP nos aeroportos!')}>
              <View style={styles.shortcutCircle}>
                <Ionicons name="star-outline" size={26} color="#D4AF37" />
              </View>
              <Text style={styles.shortcutText}>Benefícios</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* TRANSAÇÕES DIRETA */}
        <View style={styles.row}>
          <View ref={depositRef} style={styles.actionCard}>
            <View style={styles.cardHeaderTitle}>
              <Ionicons name="wallet-outline" size={22} color="#D4AF37" style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Depositar na Conta</Text>
            </View>
            <Text style={styles.cardSubtitle}>Adicione saldo instantaneamente</Text>
            <TextInput
              style={styles.input}
              placeholder="R$ 0,00"
              placeholderTextColor={theme.colors.textGray}
              keyboardType="numeric"
              value={depositCents > 0 ? `R$ ${formatCentsToCurrency(depositCents)}` : ''}
              onChangeText={(text) => handleAmountChange(text, setDepositCents)}
            />
            <TouchableOpacity style={styles.successButton} onPress={handleDeposit}>
              <Text style={styles.buttonText}>Confirmar Depósito</Text>
            </TouchableOpacity>
          </View>

          <View ref={transferRef} style={styles.actionCard}>
            <View style={styles.cardHeaderTitle}>
              <Ionicons name="send-outline" size={20} color="#D4AF37" style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Transferir Pix / Conta</Text>
            </View>
            <Text style={styles.cardSubtitle}>Envie dinheiro com segurança</Text>
            <TextInput
              style={styles.input}
              placeholder="E-mail do destinatário"
              placeholderTextColor={theme.colors.textGray}
              value={receiverEmail}
              onChangeText={setReceiverEmail}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="R$ 0,00"
              placeholderTextColor={theme.colors.textGray}
              keyboardType="numeric"
              value={transferCents > 0 ? `R$ ${formatCentsToCurrency(transferCents)}` : ''}
              onChangeText={(text) => handleAmountChange(text, setTransferCents)}
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleTransfer}>
              <Text style={styles.buttonDarkText}>Realizar Transferência</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* MODAL DE EXTRATO */}
      <Modal visible={isStatementOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="document-text-outline" size={22} color="#D4AF37" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Extrato da Conta</Text>
              </View>
              <TouchableOpacity onPress={() => setIsStatementOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            {loadingStatement ? (
              <ActivityIndicator size="large" color="#D4AF37" style={{ marginVertical: 40 }} />
            ) : transactions.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma movimentação registrada.</Text>
            ) : (
              <FlatList
                data={transactions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.transactionItem}
                    onPress={() => setSelectedTransaction(item)}
                  >
                    <View style={styles.txIconContainer}>
                      <Ionicons 
                        name={item.type === 'deposit' || item.type === 'transfer_in' ? "arrow-down-circle" : "arrow-up-circle"} 
                        size={24} 
                        color={item.type === 'deposit' || item.type === 'transfer_in' ? '#10B981' : '#EF4444'} 
                      />
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txDescription}>{item.description}</Text>
                      <Text style={styles.txDate}>{new Date(item.createdAt).toLocaleString('pt-BR')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.txAmount, { color: item.type === 'deposit' || item.type === 'transfer_in' ? '#10B981' : '#EF4444' }]}>
                        {item.type === 'deposit' || item.type === 'transfer_in' ? '+' : '-'} R$ {item.amount.toFixed(2)}
                      </Text>
                      <Text style={styles.viewReceiptText}>Ver comprovante ›</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL DE COMPROVANTE VIP ELEGANTE */}
      <Modal visible={!!selectedTransaction} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.receiptContainer}>
            <View style={styles.receiptHeader}>
              <View style={styles.goldBadgeIcon}>
                <Ionicons name="checkmark-circle" size={42} color="#D4AF37" />
              </View>
              <Text style={styles.receiptBankTitle}>FlowBank <Text style={{ color: '#D4AF37' }}>Black</Text></Text>
              <Text style={styles.receiptStatusText}>Comprovante de Transação</Text>
            </View>

            {selectedTransaction && (
              <View style={styles.receiptBody}>
                <Text style={styles.receiptAmountLabel}>Valor da operação</Text>
                <Text style={styles.receiptAmountValue}>
                  R$ {selectedTransaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptLabel}>Tipo de Transação</Text>
                  <Text style={styles.receiptValue}>{selectedTransaction.description}</Text>
                </View>

                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptLabel}>Data e Hora</Text>
                  <Text style={styles.receiptValue}>{new Date(selectedTransaction.createdAt).toLocaleString('pt-BR')}</Text>
                </View>

                {selectedTransaction.receiverEmail && (
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptLabel}>Destinatário</Text>
                    <Text style={styles.receiptValue}>{selectedTransaction.receiverEmail}</Text>
                  </View>
                )}

                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptLabel}>Pagador</Text>
                  <Text style={styles.receiptValue}>{user.name} ({user.email})</Text>
                </View>

                <View style={styles.receiptDetailRow}>
                  <Text style={styles.receiptLabel}>Instituição</Text>
                  <Text style={styles.receiptValue}>FlowBank S.A. (388)</Text>
                </View>

                <View style={styles.receiptDivider} />

                <Text style={styles.receiptIdLabel}>Autenticação Digital:</Text>
                <Text style={styles.receiptIdCode}>{selectedTransaction.id.toUpperCase()}-FB-BLACK</Text>
              </View>
            )}

            <View style={styles.receiptActions}>
              <TouchableOpacity style={styles.primaryButton} onPress={handleShareReceipt}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="share-social-outline" size={18} color="#0F0F0F" />
                  <Text style={styles.buttonDarkText}>Compartilhar</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeReceiptButton} onPress={() => setSelectedTransaction(null)}>
                <Text style={{ color: '#9CA3AF', fontWeight: 'bold' }}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL PIX QR CODE */}
      <Modal visible={isQrModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="qr-code-outline" size={22} color="#D4AF37" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Área Pix & QR Code</Text>
              </View>
              <TouchableOpacity onPress={() => { setIsQrModalOpen(false); setPaymentPreview(null); }} style={styles.closeButton}>
                <Ionicons name="close" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              
              {paymentPreview ? (
                <View style={styles.confirmContainer}>
                  <View style={styles.confirmIconCircle}>
                    <Ionicons name="swap-horizontal" size={32} color="#D4AF37" />
                  </View>
                  <Text style={styles.confirmTitle}>Resumo do Pix</Text>
                  
                  <View style={styles.confirmBox}>
                    <Text style={styles.confirmLabel}>Quem envia:</Text>
                    <Text style={styles.confirmValue}>{user.name} ({user.email})</Text>

                    <View style={styles.miniDivider} />

                    <Text style={styles.confirmLabel}>Quem recebe:</Text>
                    <Text style={styles.confirmValue}>{paymentPreview.email}</Text>

                    <View style={styles.miniDivider} />

                    <Text style={styles.confirmLabel}>Valor total:</Text>
                    <Text style={styles.confirmAmount}>R$ {paymentPreview.amount.toFixed(2)}</Text>
                  </View>

                  <TouchableOpacity style={styles.successButton} onPress={handleConfirmPixPayment}>
                    <Text style={styles.buttonText}>Confirmar e Enviar Pix</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelTextButton} onPress={() => setPaymentPreview(null)}>
                    <Text style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 14 }}>Ler outro código QR</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Pagar via Leitor / Código QR</Text>
                  <Text style={styles.cardSubtitle}>Insira ou cole os dados do QR Code para avançar:</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Cole aqui os dados do QR Code..."
                    placeholderTextColor={theme.colors.textGray}
                    value={scannedInput}
                    onChangeText={setScannedInput}
                  />
                  <TouchableOpacity 
                    style={styles.successButton} 
                    onPress={() => handleProcessScannedCode(scannedInput)}
                  >
                    <Text style={styles.buttonText}>Ler e Mostrar Resumo</Text>
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <Text style={styles.sectionTitle}>Cobrar (Gerar QR Code)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="R$ 0,00"
                    placeholderTextColor={theme.colors.textGray}
                    keyboardType="numeric"
                    value={qrCents > 0 ? `R$ ${formatCentsToCurrency(qrCents)}` : ''}
                    onChangeText={(text) => handleAmountChange(text, setQrCents)}
                  />
                  <TouchableOpacity style={styles.primaryButton} onPress={handleGenerateQr}>
                    <Text style={styles.buttonDarkText}>Gerar Meu QR Code</Text>
                  </TouchableOpacity>

                  {generatedQrCode && (
                    <View style={styles.qrDisplayContainer}>
                      <Text style={styles.qrLabel}>Mostre para quem vai pagar:</Text>
                      <View style={styles.qrWrapper}>
                        <QRCode
                          value={generatedQrCode}
                          size={160}
                          color="#0F0F0F"
                          backgroundColor="#FFFFFF"
                        />
                      </View>
                      <Text style={styles.codePayload}>{generatedQrCode}</Text>
                    </View>
                  )}
                </>
              )}

            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#0F0F0F' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingTop: 40, 
    paddingBottom: 20, 
    backgroundColor: '#0F0F0F' 
  },
  userAvatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#1A1A1A', 
    borderWidth: 1,
    borderColor: '#D4AF37',
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  avatarText: { color: '#D4AF37', fontSize: 18, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#1A1A1A', 
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  logoutButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#1A1A1A', 
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40, alignItems: 'center' },
  greeting: { width: '100%', maxWidth: 800, fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 20, paddingHorizontal: 4 },
  goldText: { color: '#D4AF37' },

  balanceCard: { 
    width: '100%', 
    maxWidth: 800, 
    backgroundColor: '#1A1A1A', 
    borderRadius: 20, 
    padding: 24, 
    marginBottom: 20, 
    borderWidth: 1,
    borderColor: '#332E14',
    shadowColor: '#D4AF37', 
    shadowOpacity: 0.15, 
    shadowRadius: 15, 
    elevation: 5 
  },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  balanceLabel: { fontSize: 15, fontWeight: '600', color: '#D4AF37' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  liveIndicator: { fontSize: 11, fontWeight: 'bold', color: '#10B981' },
  balanceValue: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  balanceSubtext: { fontSize: 12, color: theme.colors.textGray },

  shortcutsContainer: { width: '100%', maxWidth: 800, marginBottom: 25 },
  shortcutsScroll: { gap: 16, paddingVertical: 5 },
  shortcutItem: { alignItems: 'center', width: 80 },
  shortcutCircle: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: '#1A1A1A', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#332E14'
  },
  shortcutText: { fontSize: 12, color: '#D4AF37', fontWeight: '500', textAlign: 'center' },

  row: { width: '100%', maxWidth: 800, flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  actionCard: { 
    flex: 1, 
    minWidth: 320, 
    backgroundColor: '#1A1A1A', 
    borderRadius: 20, 
    padding: 24, 
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000', 
    shadowOpacity: 0.3, 
    shadowRadius: 10, 
    elevation: 3 
  },
  cardHeaderTitle: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  cardSubtitle: { fontSize: 12, color: theme.colors.textGray, marginBottom: 16 },
  input: { 
    backgroundColor: '#0F0F0F', 
    borderWidth: 1, 
    borderColor: '#2A2A2A', 
    padding: 14, 
    borderRadius: 12, 
    marginBottom: 14, 
    fontSize: 14, 
    color: '#FFFFFF' 
  },
  successButton: { backgroundColor: theme.colors.success, padding: 14, borderRadius: 12, alignItems: 'center', width: '100%' },
  primaryButton: { backgroundColor: '#D4AF37', padding: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  buttonDarkText: { color: '#0F0F0F', fontSize: 14, fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { width: '100%', maxWidth: 600, backgroundColor: '#1A1A1A', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#D4AF37', maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#2A2A2A', paddingBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#D4AF37' },
  closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#9CA3AF', textAlign: 'center', marginVertical: 30, fontSize: 14 },
  
  transactionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  txIconContainer: { marginRight: 12 },
  txInfo: { flex: 1 },
  txDescription: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  txDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: 'bold' },
  viewReceiptText: { fontSize: 10, color: '#D4AF37', marginTop: 2, fontWeight: 'bold' },

  // Comprovante VIP
  receiptContainer: { width: '100%', maxWidth: 480, backgroundColor: '#141414', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#D4AF37', shadowColor: '#D4AF37', shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
  receiptHeader: { alignItems: 'center', marginBottom: 16 },
  goldBadgeIcon: { marginBottom: 8 },
  receiptBankTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  receiptStatusText: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  receiptBody: { backgroundColor: '#0F0F0F', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#2A2A2A', marginBottom: 20 },
  receiptAmountLabel: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  receiptAmountValue: { fontSize: 28, fontWeight: 'bold', color: '#10B981', textAlign: 'center', marginTop: 4, marginBottom: 12 },
  receiptDivider: { height: 1, backgroundColor: '#2A2A2A', marginVertical: 12 },
  receiptDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  receiptLabel: { fontSize: 12, color: '#9CA3AF' },
  receiptValue: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  receiptIdLabel: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 4 },
  receiptIdCode: { fontSize: 11, color: '#D4AF37', fontFamily: 'monospace', textAlign: 'center', fontWeight: 'bold', marginTop: 2 },
  receiptActions: { gap: 10 },
  closeReceiptButton: { alignItems: 'center', paddingVertical: 12 },

  // Estilos Adicionais do Pix Preview
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6, marginTop: 10 },
  qrDisplayContainer: { marginTop: 15, padding: 15, backgroundColor: '#0F0F0F', borderRadius: 12, borderWidth: 1, borderColor: '#D4AF37', alignItems: 'center' },
  qrWrapper: { padding: 10, backgroundColor: '#FFFFFF', borderRadius: 10, marginVertical: 10 },
  qrLabel: { color: '#D4AF37', fontSize: 12, fontWeight: 'bold' },
  codePayload: { color: '#9CA3AF', fontSize: 10, fontFamily: 'monospace', textAlign: 'center', marginTop: 5 },
  divider: { height: 1, backgroundColor: '#2A2A2A', marginVertical: 20 },
  confirmContainer: { alignItems: 'center', paddingVertical: 10 },
  confirmIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#0F0F0F', borderWidth: 1, borderColor: '#D4AF37', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  confirmTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 15 },
  confirmBox: { width: '100%', backgroundColor: '#0F0F0F', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2A2A2A', marginBottom: 20 },
  confirmLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  confirmValue: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
  confirmAmount: { fontSize: 22, color: '#10B981', fontWeight: 'bold', marginTop: 4 },
  miniDivider: { height: 1, backgroundColor: '#2A2A2A', marginVertical: 10 },
  cancelTextButton: { width: '100%' }
});