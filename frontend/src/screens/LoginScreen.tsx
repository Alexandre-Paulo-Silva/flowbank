import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';

export const LoginScreen = ({ onLoginSuccess, onNavigateToRegister }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Por favor, preencha o e-mail e a palavra-passe.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      
      const { token, user } = response.data;
      onLoginSuccess(token, user);
    } catch (error: any) {
      const apiError = error.response?.data?.error || 'E-mail ou palavra-passe incorretos.';
      setErrorMessage(apiError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
      
      <View style={styles.cardContainer}>
        <View style={styles.logoCircle}>
          <Ionicons name="diamond-outline" size={32} color="#D4AF37" />
        </View>

        <Text style={styles.title}>FlowBank <Text style={{ color: '#D4AF37' }}>Black</Text></Text>
        <Text style={styles.subtitle}>Aceda à sua conta VIP</Text>

        {/* Alerta de Erro estilizado em destaque */}
        {!!errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#6B7280"
          value={email}
          onChangeText={(text) => { setEmail(text); setErrorMessage(''); }}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Palavra-passe"
          placeholderTextColor="#6B7280"
          secureTextEntry
          value={password}
          onChangeText={(text) => { setPassword(text); setErrorMessage(''); }}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#0F0F0F" />
          ) : (
            <Text style={styles.buttonText}>Entrar na Conta</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onNavigateToRegister} style={styles.registerLink}>
          <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center' }}>
            Ainda não tem conta Black? <Text style={{ color: '#D4AF37', fontWeight: 'bold' }}>Cadastre-se</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0F0F0F', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#332E14',
    shadowColor: '#D4AF37',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 },
  input: { 
    backgroundColor: '#0F0F0F', 
    borderWidth: 1, 
    borderColor: '#2A2A2A', 
    padding: 14, 
    borderRadius: 12, 
    color: '#FFF', 
    marginBottom: 14,
    fontSize: 14
  },
  button: { 
    backgroundColor: '#D4AF37', 
    padding: 15, 
    borderRadius: 12, 
    alignItems: 'center',
    marginTop: 6
  },
  buttonText: { color: '#0F0F0F', fontWeight: 'bold', fontSize: 15 },
  errorBanner: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)', 
    borderWidth: 1, 
    borderColor: '#EF4444', 
    padding: 12, 
    borderRadius: 10, 
    marginBottom: 16 
  },
  errorBannerText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  registerLink: { marginTop: 22 }
});