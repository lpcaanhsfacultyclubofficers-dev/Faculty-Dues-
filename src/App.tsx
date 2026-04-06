/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component } from 'react';
import { Sun, Check, Send, Plus, User, Mail, PhilippinePeso, Heart, Upload, Trash2, FileText, FileDown, ChevronDown, ChevronUp, Loader2, LogOut, Shield, BarChart3, Wallet, Search, X, ShieldAlert, Lock, Eye, EyeOff, Users, CheckCircle, Clock, ChevronLeft, ChevronRight, AlertCircle, AlertTriangle, Database, QrCode, Download, CreditCard, Activity, Menu, LayoutDashboard, Settings, History, PieChart, TrendingUp, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  AlignmentType, 
  HeadingLevel, 
  TextRun, 
  PageOrientation, 
  BorderStyle,
  VerticalAlign,
  HeightRule
} from 'docx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { AnimatePresence, motion } from 'motion/react';
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, 
  collection, doc, setDoc, getDoc, getDocs, onSnapshot, query, where, addDoc, 
  updateDoc, deleteDoc, serverTimestamp, Timestamp, writeBatch, signInWithEmailAndPassword, firebaseConfig
} from './firebase';
import type { User as FirebaseUser } from './firebase';

import { Html5Qrcode } from 'html5-qrcode';

type GradeLevel = 'Grade 7' | 'Grade 8' | 'Grade 9' | 'Grade 10';

type StandardDue = {
  id: string;
  name: string;
  amount: number;
  isVoluntary?: boolean;
  pendingDeletion?: boolean;
  deletionRequestedBy?: string;
  lastUpdated?: string;
};

type TeacherRecord = {
  id: string;
  name: string;
  lastName?: string;
  firstName?: string;
  middleInitial?: string;
  email: string;
  contactNumber: string;
  gradeLevel: GradeLevel;
  paidDueIds: string[];
  voluntaryPayments?: Record<string, number>;
  lastReceiptSent?: string;
  remitted?: boolean;
  remittanceId?: string;
  remittedDueIds?: string[];
  lastReferenceNumber?: string;
  pendingDeletion?: boolean;
  deletionRequestedBy?: string;
  lastUpdated?: string;
  paymentHistory?: { dueId: string, dueName: string, date: string, amount: number }[];
};

type UserProfile = {
  uid: string;
  email: string;
  role: 'admin' | 'bod' | 'teacher';
  gradeLevel: GradeLevel | 'All';
  name: string;
};

type Expense = {
  id: string;
  description: string;
  amount: number;
  category?: string;
  timestamp: any;
  adminId: string;
  adminName: string;
};

type AuditLog = {
  id: string;
  action: string;
  details?: string;
  userId: string;
  userName?: string;
  timestamp: any;
  type: 'info' | 'warning' | 'critical';
};

