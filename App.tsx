import './src/polyfills';
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput, 
  Alert, 
  StyleSheet, 
  Dimensions 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFacultyLogic } from './src/lib/mobileLogic';
import { 
  Users, 
  Receipt, 
  TrendingUp, 
  CreditCard, 
  LogIn, 
  LogOut, 
  ShieldAlert 
} from 'lucide-react-native';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  db, 
  doc, 
  setDoc, 
  serverTimestamp 
} from './src/firebase';

const { width } = Dimensions.get('window');

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const { records, stats } = useFacultyLogic(authReady ? user : null, { role: 'admin' });

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', "Check your email/password or internet connection.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !displayName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const lowerEmail = email.toLowerCase();
    const isDepEd = lowerEmail.endsWith('@deped.gov.ph');
    const isGmail = lowerEmail.endsWith('@gmail.com');

    if (!isDepEd && !isGmail) {
      Alert.alert('Invalid Email', 'Please use your DepEd email (@deped.gov.ph) or a personal Gmail address.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: newUser.email,
        displayName: displayName,
        role: 'teacher',
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Account created successfully!');
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#C41E3A" />
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.authScroll}>
          <View style={styles.authCard}>
            <View style={styles.logoContainer}>
              <View style={styles.logoBox}>
                <Text style={styles.logoF}>F</Text>
                <Text style={styles.logoD}>D</Text>
              </View>
              <Text style={styles.appName}>Faculty Club</Text>
              <Text style={styles.subtitle}>
                {isSignUp ? 'Teacher Registration' : 'Mobile Access'}
              </Text>
            </View>

            <View style={styles.form}>
              {isSignUp && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="Juan Dela Cruz"
                    value={displayName}
                    onChangeText={setDisplayName}
                  />
                </View>
              )}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="your@deped.gov.ph"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity 
                onPress={isSignUp ? handleSignUp : handleLogin}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>
                  {isSignUp ? 'CREATE ACCOUNT' : 'LOGIN'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setIsSignUp(!isSignUp)}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTag}>SYSTEM ACTIVE</Text>
            <Text style={styles.welcomeText}>Hello,</Text>
            <Text style={styles.userText}>{user.displayName || user.email}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <LogOut size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>TOTAL NET BALANCE</Text>
          <Text style={styles.balanceAmount}>₱{stats.netBalance.toLocaleString()}</Text>
          
          <View style={styles.balanceRow}>
            <View style={styles.balanceCol}>
              <Text style={styles.colLabel}>INCOME</Text>
              <Text style={styles.colVal}>₱{stats.totalCollections.toLocaleString()}</Text>
            </View>
            <View style={styles.balanceCol}>
              <Text style={styles.colLabel}>EXPENSES</Text>
              <Text style={styles.colVal}>₱{stats.totalExpenses.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Users size={20} color="#3b82f6" />
            <Text style={styles.statNumber}>{records.length}</Text>
            <Text style={styles.statLabel}>TEACHERS</Text>
          </View>
          <View style={styles.statBox}>
            <TrendingUp size={20} color="#10b981" />
            <Text style={styles.statNumber}>84%</Text>
            <Text style={styles.statLabel}>RATE</Text>
          </View>
        </View>

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Recent Records</Text>
          {records.length === 0 ? (
             <View style={styles.emptyContainer}>
               <ActivityIndicator size="small" color="#94a3b8" />
               <Text style={styles.emptyText}>Loading records...</Text>
             </View>
          ) : (
            records.slice(0, 10).map((teacher) => (
              <View key={teacher.id} style={styles.listItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{teacher.name.charAt(0)}</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{teacher.name}</Text>
                  <Text style={styles.itemSub}>{teacher.gradeLevel}</Text>
                </View>
                <View style={styles.itemEnd}>
                  <CreditCard size={14} color="#10b981" />
                  <Text style={styles.itemCheck}>VERIFIED</Text>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  authScroll: { flexGrow: 1, justifyContent: 'center', padding: 25 },
  authCard: { backgroundColor: '#fff', borderRadius: 30, padding: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, borderWeight: 1, borderColor: '#f1f5f9' },
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  logoBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  logoF: { fontSize: 50, fontWeight: '900', color: '#C41E3A' },
  logoD: { fontSize: 50, fontWeight: '900', color: '#1B1F2C', marginLeft: -2 },
  appName: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
  subtitle: { color: '#64748b', fontWeight: '600', marginTop: 5 },
  form: { marginTop: 10 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5, marginLeft: 5 },
  input: { backgroundColor: '#f1f5f9', padding: 15, borderRadius: 15, color: '#1e293b', fontWeight: '600' },
  primaryButton: { backgroundColor: '#1B1F2C', padding: 18, borderRadius: 15, marginTop: 25, alignItems: 'center', shadowColor: '#1B1F2C', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  primaryButtonText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  linkButton: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#64748b', fontWeight: '700', fontSize: 13 },
  mainContainer: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  headerTag: { fontSize: 9, fontWeight: '900', color: '#3b82f6', letterSpacing: 2, marginBottom: 5 },
  welcomeText: { fontSize: 28, fontWeight: '900', color: '#1e293b' },
  userText: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  logoutBtn: { backgroundColor: '#fff', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  balanceCard: { backgroundColor: '#1e40af', padding: 25, borderRadius: 25, shadowColor: '#1e40af', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  balanceLabel: { color: '#93c5fd', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  balanceAmount: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 5 },
  balanceRow: { flexDirection: 'row', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  balanceCol: { flex: 1 },
  colLabel: { color: '#93c5fd', fontSize: 9, fontWeight: '900' },
  colVal: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  statBox: { backgroundColor: '#fff', padding: 15, borderRadius: 20, width: '48%', borderWeight: 1, borderColor: '#f1f5f9' },
  statNumber: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginTop: 8 },
  statLabel: { fontSize: 9, fontWeight: '800', color: '#64748b', marginTop: 2 },
  listSection: { marginTop: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 15 },
  listItem: { backgroundColor: '#fff', padding: 15, borderRadius: 18, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWeight: 1, borderColor: '#f1f5f9' },
  avatar: { width: 40, h: 40, borderRadius: 12, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#3b82f6', fontWeight: '900' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  itemSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  itemEnd: { alignItems: 'flex-end' },
  itemCheck: { fontSize: 8, fontWeight: '900', color: '#10b981', marginTop: 3 },
  emptyContainer: { alignItems: 'center', padding: 50 },
  emptyText: { color: '#94a3b8', fontWeight: '600', marginTop: 15 }
});
