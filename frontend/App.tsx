import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';

export default function App() {
  // Controle de estado das telas: 'login' | 'register' | 'dashboard'
  const [currentScreen, setCurrentScreen] = useState<'login' | 'register' | 'dashboard'>('login');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const handleLoginSuccess = (userToken: string, userData: any) => {
    setToken(userToken);
    setUser(userData);
    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setCurrentScreen('login');
  };

  return (
    <View style={styles.container}>
      {currentScreen === 'login' && (
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess}
          onNavigateToRegister={() => setCurrentScreen('register')}
        />
      )}

      {currentScreen === 'register' && (
        <RegisterScreen 
          onRegisterSuccess={() => setCurrentScreen('login')}
          onNavigateToLogin={() => setCurrentScreen('login')}
        />
      )}

      {currentScreen === 'dashboard' && token && user && (
        <DashboardScreen 
          token={token}
          user={user}
          onLogout={handleLogout}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
});