type Remittance = {
  id: string;
  bodId: string;
  bodName: string;
  bodEmail?: string;
  gradeLevel: GradeLevel;
  amount: number;
  timestamp: any;
  status: 'pending' | 'verified';
  teacherIds: string[];
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      let message = "Something went wrong.";
      try {
        const info = JSON.parse(this.state.errorInfo || '{}');
        if (info.error && info.error.includes('insufficient permissions')) {
          message = "Access Denied: You don't have permission to perform this action.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border-2 border-red-100">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="text-red-600" size={32} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">System Error</h1>
            <p className="text-gray-500 mb-8 font-medium">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-[#0038A8] text-white py-4 rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGradeSelection, setShowGradeSelection] = useState(false);
  const [standardDues, setStandardDues] = useState<StandardDue[]>([]);
  const [records, setRecords] = useState<TeacherRecord[]>([]);
  const [remittances, setRemittances] = useState<Remittance[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'All'>('All');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'collection' | 'admin' | 'remittance' | 'expenses' | 'audit' | 'profile'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileEmail, setEditProfileEmail] = useState('');
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{ email: string, pass: string, grade: string, realEmail?: string } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isQRLogin, setIsQRLogin] = useState(false);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string | null>(null);
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);
  const [deleteType, setDeleteType] = useState<'selected' | 'all'>('selected');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'All' | 'Paid' | 'Partial' | 'Pending'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showDues, setShowDues] = useState(true);
  const [showPayments, setShowPayments] = useState(true);

  const NavItem = ({ id, icon: Icon, label, role }: { id: typeof activeTab, icon: any, label: string, role?: string }) => {
    if (role && profile?.role !== role && profile?.role !== 'admin') return null;
    
    const isActive = activeTab === id;
    
    return (
      <button
        onClick={() => {
          setActiveTab(id);
          setIsSidebarOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${
          isActive 
            ? 'bg-[#0038A8] text-white shadow-lg shadow-blue-200' 
            : 'text-gray-500 hover:bg-blue-50 hover:text-[#0038A8]'
        }`}
      >
        <div className={`p-2 rounded-xl transition-colors ${
          isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-white'
        }`}>
          <Icon size={18} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-[#0038A8]'} />
        </div>
        <span className={`text-xs font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
          {label}
        </span>
        {isActive && (
          <motion.div 
            layoutId="active-pill"
            className="ml-auto w-1.5 h-1.5 bg-[#FCD116] rounded-full shadow-[0_0_8px_#FCD116]"
          />
        )}
      </button>
    );
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGrade, paymentFilter]);

  useEffect(() => {
    if (profile) {
      setEditProfileName(profile.name);
      setEditProfileEmail(profile.email);
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    try {
      showToast("Updating profile...");
      // Update users collection
      await updateDoc(doc(db, 'users', profile.uid), {
        name: editProfileName,
        email: editProfileEmail
      });
      
      // Update teachers collection if it exists
      const teacherRecord = records.find(r => r.email === profile.email);
      if (teacherRecord) {
        await updateDoc(doc(db, 'teachers', teacherRecord.id), {
          name: editProfileName,
          email: editProfileEmail
        });
      }
      
      setProfile({ ...profile, name: editProfileName, email: editProfileEmail });
      setIsEditingProfile(false);
      showToast("Profile updated successfully.");
      logActivity("Updated Profile", `User ${profile.email} updated their profile`);
    } catch (error: any) {
      console.error("Update Profile Error:", error);
      showToast(`Failed to update profile: ${error.message}`);
    }
  };

  const downloadQRCode = (canvasId: string, fileName: string, email: string) => {
    const qrCanvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!qrCanvas) {
      showToast("Error: QR Code not found.");
      return;
    }

    try {
      showToast("Preparing download...");
      const finalCanvas = document.createElement('canvas');
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) throw new Error("Could not create canvas context");

      // Set dimensions
      finalCanvas.width = 500;
      finalCanvas.height = 700;

      // 1. Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      // 2. Header
      ctx.fillStyle = '#0038A8';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('FACULTY CLUB', 250, 60);
      
      ctx.fillStyle = '#666666';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('SECURE LOGIN QR CODE', 250, 95);

      // 3. Draw QR Code (centered)
      const qrSize = 350;
      const qrX = (finalCanvas.width - qrSize) / 2;
      const qrY = 130;
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

      // 4. Email Section
      ctx.fillStyle = '#999999';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('ACCOUNT EMAIL', 250, 520);
      
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 22px Arial';
      ctx.fillText(email, 250, 555);

      // 5. Security Note Box
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(50, 590, 400, 80);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 590, 400, 80);

      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('IMPORTANT SECURITY NOTICE', 250, 620);
      
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('Keep this QR code private. It grants direct access to your account.', 250, 645);

      // 6. Download
      const dataUrl = finalCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("QR Code downloaded successfully.");
    } catch (err) {
      console.error("Download error:", err);
      showToast("Failed to download QR code.");
    }
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const [editLastName, setEditLastName] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editMiddleInitial, setEditMiddleInitial] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editContactNumber, setEditContactNumber] = useState('');
  const [editGradeLevel, setEditGradeLevel] = useState<GradeLevel>('Grade 7');

  const ALLOWED_BODS: Record<string, GradeLevel> = {
    'bodgrade7@gmail.com': 'Grade 7',
    'bodgrade8@gmail.com': 'Grade 8',
    'bodgrade9@gmail.com': 'Grade 9',
    'bodgrade10@gmail.com': 'Grade 10',
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth State Changed:", firebaseUser?.email);
      if (firebaseUser) {
        const email = firebaseUser.email?.toLowerCase() || '';
        const isAdminEmail = email === 'lpcaanhsfacultyclubofficers@gmail.com';
        const isBodEmail = Object.keys(ALLOWED_BODS).includes(email);
        const isQRLoginEmail = email.startsWith('qr-') && email.endsWith('@facultyclub.local');
        
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          
          // Enforce BOD roles strictly based on email
          if (isBodEmail && (data.role !== 'bod' || data.gradeLevel !== ALLOWED_BODS[email])) {
            data.role = 'bod';
            data.gradeLevel = ALLOWED_BODS[email];
            await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'bod', gradeLevel: ALLOWED_BODS[email] });
          }
          
          if (!isAdminEmail && !isBodEmail && !isQRLoginEmail && data.role === 'bod') {
             // If they were somehow a BOD but aren't in the allowed list anymore, sign them out
             signOut(auth);
             setUnauthorizedEmail(email);
             setUser(null);
             setProfile(null);
             setLoading(false);
             return;
          }

          setUser(firebaseUser);
          setProfile(data);
        } else {
          // Check if this email belongs to a teacher
          const teacherQuery = query(collection(db, 'teachers'), where('email', '==', email));
          const teacherSnap = await getDocs(teacherQuery);
          
          let role: 'admin' | 'bod' | 'teacher' | 'unauthorized' = 'unauthorized';
          let gradeLevel: GradeLevel | 'All' = 'Grade 7';
          
          if (isAdminEmail) {
            role = 'admin';
            gradeLevel = 'All';
          } else if (isBodEmail) {
            role = 'bod';
            gradeLevel = ALLOWED_BODS[email];
          } else if (isQRLoginEmail) {
            role = 'bod';
            gradeLevel = 'Grade 7'; // Default, will be updated by grade selection modal
          } else if (!teacherSnap.empty) {
            role = 'teacher';
            gradeLevel = teacherSnap.docs[0].data().gradeLevel;
          }

          if (role === 'unauthorized') {
            signOut(auth);
            setUnauthorizedEmail(email);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }

          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            role,
            gradeLevel,
            name: firebaseUser.displayName || (isAdminEmail ? 'Executive Officer' : role === 'teacher' ? 'Teacher' : 'BOD Member')
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          setUser(firebaseUser);
          setProfile(newProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync: Dues
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'dues'), (snapshot) => {
      const duesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StandardDue));
      setStandardDues(duesData);
    });
    return () => unsubscribe();
  }, [user]);

  // Firestore Sync: Teachers
  useEffect(() => {
    if (!user || !profile) return;
    let q = query(collection(db, 'teachers'));
    
    // BODs only see their grade level
    if (profile.role === 'bod') {
      q = query(collection(db, 'teachers'), where('gradeLevel', '==', profile.gradeLevel));
    } else if (profile.role === 'teacher' && profile.email) {
      q = query(collection(db, 'teachers'), where('email', '==', profile.email));
    } else if (selectedGrade !== 'All') {
      q = query(collection(db, 'teachers'), where('gradeLevel', '==', selectedGrade));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teacherData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeacherRecord));
      console.log("Teachers updated:", teacherData);
      setRecords(teacherData);
    });
    return () => unsubscribe();
  }, [user, profile, selectedGrade]);

  // Firestore Sync: Remittances
  useEffect(() => {
    if (!user || !profile) return;
    let q = query(collection(db, 'remittances'));
    if (profile.role === 'bod') {
      q = query(collection(db, 'remittances'), where('bodId', '==', profile.uid));
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Remittance));
      setRemittances(remData);
    });
    return () => unsubscribe();
  }, [user, profile]);

  // Admin: Fetch all users
  useEffect(() => {
    if (!user || !profile || profile.role !== 'admin') return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(usersData);
    });
    return () => unsubscribe();
  }, [user, profile]);

  // Admin: Fetch Expenses
  useEffect(() => {
    if (!user || !profile || profile.role !== 'admin') return;
    const unsubscribe = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const expenseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(expenseData);
    });
    return () => unsubscribe();
  }, [user, profile]);

  // Admin: Fetch Audit Logs
  useEffect(() => {
    if (!user || !profile || profile.role !== 'admin') return;
    const q = query(collection(db, 'audit_logs'), where('timestamp', '!=', null));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
      // Sort manually because Firestore query might need index
      setAuditLogs(logData.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds));
    });
    return () => unsubscribe();
  }, [user, profile]);

  const updateUserRole = async (uid: string, role: 'admin' | 'bod' | 'teacher', gradeLevel: GradeLevel | 'All') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role, gradeLevel });
      showToast("User updated.");
    } catch (error) {
      console.error("Update User Error:", error);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    const startScanner = async () => {
      if (showScanner) {
        // Add a small delay to ensure the DOM element is ready
        await new Promise(resolve => setTimeout(resolve, 300));
        try {
          html5QrCode = new Html5Qrcode("qr-reader");
          const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          };

          await html5QrCode.start(
            { facingMode: "environment" }, 
            config,
            async (decodedText) => {
              try {
                console.log("QR Code Scanned:", decodedText);
                const data = JSON.parse(decodedText);
                if (!data.email || !data.pass) {
                  throw new Error("Invalid QR code format");
                }

                if (html5QrCode) {
                  await html5QrCode.stop();
                }
                setShowScanner(false);
                setLoading(true);
                
                await signInWithEmailAndPassword(auth, data.email, data.pass);
                
                setIsQRLogin(true);
                
                setShowLoginSuccess(true);
                setTimeout(() => setShowLoginSuccess(false), 4000);
              } catch (e: any) {
                console.error("QR Login Error:", e);
                showToast(`QR Login Failed: ${e.message || "Invalid format"}`);
                setLoading(false);
              }
            },
            (errorMessage) => {
              // Ignore scan errors as they happen constantly when no QR code is in view
            }
          );
        } catch (err: any) {
          console.error("Scanner Start Error:", err);
          showToast(`Failed to start camera: ${err.message || "Unknown error"}`);
          setShowScanner(false);
        }
      }
    };

    startScanner();

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.error("Scanner Stop Error:", err));
      }
    };
  }, [showScanner]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast("Successfully logged in!");
      setShowLoginSuccess(true);
      setTimeout(() => setShowLoginSuccess(false), 4000);
    } catch (error: any) {
      console.error("Login Error:", error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User closed the popup, ignore or show a specific message
        return;
      }
      showToast("Login failed. Please try again.");
    }
  };

  const handleLogout = () => signOut(auth);

  const selectGradeLevel = async (grade: GradeLevel) => {
    if (!profile || !user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { gradeLevel: grade });
      setProfile({ ...profile, gradeLevel: grade });
      setShowGradeSelection(false);
      showToast(`Grade level set to ${grade}`);
    } catch (error) {
      console.error("Error setting grade level:", error);
      showToast("Failed to set grade level.");
    }
  };

  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('Grade 7');
  const [showAddTeacherForm, setShowAddTeacherForm] = useState(true);
  
  // Sync gradeLevel state with profile's gradeLevel
  useEffect(() => {
    if (profile?.gradeLevel && profile.gradeLevel !== 'All') {
      setGradeLevel(profile.gradeLevel as GradeLevel);
    }
  }, [profile]);
  
  const [newDueName, setNewDueName] = useState('');
  const [newDueAmount, setNewDueAmount] = useState<number | ''>('');
  const [isVoluntary, setIsVoluntary] = useState(false);
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState<number | ''>('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('General');

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 5000);
  };

  const logActivity = async (action: string, details?: string, type: 'info' | 'warning' | 'critical' = 'info') => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'audit_logs'), {
        action,
        details: details || '',
        userId: user.uid,
        userName: profile?.name || user.email || 'Unknown User',
        timestamp: serverTimestamp(),
        type
      });
    } catch (error) {
      console.error("Audit Log Error:", error);
    }
  };

  const handleAddStandardDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDueName || (newDueAmount === '' && !isVoluntary)) return;

    try {
      console.log("Adding due:", { name: newDueName, amount: Number(newDueAmount || 0), isVoluntary });
      await addDoc(collection(db, 'dues'), {
        name: newDueName,
        amount: Number(newDueAmount || 0),
        isVoluntary: isVoluntary
      });
      setNewDueName('');
      setNewDueAmount('');
      setIsVoluntary(false);
      showToast(`Added "${newDueName}" to standard dues.`);
      logActivity("Added Standard Due", `Name: ${newDueName}, Amount: ₱${newDueAmount}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'dues');
    }
  };

  const deleteStandardDue = async (id: string) => {
    if (profile?.role === 'admin') {
      try {
        const due = standardDues.find(d => d.id === id);
        await deleteDoc(doc(db, 'dues', id));
        showToast("Standard due removed.");
        logActivity("Deleted Standard Due", `Removed ${due?.name}`, 'warning');
      } catch (error) {
        console.error("Error deleting due:", error);
      }
    } else {
      try {
        await updateDoc(doc(db, 'dues', id), {
          pendingDeletion: true,
          deletionRequestedBy: profile?.name || 'BOD'
        });
        showToast("Deletion request sent to Admin.");
      } catch (error) {
        console.error("Error requesting due deletion:", error);
      }
    }
  };

  const cancelDeleteStandardDue = async (id: string) => {
    try {
      await updateDoc(doc(db, 'dues', id), {
        pendingDeletion: false,
        deletionRequestedBy: null
      });
      showToast("Deletion request cancelled.");
    } catch (error) {
      console.error("Error cancelling due deletion:", error);
    }
  };

  const openEditModal = (teacher: TeacherRecord) => {
    setEditingTeacher(teacher);
    setEditLastName(teacher.lastName || '');
    setEditFirstName(teacher.firstName || '');
    setEditMiddleInitial(teacher.middleInitial || '');
    setEditEmail(teacher.email || '');
    setEditContactNumber(teacher.contactNumber || '');
    setEditGradeLevel(teacher.gradeLevel);
    setIsEditModalOpen(true);
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher || !editLastName || !editFirstName) return;

    const fullName = `${editLastName}, ${editFirstName}${editMiddleInitial ? ' ' + editMiddleInitial : ''}`;

    try {
      await updateDoc(doc(db, 'teachers', editingTeacher.id), {
        name: fullName,
        lastName: editLastName,
        firstName: editFirstName,
        middleInitial: editMiddleInitial,
        email: editEmail,
        contactNumber: editContactNumber,
        gradeLevel: editGradeLevel
      });
      setIsEditModalOpen(false);
      setEditingTeacher(null);
      showToast(`Updated ${fullName}'s information.`);
    } catch (error) {
      console.error("Error updating teacher:", error);
      showToast("Failed to update teacher.");
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastName || !firstName) return;

    const fullName = `${lastName}, ${firstName}${middleInitial ? ' ' + middleInitial : ''}`;

    try {
      await addDoc(collection(db, 'teachers'), {
        name: fullName,
        lastName,
        firstName,
        middleInitial,
        email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        contactNumber: contactNumber || 'N/A',
        gradeLevel: gradeLevel,
        paidDueIds: [],
        remittedDueIds: [],
        remitted: false
      });
      setLastName('');
      setFirstName('');
      setMiddleInitial('');
      setEmail('');
      setContactNumber('');
      showToast(`Added ${fullName} to the list.`);
      logActivity("Added Teacher", `${fullName} added to ${gradeLevel}`);
    } catch (error) {
      console.error("Error adding teacher:", error);
    }
  };

  const toggleDuePaid = async (teacherId: string, dueId: string, amount?: number) => {
    const record = records.find(r => r.id === teacherId);
    if (!record) return;

    const isPaid = record.paidDueIds.includes(dueId);
    const newPaidIds = isPaid 
      ? record.paidDueIds.filter(id => id !== dueId)
      : [...record.paidDueIds, dueId];

    const newVoluntaryPayments = { ...(record.voluntaryPayments || {}) };
    const newPaymentHistory = [...(record.paymentHistory || [])];
    
    if (isPaid) {
      delete newVoluntaryPayments[dueId];
      const index = newPaymentHistory.findIndex(h => h.dueId === dueId);
      if (index > -1) newPaymentHistory.splice(index, 1);
    } else {
      if (amount !== undefined) {
        newVoluntaryPayments[dueId] = amount;
      }
      const due = standardDues.find(d => d.id === dueId);
      newPaymentHistory.push({
        dueId,
        dueName: due?.name || 'Unknown Due',
        date: new Date().toISOString(),
        amount: amount !== undefined ? amount : (due?.amount || 0)
      });
    }

    try {
      await updateDoc(doc(db, 'teachers', teacherId), {
        paidDueIds: newPaidIds,
        voluntaryPayments: newVoluntaryPayments,
        paymentHistory: newPaymentHistory
      });
    } catch (error) {
      console.error("Error updating payment:", error);
    }
  };

  const deleteTeacher = async (id: string) => {
    if (profile?.role === 'admin') {
      try {
        const teacher = records.find(r => r.id === id);
        await deleteDoc(doc(db, 'teachers', id));
        showToast("Teacher record removed.");
        logActivity("Deleted Teacher", `Removed ${teacher?.name} from ${teacher?.gradeLevel}`, 'warning');
      } catch (error) {
        console.error("Error deleting teacher:", error);
      }
    } else {
      try {
        await updateDoc(doc(db, 'teachers', id), {
          pendingDeletion: true,
          deletionRequestedBy: profile?.name || 'BOD'
        });
        showToast("Deletion request sent to Admin.");
      } catch (error) {
        console.error("Error requesting teacher deletion:", error);
      }
    }
  };

  const cancelDeleteTeacher = async (id: string) => {
    try {
      await updateDoc(doc(db, 'teachers', id), {
        pendingDeletion: false,
        deletionRequestedBy: null
      });
      showToast("Deletion request cancelled.");
    } catch (error) {
      console.error("Error cancelling teacher deletion:", error);
    }
  };

  const filteredRecords = records
    .filter(record => {
      const matchesSearch = record.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           record.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGrade = selectedGrade === 'All' || record.gradeLevel === selectedGrade;
      
      const totalPaid = standardDues
        .filter(d => record.paidDueIds.includes(d.id))
        .reduce((sum, d) => {
          if (d.isVoluntary && record.voluntaryPayments?.[d.id] !== undefined) {
            return sum + record.voluntaryPayments[d.id];
          }
          return sum + d.amount;
        }, 0);
      const requiredDues = standardDues.filter(d => !d.isVoluntary);
      const isFullyPaid = requiredDues.length > 0 && requiredDues.every(d => record.paidDueIds.includes(d.id));
      
      const matchesPayment = paymentFilter === 'All' || 
                            (paymentFilter === 'Paid' && isFullyPaid) || 
                            (paymentFilter === 'Partial' && !isFullyPaid && totalPaid > 0) ||
                            (paymentFilter === 'Pending' && totalPaid === 0);
      
      return matchesSearch && matchesGrade && matchesPayment;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedGrade('All');
    setPaymentFilter('All');
    setSelectedTeacherIds(new Set());
  };

  const selectPaidTeachers = () => {
    const paidTeachers = filteredRecords.filter(r => r.paidDueIds.length > 0 || (r.voluntaryPayments && Object.keys(r.voluntaryPayments).length > 0));
    setSelectedTeacherIds(new Set(paidTeachers.map(r => r.id)));
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      if (data.length < 2) {
        showToast("Excel file is empty or invalid.");
        return;
      }

      const headers = data[0].map(h => String(h).toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes('name') && !h.includes('last') && !h.includes('first'));
      const lastNameIdx = headers.findIndex(h => h.includes('last') && h.includes('name'));
      const firstNameIdx = headers.findIndex(h => h.includes('first') && h.includes('name'));
      const middleInitialIdx = headers.findIndex(h => h.includes('middle') || h.includes('initial') || h.includes('m.i'));
      const emailIdx = headers.findIndex(h => h.includes('email'));
      const contactIdx = headers.findIndex(h => h.includes('contact') || h.includes('number') || h.includes('phone'));
      const gradeIdx = headers.findIndex(h => h.includes('grade') || h.includes('level'));

      let count = 0;
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[nameIdx !== -1 ? nameIdx : (lastNameIdx !== -1 ? lastNameIdx : 0)]) continue;

        let lName = '', fName = '', mInitial = '';
        let teacherName = '';

        if (lastNameIdx !== -1 && firstNameIdx !== -1) {
          lName = String(row[lastNameIdx] || '').trim();
          fName = String(row[firstNameIdx] || '').trim();
          mInitial = middleInitialIdx !== -1 ? String(row[middleInitialIdx] || '').trim() : '';
        } else {
          const rawName = String(row[nameIdx !== -1 ? nameIdx : 0]).trim();
          if (rawName.includes(',')) {
            const parts = rawName.split(',');
            lName = parts[0].trim();
            const rest = parts[1].trim().split(' ');
            fName = rest[0];
            mInitial = rest.slice(1).join(' ');
          } else {
            // Try to split by space: First Middle Last
            const parts = rawName.split(' ');
            if (parts.length >= 3) {
              fName = parts[0];
              mInitial = parts[1];
              lName = parts.slice(2).join(' ');
            } else if (parts.length === 2) {
              fName = parts[0];
              lName = parts[1];
            } else {
              lName = rawName;
            }
          }
        }

        teacherName = `${lName}, ${fName}${mInitial ? ' ' + mInitial : ''}`;
        const teacherEmail = String(emailIdx !== -1 ? row[emailIdx] : `${fName.toLowerCase()}.${lName.toLowerCase()}@example.com`);
        const contact = String(contactIdx !== -1 ? row[contactIdx] : 'N/A');
        
        let rawGrade = gradeIdx !== -1 ? String(row[gradeIdx] || '') : '';
        let grade: GradeLevel = 'Grade 7';
        if (rawGrade.includes('7')) grade = 'Grade 7';
        else if (rawGrade.includes('8')) grade = 'Grade 8';
        else if (rawGrade.includes('9')) grade = 'Grade 9';
        else if (rawGrade.includes('10')) grade = 'Grade 10';
        else if (profile?.role === 'bod') grade = profile.gradeLevel as GradeLevel;

        await addDoc(collection(db, 'teachers'), {
          name: teacherName,
          lastName: lName,
          firstName: fName,
          middleInitial: mInitial,
          email: teacherEmail,
          contactNumber: contact,
          gradeLevel: grade,
          paidDueIds: [],
          remittedDueIds: [],
          remitted: false
        });
        count++;
      }
      showToast(`Imported ${count} teachers.`);
    };
    reader.readAsBinaryString(file);
  };

  const clearAuditLogs = async () => {
    if (!window.confirm("Are you sure you want to clear all transparency logs? This action cannot be undone.")) return;
    try {
      const batch = writeBatch(db);
      auditLogs.forEach(log => {
        batch.delete(doc(db, 'audit_logs', log.id));
      });
      await batch.commit();
      showToast("All transparency logs have been cleared.");
      logActivity("Cleared Audit Logs", "Admin cleared all system transparency logs", "critical");
    } catch (error) {
      console.error("Clear Audit Logs Error:", error);
      showToast("Failed to clear logs.");
    }
  };

  const handleRemit = async () => {
    if (!profile || profile.role !== 'bod') return;

    const unremittedTeachers = records.filter(r => {
      const remittedIds = r.remittedDueIds || [];
      return r.paidDueIds.some(id => !remittedIds.includes(id));
    });

    if (unremittedTeachers.length === 0) {
      showToast("No unremitted payments found.");
      return;
    }

    const totalAmount = unremittedTeachers.reduce((sum, r) => {
      const remittedIds = r.remittedDueIds || [];
      const newlyPaidDues = standardDues.filter(d => r.paidDueIds.includes(d.id) && !remittedIds.includes(d.id));
      return sum + newlyPaidDues.reduce((s, d) => s + d.amount, 0);
    }, 0);

    try {
      const remRef = doc(collection(db, 'remittances'));
      const batch = writeBatch(db);
      
      batch.set(remRef, {
        bodId: profile.uid,
        bodName: profile.name,
        bodEmail: profile.email,
        gradeLevel: profile.gradeLevel,
        amount: totalAmount,
        timestamp: serverTimestamp(),
        status: 'pending',
        teacherIds: unremittedTeachers.map(r => r.id)
      });

      // Mark teachers as remitted for the specific dues
      for (const teacher of unremittedTeachers) {
        batch.update(doc(db, 'teachers', teacher.id), {
          remitted: true,
          remittanceId: remRef.id,
          remittedDueIds: teacher.paidDueIds // Mark all currently paid dues as remitted
        });
      }

      await batch.commit();

      showToast(`Remitted ₱${totalAmount.toFixed(2)} to Treasurer.`);
    } catch (error) {
      console.error("Remittance Error:", error);
      showToast("Failed to remit.");
    }
  };

  const sendAcceptanceEmail = async (remId: string) => {
    try {
      const remDoc = await getDoc(doc(db, 'remittances', remId));
      if (!remDoc.exists()) return { success: false, error: "Remittance not found" };
      const rem = { id: remDoc.id, ...remDoc.data() } as Remittance;

      // Calculate stats for the email
      const teachersSnapshot = await getDocs(query(collection(db, 'teachers'), where('gradeLevel', '==', rem.gradeLevel)));
      const gradeTeachers = teachersSnapshot.docs.map(d => d.data() as TeacherRecord);
      
      const paidCount = gradeTeachers.filter(t => 
        standardDues.length > 0 && standardDues.every(d => t.paidDueIds.includes(d.id))
      ).length;
      const pendingCount = gradeTeachers.length - paidCount;

      const remTeachers = gradeTeachers.filter(t => rem.teacherIds?.includes(t.id));
      const teacherListHtml = remTeachers.length > 0 
        ? `<div style="margin-top: 20px;">
             <h4 style="color: #0038A8; font-size: 14px; margin-bottom: 10px;">Teachers Included in this Remittance:</h4>
             <ul style="list-style-type: none; padding: 0; margin: 0;">
               ${remTeachers.map(t => `<li style="padding: 5px 0; border-bottom: 1px solid #eee; font-size: 14px; color: #333;">${t.lastName}, ${t.firstName} ${t.middleInitial || ''}</li>`).join('')}
             </ul>
           </div>`
        : '';

      const formattedDate = rem.timestamp 
        ? rem.timestamp.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

      // Send Acceptance Email to BOD
      const emailContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <div style="background-color: #0038A8; color: white; padding: 40px 20px; text-align: center;">
            <div style="background-color: rgba(255,255,255,0.1); width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
              <span style="font-size: 30px;">✅</span>
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">Remittance Accepted</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">Official Treasurer Verification</p>
          </div>
          
          <div style="padding: 40px 30px; color: #333; line-height: 1.6;">
            <p style="margin-top: 0; font-size: 16px;">Hello <strong>${rem.bodName}</strong>,</p>
            <p>Great news! The treasurer has successfully verified and accepted your cash remittance for <strong>${rem.gradeLevel}</strong>.</p>
            
            <div style="background-color: #f8fafc; padding: 25px; border-radius: 16px; margin: 30px 0; border: 1px solid #e2e8f0;">
              <h3 style="margin-top: 0; color: #0038A8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Remittance Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Date Remitted:</td>
                  <td style="padding: 8px 0; font-weight: bold; text-align: right;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Amount Remitted:</td>
                  <td style="padding: 8px 0; font-weight: 900; text-align: right; color: #16a34a; font-size: 18px;">₱${rem.amount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Grade Level:</td>
                  <td style="padding: 8px 0; font-weight: bold; text-align: right;">${rem.gradeLevel}</td>
                </tr>
              </table>
              ${teacherListHtml}
            </div>

            <div style="background-color: #f0f9ff; padding: 25px; border-radius: 16px; margin: 30px 0; border: 1px solid #bae6fd;">
              <h3 style="margin-top: 0; color: #0369a1; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Collection Progress</h3>
              <div style="display: flex; justify-content: space-between; margin-top: 15px;">
                <div style="text-align: center; flex: 1;">
                  <div style="font-size: 20px; font-weight: 900; color: #0038A8;">${gradeTeachers.length}</div>
                  <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Total Teachers</div>
                </div>
                <div style="text-align: center; flex: 1; border-left: 1px solid #bae6fd; border-right: 1px solid #bae6fd;">
                  <div style="font-size: 20px; font-weight: 900; color: #16a34a;">${paidCount}</div>
                  <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Fully Paid</div>
                </div>
                <div style="text-align: center; flex: 1;">
                  <div style="font-size: 20px; font-weight: 900; color: #dc2626;">${pendingCount}</div>
                  <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Pending</div>
                </div>
              </div>
            </div>

            <p style="margin-bottom: 0; font-size: 14px; color: #64748b;">Thank you for your service to the Faculty Club!</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
              Las Piñas CAA National High School • Faculty Club
            </p>
          </div>
        </div>
      `;

      let targetEmail = rem.bodEmail;
      
      // Fallback if bodEmail is missing from the remittance record
      if (!targetEmail && rem.bodId) {
        try {
          const bodDoc = await getDoc(doc(db, 'users', rem.bodId));
          if (bodDoc.exists()) {
            targetEmail = bodDoc.data().email;
          }
        } catch (e) {
          console.error("Failed to fetch BOD email fallback", e);
        }
      }

      if (!targetEmail) {
        return { success: false, error: "No BOD email found" };
      }

      const response = await fetch('/api/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          subject: `Remittance Accepted - ${rem.gradeLevel}`,
          html: emailContent
        })
      });
      
      const resultData = await response.json();
      if (!response.ok) {
        return { success: false, error: resultData.error || "Server error", details: resultData.details };
      }
      return { success: true, simulated: resultData.simulated };
    } catch (error: any) {
      console.error("Email Sending Error:", error);
      return { success: false, error: "Connection error", details: error.message };
    }
  };

  const verifyRemittance = async (remId: string) => {
    const isExecutive = profile?.email === 'lpcaanhsfacultyclubofficers@gmail.com';
    if (profile?.role !== 'admin' && !isExecutive) return;
    
    showToast("Verifying remittance and sending email...");
    try {
      await updateDoc(doc(db, 'remittances', remId), {
        status: 'verified'
      });
      
      const rem = remittances.find(r => r.id === remId);
      logActivity("Verified Remittance", `Verified ₱${rem?.amount?.toFixed(2)} from ${rem?.bodName} (${rem?.gradeLevel})`);

      let result = await sendAcceptanceEmail(remId);
      
      if (!result.success) {
        console.log("Email attempt failed, retrying with backoff...");
        // Retry up to 3 times with exponential backoff
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, i)));
          result = await sendAcceptanceEmail(remId);
          if (result.success) break;
        }
      }
      
      if (!result.success) {
        showToast(`Remittance verified, but failed to send email: ${result.error}`);
      } else if (result.simulated) {
        showToast("Remittance verified. (Email simulated - check secrets configuration)");
      } else {
        showToast("Remittance verified and email sent to BOD.");
      }
    } catch (error) {
      console.error("Verification Error:", error);
      showToast("Failed to verify remittance.");
    }
  };

  const handleResendAcceptanceEmail = async (rem: Remittance) => {
    showToast("Attempting to resend acceptance email...");
    const result = await sendAcceptanceEmail(rem.id);
    
    if (!result.success) {
      showToast(`Failed to resend email: ${result.error}`);
    } else if (result.simulated) {
      showToast("Email simulated. Check your GMAIL_USER and GMAIL_APP_PASSWORD secrets.");
    } else {
      showToast("Acceptance email resent successfully!");
    }
  };

  const generateBODQRCode = async (bodEmail: string, gradeLevel: string) => {
    if (profile?.role !== 'admin') return;
    showToast("Generating secure QR code...");
    
    try {
      // Generate a secure random password
      const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
      const qrEmail = `qr-${bodEmail.replace('@', '_')}@facultyclub.local`;

      // Use Firebase REST API to create the user without signing out the admin
      // Note: This requires Email/Password authentication to be enabled in Firebase Console
      const apiKey = firebaseConfig.apiKey;
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: qrEmail,
          password: randomPassword,
          returnSecureToken: true
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.error?.message === 'OPERATION_NOT_ALLOWED') {
          showToast("Please enable Email/Password authentication in Firebase Console to use QR Login.");
          return;
        } else if (data.error?.message === 'EMAIL_EXISTS') {
          // If it exists, we can't easily reset the password via REST without the user's token.
          // So we append a random string to make a new one.
          showToast("QR Code already exists for this BOD. Generating a new one...");
          const newQrEmail = `qr-${Math.random().toString(36).slice(-5)}-${bodEmail.replace('@', '_')}@facultyclub.local`;
          const retryResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: newQrEmail,
              password: randomPassword,
              returnSecureToken: true
            })
          });
          const retryData = await retryResponse.json();
          if (!retryResponse.ok) throw new Error(retryData.error?.message || "Failed to create QR account");
          
          await setDoc(doc(db, 'users', retryData.localId), {
            uid: retryData.localId,
            email: bodEmail, // Store their real email for reference
            role: 'bod',
            gradeLevel: gradeLevel,
            name: `BOD (${gradeLevel}) - QR Login`
          });
          
          setQrCodeData({ email: newQrEmail, pass: randomPassword, grade: gradeLevel, realEmail: bodEmail });
          showToast("QR Code generated successfully.");
          return;
        }
        throw new Error(data.error?.message || "Failed to create QR account");
      }

      // Create the user profile in Firestore
      await setDoc(doc(db, 'users', data.localId), {
        uid: data.localId,
        email: bodEmail, // Store their real email for reference
        role: 'bod',
        gradeLevel: gradeLevel,
        name: `BOD (${gradeLevel}) - QR Login`
      });

      setQrCodeData({ email: qrEmail, pass: randomPassword, grade: gradeLevel, realEmail: bodEmail });
      showToast("QR Code generated successfully.");
      logActivity("Generated QR Code", `Created QR login for ${gradeLevel} BOD`);
    } catch (error: any) {
      console.error("QR Generation Error:", error);
      showToast(`Failed to generate QR code: ${error.message}`);
    }
  };

  const generateTeacherQRCode = async (teacherEmail: string, gradeLevel: string, name: string) => {
    if (profile?.role !== 'admin' && profile?.role !== 'teacher') return;
    showToast("Generating secure QR code...");
    
    try {
      // Generate a secure random password
      const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
      const qrEmail = `qr-${teacherEmail.replace('@', '_')}@facultyclub.local`;

      // Use Firebase REST API to create the user without signing out the admin
      const apiKey = firebaseConfig.apiKey;
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: qrEmail,
          password: randomPassword,
          returnSecureToken: true
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.error?.message === 'OPERATION_NOT_ALLOWED') {
          showToast("Please enable Email/Password authentication in Firebase Console to use QR Login.");
          return;
        } else if (data.error?.message === 'EMAIL_EXISTS') {
          showToast("QR Code already exists for this teacher. Generating a new one...");
          const newQrEmail = `qr-${Math.random().toString(36).slice(-5)}-${teacherEmail.replace('@', '_')}@facultyclub.local`;
          const retryResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: newQrEmail,
              password: randomPassword,
              returnSecureToken: true
            })
          });
          const retryData = await retryResponse.json();
          if (!retryResponse.ok) throw new Error(retryData.error?.message || "Failed to create QR account");
          
          await setDoc(doc(db, 'users', retryData.localId), {
            uid: retryData.localId,
            email: teacherEmail, // Store their real email for reference
            role: 'teacher',
            gradeLevel: gradeLevel,
            name: `${name} - QR Login`
          });
          
          setQrCodeData({ email: newQrEmail, pass: randomPassword, grade: gradeLevel, realEmail: teacherEmail });
          showToast("QR Code generated successfully.");
          return;
        }
        throw new Error(data.error?.message || "Failed to create QR account");
      }

      // Create the user profile in Firestore
      await setDoc(doc(db, 'users', data.localId), {
        uid: data.localId,
        email: teacherEmail, // Store their real email for reference
        role: 'teacher',
        gradeLevel: gradeLevel,
        name: `${name} - QR Login`
      });
      
      setQrCodeData({ email: qrEmail, pass: randomPassword, grade: gradeLevel, realEmail: teacherEmail });
      showToast("QR Code generated successfully.");
    } catch (error: any) {
      console.error("QR Generation Error:", error);
      showToast(`Failed to generate QR code: ${error.message}`);
    }
  };



  const deleteUser = async (uid: string) => {
    if (profile?.role !== 'admin') return;
    if (!window.confirm("Are you sure you want to remove this BOD? They will lose access to the app's BOD features.")) return;
    
    try {
      const userToDelete = allUsers.find(u => u.uid === uid);
      await deleteDoc(doc(db, 'users', uid));
      showToast("BOD removed successfully.");
      logActivity("Removed User", `Removed ${userToDelete?.name} (${userToDelete?.email})`, 'critical');
    } catch (error) {
      console.error("Delete User Error:", error);
      showToast("Failed to remove BOD.");
    }
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [remittanceIdToDelete, setRemittanceIdToDelete] = useState<string | null>(null);

  const deleteRemittance = async () => {
    console.log("Attempting to delete remittance:", remittanceIdToDelete, "with password:", deletePassword, "Profile:", profile);
    if (deletePassword.trim() !== '320302') {
      showToast("Incorrect password.");
      console.log("Incorrect password.");
      return;
    }

    if (!remittanceIdToDelete) {
      console.log("No remittance ID to delete.");
      return;
    }
    if (profile?.role !== 'admin') {
      showToast("Unauthorized: Only Admins can delete remittances.");
      console.log("Unauthorized. Profile role:", profile?.role);
      return;
    }

    try {
      console.log("Starting batch delete...");
      const batch = writeBatch(db);
      
      // Find the remittance to get teacher IDs
      const rem = remittances.find(r => r.id === remittanceIdToDelete);
      console.log("Found remittance:", rem);
      if (rem && rem.teacherIds && Array.isArray(rem.teacherIds)) {
        // Reset remitted status for teachers in this remittance
        for (const tId of rem.teacherIds) {
          const teacherRef = doc(db, 'teachers', tId);
          const teacherSnap = await getDoc(teacherRef);
          if (teacherSnap.exists()) {
            batch.update(teacherRef, {
              remitted: false,
              remittanceId: null,
              remittedDueIds: [] // Resetting this allows them to be remitted again
            });
          } else {
            console.warn(`Teacher ${tId} not found, skipping update.`);
          }
        }
      }

      const remRef = doc(db, 'remittances', remittanceIdToDelete);
      batch.delete(remRef);
      
      await batch.commit();
      console.log("Batch commit successful.");
      
      showToast("Remittance record deleted instantly.");
      await new Promise(r => setTimeout(r, 500)); // Small delay for Firestore sync
      setIsDeleteModalOpen(false);
      setDeletePassword('');
      setShowDeletePassword(false);
      setRemittanceIdToDelete(null);
    } catch (error) {
      console.error("Delete Remittance Error:", error);
      showToast("Failed to delete remittance.");
    }
  };

  const handleDownloadExcel = () => {
    if (records.length === 0) {
      showToast("No records to download.");
      return;
    }

    const data = records.map(record => {
      const row: any = {
        'Name': record.name,
        'Email': record.email,
        'Contact Number': record.contactNumber,
        'Grade Level': record.gradeLevel,
      };

      standardDues.forEach(due => {
        if (due.isVoluntary) {
          row[`${due.name} (Voluntary)`] = record.voluntaryPayments?.[due.id] || 0;
        } else {
          row[`${due.name} (Required)`] = record.paidDueIds.includes(due.id) ? due.amount : 0;
        }
      });

      const totalPaid = standardDues
        .filter(d => record.paidDueIds.includes(d.id))
        .reduce((sum, d) => {
          if (d.isVoluntary && record.voluntaryPayments?.[d.id] !== undefined) {
            return sum + record.voluntaryPayments[d.id];
          }
          return sum + d.amount;
        }, 0);
      
      const totalRequired = standardDues.filter(d => !d.isVoluntary).reduce((sum, d) => sum + d.amount, 0);

      row['Total Paid (₱)'] = totalPaid;
      row['Total Required (₱)'] = totalRequired;
      row['Balance (₱)'] = totalRequired - totalPaid;
      row['Status'] = totalPaid >= totalRequired ? 'Fully Paid' : totalPaid > 0 ? 'Partial' : 'Pending';
      row['Reference No.'] = record.lastReferenceNumber || 'N/A';
      row['Last Updated'] = record.lastUpdated ? new Date(record.lastUpdated).toLocaleString() : 'N/A';

      return row;
    });

    // Add a summary row
    const summaryRow: any = { 'Name': 'TOTAL SUMMARY' };
    standardDues.forEach(due => {
      summaryRow[`${due.name} (${due.isVoluntary ? 'Voluntary' : 'Required'})`] = records.reduce((sum, r) => {
        if (due.isVoluntary) return sum + (r.voluntaryPayments?.[due.id] || 0);
        return sum + (r.paidDueIds.includes(due.id) ? due.amount : 0);
      }, 0);
    });
    summaryRow['Total Paid (₱)'] = data.reduce((sum, r) => sum + r['Total Paid (₱)'], 0);
    summaryRow['Total Required (₱)'] = data.reduce((sum, r) => sum + r['Total Required (₱)'], 0);
    summaryRow['Balance (₱)'] = summaryRow['Total Required (₱)'] - summaryRow['Total Paid (₱)'];
    data.push(summaryRow);

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Liquidation Report");
    XLSX.writeFile(wb, `Liquidation_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast("Liquidation report downloaded.");
    logActivity("Exported Liquidation Report", `Exported ${records.length} records.`);
  };

  const handleDownloadComprehensiveReportDocx = async () => {
    try {
      showToast("Generating Comprehensive Report...");
      
      const totalCollections = records.reduce((sum, r) => {
        const paidDues = standardDues.filter(d => r.paidDueIds.includes(d.id));
        return sum + paidDues.reduce((s, d) => {
          if (d.isVoluntary && r.voluntaryPayments?.[d.id]) return s + r.voluntaryPayments[d.id];
          return s + d.amount;
        }, 0);
      }, 0);

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netBalance = totalCollections - totalExpenses;

      // Part I: Summary Table
      const summaryTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PARTICULARS", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F3F4F6" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "AMOUNT (₱)", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F3F4F6" } }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: "TOTAL COLLECTIONS (INCOME)" })] }),
              new TableCell({ children: [new Paragraph({ text: `₱ ${totalCollections.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, alignment: AlignmentType.RIGHT })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: "TOTAL EXPENSES (OUTFLOW)" })] }),
              new TableCell({ children: [new Paragraph({ text: `₱ ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, alignment: AlignmentType.RIGHT })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NET CLUB BALANCE", bold: true })] })], shading: { fill: "EBF5FF" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `₱ ${netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, bold: true })], alignment: AlignmentType.RIGHT })], shading: { fill: "EBF5FF" } }),
            ],
          }),
        ],
      });

      // Part II: Collections Table
      const collectionRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TEACHER NAME", bold: true, color: "FFFFFF" })] })], shading: { fill: "0038A8" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "GRADE", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "0038A8" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL PAID", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "0038A8" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "STATUS", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "0038A8" } }),
          ],
        }),
      ];

      records.forEach(r => {
        const paid = standardDues.filter(d => r.paidDueIds.includes(d.id)).reduce((s, d) => {
          if (d.isVoluntary && r.voluntaryPayments?.[d.id]) return s + r.voluntaryPayments[d.id];
          return s + d.amount;
        }, 0);
        const totalReq = standardDues.filter(d => !d.isVoluntary).reduce((s, d) => s + d.amount, 0);
        const status = paid >= totalReq ? "Fully Paid" : paid > 0 ? "Partial" : "Pending";

        collectionRows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: r.name })] }),
            new TableCell({ children: [new Paragraph({ text: r.gradeLevel, alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ text: `₱ ${paid.toLocaleString()}`, alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ text: status, alignment: AlignmentType.CENTER })] }),
          ],
        }));
      });

      // Part III: Expenses Table
      const expenseRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DATE", bold: true, color: "FFFFFF" })] })], shading: { fill: "DC2626" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DESCRIPTION", bold: true, color: "FFFFFF" })] })], shading: { fill: "DC2626" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "AMOUNT (₱)", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "DC2626" } }),
          ],
        }),
      ];

      expenses.forEach(e => {
        expenseRows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: e.timestamp?.toDate().toLocaleDateString() || "N/A" })] }),
            new TableCell({ children: [new Paragraph({ text: e.description })] }),
            new TableCell({ children: [new Paragraph({ text: `₱ ${e.amount.toLocaleString()}`, alignment: AlignmentType.RIGHT })] }),
          ],
        }));
      });

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                size: {
                  width: 18720, // 13 inches
                  height: 12240, // 8.5 inches
                  orientation: PageOrientation.LANDSCAPE,
                },
              },
            },
            children: [
              new Paragraph({ text: "LAS PIÑAS CAA NATIONAL HIGH SCHOOL", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
              new Paragraph({ text: "FACULTY CLUB OFFICERS", alignment: AlignmentType.CENTER }),
              new Paragraph({ text: "COMPREHENSIVE FINANCIAL & LIQUIDATION REPORT", heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER, spacing: { before: 200, after: 400 } }),
              
              new Paragraph({ text: "I. FINANCIAL SUMMARY", heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 200 } }),
              summaryTable,

              new Paragraph({ text: "II. COLLECTIONS BREAKDOWN", heading: HeadingLevel.HEADING_3, spacing: { before: 400, after: 200 } }),
              new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: collectionRows }),

              new Paragraph({ text: "III. EXPENSES BREAKDOWN", heading: HeadingLevel.HEADING_3, spacing: { before: 400, after: 200 } }),
              new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: expenseRows }),

              new Paragraph({ text: "", spacing: { before: 800 } }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({ 
                        children: [
                          new Paragraph({ text: "Prepared by:", spacing: { after: 400 } }), 
                          new Paragraph({ children: [new TextRun({ text: profile?.name || "____________________", bold: true })] }), 
                          new Paragraph({ text: "Faculty Club Treasurer" })
                        ], 
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } 
                      }),
                      new TableCell({ 
                        children: [
                          new Paragraph({ text: "Noted by:", spacing: { after: 400 } }), 
                          new Paragraph({ children: [new TextRun({ text: "____________________", bold: true })] }), 
                          new Paragraph({ text: "Faculty Club President" })
                        ], 
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } 
                      }),
                      new TableCell({ 
                        children: [
                          new Paragraph({ text: "Approved by:", spacing: { after: 400 } }), 
                          new Paragraph({ children: [new TextRun({ text: "____________________", bold: true })] }), 
                          new Paragraph({ text: "School Principal" })
                        ], 
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } 
                      }),
                    ],
                  }),
                ],
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Comprehensive_Liquidation_Report_${new Date().toISOString().split('T')[0]}.docx`);
      showToast("Comprehensive DOCX report downloaded.");
    } catch (error) {
      console.error("Comprehensive DOCX Error:", error);
      showToast("Failed to generate DOCX.");
    }
  };

  const handleDownloadLiquidationDocx = async () => {
    if (expenses.length === 0) {
      showToast("No expenses to report.");
      return;
    }

    try {
      showToast("Generating DOCX report...");
      
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "DATE", alignment: AlignmentType.CENTER, style: "HeaderStyle" })], shading: { fill: "0038A8" } }),
            new TableCell({ children: [new Paragraph({ text: "DESCRIPTION / PARTICULARS", alignment: AlignmentType.CENTER, style: "HeaderStyle" })], shading: { fill: "0038A8" } }),
            new TableCell({ children: [new Paragraph({ text: "CATEGORY", alignment: AlignmentType.CENTER, style: "HeaderStyle" })], shading: { fill: "0038A8" } }),
            new TableCell({ children: [new Paragraph({ text: "AMOUNT (₱)", alignment: AlignmentType.CENTER, style: "HeaderStyle" })], shading: { fill: "0038A8" } }),
          ],
        }),
      ];

      expenses.forEach((exp) => {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: exp.timestamp?.toDate().toLocaleDateString() || "N/A", alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ text: exp.description })] }),
              new TableCell({ children: [new Paragraph({ text: exp.category || "General", alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ text: `₱ ${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, alignment: AlignmentType.RIGHT })] }),
            ],
          })
        );
      });

      // Total Row
      const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "TOTAL EXPENSES", alignment: AlignmentType.RIGHT, style: "BoldStyle" })], columnSpan: 3 }),
            new TableCell({ children: [new Paragraph({ text: `₱ ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, alignment: AlignmentType.RIGHT, style: "BoldStyle" })] }),
          ],
        })
      );

      const doc = new Document({
        styles: {
          paragraphStyles: [
            { id: "HeaderStyle", name: "Header Style", run: { bold: true, color: "FFFFFF", size: 20 } },
            { id: "BoldStyle", name: "Bold Style", run: { bold: true, size: 22 } },
          ],
        },
        sections: [
          {
            properties: {
              page: {
                size: {
                  width: 18720, // 13 inches
                  height: 12240, // 8.5 inches
                  orientation: PageOrientation.LANDSCAPE,
                },
              },
            },
            children: [
              new Paragraph({
                text: "LAS PIÑAS CAA NATIONAL HIGH SCHOOL",
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                text: "FACULTY CLUB OFFICERS",
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                text: "LIQUIDATION REPORT",
                heading: HeadingLevel.HEADING_2,
                alignment: AlignmentType.CENTER,
                spacing: { before: 200, after: 400 },
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: tableRows,
              }),
              new Paragraph({ text: "", spacing: { before: 800 } }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({ 
                        children: [
                          new Paragraph({ text: "Prepared by:", spacing: { after: 400 } }), 
                          new Paragraph({ children: [new TextRun({ text: profile?.name || "____________________", bold: true })] }), 
                          new Paragraph({ text: "Faculty Club Treasurer" })
                        ], 
                        borders: { 
                          top: { style: BorderStyle.NONE }, 
                          bottom: { style: BorderStyle.NONE }, 
                          left: { style: BorderStyle.NONE }, 
                          right: { style: BorderStyle.NONE } 
                        } 
                      }),
                      new TableCell({ 
                        children: [
                          new Paragraph({ text: "Noted by:", spacing: { after: 400 } }), 
                          new Paragraph({ children: [new TextRun({ text: "____________________", bold: true })] }), 
                          new Paragraph({ text: "Faculty Club President" })
                        ], 
                        borders: { 
                          top: { style: BorderStyle.NONE }, 
                          bottom: { style: BorderStyle.NONE }, 
                          left: { style: BorderStyle.NONE }, 
                          right: { style: BorderStyle.NONE } 
                        } 
                      }),
                      new TableCell({ 
                        children: [
                          new Paragraph({ text: "Approved by:", spacing: { after: 400 } }), 
                          new Paragraph({ children: [new TextRun({ text: "____________________", bold: true })] }), 
                          new Paragraph({ text: "School Principal" })
                        ], 
                        borders: { 
                          top: { style: BorderStyle.NONE }, 
                          bottom: { style: BorderStyle.NONE }, 
                          left: { style: BorderStyle.NONE }, 
                          right: { style: BorderStyle.NONE } 
                        } 
                      }),
                    ],
                  }),
                ],
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Liquidation_Report_${new Date().toISOString().split('T')[0]}.docx`);
      showToast("DOCX report downloaded.");
    } catch (error) {
      console.error("DOCX Generation Error:", error);
      showToast("Failed to generate DOCX.");
    }
  };

  const addExpense = async (description: string, amount: number, category: string) => {
    if (profile?.role !== 'admin') return;
    try {
      await addDoc(collection(db, 'expenses'), {
        description,
        amount,
        category,
        timestamp: serverTimestamp(),
        adminId: user?.uid,
        adminName: profile?.name || 'Admin'
      });
      showToast("Expense recorded successfully.");
      logActivity("Recorded Expense", `Amount: ₱${amount.toFixed(2)} - ${description}`);
    } catch (error) {
      console.error("Add Expense Error:", error);
      showToast("Failed to record expense.");
    }
  };

  const deleteExpense = async (id: string) => {
    if (profile?.role !== 'admin') return;
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;
    try {
      const exp = expenses.find(e => e.id === id);
      await deleteDoc(doc(db, 'expenses', id));
      showToast("Expense record deleted.");
      logActivity("Deleted Expense", `Amount: ₱${exp?.amount.toFixed(2)} - ${exp?.description}`, 'warning');
    } catch (error) {
      console.error("Delete Expense Error:", error);
      showToast("Failed to delete expense.");
    }
  };

  const generateHTMLReceipt = (receipt: any) => {
    return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #0038A8; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">Official Receipt</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.9;">Las Piñas CAA Faculty Club</p>
  </div>
  <div style="padding: 20px;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
      <div>
        <p style="margin: 0; color: #666; font-size: 14px;">Date & Time</p>
        <p style="margin: 5px 0 0 0; font-weight: bold;">${receipt.date}</p>
      </div>
      <div style="text-align: right;">
        <p style="margin: 0; color: #666; font-size: 14px;">Reference No.</p>
        <p style="margin: 5px 0 0 0; font-weight: bold;">${receipt.referenceNumber}</p>
      </div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Received From</p>
      <p style="margin: 0; font-size: 18px; font-weight: bold;">${receipt.teacherName}</p>
      <p style="margin: 5px 0 0 0; color: #666;">${receipt.email}</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #f9f9f9;">
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Description (Paid)</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Amount (₱)</th>
        </tr>
      </thead>
      <tbody>
        ${receipt.breakdown.map((item: any) => `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">₱${item.amount.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td style="padding: 10px; font-weight: bold; text-align: right;">Collected Now</td>
          <td style="padding: 10px; font-weight: bold; text-align: right; font-size: 18px; color: #008000;">₱${receipt.total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    ${receipt.collectiblesBreakdown && receipt.collectiblesBreakdown.length > 0 ? `
    <div style="margin-top: 20px; border: 1px solid #ffeeba; border-radius: 8px; background-color: #fff3cd; padding: 15px;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #856404;">Collectibles</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${receipt.collectiblesBreakdown.map((item: any) => `
          <tr>
            <td style="padding: 5px 0; color: #856404; font-size: 14px;">${item.name}</td>
            <td style="padding: 5px 0; text-align: right; color: #856404; font-size: 14px;">₱${item.amount.toFixed(2)}</td>
          </tr>
        `).join('')}
        <tr style="border-top: 1px solid #ffeeba;">
          <td style="padding: 10px 0 0 0; font-weight: bold; color: #856404;">Balance</td>
          <td style="padding: 10px 0 0 0; text-align: right; font-weight: bold; color: #856404;">₱${receipt.balance.toFixed(2)}</td>
        </tr>
      </table>
    </div>
    ` : ''}

    <div style="background-color: ${receipt.isFullyPaid ? '#FCD116' : '#f3f4f6'}; color: #111; padding: 10px; text-align: center; border-radius: 4px; font-weight: bold; margin: 20px 0;">
      Status: ${receipt.isFullyPaid ? 'Fully Paid' : 'Partial Payment'}
    </div>

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #ccc;">
      <p style="margin: 0; color: #666;">Signed by</p>
      <p style="margin: 5px 0 0 0; font-weight: bold; color: #0038A8;">${receipt.sender}</p>
    </div>
  </div>
</div>
    `;
  };

  const sendReceiptEmail = async (record: TeacherRecord) => {
    const paidDues = standardDues.filter(d => record.paidDueIds.includes(d.id));
    const collectiblesDues = standardDues.filter(d => !record.paidDueIds.includes(d.id));
    
    if (paidDues.length === 0) return { success: false, error: "No paid dues" };

    const total = paidDues.reduce((sum, d) => sum + d.amount, 0);
    const balance = collectiblesDues.reduce((sum, d) => sum + d.amount, 0);
    const isFullyPaid = standardDues.length > 0 && standardDues.every(d => record.paidDueIds.includes(d.id));

    const receipt = {
      date: new Date().toLocaleString(),
      referenceNumber: `REC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      teacherName: record.name,
      email: record.email,
      breakdown: paidDues.map(d => ({ name: d.name, amount: d.amount })),
      collectiblesBreakdown: collectiblesDues.map(d => ({ name: d.name, amount: d.amount })),
      total: total,
      balance: balance,
      isFullyPaid: isFullyPaid,
      sender: "Las Piñas CAA Faculty Club Officers - BODs"
    };

    const html = generateHTMLReceipt(receipt);

    try {
      const response = await fetch('/api/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: record.email,
          subject: `Official Receipt - ${record.name} - ${receipt.referenceNumber}`,
          html: html
        })
      });

      const result = await response.json();
      if (result.success) {
        await updateDoc(doc(db, 'teachers', record.id), {
          lastReceiptSent: new Date().toISOString(),
          lastReferenceNumber: receipt.referenceNumber
        });
        return { success: true, ref: receipt.referenceNumber };
      } else {
        return { success: false, error: result.error || 'Failed to send email' };
      }
    } catch (error) {
      console.error("Send Error:", error);
      return { success: false, error: "Connection error" };
    }
  };

  const handleSendReceipt = async (record: TeacherRecord) => {
    setIsSending(record.id);
    const result = await sendReceiptEmail(record);
    if (result.success) {
      showToast(`Receipt Sent to ${record.email}`);
    } else {
      showToast(`Error: ${result.error}`);
    }
    setIsSending(null);
  };

  const handleBatchSendReceipts = async () => {
    const selectedTeachers = filteredRecords.filter(r => selectedTeacherIds.has(r.id));
    const teachersToReceive = selectedTeachers.filter(r => r.paidDueIds.length > 0);
    
    if (teachersToReceive.length === 0) {
      showToast("No teachers with payments selected.");
      return;
    }

    setIsBatchSending(true);
    let successCount = 0;
    const total = teachersToReceive.length;
    
    for (let i = 0; i < total; i++) {
      const record = teachersToReceive[i];
      showToast(`Sending receipt ${i + 1} of ${total}...`);
      const result = await sendReceiptEmail(record);
      if (result.success) successCount++;
      
      // Delay of 1.5 seconds between emails to prevent rate limiting/backend overload
      if (i < total - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    setIsBatchSending(false);
    setSelectedTeacherIds(new Set());
    
    if (selectedTeachers.length === teachersToReceive.length) {
      showToast(`Successfully sent ${successCount} out of ${total} emails.`);
    } else {
      showToast(`Successfully sent ${successCount} emails (Skipped ${selectedTeachers.length - teachersToReceive.length} without payments).`);
    }
  };

  const toggleTeacherSelection = (id: string) => {
    console.log("Toggling selection for:", id);
    const newSelection = new Set(selectedTeacherIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedTeacherIds(newSelection);
  };

  const selectAllWithPayments = () => {
    const withPayments = filteredRecords.filter(r => r.paidDueIds.length > 0).map(r => r.id);
    setSelectedTeacherIds(new Set(withPayments));
  };

  const clearSelection = () => {
    setSelectedTeacherIds(new Set());
  };

  const handleBatchDeleteTeachers = async () => {
    const teachersToDelete = Array.from(selectedTeacherIds);
    if (teachersToDelete.length === 0) return;

    setIsBatchDeleting(true);
    try {
      const batch = writeBatch(db);
      for (const id of teachersToDelete) {
        batch.delete(doc(db, 'teachers', id));
      }
      await batch.commit();
      
      setSelectedTeacherIds(new Set());
      showToast(`Successfully deleted ${teachersToDelete.length} teachers.`);
    } catch (error) {
      console.error("Batch Delete Error:", error);
      showToast("Failed to delete some teachers.");
    } finally {
      setIsBatchDeleting(false);
      setIsBatchDeleteModalOpen(false);
    }
  };

  const handleDeleteAllTeachers = async () => {
    setIsBatchDeleting(true);
    try {
      const snapshot = await getDocs(collection(db, 'teachers'));
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'teachers', docSnap.id));
      }
      showToast(`Successfully deleted all teacher records.`);
    } catch (error) {
      console.error("Delete All Error:", error);
      showToast("Failed to delete all teachers.");
    } finally {
      setIsBatchDeleting(false);
      setIsBatchDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#0038A8]" size={48} />
      </div>
    );
  }

  if ((!user || !profile)) {
    return (
      <div className="min-h-screen bg-[#0038A8] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
           <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
           <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-[#FCD116] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/95 backdrop-blur-xl p-8 sm:p-12 rounded-[2.5rem] shadow-2xl max-w-lg w-full text-center border border-white/50 relative z-10"
        >
          <div className="bg-gradient-to-br from-[#0038A8] to-blue-600 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-500/30 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
            <Sun className="text-[#FCD116] animate-sun-rotate" size={48} fill="#FCD116" />
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-3 tracking-tight">Faculty Club</h1>
          <p className="text-[#0038A8] mb-10 font-bold text-sm uppercase tracking-[0.2em]">Dues Management System</p>
          
          <div className="space-y-6">
            <div className="bg-gray-50/50 rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-inner">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Shield className="text-gray-400" size={16} />
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Secure Access</p>
              </div>
              
              <button 
                onClick={handleLogin}
                className="w-full bg-[#0038A8] text-white py-4 px-6 rounded-2xl font-bold text-sm hover:bg-blue-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                <div className="bg-white p-1.5 rounded-full relative z-10">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <span className="relative z-10">Continue with Google</span>
              </button>

              <div className="relative flex items-center py-5">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase tracking-widest">Or</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <button 
                onClick={() => setShowScanner(true)}
                className="w-full bg-white text-gray-700 border border-gray-200 py-4 px-6 rounded-2xl font-bold text-sm hover:bg-gray-50 hover:shadow-md transition-all duration-300 flex items-center justify-center gap-3 group"
              >
                <div className="bg-gray-100 p-1.5 rounded-full group-hover:bg-blue-100 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 group-hover:text-blue-600"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                </div>
                <span>Scan QR Code</span>
              </button>
              
              <p className="mt-6 text-xs text-gray-500 font-medium leading-relaxed">
                Faculty & BODs: Please use your registered email or scan your QR code to sign in.
              </p>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-bold">
              Las Piñas CAA National High School
            </p>
          </div>
        </motion.div>

        {/* QR Code Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setShowScanner(false)}
                className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600 transition-colors z-[110]"
              >
                <X size={20} />
              </button>
              <h2 className="text-xl font-black text-center text-gray-900 mb-4">Scan QR Code</h2>
              <div className="rounded-2xl overflow-hidden border-2 border-gray-100 mb-4 bg-black aspect-square relative">
                <div id="qr-reader" className="w-full h-full"></div>
                <div className="absolute inset-0 border-2 border-blue-500/30 pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                </div>
              </div>
              <p className="text-center text-sm text-gray-500 font-medium">
                Position the QR code within the frame to log in instantly.
              </p>
              <button
                onClick={() => setShowScanner(false)}
                className="w-full mt-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}

        {/* Unauthorized Email Modal */}
        {unauthorizedEmail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
              <div className="flex justify-center mb-6">
                <div className="bg-red-50 p-4 rounded-full">
                  <ShieldAlert className="text-red-500" size={40} />
                </div>
              </div>
              <h2 className="text-2xl font-black text-center text-gray-900 mb-2">Access Denied</h2>
              <p className="text-center text-gray-600 mb-6 font-medium">
                The email address <span className="font-bold text-gray-900">{unauthorizedEmail}</span> is not authorized to access this system.
              </p>
              <div className="bg-gray-50 rounded-2xl p-5 mb-8 border border-gray-100">
                <p className="text-sm text-gray-600 leading-relaxed">
                  To gain access, please ensure you are using:
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={16} />
                    <span>The email address associated with your teacher profile in the exported Excel file.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={16} />
                    <span>The official BOD email address assigned to you by the admin.</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => setUnauthorizedEmail(null)}
                className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-colors"
              >
                Understood, try another account
              </button>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  if (profile?.role === 'teacher') {
    const teacherRecord = records.find(r => r.email === profile?.email);
    
    // Calculate balances
    const totalDuesAmount = standardDues.reduce((sum, d) => sum + d.amount, 0);
    
    // Total Paid Amount should be the sum of all payments in history
    const totalPaidAmount = (teacherRecord?.paymentHistory || []).reduce((sum, p) => sum + p.amount, 0);
    
    // Remaining balance is based on CURRENT active dues
    const currentPaidAmount = standardDues.filter(d => teacherRecord?.paidDueIds.includes(d.id)).reduce((sum, d) => {
      if (d.isVoluntary && teacherRecord?.voluntaryPayments?.[d.id]) return sum + teacherRecord.voluntaryPayments[d.id];
      return sum + d.amount;
    }, 0);
    const remainingBalance = Math.max(0, totalDuesAmount - currentPaidAmount);
    const unpaidDues = standardDues.filter(d => !teacherRecord?.paidDueIds.includes(d.id));
    const settledCurrentDuesCount = standardDues.filter(d => teacherRecord?.paidDueIds.includes(d.id)).length;

    return (
      <div className="min-h-screen bg-gray-50 font-sans pb-12">
        <header className="bg-[#0038A8] text-white shadow-md sticky top-0 z-30">
          <div className="w-full px-4 sm:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Sun className="text-[#FCD116] animate-sun-rotate" size={32} fill="#FCD116" />
              <div>
                <h1 className="text-xl font-black leading-none tracking-tight">Faculty Club</h1>
                <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest">Teacher Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right mr-2">
                <p className="text-xs font-black text-blue-100 uppercase tracking-widest">{profile.name}</p>
                <p className="text-[10px] text-blue-300 font-bold">{profile.gradeLevel}</p>
              </div>
              <button onClick={handleLogout} className="p-2 bg-blue-800/50 hover:bg-red-500/20 rounded-xl transition-all">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
          {/* Welcome & Quick Actions */}
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[5rem] -mr-8 -mt-8 z-0"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-[#0038A8] w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
                    <User className="text-white" size={28} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">{teacherRecord?.name || profile.name}</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-[0.2em]">{teacherRecord?.gradeLevel || 'Teacher'}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => {
                      setEditProfileName(profile.name);
                      setEditProfileEmail(profile.email);
                      setIsEditingProfile(true);
                    }}
                    className="flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3.5 px-8 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
                  >
                    <User size={18} />
                    Edit Profile
                  </button>
                  <button 
                    onClick={() => generateTeacherQRCode(profile.email, teacherRecord?.gradeLevel || 'Teacher', profile.name)}
                    className="flex items-center justify-center gap-2 bg-blue-50 text-[#0038A8] py-3.5 px-8 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-100 transition-all active:scale-95"
                  >
                    <QrCode size={18} />
                    Generate QR Code
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:w-80 bg-[#0038A8] p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-100 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-tl-[4rem] -mb-4 -mr-4"></div>
              <div className="relative z-10">
                <p className="text-blue-200 font-black uppercase tracking-widest text-[10px] mb-2">Remaining Balance</p>
                <h3 className="text-4xl font-black tracking-tight mb-6">₱{remainingBalance.toFixed(2)}</h3>
                
                <div className="space-y-4">
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#FCD116] h-full transition-all duration-1000 ease-out" 
                      style={{ width: `${totalDuesAmount > 0 ? (currentPaidAmount / totalDuesAmount) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-80">
                    <span>Settlement Progress</span>
                    <span>{((currentPaidAmount / totalDuesAmount) * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div className="mt-8 bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-start gap-3">
                  <div className="bg-white/20 p-2 rounded-lg shrink-0">
                    <AlertCircle size={16} className="text-blue-100" />
                  </div>
                  <p className="text-[10px] font-bold text-blue-50 leading-relaxed">
                    {unpaidDues.length > 0 
                      ? `You have ${unpaidDues.length} unpaid dues. Please settle them with your BOD to maintain a verified status.`
                      : "All dues are settled. Your account is currently in good standing. Thank you!"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-50 p-2 rounded-xl text-green-600">
                  <PhilippinePeso size={20} />
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Paid (₱)</span>
              </div>
              <div className="text-2xl font-black text-gray-900">₱{totalPaidAmount.toFixed(2)}</div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-50 p-2 rounded-xl text-blue-600">
                  <CheckCircle size={20} />
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dues Settled</span>
              </div>
              <div className="text-2xl font-black text-gray-900">{settledCurrentDuesCount} / {standardDues.length}</div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-yellow-50 p-2 rounded-xl text-yellow-600">
                  <Clock size={20} />
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending</span>
              </div>
              <div className="text-2xl font-black text-gray-900">{unpaidDues.length} {unpaidDues.length === 1 ? 'Item' : 'Items'}</div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-50 p-2 rounded-xl text-purple-600">
                  <Shield size={20} />
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</span>
              </div>
              <div className="text-2xl font-black text-gray-900">
                {remainingBalance === 0 ? 'Verified' : 'Active'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-8">
              {/* Dues Status Section */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Dues Overview</h3>
                  <button 
                    onClick={() => setShowDues(!showDues)}
                    className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${showDues ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-[#0038A8] text-white hover:bg-blue-800'}`}
                  >
                    <Eye size={14} />
                    {showDues ? 'Hide Dues' : 'Show Dues'}
                  </button>
                </div>
                {showDues && (
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{unpaidDues.length} {unpaidDues.length === 1 ? 'Item' : 'Items'} Pending</span>
                    </div>
                    
                    <div className="space-y-3">
                      {standardDues.map(due => {
                        const isPaid = teacherRecord?.paidDueIds.includes(due.id);
                        return (
                          <div key={due.id} className={`p-5 rounded-3xl border-2 transition-all ${isPaid ? 'bg-white border-green-50' : 'bg-white border-gray-50 hover:border-blue-100'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPaid ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                  {isPaid ? <Check size={24} /> : <Clock size={24} />}
                                </div>
                                <div>
                                  <div className="font-black text-gray-900">{due.name}</div>
                                  <div className="text-xs font-bold text-gray-400">₱{due.amount.toFixed(2)}</div>
                                </div>
                              </div>
                              <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${isPaid ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'}`}>
                                {isPaid ? 'Settled' : 'Unpaid'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

              {/* Payment History Section */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Recent Payments</h3>
                <button 
                  onClick={() => setShowPayments(!showPayments)}
                  className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${showPayments ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-[#0038A8] text-white hover:bg-blue-800'}`}
                >
                  <Eye size={14} />
                  {showPayments ? 'Hide Payments' : 'Show Payments'}
                </button>
              </div>
              {showPayments && (
                <section>
                  <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="divide-y divide-gray-50">
                      {(teacherRecord?.paymentHistory || [])
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((payment, idx) => {
                          const due = standardDues.find(d => d.id === payment.dueId);
                          return (
                            <div key={idx} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="bg-blue-50 text-[#0038A8] w-10 h-10 rounded-xl flex items-center justify-center">
                                  <PhilippinePeso size={20} />
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900">{payment.dueName || due?.name || 'Unknown Due'}</div>
                                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {new Date(payment.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-black text-gray-900">₱{payment.amount.toFixed(2)}</div>
                                <div className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Successful</div>
                              </div>
                            </div>
                          );
                        })}
                      {(!teacherRecord?.paymentHistory || teacherRecord.paymentHistory.length === 0) && (
                        <div className="p-12 text-center">
                          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <FileText size={32} />
                          </div>
                          <p className="text-sm text-gray-400 font-bold">No payment records found yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar Area */}
            <div className="space-y-8">
              {/* Contact BOD Card */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6">Support</h3>
                <div className="space-y-4">
                  <a 
                    href="mailto:lpcaanhsfacultyclub@gmail.com?subject=Faculty Club Support Request"
                    className="p-4 bg-gray-50 rounded-2xl flex items-center gap-4 hover:bg-blue-50 transition-all group"
                  >
                    <div className="bg-white p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                      <Mail size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Support</p>
                      <p className="text-xs font-bold text-gray-700 group-hover:text-blue-600">lpcaanhsfacultyclub@gmail.com</p>
                    </div>
                  </a>
                  <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-4">
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                      <Users size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">BOD Contact</p>
                      <p className="text-xs font-bold text-gray-700">Contact your Grade Level BOD</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Note */}
              <div className="bg-yellow-50 p-6 rounded-[2rem] border border-yellow-100">
                <div className="flex items-center gap-3 mb-3">
                  <ShieldAlert size={20} className="text-yellow-600" />
                  <h4 className="text-xs font-black text-yellow-800 uppercase tracking-widest">Security Tip</h4>
                </div>
                <p className="text-[11px] text-yellow-700 font-medium leading-relaxed">
                  Never share your QR login code with anyone. It provides direct access to your financial records and profile.
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* Edit Profile Modal for Teachers */}
        {isEditingProfile && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2.5rem] p-8 sm:p-12 max-w-md w-full shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Edit My Profile</h3>
                <button onClick={() => setIsEditingProfile(false)} className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={editProfileName}
                    onChange={(e) => setEditProfileName(e.target.value)}
                    className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl font-bold text-gray-900 transition-all outline-none"
                    placeholder="Your Full Name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={editProfileEmail}
                    onChange={(e) => setEditProfileEmail(e.target.value)}
                    className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl font-bold text-gray-900 transition-all outline-none"
                    placeholder="your@email.com"
                  />
                </div>
                
                <div className="flex flex-col gap-3 pt-4">
                  <button 
                    onClick={handleSaveProfile}
                    className="w-full py-4 bg-[#0038A8] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-100"
                  >
                    Save Changes
                  </button>
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* QR Code Display Modal for Teachers */}
        {qrCodeData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[2.5rem] p-8 sm:p-12 max-w-md w-full shadow-2xl border border-gray-100 text-center relative"
            >
              <button 
                onClick={() => setQrCodeData(null)}
                className="absolute top-6 right-6 p-2 bg-gray-100 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
              
              <div id="qr-code-capture-area-teacher" className="bg-white p-4 rounded-2xl">
                <h3 className="text-2xl font-black text-gray-900 mb-2">Teacher Login QR Code</h3>
                <p className="text-gray-500 font-bold mb-6 text-sm">
                  Teacher
                </p>
                
                <div className="bg-white p-4 rounded-2xl shadow-inner border border-gray-100 inline-block mb-4">
                  <QRCodeCanvas 
                    id="teacher-qr-canvas"
                    value={JSON.stringify({ email: qrCodeData.email, pass: qrCodeData.pass })} 
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6">
                  <p className="text-xs text-blue-800 font-medium leading-relaxed mb-2">
                    Scan this QR code next time you log in.
                  </p>
                  <div className="flex items-start gap-2 mt-3 pt-3 border-t border-blue-200/50">
                    <ShieldAlert size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-700 font-bold text-left">
                      Note: Please keep this QR code safe and private, as it grants direct access to your account.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => downloadQRCode(
                    'teacher-qr-canvas', 
                    `FacultyClub_QR_${profile.name.replace(/\s+/g, '_')}.png`,
                    qrCodeData.realEmail || qrCodeData.email
                  )}
                  className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-100"
                >
                  <Download size={16} />
                  Download QR Code
                </button>
                <button 
                  onClick={() => setQrCodeData(null)}
                  className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col lg:flex-row overflow-hidden">
      {/* Mobile Header */}
      <header className="lg:hidden bg-[#0038A8] text-white p-4 flex items-center justify-between sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
            <Sun className="text-[#FCD116] animate-sun-rotate" size={24} fill="#FCD116" />
          </div>
          <h1 className="text-lg font-black tracking-tight">Las Piñas CAA</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 1024) && (
          <motion.aside 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 flex flex-col shadow-2xl lg:shadow-none transition-all duration-300 ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            <div className="p-8">
              <div className="flex items-center gap-4 mb-10">
                <div className="bg-gradient-to-br from-[#0038A8] to-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200 transform -rotate-6">
                  <Sun className="text-[#FCD116] animate-sun-rotate" size={28} fill="#FCD116" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-gray-900 leading-none tracking-tight">Faculty Club</h1>
                  <p className="text-[10px] text-[#0038A8] font-black uppercase tracking-widest mt-1">Management System</p>
                </div>
              </div>

              <nav className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">Main Menu</p>
                <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
                <NavItem id="collection" icon={Users} label="Collection" />
                <NavItem id="remittance" icon={Wallet} label="Remittances" />
                
                <div className="pt-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">Administrative</p>
                  <NavItem id="admin" icon={Shield} label="Admin Panel" role="admin" />
                  <NavItem id="expenses" icon={CreditCard} label="Expenses" role="admin" />
                  <NavItem id="audit" icon={History} label="Audit Logs" role="admin" />
                </div>

                <div className="pt-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">Account</p>
                  <NavItem id="profile" icon={User} label="My Profile" />
                </div>
              </nav>
            </div>

            <div className="mt-auto p-6 border-t border-gray-50">
              <div className="bg-gray-50 rounded-3xl p-4 flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-[#0038A8] rounded-full flex items-center justify-center text-white font-black shadow-md">
                  {profile.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-gray-900 truncate">{profile.name}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{profile.role} • {profile.gradeLevel}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all group"
              >
                <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" /> Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Bar (Desktop) */}
        <header className="hidden lg:flex items-center justify-between px-10 py-6 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
          <div>
            <h2 className="text-2xl font-black text-gray-900 capitalize tracking-tight">{activeTab.replace('-', ' ')}</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-2xl border border-blue-100">
              <Activity size={14} className="text-[#0038A8]" />
              <span className="text-[10px] font-black text-[#0038A8] uppercase tracking-widest">System Active</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto"
            >
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Welcome Section */}
                  <div className="bg-gradient-to-br from-[#0038A8] to-blue-700 rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="max-w-xl">
                        <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">
                          Welcome back, {profile.name.split(' ')[0]}! 
                          <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
                        </h1>
                        <p className="text-blue-100 text-sm md:text-base font-medium leading-relaxed opacity-90">
                          Here's what's happening with the Faculty Club finances today. {(profile?.role === 'admin' || profile?.email === 'lpcaanhsfacultyclubofficers@gmail.com') && `You have ${remittances.filter(r => r.status === 'pending').length} pending remittances to verify.`}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-8">
                          <button onClick={() => setActiveTab('collection')} className="bg-white text-[#0038A8] px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-lg">
                            Manage Collections
                          </button>
                          {(profile?.role === 'admin' || profile?.email === 'lpcaanhsfacultyclubofficers@gmail.com') && (
                            <button onClick={() => setActiveTab('remittance')} className="bg-blue-600/30 backdrop-blur-md text-white border border-white/20 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600/50 transition-all">
                              View Remittances
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20 flex flex-col items-center text-center min-w-[240px]">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">Net Club Balance</div>
                        <div className="text-4xl font-black tracking-tighter mb-4">
                          ₱{(records.reduce((sum, r) => {
                            const paidDues = standardDues.filter(d => r.paidDueIds.includes(d.id));
                            return sum + paidDues.reduce((s, d) => {
                              if (d.isVoluntary && r.voluntaryPayments?.[d.id]) return s + r.voluntaryPayments[d.id];
                              return s + d.amount;
                            }, 0);
                          }, 0) - expenses.reduce((sum, e) => sum + e.amount, 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-green-500/20 text-green-300 px-3 py-1 rounded-full">
                          <TrendingUp size={12} /> Updated Just Now
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 rounded-2xl text-[#0038A8] group-hover:bg-[#0038A8] group-hover:text-white transition-all">
                          <Users size={24} />
                        </div>
                        <div className="flex items-center gap-1 text-green-600 text-[10px] font-black">
                          <ArrowUpRight size={14} /> +2.5%
                        </div>
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Faculty</p>
                      <h3 className="text-2xl font-black text-gray-900">{records.length}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-50 rounded-2xl text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all">
                          <CheckCircle size={24} />
                        </div>
                        <div className="text-[10px] font-black text-green-600">
                          {((records.filter(r => {
                            const requiredDues = standardDues.filter(d => !d.isVoluntary);
                            return requiredDues.length > 0 && requiredDues.every(d => r.paidDueIds.includes(d.id));
                          }).length / (records.length || 1)) * 100).toFixed(0)}%
                        </div>
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fully Paid</p>
                      <h3 className="text-2xl font-black text-gray-900">
                        {records.filter(r => {
                          const requiredDues = standardDues.filter(d => !d.isVoluntary);
                          return requiredDues.length > 0 && requiredDues.every(d => r.paidDueIds.includes(d.id));
                        }).length}
                      </h3>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-50 rounded-2xl text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all">
                          <CreditCard size={24} />
                        </div>
                        <div className="flex items-center gap-1 text-red-600 text-[10px] font-black">
                          <ArrowDownRight size={14} /> -₱2.4k
                        </div>
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Expenses</p>
                      <h3 className="text-2xl font-black text-gray-900">₱{expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</h3>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                          <PieChart size={24} />
                        </div>
                        <div className="text-[10px] font-black text-purple-600">
                          {standardDues.length} {standardDues.length === 1 ? 'Item' : 'Items'}
                        </div>
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Dues</p>
                      <h3 className="text-2xl font-black text-gray-900">₱{standardDues.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}</h3>
                    </div>
                  </div>

                  {/* Main Dashboard Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Activity */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-50 rounded-2xl text-[#0038A8]">
                            <History size={24} />
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Recent Activity</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Latest system updates</p>
                          </div>
                        </div>
                        <button onClick={() => setActiveTab('audit')} className="text-[10px] font-black text-[#0038A8] uppercase tracking-widest hover:underline">View All</button>
                      </div>
                      
                      <div className="space-y-4">
                        {auditLogs.slice(0, 5).map(log => (
                          <div key={log.id} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100">
                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                              log.type === 'critical' ? 'bg-red-500' : log.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-gray-900 uppercase tracking-tight mb-1">{log.action}</p>
                              <p className="text-[11px] text-gray-500 font-medium line-clamp-1">{log.details}</p>
                            </div>
                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest whitespace-nowrap">
                              {log.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pending Tasks / Remittances */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-yellow-50 rounded-2xl text-yellow-600">
                          <Clock size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Pending Tasks</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Awaiting action</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {remittances.filter(r => r.status === 'pending').length > 0 ? (
                          remittances.filter(r => r.status === 'pending').slice(0, 4).map(rem => (
                            <div key={rem.id} className="p-4 rounded-2xl bg-yellow-50/50 border border-yellow-100">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-black text-yellow-700 uppercase tracking-widest">{rem.gradeLevel} Remittance</span>
                                <span className="text-[10px] font-black text-yellow-600">₱{rem.amount.toLocaleString()}</span>
                              </div>
                              <p className="text-[11px] text-gray-600 font-bold mb-3">From: {rem.bodName}</p>
                              <button 
                                onClick={() => setActiveTab('remittance')}
                                className="w-full py-2 bg-white text-yellow-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-yellow-200 hover:bg-yellow-100 transition-all"
                              >
                                Review & Verify
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="py-12 text-center">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <CheckCircle size={24} className="text-gray-200" />
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">All caught up!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'collection' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Collection Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-[#0038A8] transition-colors">
                    <Users className="text-[#0038A8] group-hover:text-white transition-colors" size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Faculty</p>
                    <h3 className="text-2xl font-black text-gray-900 leading-none">{filteredRecords.length}</h3>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0038A8] rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-green-50 rounded-2xl group-hover:bg-green-600 transition-colors">
                    <CheckCircle className="text-green-600 group-hover:text-white transition-colors" size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Fully Paid</p>
                    <h3 className="text-2xl font-black text-gray-900 leading-none">
                      {filteredRecords.filter(r => {
                        const requiredDues = standardDues.filter(d => !d.isVoluntary);
                        return requiredDues.length > 0 && requiredDues.every(d => r.paidDueIds.includes(d.id));
                      }).length}
                    </h3>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ 
                    width: `${(filteredRecords.filter(r => {
                      const requiredDues = standardDues.filter(d => !d.isVoluntary);
                      return requiredDues.length > 0 && requiredDues.every(d => r.paidDueIds.includes(d.id));
                    }).length / (filteredRecords.length || 1)) * 100}%` 
                  }}></div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-yellow-50 rounded-2xl group-hover:bg-yellow-600 transition-colors">
                    <Clock className="text-yellow-600 group-hover:text-white transition-colors" size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Partial</p>
                    <h3 className="text-2xl font-black text-gray-900 leading-none">
                      {filteredRecords.filter(r => {
                        const requiredDues = standardDues.filter(d => !d.isVoluntary);
                        const isFullyPaid = requiredDues.length > 0 && requiredDues.every(d => r.paidDueIds.includes(d.id));
                        const totalPaid = standardDues.filter(d => r.paidDueIds.includes(d.id)).length;
                        return !isFullyPaid && totalPaid > 0;
                      }).length}
                    </h3>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ 
                    width: `${(filteredRecords.filter(r => {
                      const requiredDues = standardDues.filter(d => !d.isVoluntary);
                      const isFullyPaid = requiredDues.length > 0 && requiredDues.every(d => r.paidDueIds.includes(d.id));
                      const totalPaid = standardDues.filter(d => r.paidDueIds.includes(d.id)).length;
                      return !isFullyPaid && totalPaid > 0;
                    }).length / (filteredRecords.length || 1)) * 100}%` 
                  }}></div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-red-50 rounded-2xl group-hover:bg-red-600 transition-colors">
                    <AlertCircle className="text-red-600 group-hover:text-white transition-colors" size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Pending</p>
                    <h3 className="text-2xl font-black text-gray-900 leading-none">
                      {filteredRecords.filter(r => r.paidDueIds.length === 0).length}
                    </h3>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ 
                    width: `${(filteredRecords.filter(r => r.paidDueIds.length === 0).length / (filteredRecords.length || 1)) * 100}%` 
                  }}></div>
                </div>
              </div>
            </div>

            {/* Admin Alert for Pending Deletions */}
            {profile?.role === 'admin' && (standardDues.some(d => d.pendingDeletion) || records.some(r => r.pendingDeletion)) && (
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl shadow-sm animate-pulse">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="text-red-500" size={24} />
                  <div>
                    <h3 className="text-xs font-black text-red-800 uppercase tracking-wider">Pending Deletion Requests</h3>
                    <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest">
                      BODs have marked items for deletion. Action required.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Encode Dues & Contributions */}
            <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-200 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
              <div className="flex items-center gap-4 mb-8 relative z-10">
                <div className="bg-[#0038A8] text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-blue-200">1</div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Standard Dues Template</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Define what everyone needs to pay</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                <div className="lg:col-span-4">
                  <form onSubmit={handleAddStandardDue} className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 space-y-4">
                    <h3 className="text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Add New Item</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Item Name</label>
                        <input 
                          type="text" 
                          required 
                          value={newDueName} 
                          onChange={e => setNewDueName(e.target.value)} 
                          placeholder="e.g. Faculty Dues"
                          className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8] transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Amount (₱)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₱</span>
                          <input 
                            type="number" 
                            required={!isVoluntary}
                            value={newDueAmount} 
                            onChange={e => setNewDueAmount(e.target.value === '' ? '' : Number(e.target.value))} 
                            placeholder={isVoluntary ? "Suggested" : "0.00"}
                            className="w-full bg-white border border-gray-200 rounded-xl p-3 pl-8 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8] transition-all"
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors group">
                        <input 
                          type="checkbox" 
                          checked={isVoluntary}
                          onChange={e => setIsVoluntary(e.target.checked)}
                          className="w-5 h-5 text-[#0038A8] border-gray-300 rounded-lg focus:ring-[#0038A8]"
                        />
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest group-hover:text-[#0038A8]">Voluntary Contribution</span>
                      </label>
                      <button type="submit" className="w-full bg-[#0038A8] text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2">
                        <Plus size={18} /> Add Item
                      </button>
                    </div>
                  </form>
                </div>

                <div className="lg:col-span-8">
                  <h3 className="text-xs font-black text-gray-400 mb-4 uppercase tracking-widest">Active Template Items</h3>
                  {standardDues.length === 0 ? (
                    <div className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-[2rem] p-12 text-center">
                      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <PhilippinePeso size={32} className="text-gray-200" />
                      </div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No dues encoded yet. Start by adding items.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {standardDues.map(due => (
                        <div key={due.id} className={`group p-4 rounded-3xl border transition-all hover:shadow-md ${
                          due.pendingDeletion 
                          ? 'bg-red-50 border-red-100' 
                          : 'bg-white border-gray-100'
                        }`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`text-sm font-black uppercase tracking-tight truncate ${due.pendingDeletion ? 'text-red-700' : 'text-gray-900'}`}>
                                  {due.name}
                                </h4>
                                {due.isVoluntary && (
                                  <span className="shrink-0 text-[8px] font-black uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Voluntary</span>
                                )}
                              </div>
                              <div className={`text-lg font-black ${due.pendingDeletion ? 'text-red-500' : 'text-[#0038A8]'}`}>
                                ₱{due.amount.toFixed(2)}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {due.pendingDeletion && profile?.role === 'admin' ? (
                                <div className="flex gap-1">
                                  <button 
                                    onClick={() => deleteStandardDue(due.id)} 
                                    className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-sm"
                                    title="Confirm Delete"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button 
                                    onClick={() => cancelDeleteStandardDue(due.id)} 
                                    className="p-2 bg-gray-200 text-gray-600 rounded-xl hover:bg-gray-300"
                                    title="Cancel Request"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => deleteStandardDue(due.id)} 
                                  disabled={due.pendingDeletion}
                                  className={`p-2 rounded-xl transition-all ${
                                    due.pendingDeletion 
                                    ? 'text-red-200 cursor-not-allowed' 
                                    : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                                  }`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                          {due.pendingDeletion && profile?.role === 'admin' && (
                            <div className="mt-3 pt-3 border-t border-red-100 text-[9px] text-red-400 font-bold uppercase tracking-widest">
                              Requested by: {due.deletionRequestedBy}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Step 2: Teacher List */}
            <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-[#0038A8] text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-blue-200">2</div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Teacher List & Payments</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Track and manage faculty contributions</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={() => setShowAddTeacherForm(!showAddTeacherForm)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                      showAddTeacherForm ? 'bg-blue-50 text-[#0038A8]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Plus size={14} /> {showAddTeacherForm ? 'Close Form' : 'Add Teacher'}
                  </button>
                  <label className="bg-blue-50 text-[#0038A8] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer flex items-center gap-2 hover:bg-blue-100 transition-all border border-blue-100">
                    <Upload size={14} /> Import
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelUpload} />
                  </label>
                  <button 
                    onClick={handleBatchSendReceipts}
                    disabled={isBatchSending || selectedTeacherIds.size === 0}
                    className="bg-[#0038A8] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-100 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isBatchSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send Batch Receipts
                  </button>
                  <button 
                    onClick={handleDownloadExcel}
                    className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center gap-2"
                  >
                    <FileDown size={14} /> Export Report
                  </button>
                  {profile.role === 'admin' && (
                    <button 
                      onClick={() => {
                        setDeleteType('all');
                        setIsBatchDeleteModalOpen(true);
                      }}
                      className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Delete All Teachers
                    </button>
                  )}
                </div>
              </div>

              {showAddTeacherForm && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 mb-8 overflow-hidden"
                >
                  <h3 className="text-xs font-black text-gray-400 mb-4 uppercase tracking-widest">New Teacher Registration</h3>
                  <form onSubmit={handleAddTeacher} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Last Name</label>
                      <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dela Cruz" className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">First Name</label>
                      <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan" className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Middle Name</label>
                      <input type="text" value={middleInitial} onChange={e => setMiddleInitial(e.target.value)} placeholder="P." className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Grade Level</label>
                      <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value as GradeLevel)} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8]">
                        <option value="Grade 7">Grade 7</option>
                        <option value="Grade 8">Grade 8</option>
                        <option value="Grade 9">Grade 9</option>
                        <option value="Grade 10">Grade 10</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Email Address</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="juan@example.com" className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 mb-1.5 uppercase tracking-widest">Contact Number</label>
                      <input type="text" value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="09123456789" className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8]" />
                    </div>
                    <div className="flex items-end">
                      <button type="submit" className="w-full bg-[#0038A8] text-white py-3 rounded-xl font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-100">
                        Register
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Filters & Search Bar */}
              <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 mb-8">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#0038A8] outline-none transition-all shadow-sm"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <select 
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value as GradeLevel | 'All')}
                      className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8] shadow-sm"
                    >
                      <option value="All">All Grades</option>
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                    </select>
                    <select 
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value as 'All' | 'Paid' | 'Partial' | 'Pending')}
                      className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8] shadow-sm"
                    >
                      <option value="All">All Status</option>
                      <option value="Paid">Fully Paid</option>
                      <option value="Partial">Partial</option>
                      <option value="Pending">Pending</option>
                    </select>
                    <button 
                      onClick={selectPaidTeachers}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-sm"
                      title="Select all teachers who have made payments"
                    >
                      Select Paid
                    </button>
                    {(searchQuery || selectedGrade !== 'All' || paymentFilter !== 'All' || selectedTeacherIds.size > 0) && (
                      <button 
                        onClick={clearFilters}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-600 px-4 py-3 rounded-2xl transition-all"
                        title="Clear all filters and selections"
                      >
                        <X size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Batch Actions Bar */}
              {selectedTeacherIds.size > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="fixed bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 bg-[#0038A8] text-white px-6 py-3 md:px-8 md:py-4 rounded-2xl md:rounded-[2rem] shadow-2xl flex flex-col md:flex-row items-center gap-3 md:gap-6 border border-white/20 backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3 md:border-r md:border-white/20 md:pr-6 w-full md:w-auto justify-center md:justify-start">
                    <div className="bg-white text-[#0038A8] w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0">
                      {selectedTeacherIds.size}
                    </div>
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Teachers Selected</span>
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-center">
                    <button 
                      onClick={handleBatchSendReceipts}
                      disabled={isBatchSending}
                      className="bg-white text-[#0038A8] px-4 py-2 md:px-6 md:py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
                    >
                      {isBatchSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Send Receipts
                    </button>
                    {profile.role === 'admin' && (
                      <button 
                        onClick={() => {
                          setDeleteType('selected');
                          setIsBatchDeleteModalOpen(true);
                        }}
                        disabled={isBatchDeleting}
                        className="bg-red-500 text-white px-4 py-2 md:px-6 md:py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-red-200 shrink-0"
                      >
                        {isBatchDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Delete
                      </button>
                    )}
                    <button 
                      onClick={clearSelection}
                      className="text-white/70 hover:text-white text-[10px] font-black uppercase tracking-widest shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

                  {/* Desktop View Table */}
                  <div className="hidden md:block overflow-x-auto border border-gray-100 rounded-xl">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-6 py-4 text-left w-10">
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 text-[#0038A8] focus:ring-[#0038A8]"
                              checked={filteredRecords.length > 0 && filteredRecords.every(r => selectedTeacherIds.has(r.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTeacherIds(new Set(filteredRecords.map(r => r.id)));
                                } else {
                                  setSelectedTeacherIds(new Set());
                                }
                              }}
                            />
                          </th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Teacher Info</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Status</th>
                          <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
                        {records.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-20 text-center">
                              <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <Users size={32} className="text-gray-200" />
                              </div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No teachers in the list yet.</p>
                            </td>
                          </tr>
                        ) : filteredRecords.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-20 text-center">
                              <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <Search size={32} className="text-gray-200" />
                              </div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No matching records found.</p>
                              <button onClick={clearFilters} className="mt-4 text-[#0038A8] text-[10px] font-black uppercase tracking-widest hover:underline">Clear Filters</button>
                            </td>
                          </tr>
                        ) : (
                          <>
                            <tr><td colSpan={4} className="px-6 py-2 text-xs text-gray-500">Showing {paginatedRecords.length} teachers of {filteredRecords.length}</td></tr>
                            {paginatedRecords.map(record => {
                              const totalCollectibles = standardDues.filter(d => !d.isVoluntary).reduce((sum, d) => sum + d.amount, 0);
                              const totalPaid = standardDues
                                .filter(d => record.paidDueIds.includes(d.id))
                                .reduce((sum, d) => {
                                  if (d.isVoluntary && record.voluntaryPayments?.[d.id] !== undefined) {
                                    return sum + record.voluntaryPayments[d.id];
                                  }
                                  return sum + d.amount;
                                }, 0);
                              const requiredDues = standardDues.filter(d => !d.isVoluntary);
                              const isFullyPaid = requiredDues.length > 0 && requiredDues.every(d => record.paidDueIds.includes(d.id));
                              const isExpanded = expandedRows.has(record.id);

                              return (
                                <React.Fragment key={record.id}>
                                  <tr className={`hover:bg-blue-50/30 transition-colors group ${isFullyPaid ? 'bg-green-50/20' : ''}`}>
                                <td className="px-6 py-4">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedTeacherIds.has(record.id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleTeacherSelection(record.id);
                                    }}
                                    className="w-5 h-5 text-[#0038A8] border-gray-300 rounded-lg focus:ring-[#0038A8]"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <button onClick={() => toggleRow(record.id)} className="text-gray-300 hover:text-[#0038A8] transition-colors">
                                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                    <div>
                                      <div className="text-sm font-black text-gray-900 uppercase tracking-tight">{record.name}</div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-md">{record.gradeLevel}</span>
                                        <span className="text-[10px] text-gray-400 font-bold truncate max-w-[150px]">{record.email}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden min-w-[80px] max-w-[120px]">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          isFullyPaid ? 'bg-green-500' : totalPaid > 0 ? 'bg-yellow-500' : 'bg-gray-200'
                                        }`} 
                                        style={{ width: `${totalCollectibles > 0 ? (totalPaid / totalCollectibles) * 100 : 0}%` }}
                                      ></div>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                                      isFullyPaid ? 'text-green-600' : totalPaid > 0 ? 'text-yellow-600' : 'text-gray-400'
                                    }`}>
                                      ₱{totalPaid.toFixed(0)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => handleSendReceipt(record)}
                                      disabled={totalPaid === 0 || isSending === record.id || record.pendingDeletion}
                                      className={`p-2 rounded-xl transition-all ${
                                        (totalPaid === 0 || record.pendingDeletion)
                                        ? 'text-gray-200 cursor-not-allowed' 
                                        : isSending === record.id
                                        ? 'text-gray-400'
                                        : 'text-[#CE1126] hover:bg-red-50'
                                      }`}
                                      title="Send Receipt"
                                    >
                                      {isSending === record.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    </button>
                                    <button 
                                      onClick={() => openEditModal(record)}
                                      className="p-2 text-[#0038A8] hover:bg-blue-50 rounded-xl transition-all"
                                      title="Edit Info"
                                    >
                                      <FileText size={16} />
                                    </button>
                                    <button 
                                      onClick={() => generateTeacherQRCode(record.email, record.gradeLevel, record.name)}
                                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                                      title="Generate QR Code"
                                    >
                                      <QrCode size={16} />
                                    </button>
                                    <button 
                                      onClick={() => deleteTeacher(record.id)}
                                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                      title="Delete"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-blue-50/20">
                                  <td colSpan={4} className="px-14 py-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {standardDues.map(due => {
                                        const isPaid = record.paidDueIds.includes(due.id);
                                        return (
                                          <label key={due.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${isPaid ? 'bg-white border-green-100 shadow-sm' : 'bg-white/50 border-gray-100'}`}>
                                            <div className="flex items-center gap-3">
                                              <input 
                                                type="checkbox" 
                                                checked={isPaid}
                                                onChange={() => toggleDuePaid(record.id, due.id)}
                                                className="w-4 h-4 text-[#0038A8] border-gray-300 rounded-lg focus:ring-[#0038A8]"
                                              />
                                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isPaid ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'}`}>
                                                {isPaid ? <Check size={12} /> : <PhilippinePeso size={12} />}
                                              </div>
                                              <div>
                                                <div className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{due.name}</div>
                                                <div className="text-[9px] text-gray-400 font-bold">₱{due.amount.toFixed(2)}</div>
                                              </div>
                                            </div>
                                            {isPaid && <span className="text-[8px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded-full">Paid</span>}
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                        </>
                      )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile View List */}
                  <div className="md:hidden space-y-4 mt-4">
                    {records.length === 0 ? (
                      <div className="py-12 text-center bg-white rounded-2xl border border-gray-100">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <Users size={24} className="text-gray-300" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No teachers yet.</p>
                      </div>
                    ) : filteredRecords.length === 0 ? (
                      <div className="py-12 text-center bg-white rounded-2xl border border-gray-100">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <Search size={24} className="text-gray-300" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No matches found.</p>
                        <button onClick={clearFilters} className="mt-3 text-[#0038A8] text-[10px] font-black uppercase tracking-widest hover:underline">Clear Filters</button>
                      </div>
                    ) : (
                      <>
                        {paginatedRecords.map(record => {
                          const totalCollectibles = standardDues.filter(d => !d.isVoluntary).reduce((sum, d) => sum + d.amount, 0);
                          const totalPaid = standardDues
                            .filter(d => record.paidDueIds.includes(d.id))
                            .reduce((sum, d) => {
                              if (d.isVoluntary && record.voluntaryPayments?.[d.id] !== undefined) {
                                return sum + record.voluntaryPayments[d.id];
                              }
                              return sum + d.amount;
                            }, 0);
                          const requiredDues = standardDues.filter(d => !d.isVoluntary);
                          const isFullyPaid = requiredDues.length > 0 && requiredDues.every(d => record.paidDueIds.includes(d.id));
                          const isExpanded = expandedRows.has(record.id);

                          return (
                            <div key={record.id} className={`bg-white p-3 rounded-2xl border ${isFullyPaid ? 'border-green-200 bg-green-50/10' : 'border-gray-100'} shadow-sm space-y-3`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedTeacherIds.has(record.id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleTeacherSelection(record.id);
                                    }}
                                    className="mt-1 w-4 h-4 text-[#0038A8] border-gray-300 rounded-lg focus:ring-[#0038A8]"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">{record.name}</div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-1.5 py-0.5 rounded-md">{record.gradeLevel}</span>
                                      <span className="text-[9px] text-gray-400 font-bold truncate max-w-[120px] sm:max-w-[200px]">{record.email}</span>
                                    </div>
                                  </div>
                                </div>
                                <button onClick={() => toggleRow(record.id)} className="p-1 text-gray-400 hover:text-[#0038A8] transition-colors bg-gray-50 rounded-lg shrink-0">
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                <div className="flex items-center gap-2 flex-1 mr-3">
                                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        isFullyPaid ? 'bg-green-500' : totalPaid > 0 ? 'bg-yellow-500' : 'bg-gray-200'
                                      }`} 
                                      style={{ width: `${totalCollectibles > 0 ? (totalPaid / totalCollectibles) * 100 : 0}%` }}
                                    ></div>
                                  </div>
                                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                                    isFullyPaid ? 'text-green-600' : totalPaid > 0 ? 'text-yellow-600' : 'text-gray-400'
                                  }`}>
                                    ₱{totalPaid.toFixed(0)}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1 shrink-0">
                                  <button 
                                    onClick={() => handleSendReceipt(record)}
                                    disabled={totalPaid === 0 || isSending === record.id || record.pendingDeletion}
                                    className={`p-1.5 rounded-lg transition-all ${
                                      (totalPaid === 0 || record.pendingDeletion)
                                      ? 'text-gray-200' 
                                      : isSending === record.id
                                      ? 'text-gray-400'
                                      : 'text-[#CE1126] bg-red-50'
                                    }`}
                                  >
                                    {isSending === record.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                  </button>
                                  <button 
                                    onClick={() => openEditModal(record)}
                                    className="p-1.5 text-[#0038A8] bg-blue-50 rounded-lg transition-all"
                                  >
                                    <FileText size={12} />
                                  </button>
                                  <button 
                                    onClick={() => deleteTeacher(record.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="pt-2 border-t border-gray-50 space-y-1.5">
                                  {standardDues.map(due => {
                                    const isPaid = record.paidDueIds.includes(due.id);
                                    return (
                                    <label key={due.id} className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer ${isPaid ? 'bg-green-50/30 border-green-100' : 'bg-gray-50/50 border-gray-100'}`}>
                                      <div className="flex items-center gap-2">
                                        <input 
                                          type="checkbox" 
                                          checked={isPaid}
                                          onChange={() => toggleDuePaid(record.id, due.id)}
                                          className="w-3 h-3 text-[#0038A8] border-gray-300 rounded focus:ring-[#0038A8]"
                                        />
                                        <div className={`w-4 h-4 rounded-md flex items-center justify-center ${isPaid ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                                          {isPaid ? <Check size={8} /> : <PhilippinePeso size={8} />}
                                        </div>
                                        <div>
                                          <div className="text-[9px] font-black text-gray-900 uppercase tracking-tight">{due.name}</div>
                                          <div className="text-[8px] text-gray-500 font-bold">₱{due.amount.toFixed(2)}</div>
                                        </div>
                                      </div>
                                      {isPaid && <span className="text-[7px] font-black text-green-600 uppercase tracking-widest bg-green-100 px-1.5 py-0.5 rounded-full">Paid</span>}
                                    </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>

                {/* Pagination */}
                {filteredRecords.length > itemsPerPage && (
                  <div className="flex items-center justify-between mt-8 px-2">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-[#0038A8] disabled:opacity-50 transition-all"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-[#0038A8] disabled:opacity-50 transition-all"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
            </section>
          </div>
        )}

        {activeTab === 'expenses' && profile.role === 'admin' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
              <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-tight">Record New Expense</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (newExpenseDesc && newExpenseAmount) {
                  addExpense(newExpenseDesc, Number(newExpenseAmount), newExpenseCategory);
                  setNewExpenseDesc('');
                  setNewExpenseAmount('');
                }
              }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Description</label>
                  <input 
                    type="text" 
                    value={newExpenseDesc}
                    onChange={e => setNewExpenseDesc(e.target.value)}
                    placeholder="e.g., Office Supplies, Bereavement Aid"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0038A8] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Amount (₱)</label>
                  <input 
                    type="number" 
                    value={newExpenseAmount}
                    onChange={e => setNewExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0038A8] outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full bg-[#0038A8] text-white py-3 rounded-xl font-black uppercase tracking-widest hover:bg-blue-800 transition-all">
                    Add Expense
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Expense History</h2>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={handleDownloadLiquidationDocx}
                    className="flex items-center gap-2 bg-blue-50 text-[#0038A8] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 hover:bg-blue-100 transition-all"
                  >
                    <FileText size={14} />
                    Download DOCX
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                      <th className="pb-4 pl-4">Date</th>
                      <th className="pb-4">Description</th>
                      <th className="pb-4">Amount (₱)</th>
                      <th className="pb-4">Recorded By</th>
                      <th className="pb-4 text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {expenses.length === 0 ? (
                      <tr><td colSpan={5} className="py-12 text-center text-gray-400 italic">No expenses recorded yet.</td></tr>
                    ) : (
                      expenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 pl-4 text-xs text-gray-500">{exp.timestamp?.toDate().toLocaleDateString()}</td>
                          <td className="py-4 text-sm font-bold text-gray-900">{exp.description}</td>
                          <td className="py-4 text-sm font-black text-red-600">₱{exp.amount.toFixed(2)}</td>
                          <td className="py-4 text-xs text-gray-500">{exp.adminName}</td>
                          <td className="py-4 text-right pr-4">
                            <button onClick={() => deleteExpense(exp.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {expenses.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 italic border border-gray-100 rounded-2xl">No expenses recorded yet.</div>
                ) : (
                  expenses.map(exp => (
                    <div key={exp.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm font-bold text-gray-900">{exp.description}</div>
                          <div className="text-xs text-gray-500 mt-1">{exp.adminName}</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-50">
                        <span className="text-gray-500 text-xs">{exp.timestamp?.toDate().toLocaleDateString()}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-black text-red-600">₱{exp.amount.toFixed(2)}</span>
                          <button onClick={() => deleteExpense(exp.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && profile.role === 'admin' && (
          <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">System Audit Logs</h2>
                    <p className="text-xs text-gray-500 font-bold mt-1 uppercase tracking-widest">Transparency & Activity Tracking</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button 
                    onClick={clearAuditLogs}
                    className="flex-1 sm:flex-none bg-red-50 text-red-600 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> Clear All Logs
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {auditLogs.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-full mb-4">
                      <Shield size={32} className="text-gray-200" />
                    </div>
                    <div className="text-gray-400 font-bold uppercase tracking-widest text-xs">No activity logs found.</div>
                  </div>
                ) : (
                  auditLogs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).map(log => (
                    <div key={log.id} className="flex items-start gap-4 p-5 rounded-3xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all group">
                      <div className={`mt-1.5 w-3 h-3 rounded-full shrink-0 ${
                        log.type === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                        log.type === 'warning' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                          <span className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">{log.action}</span>
                          <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap bg-gray-100 px-3 py-1 rounded-full group-hover:bg-white transition-colors">
                            {log.timestamp?.toDate().toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-3 leading-relaxed font-medium">{log.details}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm">
                            <User size={12} className="text-gray-600" />
                          </div>
                          <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{log.userName}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && profile && (
          <div className="max-w-xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-[#0038A8]">
                  <User size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">User Profile</h2>
                  <p className="text-sm text-gray-500 font-medium">Manage your personal information</p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Name</label>
                  <input 
                    type="text" 
                    value={isEditingProfile ? editProfileName : profile.name}
                    onChange={(e) => setEditProfileName(e.target.value)}
                    disabled={!isEditingProfile}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#0038A8] outline-none font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email</label>
                  <input 
                    type="email" 
                    value={isEditingProfile ? editProfileEmail : profile.email}
                    onChange={(e) => setEditProfileEmail(e.target.value)}
                    disabled={!isEditingProfile}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#0038A8] outline-none font-bold text-gray-900"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  {isEditingProfile ? (
                    <>
                      <button onClick={handleSaveProfile} className="flex-1 bg-[#0038A8] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-800 transition-all">Save</button>
                      <button onClick={() => setIsEditingProfile(false)} className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditingProfile(true)} className="w-full bg-[#0038A8] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-800 transition-all">Edit Profile</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'remittance' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-[#0038A8] text-white w-10 h-10 rounded-2xl flex items-center justify-center font-bold">
                    <Wallet size={20} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Remittance Tracking</h2>
                </div>
                <p className="text-sm text-gray-500 font-medium">Monitor and manage all remittance records from Board of Directors.</p>
              </div>
              
              {profile.role === 'bod' && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex flex-col justify-between">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pending Remittance</div>
                  <div className="text-3xl font-black text-green-600 mb-4">
                    ₱{records.filter(r => {
                      const remittedIds = r.remittedDueIds || [];
                      return r.paidDueIds.some(id => !remittedIds.includes(id));
                    }).reduce((sum, r) => {
                      const remittedIds = r.remittedDueIds || [];
                      const newlyPaidDues = standardDues.filter(d => r.paidDueIds.includes(d.id) && !remittedIds.includes(d.id));
                      return sum + newlyPaidDues.reduce((s, d) => s + d.amount, 0);
                    }, 0).toFixed(2)}
                  </div>
                  <button 
                    onClick={handleRemit}
                    className="w-full bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Send size={16} /> Remit Collected Funds
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                      <th className="pb-4 pl-4">Date</th>
                      <th className="pb-4">BOD Name</th>
                      <th className="pb-4">Grade</th>
                      <th className="pb-4">Amount (₱)</th>
                      <th className="pb-4">Status</th>
                      {(profile.role === 'admin' || profile.email === 'lpcaanhsfacultyclubofficers@gmail.com') && <th className="pb-4 text-right pr-4">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {remittances.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds).map(rem => (
                      <tr key={rem.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 pl-4 text-xs text-gray-600">
                          {rem.timestamp?.toDate().toLocaleDateString()}
                        </td>
                        <td className="py-4 text-sm font-bold text-gray-900">{rem.bodName}</td>
                        <td className="py-4 text-xs font-medium text-gray-500">{rem.gradeLevel}</td>
                        <td className="py-4 text-sm font-black text-[#0038A8]">₱{rem.amount.toFixed(2)}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                            rem.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {rem.status}
                          </span>
                        </td>
                         {(profile.role === 'admin' || profile.email === 'lpcaanhsfacultyclubofficers@gmail.com') && (
                          <td className="py-4 text-right pr-4 flex items-center justify-end gap-3">
                            {rem.status === 'pending' ? (
                              <button 
                                onClick={() => verifyRemittance(rem.id)}
                                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                              >
                                Verify
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleResendAcceptanceEmail(rem)}
                                className="text-[10px] font-bold text-green-600 hover:text-green-800 underline"
                              >
                                Resend
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                setRemittanceIdToDelete(rem.id);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete Remittance"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {remittances.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 text-sm italic">
                          No remittance records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {remittances.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds).map(rem => (
                  <div key={rem.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-sm font-bold text-gray-900">{rem.bodName}</div>
                        <div className="text-xs text-gray-500">{rem.gradeLevel}</div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                        rem.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {rem.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 text-xs">{rem.timestamp?.toDate().toLocaleDateString()}</span>
                      <span className="font-black text-[#0038A8]">₱{rem.amount.toFixed(2)}</span>
                    </div>
                    {(profile.role === 'admin' || profile.email === 'lpcaanhsfacultyclubofficers@gmail.com') && (
                      <div className="pt-3 border-t border-gray-50 flex justify-end gap-3">
                        {rem.status === 'pending' ? (
                          <button 
                            onClick={() => verifyRemittance(rem.id)}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                          >
                            Verify
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleResendAcceptanceEmail(rem)}
                            className="text-[10px] font-bold text-green-600 hover:text-green-800 underline"
                          >
                            Resend
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setRemittanceIdToDelete(rem.id);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete Remittance"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {remittances.length === 0 && (
                  <div className="py-8 text-center text-gray-400 text-sm italic border border-gray-100 rounded-2xl">
                    No remittance records found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && profile.role === 'admin' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button onClick={() => setActiveTab('collection')} className="bg-white p-4 rounded-[2rem] border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all flex flex-col items-center gap-3 group">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0038A8] group-hover:bg-[#0038A8] group-hover:text-white transition-all">
                  <Users size={20} />
                </div>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Manage Teachers</span>
              </button>
              <button onClick={() => setActiveTab('expenses')} className="bg-white p-4 rounded-[2rem] border border-gray-100 hover:border-red-200 hover:shadow-md transition-all flex flex-col items-center gap-3 group">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all">
                  <CreditCard size={20} />
                </div>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Manage Expenses</span>
              </button>
              <button onClick={() => setActiveTab('audit')} className="bg-white p-4 rounded-[2rem] border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all flex flex-col items-center gap-3 group">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <Shield size={20} />
                </div>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">System Logs</span>
              </button>
              <button onClick={handleDownloadComprehensiveReportDocx} className="bg-white p-4 rounded-[2rem] border border-gray-100 hover:border-green-200 hover:shadow-md transition-all flex flex-col items-center gap-3 group">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all">
                  <FileText size={20} />
                </div>
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Export Reports</span>
              </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].map(grade => {
                const gradeTeachers = records.filter(r => r.gradeLevel === grade);
                const totalCollected = gradeTeachers.reduce((sum, r) => {
                  const paidDues = standardDues.filter(d => r.paidDueIds.includes(d.id));
                  return sum + paidDues.reduce((s, d) => s + d.amount, 0);
                }, 0);
                const totalCollectibles = gradeTeachers.length * standardDues.reduce((sum, d) => sum + d.amount, 0);
                const fullyPaidCount = gradeTeachers.filter(r => r.paidDueIds.length === standardDues.length).length;

                return (
                  <div key={grade} className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{grade}</div>
                      <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                        <Users size={14} className="text-gray-400 group-hover:text-[#0038A8]" />
                      </div>
                    </div>
                    <div className="text-xl md:text-2xl font-black text-gray-900 mb-3">₱{totalCollected.toLocaleString()}</div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-3">
                      <div 
                        className="bg-green-500 h-full transition-all duration-1000 ease-out" 
                        style={{ width: `${totalCollectibles > 0 ? (totalCollected / totalCollectibles) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-gray-400 uppercase tracking-widest">Progress</span>
                      <span className="text-green-600 font-black">{fullyPaidCount} / {gradeTeachers.length}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Collection Progress Chart */}
              <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#0038A8]">
                      <BarChart3 size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Collection Progress</h2>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Real-time Dues Monitoring</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={handleDownloadExcel} className="flex-1 sm:flex-none p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-100 transition-all flex items-center justify-center gap-2" title="Excel Report">
                      <FileText size={18} /> <span className="sm:hidden text-xs font-bold">Excel</span>
                    </button>
                    <button onClick={handleDownloadComprehensiveReportDocx} className="flex-1 sm:flex-none p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all flex items-center justify-center gap-2" title="Comprehensive DOCX Report">
                      <FileText size={18} /> <span className="sm:hidden text-xs font-bold">DOCX</span>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {standardDues.map(due => {
                    const paidCount = records.filter(r => r.paidDueIds.includes(due.id)).length;
                    const progress = (paidCount / records.length) * 100;

                    return (
                      <div key={due.id} className="space-y-2 p-4 rounded-2xl border border-gray-50 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-gray-700 uppercase tracking-tight">{due.name}</span>
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{paidCount} / {records.length}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-[#0038A8] h-full transition-all duration-1000 ease-in-out" 
                            style={{ width: `${records.length > 0 ? progress : 0}%` }}
                          ></div>
                        </div>
                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-right">
                          {progress.toFixed(0)}% Collected
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Net Balance Card */}
              <div className="bg-[#0038A8] p-8 md:p-10 rounded-[3rem] shadow-2xl text-white relative overflow-hidden flex flex-col justify-between min-h-[350px]">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                      <Wallet size={20} />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Financial Summary</div>
                  </div>
                  
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Net Club Balance</div>
                  <div className="text-5xl font-black mb-10 tracking-tighter">
                    ₱{(records.reduce((sum, r) => {
                      const paidDues = standardDues.filter(d => r.paidDueIds.includes(d.id));
                      return sum + paidDues.reduce((s, d) => {
                        if (d.isVoluntary && r.voluntaryPayments?.[d.id]) return s + r.voluntaryPayments[d.id];
                        return s + d.amount;
                      }, 0);
                    }, 0) - expenses.reduce((sum, e) => sum + e.amount, 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                
                <div className="relative z-10 space-y-4 pt-8 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold opacity-60 uppercase tracking-widest">Total Collections</span>
                    <span className="text-sm font-black">₱{records.reduce((sum, r) => {
                      const paidDues = standardDues.filter(d => r.paidDueIds.includes(d.id));
                      return sum + paidDues.reduce((s, d) => {
                        if (d.isVoluntary && r.voluntaryPayments?.[d.id]) return s + r.voluntaryPayments[d.id];
                        return s + d.amount;
                      }, 0);
                    }, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold opacity-60 uppercase tracking-widest">Total Expenses</span>
                    <span className="text-sm font-black text-red-300">-₱{expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* User Management Section */}
              <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">User Management</h2>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">BODs & Faculty Access Control</p>
                    </div>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      value={userSearchTerm}
                      onChange={e => setUserSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <QrCode size={16} />
                      </div>
                      <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">BOD QR Generator</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select id="new-bod-email" className="p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                          <option value="bodgrade7@gmail.com">Grade 7 BOD</option>
                          <option value="bodgrade8@gmail.com">Grade 8 BOD</option>
                          <option value="bodgrade9@gmail.com">Grade 9 BOD</option>
                          <option value="bodgrade10@gmail.com">Grade 10 BOD</option>
                        </select>
                        <select id="new-bod-grade" className="p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                          <option value="Grade 7">Grade 7</option>
                          <option value="Grade 8">Grade 8</option>
                          <option value="Grade 9">Grade 9</option>
                          <option value="Grade 10">Grade 10</option>
                        </select>
                      </div>
                      <button 
                        onClick={() => {
                          const email = (document.getElementById('new-bod-email') as HTMLSelectElement).value;
                          const grade = (document.getElementById('new-bod-grade') as HTMLSelectElement).value;
                          if (email) generateBODQRCode(email, grade);
                        }}
                        className="w-full bg-[#0038A8] text-white py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-200"
                      >
                        Generate BOD QR Code
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto -mx-6 md:mx-0 hidden md:block">
                  <div className="inline-block min-w-full align-middle px-6 md:px-0">
                    <table className="min-w-full border-separate border-spacing-y-2">
                      <thead>
                        <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                          <th className="pb-4 pl-4">User Details</th>
                          <th className="pb-4">Role</th>
                          <th className="pb-4">Assigned Grade</th>
                          <th className="pb-4 text-right pr-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="space-y-2">
                        {allUsers
                          .filter(u => 
                            u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                            u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                          )
                          .map(u => (
                          <tr key={u.uid} className="bg-gray-50/50 hover:bg-white hover:shadow-md transition-all group rounded-2xl overflow-hidden">
                            <td className="py-4 pl-4 rounded-l-2xl">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-black group-hover:bg-blue-50 group-hover:text-[#0038A8] transition-colors">
                                  {u.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-sm font-black text-gray-900 leading-none mb-1">{u.name}</div>
                                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              {Object.keys(ALLOWED_BODS).includes(u.email.toLowerCase()) ? (
                                <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em] bg-gray-100 px-3 py-1 rounded-full">{u.role}</span>
                              ) : (
                                <select 
                                  value={u.role}
                                  onChange={e => updateUserRole(u.uid, e.target.value as any, u.gradeLevel)}
                                  className="text-[10px] font-black uppercase tracking-widest border border-gray-200 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="admin">Admin</option>
                                  <option value="bod">BOD</option>
                                  <option value="teacher">Teacher</option>
                                </select>
                              )}
                            </td>
                            <td className="py-4">
                              {Object.keys(ALLOWED_BODS).includes(u.email.toLowerCase()) ? (
                                <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em] bg-gray-100 px-3 py-1 rounded-full">{u.gradeLevel}</span>
                              ) : (
                                <select 
                                  value={u.gradeLevel}
                                  onChange={e => updateUserRole(u.uid, u.role, e.target.value as any)}
                                  className="text-[10px] font-black uppercase tracking-widest border border-gray-200 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="All">All Grades</option>
                                  <option value="Grade 7">Grade 7</option>
                                  <option value="Grade 8">Grade 8</option>
                                  <option value="Grade 9">Grade 9</option>
                                  <option value="Grade 10">Grade 10</option>
                                </select>
                              )}
                            </td>
                            <td className="py-4 text-right pr-4 rounded-r-2xl">
                              <div className="flex justify-end gap-2">
                                {Object.keys(ALLOWED_BODS).includes(u.email.toLowerCase()) && (
                                  <button 
                                    onClick={() => generateBODQRCode(u.email, u.gradeLevel)}
                                    className="p-2 text-blue-500 hover:text-white hover:bg-blue-600 transition-all bg-blue-50 rounded-xl"
                                    title="Generate QR Login Code"
                                  >
                                    <QrCode size={16} />
                                  </button>
                                )}
                                {u.email !== 'lpcaanhsfacultyclubofficers@gmail.com' && (
                                  <button 
                                    onClick={() => deleteUser(u.uid)}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-red-500 transition-all bg-gray-100 rounded-xl"
                                    title="Remove User"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {allUsers
                    .filter(u => 
                      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                      u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                    )
                    .map(u => (
                      <div key={u.uid} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 font-black">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-black text-gray-900 leading-none mb-1">{u.name}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{u.email}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Role</label>
                            {Object.keys(ALLOWED_BODS).includes(u.email.toLowerCase()) ? (
                              <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em] bg-gray-100 px-3 py-1 rounded-full block w-max">{u.role}</span>
                            ) : (
                              <select 
                                value={u.role}
                                onChange={e => updateUserRole(u.uid, e.target.value as any, u.gradeLevel)}
                                className="w-full text-[10px] font-black uppercase tracking-widest border border-gray-200 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="admin">Admin</option>
                                <option value="bod">BOD</option>
                                <option value="teacher">Teacher</option>
                              </select>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Grade</label>
                            {Object.keys(ALLOWED_BODS).includes(u.email.toLowerCase()) ? (
                              <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em] bg-gray-100 px-3 py-1 rounded-full block w-max">{u.gradeLevel}</span>
                            ) : (
                              <select 
                                value={u.gradeLevel}
                                onChange={e => updateUserRole(u.uid, u.role, e.target.value as any)}
                                className="w-full text-[10px] font-black uppercase tracking-widest border border-gray-200 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="All">All Grades</option>
                                <option value="Grade 7">Grade 7</option>
                                <option value="Grade 8">Grade 8</option>
                                <option value="Grade 9">Grade 9</option>
                                <option value="Grade 10">Grade 10</option>
                              </select>
                            )}
                          </div>
                        </div>
                        <div className="pt-3 border-t border-gray-50 flex justify-end gap-2">
                          {Object.keys(ALLOWED_BODS).includes(u.email.toLowerCase()) && (
                            <button 
                              onClick={() => generateBODQRCode(u.email, u.gradeLevel)}
                              className="p-2 text-blue-500 hover:text-white hover:bg-blue-600 transition-all bg-blue-50 rounded-xl"
                              title="Generate QR Login Code"
                            >
                              <QrCode size={16} />
                            </button>
                          )}
                          {u.email !== 'lpcaanhsfacultyclubofficers@gmail.com' && (
                            <button 
                              onClick={() => deleteUser(u.uid)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-red-500 transition-all bg-gray-100 rounded-xl"
                              title="Remove User"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Recent Activity Snippet */}
              <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                      <Activity size={20} />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Recent Activity</h3>
                  </div>
                  <button onClick={() => setActiveTab('audit')} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">View All Logs</button>
                </div>
                <div className="space-y-4 flex-1">
                  {auditLogs.slice(0, 8).map(log => (
                    <div key={log.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${log.type === 'critical' ? 'bg-red-500' : log.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black text-gray-900 truncate">{log.action}</div>
                        <div className="text-[10px] text-gray-400 font-bold truncate">{log.details}</div>
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase shrink-0">{log.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && <div className="text-center py-8 text-xs text-gray-400 italic">No recent activity.</div>}
                </div>
              </div>
            </div>

            {/* Database Maintenance Section */}
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                    <Database size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">System Maintenance</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Database & Record Management</p>
                  </div>
                </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button 
                      onClick={clearAuditLogs}
                      className="w-full sm:w-auto bg-orange-50 text-orange-600 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-orange-100 hover:bg-orange-600 hover:text-white transition-all flex items-center justify-center gap-2 group"
                    >
                      <Trash2 size={16} className="group-hover:scale-110 transition-transform" /> Clear Transparency Logs
                    </button>
                    <button 
                      onClick={() => {
                        setDeleteType('all');
                        setIsBatchDeleteModalOpen(true);
                      }}
                      className="w-full sm:w-auto bg-red-50 text-red-600 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border border-red-100 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 group"
                    >
                      <Trash2 size={16} className="group-hover:scale-110 transition-transform" /> Wipe All Records
                    </button>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#0038A8] shrink-0 shadow-sm">
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[#0038A8] uppercase tracking-tight mb-2">Important Note</h4>
                      <p className="text-xs text-blue-800 leading-relaxed font-medium">
                        Deleting teacher records will also remove their entire payment history. This action is permanent and will be reflected across all BOD dashboards immediately.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center">
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">
                    Manage the entire teacher database. Use the <strong className="text-gray-900">Collection</strong> tab for selective deletions or use the red button to perform a complete system reset.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      
      {/* Edit Teacher Modal */}
      {isEditModalOpen && editingTeacher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-gray-100"
          >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-2xl text-[#0038A8]">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900">Edit Teacher Info</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Update Profile Details</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateTeacher} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Last Name</label>
                    <input 
                      type="text" 
                      required 
                      value={editLastName} 
                      onChange={e => setEditLastName(e.target.value)} 
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-[#0038A8] focus:bg-white transition-all outline-none font-bold text-gray-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">First Name</label>
                    <input 
                      type="text" 
                      required 
                      value={editFirstName} 
                      onChange={e => setEditFirstName(e.target.value)} 
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-[#0038A8] focus:bg-white transition-all outline-none font-bold text-gray-900 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Middle Initial</label>
                    <input 
                      type="text" 
                      value={editMiddleInitial} 
                      onChange={e => setEditMiddleInitial(e.target.value)} 
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-[#0038A8] focus:bg-white transition-all outline-none font-bold text-gray-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Grade Level</label>
                    <select 
                      value={editGradeLevel}
                      onChange={e => setEditGradeLevel(e.target.value as GradeLevel)}
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-[#0038A8] focus:bg-white transition-all outline-none font-bold text-gray-900 text-sm appearance-none"
                    >
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email Address</label>
                    <input 
                      type="email" 
                      required 
                      value={editEmail} 
                      onChange={e => setEditEmail(e.target.value)} 
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-[#0038A8] focus:bg-white transition-all outline-none font-bold text-gray-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contact Number</label>
                    <input 
                      type="text" 
                      required 
                      value={editContactNumber} 
                      onChange={e => setEditContactNumber(e.target.value)} 
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus:border-[#0038A8] focus:bg-white transition-all outline-none font-bold text-gray-900 text-sm"
                    />
                  </div>
                </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-[#0038A8] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-200"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Remittance Password Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-red-100 p-3 rounded-2xl">
                <ShieldAlert className="text-red-600" size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">Admin Authentication</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Security Clearance Required</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              You are about to delete a remittance record. This action will reset the remittance status for associated teachers. Please enter the admin password to proceed.
            </p>
            
            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type={showDeletePassword ? "text" : "password"}
                  placeholder="Enter Admin Password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-[#0038A8] focus:bg-white transition-all outline-none font-bold text-gray-900"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && deleteRemittance()}
                />
                <button 
                  type="button"
                  onClick={() => setShowDeletePassword(!showDeletePassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showDeletePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setDeletePassword('');
                    setShowDeletePassword(false);
                    setRemittanceIdToDelete(null);
                  }}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={deleteRemittance}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* QR Code Display Modal */}
      {qrCodeData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-8 sm:p-12 max-w-md w-full shadow-2xl border border-gray-100 text-center relative"
          >
            <button 
              onClick={() => setQrCodeData(null)}
              className="absolute top-6 right-6 p-2 bg-gray-100 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div id="qr-code-capture-area-admin" className="bg-white p-4 rounded-2xl">
              <h3 className="text-2xl font-black text-gray-900 mb-2">{qrCodeData.grade === 'Teacher' ? 'Teacher' : 'BOD'} Login QR Code</h3>
              <p className="text-gray-500 font-bold mb-6 text-sm">
                {qrCodeData.grade}
              </p>
              
              <div className="bg-white p-4 rounded-2xl shadow-inner border border-gray-100 inline-block mb-4">
                <QRCodeCanvas 
                  id="admin-qr-canvas"
                  value={JSON.stringify({ email: qrCodeData.email, pass: qrCodeData.pass })} 
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="mb-6">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Account Email</p>
                <p className="text-sm font-black text-gray-800 bg-gray-50 py-2 px-4 rounded-lg inline-block border border-gray-100">
                  {qrCodeData.realEmail || qrCodeData.email}
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6">
                <p className="text-xs text-blue-800 font-medium leading-relaxed mb-2">
                  Instruct the {qrCodeData.grade === 'Teacher' ? 'teacher' : 'BOD'} to scan this QR code to log in.
                </p>
                <div className="flex items-start gap-2 mt-3 pt-3 border-t border-blue-200/50">
                  <ShieldAlert size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-700 font-bold text-left">
                    Note: Please keep this QR code safe and private, as it grants direct access to your account.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => downloadQRCode(
                  'admin-qr-canvas', 
                  `FacultyClub_Admin_QR_${qrCodeData.grade}.png`,
                  qrCodeData.realEmail || qrCodeData.email
                )}
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-100"
              >
                <Download size={16} />
                Download QR Code
              </button>
              <button 
                onClick={() => setQrCodeData(null)}
                className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-8 sm:p-12 max-w-md w-full shadow-2xl border border-gray-100 text-center"
          >
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
              <AlertTriangle size={40} />
            </div>
            
            <h3 className="text-2xl font-black text-gray-900 mb-2">
              {deleteType === 'all' ? 'Delete All Records?' : 'Delete Selected Records?'}
            </h3>
            <p className="text-gray-500 font-bold mb-8 leading-relaxed">
              {deleteType === 'all' 
                ? 'This will permanently wipe all teacher records and their payment history from the database. This action cannot be undone.' 
                : `You are about to delete ${selectedTeacherIds.size} selected teacher records. This action is permanent and cannot be reversed.`}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setIsBatchDeleteModalOpen(false)}
                disabled={isBatchDeleting}
                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={deleteType === 'all' ? handleDeleteAllTeachers : handleBatchDeleteTeachers}
                disabled={isBatchDeleting}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isBatchDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Confirm Delete'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Login Success Pop-up */}
      {showLoginSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none bg-blue-900/10 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 100 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            className="bg-white/90 backdrop-blur-xl p-10 rounded-[3rem] shadow-[0_30px_100px_rgba(0,56,168,0.2)] border border-blue-100 text-center max-w-sm w-full mx-4"
          >
            <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600 shadow-inner">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
              >
                <CheckCircle size={48} />
              </motion.div>
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Welcome Back!</h2>
            <p className="text-[#0038A8] font-black uppercase tracking-[0.2em] text-[10px]">Successfully Logged In</p>
            <div className="mt-8 flex justify-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-4 right-4 left-4 md:bottom-8 md:right-8 md:left-auto md:w-auto bg-white text-gray-900 px-6 py-4 md:px-8 md:py-5 rounded-2xl md:rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center gap-4 z-[100] border border-gray-100"
        >
          <div className="bg-green-100 p-3 rounded-2xl text-green-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-0.5">Notification</p>
            <p className="font-black text-sm text-gray-900">{toast}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
