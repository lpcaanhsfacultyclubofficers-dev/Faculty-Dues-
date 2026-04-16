import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFacultyLogic } from './src/lib/mobileLogic';
import { Users, Receipt, TrendingUp, CreditCard, LogIn, LogOut, QrCode, Camera, X } from 'lucide-react-native';
import { auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, googleProvider, signInWithPopup } from './src/firebase';
import { BarCodeScanner } from 'expo-barcode-scanner';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const { records, stats, actions } = useFacultyLogic(user, { role: 'admin' });

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Note: signInWithPopup works in web/browser. 
      // For native APK, this might open a browser window.
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      Alert.alert('Google Login Failed', 'This feature requires a browser. If you are in the app, please use Email/Password for now.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleBarCodeScanned = ({ type, data }: { type: string, data: string }) => {
    setScanned(true);
    setShowScanner(false);
    Alert.alert('QR Code Scanned', `Data: ${data}`);
    // Here you would add logic to handle the scanned data (e.g., login or find teacher)
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (showScanner) {
    return (
      <View className="flex-1 bg-black">
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
        <SafeAreaView className="flex-1 justify-between p-6">
          <TouchableOpacity 
            onPress={() => setShowScanner(false)}
            className="self-end bg-white/20 p-3 rounded-full"
          >
            <X color="white" size={24} />
          </TouchableOpacity>
          <View className="items-center mb-20">
            <View className="w-64 h-64 border-2 border-white/50 rounded-3xl items-center justify-center">
              <View className="w-48 h-48 border-2 border-blue-500 rounded-2xl opacity-50" />
            </View>
            <Text className="text-white font-bold mt-8 text-lg">Scan Teacher QR Code</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center p-6">
        <View className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
          <View className="items-center mb-8">
            <View className="w-16 h-16 bg-blue-600 rounded-2xl items-center justify-center mb-4">
              <LogIn color="white" size={32} />
            </View>
            <Text className="text-2xl font-black text-slate-900">Faculty Club</Text>
            <Text className="text-slate-500 font-medium">Mobile Admin Access</Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Email Address</Text>
              <TextInput 
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900"
                placeholder="admin@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View className="mt-4">
              <Text className="text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Password</Text>
              <TextInput 
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-900"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              onPress={handleLogin}
              className="bg-blue-600 p-4 rounded-xl mt-8 items-center shadow-lg shadow-blue-200"
            >
              <Text className="text-white font-black text-lg">Sign In</Text>
            </TouchableOpacity>

            <View className="flex-row items-center my-6">
              <View className="flex-1 h-[1px] bg-slate-200" />
              <Text className="mx-4 text-slate-400 font-bold text-[10px] uppercase">Or continue with</Text>
              <View className="flex-1 h-[1px] bg-slate-200" />
            </View>

            <TouchableOpacity 
              onPress={handleGoogleLogin}
              className="bg-white p-4 rounded-xl items-center border border-slate-200 flex-row justify-center"
            >
              <Text className="text-slate-700 font-bold ml-2">Sign in with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setShowScanner(true)}
              className="mt-4 flex-row items-center justify-center"
            >
              <QrCode size={18} color="#2563eb" />
              <Text className="text-blue-600 font-bold ml-2">Login with QR Code</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!records.length && !stats.totalCollections) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center p-6">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-4 text-slate-500 font-medium text-center">
            Connected as {user.email}{"\n"}
            Fetching records...
          </Text>
          <TouchableOpacity onPress={handleLogout} className="mt-8">
            <Text className="text-blue-600 font-bold">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* Header */}
        <View className="flex-row justify-between items-start mb-6">
          <View>
            <Text className="text-xs font-black text-blue-500 uppercase tracking-widest">Faculty Club</Text>
            <Text className="text-3xl font-black text-slate-900">Dashboard</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} className="bg-white p-2 rounded-xl border border-slate-200">
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View className="bg-blue-600 p-6 rounded-3xl shadow-xl shadow-blue-200">
          <Text className="text-blue-100 text-xs font-bold uppercase">Available Funds</Text>
          <Text className="text-white text-4xl font-black mt-1">₱{stats.netBalance.toLocaleString()}</Text>
          
          <View className="flex-row mt-5 pt-5 border-t border-white/10">
            <View className="flex-1">
              <Text className="text-blue-200 text-[10px] font-bold uppercase">Collections</Text>
              <Text className="text-white text-base font-bold">₱{stats.totalCollections.toLocaleString()}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-blue-200 text-[10px] font-bold uppercase">Expenses</Text>
              <Text className="text-white text-base font-bold">₱{stats.totalExpenses.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="flex-row justify-between mt-6">
          <View className="bg-white p-4 rounded-2xl w-[48%] border border-slate-100">
            <Users size={20} color="#3b82f6" />
            <Text className="text-xl font-black text-slate-900 mt-2">{records.length}</Text>
            <Text className="text-[10px] text-slate-500 font-bold uppercase">Total Teachers</Text>
          </View>
          <View className="bg-white p-4 rounded-2xl w-[48%] border border-slate-100">
            <TrendingUp size={20} color="#10b981" />
            <Text className="text-xl font-black text-slate-900 mt-2">84%</Text>
            <Text className="text-[10px] text-slate-500 font-bold uppercase">Collection Rate</Text>
          </View>
        </View>

        {/* Recent Teachers List */}
        <View className="mt-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-black text-slate-900">Teacher Records</Text>
            <TouchableOpacity>
              <Text className="text-blue-600 font-bold text-sm">View All</Text>
            </TouchableOpacity>
          </View>

          {records.slice(0, 10).map((teacher) => (
            <TouchableOpacity 
              key={teacher.id} 
              className="bg-white p-4 rounded-2xl mb-3 flex-row items-center border border-slate-100"
            >
              <View className="w-10 h-10 rounded-xl bg-blue-50 justify-center items-center mr-3">
                <Text className="text-blue-600 font-black">{teacher.name.charAt(0)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900">{teacher.name}</Text>
                <Text className="text-[10px] text-slate-500">{teacher.gradeLevel}</Text>
              </View>
              <View className="items-end">
                <Text className={`text-[10px] font-bold ${teacher.paidDueIds.length > 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {teacher.paidDueIds.length} Paid
                </Text>
                <CreditCard size={14} color={teacher.paidDueIds.length > 0 ? '#10b981' : '#f59e0b'} className="mt-1" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
