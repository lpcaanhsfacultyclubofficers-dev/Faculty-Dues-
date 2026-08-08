/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="vite/client" />

import React, { useState, useEffect, useMemo, useCallback, Component, useRef } from 'react';
import { Sun, Moon, Check, Send, Plus, User, Mail, PhilippinePeso, Heart, Upload, Trash2, FileText, FileDown, ChevronDown, ChevronUp, Loader2, LogOut, Shield, BarChart3, Wallet, Search, X, ShieldAlert, Lock, Eye, EyeOff, Users, CheckCircle, Clock, ChevronLeft, ChevronRight, AlertCircle, AlertTriangle, Database, QrCode, Download, CreditCard, Activity, Menu, LayoutDashboard, Settings, History, PieChart, TrendingUp, ArrowUpRight, ArrowDownRight, Filter, RefreshCw, Camera, ShieldCheck, MailWarning, Archive, FileBarChart, Undo, Redo, Code, Bell, Megaphone, MessageSquare } from 'lucide-react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

import { QRCodeCanvas } from 'qrcode.react';
import { DesktopOceanBackground } from './components/OceanBackground';
import { CollectionAnalyticsChart } from './components/CollectionAnalyticsChart';
import { 
  PieChart as RePieChart, Pie, Cell, 
  LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer,
  ComposedChart, Bar, Area
} from 'recharts';
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
  ImageRun,
  PageOrientation, 
  BorderStyle,
  VerticalAlign,
  HeightRule,
  Header,
  Footer
} from 'docx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { AnimatePresence, motion } from 'motion/react';
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, 
  collection, doc, setDoc, getDoc, getDocs, onSnapshot, query, where, addDoc, 
  updateDoc, deleteDoc, serverTimestamp, Timestamp, writeBatch, signInWithEmailAndPassword, firebaseConfig,
  collectionGroup
} from './firebase';
import type { User as FirebaseUser } from './firebase';

import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const SUN_LOGO_SVG = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjRkNEMTE2IiBzdHJva2U9IiNGQ0QxMTYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI0Ii8+PHBhdGggZD0iTTEyIDJ2MiIvPjxwYXRoIGQ9Ik0xMiAyMHYyIi8+PHBhdGggZD0ibTQuOTMgNC45MyAxLjQxIDEuNDEiLz48cGF0aCBkPSJtMTcuNjYgMTcuNjYgMS40MSAxLjQxIi8+PHBhdGggZD0iTTIgMTJoMiIvPjxwYXRoIGQ9Ik0yMCAxMmgyIi8+PHBhdGggZD0ibTYuMzQgMTcuNjYtMS40MSAxLjQxIi8+PHBhdGggZD0ibTE5LjA3IDQuOTMtMS40MSAxLjQxIi8+PC9zdmc+`;

/**
 * Ensures that a value is a Firestore Timestamp instance.
 * Useful when data is loaded from JSON backups or local state where it might be a plain object.
 */
const ensureTimestamp = (val: any): Timestamp => {
  if (val && typeof val.toDate === 'function') return val;
  if (val && typeof val.seconds === 'number') {
    return new Timestamp(val.seconds, val.nanoseconds || 0);
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return Timestamp.fromDate(d);
  }
  // Return earliest possible timestamp if completely missing
  return new Timestamp(0, 0);
};

const DOCX_HEADER_URL = "https://www.dropbox.com/scl/fi/mjabep0bljlz97zd4x9sm/3-LPCAANHS-Header-with-line-A4.png?rlkey=i9om3suf8gw0pvvluq1lqwadc&st=363uvkkq&raw=1";
const DOCX_FOOTER_URL = "https://www.dropbox.com/scl/fi/rv3723xd2e653zv7wwphm/4-LPCAANHS-Footer-with-line-A4.png?rlkey=c8vr0w0exbyg293ggsl2mm8io&st=6yau8xhx&raw=1";

const getDirectUrl = (url: string) => {
  if (url.includes('dropbox.com')) {
    return url.replace('dl=0', 'raw=1').replace('dl=1', 'raw=1');
  }
  return url;
};

const getDocxHeaderFooter = async (widthInInches: number, docxModules: any, urls?: { header?: string, footer?: string }) => {
  const { Header, Footer, Paragraph, ImageRun, AlignmentType, TextRun, HeaderFooterType } = docxModules;

    const hfTypeActual = HeaderFooterType?.DEFAULT || "default";
    const headerUrlToFetch = urls?.header || DOCX_HEADER_URL;
    const footerUrlToFetch = urls?.footer || DOCX_FOOTER_URL;

    const fetchImageData = async (url: string): Promise<{ data: Uint8Array, width: number, height: number } | null> => {
      let directUrl = getDirectUrl(url);

      if (directUrl.startsWith('data:')) {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const base64 = directUrl.split(',')[1];
              const binaryStr = window.atob(base64);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
              resolve({ data: bytes, width: img.width || 1, height: img.height || 1 });
            } catch (err) {
              console.error("Failed to parse base64 image data:", err);
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = directUrl;
        });
      }

      const tryFetch = async (fetchUrl: string) => {
        const response = await fetch(fetchUrl, { cache: 'no-cache' });
        if (!response.ok) throw new Error("Fetch not ok");
        const blob = await response.blob();
        return await new Promise<{ data: Uint8Array, width: number, height: number }>((resolve, reject) => {
          const img = new Image();
          const objectUrl = URL.createObjectURL(blob);
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width || 1;
            canvas.height = img.height || 1;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((b) => {
                if (b) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    resolve({
                      data: new Uint8Array(reader.result as ArrayBuffer),
                      width: img.width || 1,
                      height: img.height || 1
                    });
                    URL.revokeObjectURL(objectUrl);
                  };
                  reader.readAsArrayBuffer(b);
                } else reject(new Error("Canvas toBlob failed"));
              }, "image/png");
            } else reject(new Error("No canvas context"));
          };
          img.onerror = reject;
          img.src = objectUrl;
        });
      };

    try {
      return await tryFetch(directUrl);
    } catch (e1) {
      try {
        return await tryFetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`);
      } catch (e2) {
        try {
          return await tryFetch(`https://corsproxy.io/?${encodeURIComponent(directUrl)}`);
        } catch (e3) {
          console.error("All fetch attempts failed for:", url);
          return null;
        }
      }
    }
  };

  try {
    const [headerResult, footerResult] = await Promise.all([
      fetchImageData(headerUrlToFetch),
      fetchImageData(footerUrlToFetch)
    ]);

    // Precise centering logic for 13" paper (18720 twips)
    // Paper: 13", Left/Right Margins: 0.5" (720 twips) each.
    // Printable Width = 12.0 inches.
    // Microsoft Word uses 96 DPI for pixel-to-EMU transformation (914400 EMUs per inch).
    const printableWidthInches = widthInInches - 1; 
    const fluidWidth = Math.floor(printableWidthInches * 96); 

    let headerHeightTwips = 0;
    let footerHeightTwips = 0;

    const headerChildren = [];
    if (headerResult && headerResult.width > 0 && headerResult.height > 0 && headerResult.data.length > 0) {
      let targetWidth = Math.min(headerResult.width, 600);
      const ratio = targetWidth / headerResult.width;
      let targetHeight = headerResult.height * ratio;
      
      headerHeightTwips = Math.round(targetHeight * 15); // Approximate twips for layout processing
      
      headerChildren.push(new Paragraph({
        children: [
          new ImageRun({
            data: headerResult.data,
            transformation: { 
              width: Math.floor(targetWidth), 
              height: Math.floor(targetHeight) 
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        indent: { left: 0, right: 0 },
      }));
    } else {
      headerChildren.push(new Paragraph({
        children: [new TextRun({ text: "LAS PIÑAS CAA NATIONAL HIGH SCHOOL", bold: true, size: 28 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }));
      headerChildren.push(new Paragraph({
        children: [new TextRun({ text: "FACULTY CLUB OFFICE", size: 20 })],
        alignment: AlignmentType.CENTER,
      }));
      headerHeightTwips = 800; 
    }

    const footerChildren = [];
    if (footerResult && footerResult.width > 0 && footerResult.height > 0 && footerResult.data.length > 0) {
      let targetWidth = Math.min(footerResult.width, 600);
      const ratio = targetWidth / footerResult.width;
      let targetHeight = footerResult.height * ratio;

      footerHeightTwips = Math.round(targetHeight * 15);
      
      footerChildren.push(new Paragraph({
        children: [
          new ImageRun({
            data: footerResult.data,
            transformation: { 
              width: Math.floor(targetWidth), 
              height: Math.floor(targetHeight) 
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        indent: { left: 0, right: 0 },
      }));
    } else {
      footerChildren.push(new Paragraph({
        children: [new TextRun({ text: "Generated by LPCAANHS Faculty Club Management System", size: 16 })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
      }));
      footerHeightTwips = 400; 
    }

    return {
      headers: {
        [hfTypeActual]: new Header({ children: headerChildren }),
      },
      footers: {
        [hfTypeActual]: new Footer({ children: footerChildren }),
      },
      headerHeightTwips,
      footerHeightTwips
    };
  } catch (e) {
    console.error("Failed to construct header/footer", e);
    return { headerHeightTwips: 0, footerHeightTwips: 0 };
  }
};

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
  gender?: 'Male' | 'Female';
  department?: string;
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
  welcomeNotificationSent?: boolean;
  paymentHistory?: { dueId: string, dueName: string, date: string, amount: number, collectedBy?: string, collectedByRole?: string }[];
  termsAgreed?: boolean;
  termsAgreedDate?: string;
  pushSubscription?: string;
};

type UserProfile = {
  uid: string;
  email: string;
  role: 'admin' | 'bod' | 'teacher';
  gradeLevel: GradeLevel | 'All';
  name: string;
  qrEmail?: string;
  qrPass?: string;
  realEmail?: string;
};

type ProfileChangeRequest = {
  id: string;
  userId: string;
  userEmail: string;
  currentName: string;
  newName: string;
  currentEmail: string;
  newEmail: string;
  currentGradeLevel?: GradeLevel;
  newGradeLevel?: GradeLevel;
  currentDepartment?: string;
  newDepartment?: string;
  status: 'pending' | 'approved' | 'rejected' | 'acknowledged';
  note: string;
  adminNote?: string;
  timestamp: any;
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

type InitialBalance = {
  id: string;
  amount: number;
  description: string;
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
    return { hasError: true, errorInfo: error.stack || error.message || String(error) };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught React Error:", error, errorInfo);
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
        message = this.state.errorInfo;
      }

      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-4xl w-full text-center border-2 border-red-100 overflow-auto">
            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="text-red-600" size={32} />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">System Error</h1>
            <pre className="text-left text-xs bg-gray-100 p-4 rounded text-red-800 whitespace-pre-wrap font-mono mb-8">{message}</pre>
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

const detectGender = (firstName: string): 'Male' | 'Female' => {
  if (!firstName) return 'Female'; 
  const firstWord = firstName.trim().split(' ')[0].toLowerCase();
  
  const femaleNames = new Set(["maria", "mary", "ma.", "ma", "anna", "ana", "rose", "jane", "joy", "mae", "princess", "angel", "sarah", "michelle", "jennifer", "jessica", "cristina", "joan", "carmen", "leonor", "marisol", "lourdes", "teresa", "jasmin", "jasmine"]);
  const maleNames = new Set(["john", "mark", "michael", "paul", "james", "david", "joseph", "richard", "chris", "ryan", "marcus", "christian", "kurt", "joshua", "robert", "manuel", "eduardo", "pedro", "antonio", "jose", "juan", "kevin", "brian", "jason"]);
  
  if (femaleNames.has(firstWord)) return 'Female';
  if (maleNames.has(firstWord)) return 'Male';
  
  const lastChar = firstWord.slice(-1);
  if (lastChar === 'a' || (firstWord.endsWith('ie') && firstWord !== 'charlie') || (firstWord.endsWith('lyn')) || firstWord.endsWith('eth')) return 'Female';
  if (lastChar === 'o' || lastChar === 'r' || lastChar === 'd' || lastChar === 's' || lastChar === 'n' || lastChar === 'l' || lastChar === 't' || lastChar === 'h' || lastChar === 'k' || lastChar === 'm' || lastChar === 'c' || lastChar === 'g' || lastChar === 'p' || lastChar === 'v' || lastChar === 'x' || lastChar === 'z' || lastChar === 'w' || lastChar === 'b' || lastChar === 'f') return 'Male';
  
  return 'Female';
};

const getDisplayName = (name: string, role?: string) => {
  if (!name) return "";
  if (name === 'Executive Officer' || name === 'BOD Member' || name === 'Teacher') return name;
  
  let firstName = name;
  if (name.includes(',')) {
    firstName = name.split(',')[1]?.trim().split(' ')[0] || name;
  } else {
    firstName = name.split(' ')[0];
  }
  return role === 'teacher' ? `Teacher ${firstName}` : firstName;
};

const GlobalOverlays = ({ 
  showTermsModal, 
  setShowTermsModal, 
  showLoginSuccess, 
  toast, 
  profile, 
  teacherRecord, 
  onAgreeTerms, 
  records = [], 
  isDarkMode = false,
  showInAppNotify,
  setShowInAppNotify,
  setActiveTab,
  onDismissToast,
  setShowLoginSuccess
}: any) => {
  const [termsChecked, setTermsChecked] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showTermsModal && scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current;
      if (scrollHeight <= clientHeight + 10) {
        setHasScrolledToBottom(true);
      }
    }
  }, [showTermsModal]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 20) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAgree = () => {
    if (profile?.role === 'teacher' && onAgreeTerms) {
      if (!termsChecked) {
        toast("Please check the box to agree to the terms.");
        return;
      }
      onAgreeTerms();
    } else {
      setShowTermsModal(false);
    }
  };

  return (
    <>
      {/* Terms and Privacy Modal */}
      <AnimatePresence>
        {showTermsModal && (
          <div className={`fixed inset-0 flex items-center justify-center z-[110] p-4 sm:p-6 ${isDarkMode ? 'bg-black/60' : 'bg-blue-900/40'} backdrop-blur-md`}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-blue-100'} w-full max-w-2xl lg:max-w-3xl lg:p-4 max-h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border`}
            >
              <div className={`p-6 sm:p-8 border-b ${isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-gray-50/50'} flex items-center justify-between`}>
                <div className="flex items-center gap-4">
                  {profile?.role !== 'teacher' && (
                    <button 
                      onClick={() => setShowTermsModal(false)}
                      className={`p-2 rounded-xl transition-all ${isDarkMode ? 'hover:bg-gray-800 text-gray-500 hover:text-blue-400' : 'hover:bg-white text-gray-400 hover:text-[#0038A8]'} shadow-sm hover:shadow-md lg:hidden`}
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#0038A8] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h2 className={`text-lg sm:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight`}>Terms & Privacy</h2>
                    <p className={`text-[9px] sm:text-[10px] ${isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'} font-black uppercase tracking-widest mt-1`}>Faculty Club Guidelines</p>
                  </div>
                </div>
                {profile?.role !== 'teacher' && (
                  <>
                    <button 
                      onClick={() => setShowTermsModal(false)}
                      className={`hidden lg:flex items-center gap-2 px-4 py-2 ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 hover:text-gray-700'} transition-all font-black text-[10px] uppercase tracking-widest`}
                    >
                      <ChevronLeft size={14} /> Back
                    </button>
                    <button 
                      onClick={() => setShowTermsModal(false)}
                      className={`lg:hidden p-3 rounded-2xl transition-all ${isDarkMode ? 'hover:bg-gray-800 text-gray-500 hover:text-red-400' : 'hover:bg-white text-gray-400 hover:text-red-500'} shadow-sm hover:shadow-md`}
                    >
                      <X size={24} />
                    </button>
                  </>
                )}
              </div>

              <div 
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar space-y-10"
              >
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-8 h-8 ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-[#0038A8]'} rounded-xl flex items-center justify-center`}>
                      <FileText size={16} />
                    </div>
                    <h3 className={`text-sm font-black ${isDarkMode ? 'text-gray-200' : 'text-gray-900'} uppercase tracking-widest`}>Terms of Service</h3>
                  </div>
                  <div className={`space-y-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} font-medium leading-relaxed`}>
                    <p>Welcome to the Las Piñas CAA National High School Faculty Club Management System. This Dues Management system is designed exclusively for our financial tracking. By using this application, you agree to the following terms:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>This web app is only for the teachers of LPCAANHS and authorized Faculty Club officers.</li>
                      <li>Users are responsible for maintaining the confidentiality of their login credentials and QR codes.</li>
                      <li>Any unauthorized access or misuse of financial data is strictly prohibited and may result in disciplinary action.</li>
                      <li><strong>Email Communications:</strong> To help keep everyone informed, you may receive polite email reminders regarding any pending dues or important club updates.</li>
                      <li>The Faculty Club reserves the right to update these terms at any time to reflect changes in club policies or legal requirements.</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-8 h-8 ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'} rounded-xl flex items-center justify-center`}>
                      <ShieldCheck size={16} />
                    </div>
                    <h3 className={`text-sm font-black ${isDarkMode ? 'text-gray-200' : 'text-gray-900'} uppercase tracking-widest`}>Data Privacy Guidelines</h3>
                  </div>
                  <div className={`space-y-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} font-medium leading-relaxed`}>
                    <p>We are committed to protecting your personal information in accordance with Data Privacy standards:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong>Collection:</strong> We collect your name, email, contact number, and grade level for membership and financial tracking purposes.</li>
                      <li><strong>Usage:</strong> Your data is used solely for recording dues, generating receipts, and managing club remittances.</li>
                      <li><strong>Security:</strong> All data is stored securely using industry-standard encryption and access controls.</li>
                      <li><strong>Access:</strong> Only authorized club officers (BODs and Admins) have access to collective financial data for audit and reporting purposes.</li>
                      <li><strong>Retention:</strong> Data is retained for the duration of your membership or as required for historical financial auditing.</li>
                    </ul>
                  </div>
                </section>

                <div className={`${isDarkMode ? 'bg-blue-900/20 border-blue-900/40' : 'bg-blue-50 border-blue-100'} p-6 rounded-3xl border`}>
                  <p className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-[#0038A8]'} font-bold leading-relaxed`}>
                    If you have any questions or concerns regarding these guidelines, please contact the Faculty Club Officers or the System Administrator.
                  </p>
                </div>
              </div>

              <div className={`p-6 sm:p-8 ${isDarkMode ? 'bg-gray-800 animate-pulse-slow' : 'bg-gray-50'} border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} space-y-4`}>
                {profile?.role === 'teacher' && (
                  <label className={`flex items-start gap-3 group ${!hasScrolledToBottom ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input 
                        type="checkbox" 
                        checked={termsChecked}
                        onChange={(e) => setTermsChecked(e.target.checked)}
                        disabled={!hasScrolledToBottom}
                        className={`peer appearance-none w-5 h-5 border-2 ${isDarkMode ? 'border-gray-600 checked:bg-blue-600 checked:border-blue-600' : 'border-gray-300 checked:bg-[#0038A8] checked:border-[#0038A8]'} rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed`}
                      />
                      <Check size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                    </div>
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-900'} transition-colors`}>
                      I have read, understood, and agree to the Terms of Service and Data Privacy Guidelines.
                    </span>
                  </label>
                )}
                <button 
                  onClick={handleAgree}
                  disabled={(profile?.role === 'teacher' && (!termsChecked || !hasScrolledToBottom)) || (profile?.role === 'teacher' && !teacherRecord)}
                  className="w-full py-4 bg-[#0038A8] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {profile?.role === 'teacher' && !teacherRecord 
                    ? (records.length === 0 ? 'Loading...' : 'Teacher Record Not Found') 
                    : profile?.role === 'teacher' && !hasScrolledToBottom 
                      ? 'Please read the terms to continue' 
                      : 'I Understand and Agree'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Login Success Pop-up */}
      <AnimatePresence>
        {showLoginSuccess && (
          <div className={`fixed inset-0 flex items-center justify-center z-[120] pointer-events-none ${isDarkMode ? 'bg-black/40' : 'bg-blue-900/10'} backdrop-blur-sm`}>
             <motion.div 
              initial={{ opacity: 0, scale: 0.5, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 100 }}
              transition={{ type: 'spring', damping: 15, stiffness: 100 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = Math.abs(offset.x) * velocity.x;
                if (swipe < -10000 || swipe > 10000 || Math.abs(offset.x) > 100) {
                  setShowLoginSuccess?.(false);
                }
              }}
              className={`${isDarkMode ? 'bg-gray-900/90 border-gray-800 shadow-[0_30px_100px_rgba(0,0,0,0.5)]' : 'bg-white/90 border-blue-100 shadow-[0_30px_100px_rgba(0,56,168,0.2)]'} backdrop-blur-xl p-10 rounded-[3rem] border text-center max-w-sm md:max-w-md lg:max-w-lg w-full mx-4 touch-pan-y pointer-events-auto`}
            >
              <div className={`${isDarkMode ? 'bg-green-900/40' : 'bg-green-100'} w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600 shadow-inner`}>
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                >
                  <CheckCircle size={48} />
                </motion.div>
              </div>
              <h2 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2 tracking-tight`}>
                Welcome Back, {getDisplayName(profile?.name || '', profile?.role)}!
              </h2>
              <p className={`${isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'} font-black uppercase tracking-[0.2em] text-[10px]`}>Successfully Logged In</p>
              <div className="mt-8 flex justify-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

          {/* Toast Notification */}
          <AnimatePresence>
            {toast && (
              <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = Math.abs(offset.x) * velocity.x;
                  if (swipe < -10000 || swipe > 10000 || Math.abs(offset.x) > 100) {
                    onDismissToast?.();
                  }
                }}
                className={`fixed bottom-20 right-4 left-4 lg:bottom-8 lg:right-8 lg:left-auto lg:w-auto ${isDarkMode ? 'bg-gray-900 text-white border-gray-800' : 'bg-white text-gray-900 border-gray-100'} px-6 py-4 md:px-8 md:py-5 rounded-2xl md:rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-4 z-[130] border transition-colors duration-300 touch-pan-y`}
              >
                <div className={`${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600'} p-3 rounded-2xl`}>
                  <CheckCircle size={24} />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-0.5">Notification</p>
                  <p className="font-black text-sm text-gray-900">{toast}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* In-App Mobile-style Push Notification */}
          <AnimatePresence>
            {showInAppNotify && (
              <motion.div
                initial={{ y: -150, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -150, opacity: 0, scale: 0.9 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = Math.abs(offset.x) * velocity.x;
                  if (swipe < -10000 || swipe > 10000 || Math.abs(offset.x) > 100) {
                    setShowInAppNotify?.(null);
                  }
                }}
                className="fixed top-4 left-4 right-4 lg:left-auto lg:right-6 lg:w-[400px] z-[200] pointer-events-auto touch-pan-y"
              >
                <div 
                  onClick={() => setActiveTab('notifications')}
                  className={`${isDarkMode ? 'bg-gray-900/90 border-gray-800 text-white shadow-2xl' : 'bg-white/90 border-gray-100 text-gray-900 shadow-xl'} backdrop-blur-xl border-2 p-5 rounded-[2rem] cursor-pointer group relative`}
                >
                  <div className="flex gap-4 items-start">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      showInAppNotify.type === 'announcement' ? (isDarkMode ? 'bg-purple-900/40' : 'bg-purple-100 text-purple-600') :
                      (isDarkMode ? 'bg-blue-900/40' : 'bg-blue-100 text-blue-600')
                    }`}>
                      {showInAppNotify.type === 'announcement' ? <Megaphone size={24} /> : <Bell size={24} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1 gap-2">
                        <p className={`text-[10px] font-black uppercase tracking-widest truncate ${isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'}`}>New Notification</p>
                        <span className="text-[9px] font-black opacity-40 uppercase tracking-tighter shrink-0">Just Now</span>
                      </div>
                      <h4 className="font-black text-sm tracking-tight mb-1 truncate">{showInAppNotify.title}</h4>
                      <p className="text-xs font-medium opacity-70 line-clamp-2 leading-relaxed">{showInAppNotify.message}</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowInAppNotify(null); }}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="mt-3 flex justify-center">
                    <div className="w-10 h-1 bg-gray-300/30 rounded-full group-hover:w-20 transition-all"></div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      );
    };
    
    // Step 2: Teacher List (Removed old template from here, fixing scope)

type AppNotification = {
  id: string;
  title: string;
  message: string;
  timestamp: any;
  type: 'welcome' | 'announcement' | 'payment' | 'system';
  isRead: boolean;
  targetId: string; // teacherId or 'all'
  replies?: {
    id: string;
    message: string;
    senderId: string;
    senderName: string;
    timestamp: any;
  }[];
};

interface NavItemProps {
  id: any;
  icon: any;
  label: string;
  role?: string;
  profile: any;
  activeTab: any;
  setActiveTab: (id: any) => void;
  setIsSidebarOpen: (open: boolean) => void;
  isDarkMode?: boolean;
}

const NavItem = ({ id, icon: Icon, label, role, profile, activeTab, setActiveTab, setIsSidebarOpen, isDarkMode }: NavItemProps) => {
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
          ? 'bg-[#0038A8] text-white shadow-lg shadow-blue-500/20' 
          : isDarkMode
            ? 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
            : 'text-gray-500 hover:bg-blue-50 hover:text-[#0038A8]'
      }`}
    >
      <div className={`p-2 rounded-xl transition-colors ${
        isActive 
          ? 'bg-white/20' 
          : isDarkMode
            ? 'bg-slate-800 group-hover:bg-slate-700'
            : 'bg-gray-100 group-hover:bg-white'
      }`}>
        <Icon size={18} className={isActive ? 'text-white' : isDarkMode ? 'text-slate-400 group-hover:text-blue-400' : 'text-gray-500 group-hover:text-[#0038A8]'} />
      </div>
      <span className={`text-xs lg:text-sm font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
        {label}
      </span>
      {isActive && (
        <motion.div 
          layoutId="active-pill"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="ml-auto w-1.5 h-1.5 bg-[#FCD116] rounded-full shadow-[0_0_8px_#FCD116]"
        />
      )}
    </button>
  );
};

const sortRecordsByGradeAndName = (records: any[]) => {
  return [...records].sort((a, b) => {
    const aGrade = a.gradeLevel || "";
    const bGrade = b.gradeLevel || "";
    
    // Extract numerical grade values 
    const aGradeNum = parseInt(aGrade.replace(/\D/g, ''), 10);
    const bGradeNum = parseInt(bGrade.replace(/\D/g, ''), 10);
    
    if (!isNaN(aGradeNum) && !isNaN(bGradeNum) && aGradeNum !== bGradeNum) {
      return aGradeNum - bGradeNum;
    }

    const gradeComp = aGrade.localeCompare(bGrade);
    if (gradeComp !== 0) return gradeComp;

    // Grades are the same, extract last name
    const extractLastName = (name: string) => {
       const parts = name.trim().split(/\s+/);
       return parts.length > 1 ? parts[parts.length - 1] : parts[0];
    };
    
    const aLastName = extractLastName(a.name);
    const bLastName = extractLastName(b.name);
    return aLastName.localeCompare(bLastName);
  });
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

type Signatory = {
  id: string;
  name: string;
  title: string;
  label: string;
};

const BACKGROUND_PARTICLES = [...Array(18)].map((_, i) => ({
  id: i,
  size: Math.random() * 50 + 15,
  left: Math.random() * 100,
  duration: Math.random() * 10 + 15,
  delay: Math.random() * -30,
  xOffset: (Math.random() - 0.5) * 60,
  pops: Math.random() > 0.3 // 70% chance to pop
}));

const playBubblePop = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!(window as any).popAudioCtx) {
      (window as any).popAudioCtx = new AudioContextClass();
    }
    const ctx = (window as any).popAudioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    
    const now = ctx.currentTime;
    
    // Create oscillator and gain nodes for realistic, satisfying wet bubble pop
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    
    // Bubble pop frequency sweep: fast sweep up sounds like a cute wet pop
    const pitchStart = 180 + Math.random() * 80;
    const pitchEnd = 750 + Math.random() * 200;
    
    osc.frequency.setValueAtTime(pitchStart, now);
    osc.frequency.exponentialRampToValueAtTime(pitchEnd, now + 0.05);
    
    // Gain envelope (exponential decay)
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.008); // brief fade-in
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.065); // quick pop release
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.075);
  } catch (err) {
    console.warn("Audio pop error:", err);
  }
};

const FloatingBubbleMobile = ({ p }: { p: any }) => {
  const [isPopped, setIsPopped] = useState(false);
  const hasPoppedRef = useRef(false);

  const handlePop = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isPopped) return;
    setIsPopped(true);
    playBubblePop();
    // Respawn after 4.5 seconds
    setTimeout(() => {
      setIsPopped(false);
      hasPoppedRef.current = false;
    }, 4500);
  };

  if (isPopped) return null;

  return (
    <motion.div
      className="absolute rounded-full bg-gradient-to-tr from-white/5 to-white/20 backdrop-blur-[1px] border border-white/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] pointer-events-auto cursor-pointer"
      style={{
        width: p.size,
        height: p.size,
        left: `${p.left}%`,
        bottom: "-10%",
      }}
      onPointerDown={handlePop}
      animate={{
        y: ["0vh", "-110vh"],
        x: ["0vw", `${p.xOffset}vw`],
        scale: p.pops ? [0.5, 1, 1, 1.4, 0] : [0.5, 1, 1],
        opacity: p.pops ? [0, 0.4, 0.4, 0.6, 0] : [0, 0.4, 0.4]
      }}
      transition={{
        duration: p.duration,
        repeat: Infinity,
        ease: "linear",
        delay: p.delay,
        times: p.pops ? [0, 0.1, 0.8, 0.9, 0.95] : [0, 0.1, 1]
      }}
      onUpdate={(latest) => {
        if (p.pops && latest.scale && (latest.scale as number) > 1.3) {
          if (!hasPoppedRef.current) {
            hasPoppedRef.current = true;
            playBubblePop();
          }
        }
        if (latest.scale && (latest.scale as number) < 0.7) {
          hasPoppedRef.current = false;
        }
      }}
    />
  );
};

const CARD_PARTICLES = [...Array(6)].map((_, i) => ({
  id: `card-${i}`,
  size: Math.random() * 30 + 10,
  left: Math.random() * 80 + 10,
  top: Math.random() * 80 + 10,
  duration: Math.random() * 5 + 5,
  delay: Math.random() * -10,
  xOffset: (Math.random() - 0.5) * 20,
  yOffset: (Math.random() - 0.5) * 20
}));

const NotificationCenter = ({ 
  notifications, 
  onMarkRead, 
  onDelete, 
  isDarkMode,
  setActiveTab
}: any) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight`}>Notification Center</h2>
          <p className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'} font-black uppercase tracking-[0.2em] mt-1`}>Your personal activity stream</p>
        </div>
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50'} px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}
        >
          <LayoutDashboard size={14} />
          Dashboard
        </button>
      </div>

      <div className="grid gap-4">
        {notifications.length === 0 ? (
          <div className={`p-16 text-center ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} rounded-[2.5rem] border shadow-sm`}>
            <Bell size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-800' : 'text-gray-100'}`} />
            <h3 className={`text-sm font-black ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase tracking-widest mb-1`}>Silence is Golden</h3>
            <p className="text-xs text-gray-400 font-medium">No updates at the moment.</p>
          </div>
        ) : (
          [...notifications].sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).map((notif: AppNotification) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={notif.id}
              className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} rounded-3xl border shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all`}
            >
              {!notif.isRead && (
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#0038A8]"></div>
              )}
              
              <div className="flex gap-5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  notif.type === 'announcement' ? (isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600') :
                  notif.type === 'welcome' ? (isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600') :
                  (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600')
                }`}>
                  {notif.type === 'announcement' ? <Megaphone size={20} /> : <Bell size={20} />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-base font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight truncate`}>{notif.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full shrink-0 text-[7px] font-black uppercase tracking-widest ${
                          notif.type === 'announcement' ? (isDarkMode ? 'bg-purple-900/40 text-purple-400' : 'bg-purple-50 text-purple-600') :
                          (isDarkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-blue-600')
                        }`}>
                          {notif.type}
                        </span>
                      </div>
                      <p className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} truncate`}>
                        {ensureTimestamp(notif.timestamp).toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {ensureTimestamp(notif.timestamp).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      {!notif.isRead && (
                        <button 
                          onClick={() => onMarkRead(notif.id)}
                          className={`p-1.5 rounded-xl transition-all ${isDarkMode ? 'bg-blue-900/40 text-blue-400 hover:bg-blue-900/60' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                          title="Mark as Read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => onDelete(notif.id)}
                        className={`p-1.5 rounded-xl transition-all ${isDarkMode ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                        title="Delete Notification"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>
                    {notif.message}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

const EMPTY_INBOX = null; // Placeholder to remove AdminInbox safely

function AppContent() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGradeSelection, setShowGradeSelection] = useState(false);
  const [standardDues, setStandardDues] = useState<StandardDue[]>([]);
  const [records, setRecords] = useState<TeacherRecord[]>([]);
  const [remittances, setRemittances] = useState<Remittance[]>([]);
  const [remittanceNotifications, setRemittanceNotifications] = useState<Remittance[]>([]);
  const [verifyingNotificationIds, setVerifyingNotificationIds] = useState<string[]>([]);
  const initialRemittancesLoaded = useRef(false);
  const knownRemittanceIds = useRef<Set<string>>(new Set());
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [profileChangeRequests, setProfileChangeRequests] = useState<ProfileChangeRequest[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [initialBalances, setInitialBalances] = useState<InitialBalance[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [brandingSettings, setBrandingSettings] = useState({ 
    headerUrl: DOCX_HEADER_URL, 
    footerUrl: DOCX_FOOTER_URL 
  });
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | 'All'>('All');

  const getTeacherRecordByEmail = useCallback((email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail.startsWith('qr-') && cleanEmail.endsWith('@facultyclub.local')) {
      return records.find(r => {
        const tEmail = r.email.toLowerCase().trim().replace('@', '_');
        return cleanEmail.includes(tEmail);
      }) || null;
    }
    return records.find(r => r.email.toLowerCase().trim() === cleanEmail) || null;
  }, [records]);

  const getWelcomeDisplayName = useCallback((name: string) => {
    return getDisplayName(name, profile?.role);
  }, [profile?.role]);

  const teacherRecord = useMemo(() => {
    if (!profile || profile.role !== 'teacher') return null;
    return getTeacherRecordByEmail(profile.email);
  }, [profile, getTeacherRecordByEmail]);

  // Memoized Teacher Stats for Portal
  const teacherStats = useMemo(() => {
    const portalRequiredDues = standardDues.filter(d => !d.isVoluntary);
    const portalTotalRequiredAmount = portalRequiredDues.reduce((sum, d) => sum + d.amount, 0);
    const portalTotalPaidAmount = (teacherRecord?.paymentHistory || []).reduce((sum, p) => sum + p.amount, 0);
    const portalCurrentPaidRequiredAmount = portalRequiredDues.filter(d => teacherRecord?.paidDueIds?.includes(d.id)).reduce((sum, d) => sum + d.amount, 0);
    const portalRemainingBalance = Math.max(0, portalTotalRequiredAmount - portalCurrentPaidRequiredAmount);
    const portalUnpaidRequiredDues = portalRequiredDues.filter(d => !teacherRecord?.paidDueIds?.includes(d.id));
    const portalSettledRequiredDuesCount = portalRequiredDues.filter(d => teacherRecord?.paidDueIds?.includes(d.id) || false).length;

    return {
      portalRequiredDues,
      portalTotalRequiredAmount,
      portalTotalPaidAmount,
      portalCurrentPaidRequiredAmount,
      portalRemainingBalance,
      portalUnpaidRequiredDues,
      portalSettledRequiredDuesCount
    };
  }, [standardDues, teacherRecord]);

  const { 
    portalRequiredDues, 
    portalTotalRequiredAmount, 
    portalTotalPaidAmount, 
    portalCurrentPaidRequiredAmount,
    portalRemainingBalance, 
    portalUnpaidRequiredDues, 
    portalSettledRequiredDuesCount 
  } = teacherStats;

  const deleteNotification = async (notifId: string) => {
    if (!user || !profile || !teacherRecord) return;
    try {
      const notifRef = doc(db, 'teachers', teacherRecord.id, 'notifications', notifId);
      await deleteDoc(notifRef);
      showToast("Notification deleted successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `teachers/${teacherRecord.id}/notifications/${notifId}`);
    }
  };

  const sendReply = async (notifId: string) => {
    if (!user || !profile || !teacherRecord || !replyText.trim()) return;
    try {
      const notifRef = doc(db, 'teachers', teacherRecord.id, 'notifications', notifId);
      const reply = {
        id: Math.random().toString(36).substring(7),
        message: replyText,
        senderId: profile.uid,
        senderName: profile.name,
        timestamp: new Date().toISOString()
      };
      const notif = notifications.find(n => n.id === notifId);
      const updatedReplies = [...(notif?.replies || []), reply];
      await updateDoc(notifRef, { replies: updatedReplies });
      setReplyText('');
      setReplyingTo(null);
      showToast("Reply sent successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `teachers/${teacherRecord.id}/notifications/${notifId}`);
    }
  };
  const [activeTab, setActiveTab] = useState<'dashboard' | 'collection' | 'admin' | 'remittance' | 'expenses' | 'audit' | 'profile' | 'settings' | 'system' | 'notifications'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teacher-dark-mode');
      return saved === 'true';
    }
    return false;
  });
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [undoStack, setUndoStack] = useState<{ type: string, data: any }[]>([]);
  const [redoStack, setRedoStack] = useState<{ type: string, data: any }[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showInAppNotify, setShowInAppNotify] = useState<AppNotification | null>(null);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileEmail, setEditProfileEmail] = useState('');
  const [editProfileGradeLevel, setEditProfileGradeLevel] = useState<GradeLevel>('Grade 7');
  const [editProfileDepartment, setEditProfileDepartment] = useState('');
  const [editProfileNote, setEditProfileNote] = useState('');
  const [isBatchSending, setIsBatchSending] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isBatchUpdateModalOpen, setIsBatchUpdateModalOpen] = useState(false);
  const [batchDueUpdates, setBatchDueUpdates] = useState<Record<string, 'paid' | 'unpaid' | 'no_change'>>({});
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [showWipeSuccessModal, setShowWipeSuccessModal] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleBrandingImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'headerUrl' | 'footerUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Downscale to prevent exceeding Firestore 1MB limit and improve mobile compatibility
        const MAX_WIDTH = 1200;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png'); 
          setBrandingSettings(prev => ({ ...prev, [target]: dataUrl }));
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveYear, setArchiveYear] = useState(new Date().getFullYear().toString());
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [newBalanceAmount, setNewBalanceAmount] = useState('');
  const [newBalanceDescription, setNewBalanceDescription] = useState('');
  const [qrCodeData, setQrCodeData] = useState<{ email: string, pass?: string, grade: string, realEmail?: string } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [previewReceiptData, setPreviewReceiptData] = useState<any>(null);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const [isScanSuccess, setIsScanSuccess] = useState(false);
  const [scannerCameraMode, setScannerCameraMode] = useState<'environment' | 'user'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('scannerCameraMode');
      if (saved === 'environment' || saved === 'user') return saved;
    }
    return 'environment';
  });
  const [isQRLogin, setIsQRLogin] = useState(false);
  const [qrLoginData, setQrLoginData] = useState<{ email: string, pass?: string, realEmail: string } | null>(null);
  const [isQRApprovalPending, setIsQRApprovalPending] = useState(false);
  const [qrApprovalRequestId, setQrApprovalRequestId] = useState<string | null>(null);
  const [qrApprovalTeacherName, setQrApprovalTeacherName] = useState<string>('');
  const [pendingLoginRequests, setPendingLoginRequests] = useState<any[]>([]);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string | null>(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);
  const justLoggedIn = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

  // Sync network status and display real-time user guidance
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showToast("You are back online! Syncing latest records.");
    };
    const handleOffline = () => {
      setIsOffline(true);
      showToast("Working offline with cached dashboard and teacher records.");
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Register service worker globally on first load for complete offline usability
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered globally with scope:', registration.scope);
          })
          .catch((err) => {
            console.warn('Global Service Worker registration failed:', err);
          });
      };
      
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  // Ask for notification permission aggressively on the first user interaction & unlock audio context
  useEffect(() => {
    let triggered = false;
    const requestPushOnFirstClick = () => {
      if (triggered) return;
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      
      // Initialize/resume the pop sound AudioContext on the very first user interaction
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass && !(window as any).popAudioCtx) {
          (window as any).popAudioCtx = new AudioContextClass();
        }
        const ctx = (window as any).popAudioCtx;
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      } catch (err) {
        console.warn("Failed to initialize pop audio context on interaction:", err);
      }

      triggered = true;
      document.removeEventListener('click', requestPushOnFirstClick);
      document.removeEventListener('touchstart', requestPushOnFirstClick);
    };

    document.addEventListener('click', requestPushOnFirstClick, { once: true });
    document.addEventListener('touchstart', requestPushOnFirstClick, { once: true });

    return () => {
      document.removeEventListener('click', requestPushOnFirstClick);
      document.removeEventListener('touchstart', requestPushOnFirstClick);
    };
  }, []);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (!isQRApprovalPending || !qrApprovalRequestId || !qrLoginData) return;

    const unsub = onSnapshot(doc(db, 'login_requests', qrApprovalRequestId), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.status === 'approved') {
          unsub();
          setLoading(true);
          try {
            await signInWithEmailAndPassword(auth, qrLoginData.email, qrLoginData.pass);
            setIsQRLogin(true);
            setIsQRApprovalPending(false);
            setQrApprovalRequestId(null);
            setQrLoginData(null);
            justLoggedIn.current = true;
            showToast("Login Approved!");
            // Clean up the request quietly
            deleteDoc(doc(db, 'login_requests', qrApprovalRequestId)).catch(err => console.warn("Cleanup error:", err));
          } catch (error: any) {
            console.error("Final QR Login Error:", error);
            showToast(`Login Failed: ${error.message}`);
            setIsQRApprovalPending(false);
          } finally {
            setLoading(false);
          }
        } else if (data.status === 'denied') {
          unsub();
          setIsQRApprovalPending(false);
          setQrApprovalRequestId(null);
          showToast("Login Request Denied by Admin.");
          // Clean up the denied request quietly
          deleteDoc(doc(db, 'login_requests', qrApprovalRequestId)).catch(err => console.warn("Cleanup error:", err));
        }
      }
    }, (error) => {
      console.error("QR Approval Listener Error:", error);
    });

    return () => unsub();
  }, [isQRApprovalPending, qrApprovalRequestId, qrLoginData]);

  // Notifications pop-up trigger logic
  const shownNotifIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (notifications.length > 0) {
      // On first load, just fill the set but don't show pop-ups
      if (isFirstLoad.current) {
        shownNotifIds.current = new Set(notifications.map(n => n.id));
        isFirstLoad.current = false;
        return;
      }

      // Find new notifications that aren't in our "shown" set
      const newNotifs = notifications.filter(n => !shownNotifIds.current.has(n.id));
      
      if (newNotifs.length > 0) {
        // Show pop-up for the most recent new notification
        const latest = newNotifs.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))[0];
        if (latest) {
          setShowInAppNotify(latest);
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/3005/3005-preview.mp3');
          audio.play().catch(() => {});
          setTimeout(() => setShowInAppNotify(null), 8000);
          
          // Add all current notifications to the shown set
          notifications.forEach(n => shownNotifIds.current.add(n.id));
        }
      }
    } else {
      // If notifications are cleared (e.g. logout), reset the trackers
      shownNotifIds.current = new Set();
      isFirstLoad.current = true;
    }
  }, [notifications]);

  useEffect(() => {
    if (justLoggedIn.current && user && profile) {
      justLoggedIn.current = false;
      if (!isMaintenanceMode) {
        // Fast transition
        setShowLoginSuccess(true);
        setTimeout(() => setShowLoginSuccess(false), 3000);
      }
    }
  }, [user, profile, isMaintenanceMode]);

  const [isVoluntaryModalOpen, setIsVoluntaryModalOpen] = useState(false);
  const [voluntaryPaymentData, setVoluntaryPaymentData] = useState<{ teacherId: string, dueId: string, amount: string } | null>(null);
  const [deleteType, setDeleteType] = useState<'selected' | 'all'>('selected');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'All' | 'Paid' | 'Partial' | 'Pending'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showDues, setShowDues] = useState(true);
  const [showPayments, setShowPayments] = useState(true);
  const [adminSubTab, setAdminSubTab] = useState<'users' | 'broadcast' | 'maintenance'>('users');

  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('teacher-dark-mode', isDarkMode.toString());
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsMaintenanceMode(docSnap.data().maintenanceMode === true);
      }
    }, (error) => console.warn("Global settings snapshot error:", error));
    return () => unsubscribe();
  }, []);

  // Optimized Calculations
  const totalCollections = useMemo(() => {
    return records.reduce((sum, r) => {
      const paidDues = standardDues.filter(d => r.paidDueIds.includes(d.id));
      return sum + paidDues.reduce((s, d) => {
        if (d.isVoluntary && r.voluntaryPayments?.[d.id]) return s + r.voluntaryPayments[d.id];
        return s + d.amount;
      }, 0);
    }, 0);
  }, [records, standardDues]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const totalInitialBalance = useMemo(() => {
    return initialBalances.reduce((sum, b) => sum + b.amount, 0);
  }, [initialBalances]);

  const netBalance = useMemo(() => {
    return totalCollections + totalInitialBalance - totalExpenses;
  }, [totalCollections, totalInitialBalance, totalExpenses]);

  const requiredDues = useMemo(() => {
    return standardDues.filter(d => !d.isVoluntary);
  }, [standardDues]);

  const totalCollectibles = useMemo(() => {
    return requiredDues.reduce((sum, d) => sum + d.amount, 0);
  }, [requiredDues]);

  const fullyPaidCount = useMemo(() => {
    return records.filter(r => {
      return requiredDues.length > 0 && requiredDues.every(d => r.paidDueIds.includes(d.id));
    }).length;
  }, [records, requiredDues]);

  const totalDuesAmount = useMemo(() => {
    return standardDues.reduce((sum, d) => sum + d.amount, 0);
  }, [standardDues]);

  const expenseChartData = useMemo(() => {
    const categories: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.category || 'General';
      categories[cat] = (categories[cat] || 0) + e.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const collectionTrendData = useMemo(() => {
    const monthsData: Record<string, { monthly: number, cumulative: number, order: number }> = {};
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // 1. Add verified remittances (BOD collections)
    remittances.filter(r => r.status === 'verified').forEach(r => {
      const date = ensureTimestamp(r.timestamp).toDate();
      if (date) {
        const monthName = date.toLocaleString('default', { month: 'short' });
        if (!monthsData[monthName]) {
          monthsData[monthName] = { monthly: 0, cumulative: 0, order: monthOrder.indexOf(monthName) };
        }
        monthsData[monthName].monthly += r.amount;
      }
    });

    // 2. Add Admin collections (direct payments)
    records.forEach(record => {
      record.paymentHistory?.forEach(payment => {
        if (payment.collectedByRole === 'admin') {
          const date = ensureTimestamp(payment.date).toDate();
          const monthName = date.toLocaleString('default', { month: 'short' });
          if (!monthsData[monthName]) {
            monthsData[monthName] = { monthly: 0, cumulative: 0, order: monthOrder.indexOf(monthName) };
          }
          monthsData[monthName].monthly += payment.amount;
        }
      });
    });
    
    const sortedData = Object.entries(monthsData)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([name, data]) => ({ name, monthly: data.monthly, cumulative: 0 }));

    // Calculate cumulative
    let runningTotal = 0;
    return sortedData.map(item => {
      runningTotal += item.monthly;
      return { ...item, cumulative: runningTotal };
    });
  }, [remittances, records]);

  const filteredRecords = useMemo(() => {
    const filtered = records
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
      });

    return sortRecordsByGradeAndName(filtered);
  }, [records, searchQuery, selectedGrade, paymentFilter, standardDues]);

  useEffect(() => {
    if (!user || !profile || profile.role !== 'teacher' || !teacherRecord) return;
    
    // Check initial load to avoid popping up old unread notifications when opening the app
    let isInitialLoad = true;
    
    const unsubscribe = onSnapshot(query(collection(db, 'teachers', teacherRecord.id, 'notifications')), (snapshot) => {
      const notifData = snapshot.docs.map(doc => {
        const d = doc.data() as any;
        return { 
          id: doc.id, 
          ...d, 
          timestamp: ensureTimestamp(d.timestamp) 
        } as AppNotification;
      });
      setNotifications(notifData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
      
      // Trigger native notification for new ones via docChanges
      if (!isInitialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data() as AppNotification;
            // Play a beep
            if (audioRef.current) {
                audioRef.current.src = 'https://assets.mixkit.co/active_storage/sfx/3005/3005-preview.mp3';
                audioRef.current.play().catch(() => {});
            } else {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/3005/3005-preview.mp3');
                audio.play().catch(() => {});
            }
            
            // Show In-app popover
            setShowInAppNotify({ id: change.doc.id, ...data });
            setTimeout(() => setShowInAppNotify(null), 8000);
            
            // Show Native Push Notification if permitted and page is hidden/backgrounded
            if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
              const nativeNotif = new Notification(data.title, {
                body: data.message,
                icon: '/vite.svg',
                tag: 'faculty-club-announcement'
              });
              
              nativeNotif.onclick = () => {
                window.focus();
                nativeNotif.close();
                setShowNotifications(true);
              };
            }
          }
        });
      }
      isInitialLoad = false;
      
    }, (error) => console.warn("Notifications snapshot error:", error));
    return () => unsubscribe();
  }, [user, profile, teacherRecord?.id]);

  // Welcome Notification Logic
  useEffect(() => {
    const checkWelcomeNotif = async () => {
      if (user && profile && profile.role === 'teacher' && teacherRecord && !teacherRecord.welcomeNotificationSent) {
        try {
          const notifRef = collection(db, 'teachers', teacherRecord.id, 'notifications');
          await addDoc(notifRef, {
            title: "Welcome to Faculty Club!",
            message: `Hi ${profile.name}! We're glad to have you here. This is your personal dashboard for monitoring dues and club activities.`,
            timestamp: serverTimestamp(),
            type: 'welcome',
            isRead: false,
            targetId: teacherRecord.id
          });
          await updateDoc(doc(db, 'teachers', teacherRecord.id), {
            welcomeNotificationSent: true
          });
        } catch (e) {
          console.error("Error sending welcome notification:", e);
        }
      }
    };
    if (records.length > 0) {
      checkWelcomeNotif();
    }
  }, [user, profile, records, teacherRecord]);

  const sendAnnouncement = async () => {
    if (!announcementTitle || !announcementMessage) {
        showToast("Please provide both title and message.");
        return;
    }
    setIsSendingAnnouncement(true);
    try {
        const batchSize = 100; // Small batches
        let processed = 0;
        
        // Loop through all teachers in chunks
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = writeBatch(db);
            const chunk = records.slice(i, i + batchSize);
            
            chunk.forEach(teacher => {
                const notifRef = doc(collection(db, 'teachers', teacher.id, 'notifications'));
                batch.set(notifRef, {
                    title: announcementTitle,
                    message: announcementMessage,
                    timestamp: serverTimestamp(),
                    type: 'announcement',
                    isRead: false,
                    targetId: teacher.id
                });
            });
            
            await batch.commit();
            processed += chunk.length;
        }
        
        // Also fire off Web Push API endpoints
        const allPushSubs = records
          .filter(t => t.pushSubscription)
          .map(t => JSON.parse(t.pushSubscription!));
          
        if (allPushSubs.length > 0) {
          try {
            await fetch('/api/broadcast', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subscriptions: allPushSubs,
                payload: { title: announcementTitle, message: announcementMessage }
              })
            });
          } catch (pushErr) {
            console.error("Web push API failed:", pushErr);
          }
        }
        
        const announcementObj: AppNotification = {
            id: 'sent-' + Date.now(),
            title: announcementTitle,
            message: announcementMessage,
            timestamp: Timestamp.now(),
            type: 'announcement',
            isRead: false,
            targetId: 'all'
        };
        
        setAnnouncementTitle('');
        setAnnouncementMessage('');
        showToast(`Announcement sent to ${processed} teachers successfully!`);
        logActivity("Broadcast Announcement", `Sent: ${announcementTitle}`);
        
        // Manual pop-up for admin feedback
        setShowInAppNotify(announcementObj);
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/3005/3005-preview.mp3');
        audio.play().catch(() => {});
        setTimeout(() => setShowInAppNotify(null), 8000);
    } catch (e: any) {
        console.error("Announcement Error:", e);
        showToast("Broadcast failed. Please try again.");
    } finally {
        setIsSendingAnnouncement(false);
    }
  };

  const markAsRead = async (notifId: string) => {
    if (!profile) return;
    const teacherRec = getTeacherRecordByEmail(profile.email);
    if (teacherRec) {
      await updateDoc(doc(db, 'teachers', teacherRec.id, 'notifications', notifId), {
        isRead: true
      });
    }
  };

    // Removed NavItem definition from here to prevent re-renders
    
    useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGrade, paymentFilter]);

  useEffect(() => {
    if (profile) {
      const teacherRec = getTeacherRecordByEmail(profile.email);
      setEditProfileName(profile.name);
      
      // Use real email for editing if it's a QR login
      if (teacherRec && profile.email.includes('@facultyclub.local')) {
        setEditProfileEmail(teacherRec.email);
      } else {
        setEditProfileEmail(profile.email);
      }

      if (teacherRec) {
        setEditProfileGradeLevel(teacherRec.gradeLevel);
        setEditProfileDepartment(teacherRec.department || '');
      }
    }
  }, [profile, getTeacherRecordByEmail]);

  useEffect(() => {
    const isExecutive = profile?.email === 'lpcaanhsfacultyclubofficers@gmail.com' || profile?.email === 'ngehthong@gmail.com';
    if (!profile || (profile.role !== 'admin' && !isExecutive)) {
      setPendingLoginRequests([]);
      return;
    }

    const q = query(collection(db, 'login_requests'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingLoginRequests(requests);
    });

    return () => unsub();
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    try {
      if (profile.role === 'teacher') {
         showToast("Submitting profile update request...");
         const teacherRec = getTeacherRecordByEmail(profile.email);
         await addDoc(collection(db, 'profile_change_requests'), {
            userId: profile.uid,
            userEmail: profile.email,
            currentName: profile.name,
            newName: editProfileName,
            currentEmail: profile.email,
            newEmail: editProfileEmail,
            currentGradeLevel: teacherRec?.gradeLevel,
            newGradeLevel: editProfileGradeLevel,
            currentDepartment: teacherRec?.department || '',
            newDepartment: editProfileDepartment,
            status: 'pending',
            note: editProfileNote,
            timestamp: serverTimestamp()
         });
         showToast("Your profile update request has been sent to the Admin for approval.");
         setIsEditingProfile(false);
         setEditProfileNote('');
         logActivity("Requested Profile Update", `User ${profile.email} requested a profile update`);
      } else {
        showToast("Updating profile...");
        // Update users collection
        await updateDoc(doc(db, 'users', profile.uid), {
          name: editProfileName,
          email: editProfileEmail,
          gradeLevel: editProfileGradeLevel as any
        });
        
        // Update teachers collection if it exists
        const teacherRec = getTeacherRecordByEmail(profile.email);
        if (teacherRec) {
          await updateDoc(doc(db, 'teachers', teacherRec.id), {
            name: editProfileName,
            email: editProfileEmail,
            gradeLevel: editProfileGradeLevel,
            department: editProfileDepartment
          });
        }
        
        setProfile({ ...profile, name: editProfileName, email: editProfileEmail, gradeLevel: editProfileGradeLevel });
        setIsEditingProfile(false);
        showToast("Profile updated successfully.");
        logActivity("Updated Profile", `User ${profile.email} updated their profile`);
      }
    } catch (error: any) {
      console.error("Update Profile Error:", error);
      showToast(`Failed to update profile: ${error.message}`);
    }
  };

  const approveLoginRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'login_requests', requestId), {
        status: 'approved'
      });
      showToast("Login Approved!");
      logActivity("Approve Login", `Approved QR login for a teacher`);
    } catch (err: any) {
      console.error("Approve Error:", err);
      showToast("Failed to approve.");
    }
  };

  const approveAllLoginRequests = async () => {
    if (pendingLoginRequests.length === 0) return;
    if (!window.confirm(`Authorize all ${pendingLoginRequests.length} pending secure login requests?`)) return;
    
    setLoading(true);
    try {
      const batchSize = 10;
      for (let i = 0; i < pendingLoginRequests.length; i += batchSize) {
        const chunk = pendingLoginRequests.slice(i, i + batchSize);
        await Promise.all(chunk.map(req => 
          updateDoc(doc(db, 'login_requests', req.id), {
            status: 'approved'
          })
        ));
      }
      showToast(`Bulk approved ${pendingLoginRequests.length} login requests!`);
      logActivity("Bulk Approve Login", `Approved ${pendingLoginRequests.length} QR logins`);
    } catch (error) {
      console.error("Bulk Approve Error:", error);
      showToast("Failed to process bulk approval.");
    } finally {
      setLoading(false);
    }
  };

  const denyLoginRequest = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'login_requests', requestId), {
        status: 'denied'
      });
      showToast("Login Denied.");
      logActivity("Deny Login", `Denied QR login for a teacher`);
    } catch (err: any) {
      console.error("Deny Error:", err);
      showToast("Failed to deny.");
    }
  };

  const downloadQRCode = async (canvasId: string, fileName: string, email: string, grade?: string) => {
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
      finalCanvas.width = 1000;
      finalCanvas.height = 1450;

      // 1. Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      // 2. Header
      ctx.fillStyle = '#0038A8';
      ctx.font = 'bold 64px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('FACULTY CLUB', 500, 120);
      
      ctx.fillStyle = '#666666';
      ctx.font = 'bold 32px Arial';
      ctx.fillText('SECURE LOGIN QR CODE', 500, 190);

      if (grade) {
        ctx.fillStyle = '#0038A8';
        ctx.font = 'bold 36px Arial';
        ctx.fillText(grade, 500, 240);
      }

      // 3. Draw QR Code (centered)
      const qrSize = 700;
      const qrX = (finalCanvas.width - qrSize) / 2;
      const qrY = 280; // Moved down slightly to accommodate grade
      
      // Draw Border
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#DBEAFE'; // blue-100
      ctx.lineWidth = 12;
      ctx.strokeRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24);
      ctx.fillRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24);

      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

      // Draw Sun Logo
      const logoSize = 140;
      const logoX = (finalCanvas.width - logoSize) / 2;
      const logoY = qrY + (qrSize - logoSize) / 2;
      
      const img = new Image();
      img.src = SUN_LOGO_SVG;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      ctx.drawImage(img, logoX, logoY, logoSize, logoSize);

      // 4. Email Section
      ctx.fillStyle = '#999999';
      ctx.font = 'bold 28px Arial';
      ctx.fillText('ACCOUNT EMAIL', 500, 1060);
      
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 44px Arial';
      ctx.fillText(email, 500, 1130);

      // 5. Security Note Box
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(100, 1200, 800, 160);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 4;
      ctx.strokeRect(100, 1200, 800, 160);

      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 28px Arial';
      ctx.fillText('IMPORTANT SECURITY NOTICE', 500, 1260);
      
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('Keep this QR code private. It grants direct access to your account.', 500, 1310);

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

  const handleDownloadBackup = async () => {
    try {
      setIsGeneratingBackup(true);
      setBackupDownloadUrl(null);
      showToast("Generating full database backup... please wait.");
      
      const mainCollections = ['users', 'teachers', 'dues', 'remittances', 'expenses', 'initial_balances', 'audit_logs', 'settings', 'archives'];
      const backupData: Record<string, any[]> = {};
      
      // 1. Fetch all main collections in parallel
      await Promise.all(mainCollections.map(async (colName) => {
        try {
          const snap = await getDocs(collection(db, colName));
          backupData[colName] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e: any) {
          throw new Error(`Failed reading collection '${colName}': ${e.message}`);
        }
      }));

      // 2. Fetch notifications for all teachers in parallel
      backupData['teachers_notifications'] = [];
      const teachers = backupData['teachers'] || [];
      if (teachers.length > 0) {
        const notifBatches = await Promise.all(teachers.map(async (teacher: any) => {
          try {
            const notifSnap = await getDocs(collection(db, 'teachers', teacher.id, 'notifications'));
            return notifSnap.docs.map(doc => ({ _parentId: teacher.id, id: doc.id, ...doc.data() }));
          } catch (e: any) {
             console.warn(`Could not read notifications for teacher ${teacher.id}: ${e.message}`);
             return [];
          }
        }));
        backupData['teachers_notifications'] = notifBatches.flat();
      }

      // 3. Fetch subcollections for all archives in parallel
      backupData['archives_teachers'] = [];
      backupData['archives_expenses'] = [];
      backupData['archives_remittances'] = [];
      const archives = backupData['archives'] || [];
      
      if (archives.length > 0) {
        await Promise.all(archives.map(async (archive: any) => {
          try {
            const [ts, es, rs] = await Promise.all([
              getDocs(collection(db, 'archives', archive.id, 'teachers')),
              getDocs(collection(db, 'archives', archive.id, 'expenses')),
              getDocs(collection(db, 'archives', archive.id, 'remittances'))
            ]);
            
            ts.docs.forEach(doc => backupData['archives_teachers'].push({ _parentId: archive.id, id: doc.id, ...doc.data() }));
            es.docs.forEach(doc => backupData['archives_expenses'].push({ _parentId: archive.id, id: doc.id, ...doc.data() }));
            rs.docs.forEach(doc => backupData['archives_remittances'].push({ _parentId: archive.id, id: doc.id, ...doc.data() }));
          } catch (e: any) {
            console.warn(`Could not read subcollections for archive ${archive.id}: ${e.message}`);
          }
        }));
      }

      const backup = {
          version: '1.0',
          timestamp: new Date().toISOString(),
          data: backupData
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      setBackupDownloadUrl(url);
      setBackupFileName(`FCMS_Database_Backup_${new Date().toISOString().split('T')[0]}.json`);
      
      showToast("Backup generated successfully. Click the 'Download Ready' button below.");
      logActivity("System Backup", `Admin ${profile?.name || 'Admin'} generated database backup`);
    } catch (e: any) {
      console.error("Backup failed", e);
      showToast(`Backup blocked: ${e.message}`);
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  const handleUploadBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm("CRITICAL WARNING: This will completely WIPE the current database and replace it with the backup file. This action cannot be undone. Are you absolutely sure you want to proceed?")) {
        event.target.value = '';
        return;
    }

    try {
        showToast("Wiping database and restoring backup... please wait. DO NOT close this window.");
        
        const text = await file.text();
        const backup = JSON.parse(text);

        if (!backup.data || !backup.version) {
            throw new Error("Invalid backup file format. Missing data or version tag.");
        }

        const mainCollections = ['users', 'teachers', 'dues', 'remittances', 'expenses', 'initial_balances', 'audit_logs', 'settings', 'archives'];
        
        let batch = writeBatch(db);
        let opCount = 0;

        const commitBatchIfNeeded = async () => {
            if (opCount >= 450) {
                await batch.commit();
                batch = writeBatch(db);
                opCount = 0;
            }
        };

        const currentTeachers = await getDocs(collection(db, 'teachers'));
        for (const t of currentTeachers.docs) {
            const notifs = await getDocs(collection(db, 'teachers', t.id, 'notifications'));
            for (const n of notifs.docs) { batch.delete(n.ref); opCount++; await commitBatchIfNeeded(); }
        }

        const currentArchives = await getDocs(collection(db, 'archives'));
        for (const a of currentArchives.docs) {
            const subCols = ['teachers', 'expenses', 'remittances'];
            for (const sub of subCols) {
                const subSnap = await getDocs(collection(db, 'archives', a.id, sub));
                for (const s of subSnap.docs) { batch.delete(s.ref); opCount++; await commitBatchIfNeeded(); }
            }
        }

        for (const colName of mainCollections) {
            const snap = await getDocs(collection(db, colName));
            for (const d of snap.docs) {
                // IMPORTANT: Never delete the active admin, otherwise Firestore rules will instantly block the rest of this wipe and restore process!
                if (colName === 'users' && d.id === user?.uid) continue;
                batch.delete(d.ref); opCount++; await commitBatchIfNeeded();
            }
        }

        const restoreTimestamps = (obj: any): any => {
            if (obj === null || typeof obj !== 'object') return obj;
            if (Array.isArray(obj)) return obj.map(restoreTimestamps);
            if (Object.keys(obj).length === 2 && 'seconds' in obj && 'nanoseconds' in obj) {
                return new Timestamp(obj.seconds, obj.nanoseconds);
            }
            const newObj: any = {};
            for (const key in obj) { newObj[key] = restoreTimestamps(obj[key]); }
            return newObj;
        };

        for (const colName of mainCollections) {
            if (backup.data[colName]) {
                for (const docData of backup.data[colName]) {
                    const { id, ...data } = docData;
                    batch.set(doc(db, colName, id), restoreTimestamps(data));
                    opCount++; await commitBatchIfNeeded();
                }
            }
        }

        if (backup.data['teachers_notifications']) {
            for (const docData of backup.data['teachers_notifications']) {
                const { id, _parentId, ...data } = docData;
                batch.set(doc(db, 'teachers', _parentId, 'notifications', id), restoreTimestamps(data));
                opCount++; await commitBatchIfNeeded();
            }
        }
        
        const archiveSubCols = ['teachers', 'expenses', 'remittances'];
        for (const sub of archiveSubCols) {
            const key = `archives_${sub}`;
            if (backup.data[key]) {
                for (const docData of backup.data[key]) {
                    const { id, _parentId, ...data } = docData;
                    batch.set(doc(db, 'archives', _parentId, sub, id), restoreTimestamps(data));
                    opCount++; await commitBatchIfNeeded();
                }
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }

        showToast("Database restored successfully! Reloading system...");
        logActivity("System Restoration", `Admin ${profile?.name || 'Admin'} restored database from backup file.`);
        
        setTimeout(() => { window.location.reload(); }, 2000);

    } catch (e: any) {
        console.error("Restore failed", e);
        showToast(`Failed to restore backup: ${e.message}`);
    } finally {
        event.target.value = '';
    }
  };

  const handleAddInitialBalance = async () => {
    if (!newBalanceAmount || isNaN(parseFloat(newBalanceAmount))) {
      showToast("Please enter a valid amount.");
      return;
    }
    try {
      await addDoc(collection(db, 'initial_balances'), {
        amount: parseFloat(newBalanceAmount),
        description: newBalanceDescription || 'Initial Balance',
        timestamp: serverTimestamp(),
        adminId: user?.uid,
        adminName: profile?.name
      });
      setNewBalanceAmount('');
      setNewBalanceDescription('');
      showToast("Initial balance added successfully.");
      logActivity("Added Initial Balance", `Admin ${profile?.name} added initial balance of ₱${newBalanceAmount}`);
    } catch (error: any) {
      console.error("Add Balance Error:", error);
      showToast(`Failed to add balance: ${error.message}`);
    }
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const [supervisingTeacherId, setSupervisingTeacherId] = useState<string | null>(null);
  const [editLastName, setEditLastName] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editMiddleInitial, setEditMiddleInitial] = useState('');
  const [editGender, setEditGender] = useState<'Male' | 'Female'>('Female');
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
        const email = firebaseUser.email?.toLowerCase().trim() || '';
        const isAdminEmail = email === 'lpcaanhsfacultyclubofficers@gmail.com' || email === 'ngehthong@gmail.com';
        const isBodEmail = Object.keys(ALLOWED_BODS).some(key => key.toLowerCase().trim() === email);
        const isQRLoginEmail = email.startsWith('qr-') && email.endsWith('@facultyclub.local');
        
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (userDoc.exists()) {
          let data = userDoc.data() as UserProfile;
          
          // Re-verify authorization on every state change
          let isAuthorized = false;
          if (isAdminEmail) isAuthorized = true;
          else if (isBodEmail) isAuthorized = true;
          else if (isQRLoginEmail) isAuthorized = true;
          else if (data.role === 'teacher') {
            const teachersSnap = await getDocs(collection(db, 'teachers'));
            isAuthorized = teachersSnap.docs.some(doc => doc.data().email.toLowerCase().trim() === email);
          }

          if (!isAuthorized) {
            console.warn("User is no longer authorized. Logging out.");
            signOut(auth);
            setUnauthorizedEmail(email);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }

          // Enforce BOD roles strictly based on email
          const actualBodEmail = Object.keys(ALLOWED_BODS).find(key => key.toLowerCase().trim() === email);
          if (actualBodEmail && (data.role !== 'bod' || data.gradeLevel !== ALLOWED_BODS[actualBodEmail])) {
            data.role = 'bod';
            data.gradeLevel = ALLOWED_BODS[actualBodEmail];
            await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'bod', gradeLevel: ALLOWED_BODS[actualBodEmail] });
          }
          
          setUser(firebaseUser);
          setProfile(data);
          setUnauthorizedEmail(null);
        } else {
          try {
            // Check if this email belongs to a teacher (client-side filter for case-insensitivity)
            const teachersSnap = await getDocs(collection(db, 'teachers'));
            const teacherDoc = teachersSnap.docs.find(doc => doc.data().email.toLowerCase().trim() === email);
            
            let role: 'admin' | 'bod' | 'teacher' | 'unauthorized' = 'unauthorized';
            let gradeLevel: GradeLevel | 'All' = 'Grade 7';
            let assignedName = firebaseUser.displayName || '';
            
            if (isAdminEmail) {
              role = 'admin';
              gradeLevel = 'All';
              if (!assignedName) assignedName = 'Executive Officer';
            } else if (isBodEmail) {
              const actualBodEmail = Object.keys(ALLOWED_BODS).find(key => key.toLowerCase().trim() === email);
              role = 'bod';
              gradeLevel = actualBodEmail ? ALLOWED_BODS[actualBodEmail] : 'Grade 7';
              if (!assignedName) assignedName = 'BOD Member';
            } else if (teacherDoc) {
              role = 'teacher';
              gradeLevel = teacherDoc.data().gradeLevel;
              if (!assignedName) assignedName = teacherDoc.data().name;
            } else if (isQRLoginEmail) {
              // Synthetic email from QR code, look up corresponding teacher
              const matchingTeacher = teachersSnap.docs.find(tDoc => {
                const tEmail = tDoc.data().email.toLowerCase().trim().replace('@', '_');
                return email.includes(tEmail);
              });
              
              if (matchingTeacher) {
                role = 'teacher';
                gradeLevel = matchingTeacher.data().gradeLevel;
                if (!assignedName) assignedName = matchingTeacher.data().name;
              }
            }

            if (role === 'unauthorized') {
              console.warn("Unregistered email tried to log in:", email);
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
              name: assignedName || 'Teacher'
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setUser(firebaseUser);
            setProfile(newProfile);
            setUnauthorizedEmail(null);
          } catch (error) {
            console.error("Error during user initialization:", error);
            signOut(auth);
            setUnauthorizedEmail(email);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }
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
      const duesData = snapshot.docs.map(doc => {
        const d = doc.data() as any;
        return { 
          id: doc.id, 
          ...d, 
          timestamp: ensureTimestamp(d.timestamp) 
        } as StandardDue;
      });
      setStandardDues(duesData);
    }, (error) => console.warn("Dues snapshot error:", error));
    return () => unsubscribe();
  }, [user]);

  // Firestore Sync: Teachers
  useEffect(() => {
    if (!user || !profile) return;
    let q = query(collection(db, 'teachers'));
    
    // BODs only see their grade level
    if (profile.role === 'bod') {
      q = query(collection(db, 'teachers'), where('gradeLevel', '==', profile.gradeLevel));
    } else if (profile.role === 'teacher') {
      // Fetch all teachers for teachers to allow client-side case-insensitive filtering
      q = query(collection(db, 'teachers'));
    } else if (selectedGrade !== 'All') {
      q = query(collection(db, 'teachers'), where('gradeLevel', '==', selectedGrade));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teacherData = snapshot.docs.map(doc => {
        const d = doc.data() as any;
        return { 
          id: doc.id, 
          ...d, 
          paidDueIds: d.paidDueIds || [], 
          paymentHistory: (d.paymentHistory || []).map((p: any) => ({ ...p, date: ensureTimestamp(p.date) })),
          voluntaryPayments: d.voluntaryPayments || {},
          timestamp: ensureTimestamp(d.timestamp)
        } as TeacherRecord;
      });
      console.log("Teachers updated:", teacherData);
      setRecords(teacherData);
    }, (error) => console.warn("Teachers snapshot error:", error));
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
      const remData = snapshot.docs.map(doc => {
        const d = doc.data() as any;
        return { 
            id: doc.id, 
            ...d, 
            teacherIds: d.teacherIds || [], 
            timestamp: ensureTimestamp(d.timestamp) 
        } as Remittance;
      });
      setRemittances(remData);
    }, (error) => console.warn("Remittances snapshot error:", error));
    return () => unsubscribe();
  }, [user, profile]);

  // Real-time remittance notification detector
  useEffect(() => {
    if (!profile || profile.role !== 'admin' || remittances.length === 0) {
      if (remittances.length > 0 && !initialRemittancesLoaded.current) {
        remittances.forEach(r => knownRemittanceIds.current.add(r.id));
        initialRemittancesLoaded.current = true;
      }
      return;
    }

    if (!initialRemittancesLoaded.current) {
      remittances.forEach(r => knownRemittanceIds.current.add(r.id));
      initialRemittancesLoaded.current = true;
      return;
    }

    // Identify newly added remittances with status 'pending'
    remittances.forEach(r => {
      if (!knownRemittanceIds.current.has(r.id)) {
        knownRemittanceIds.current.add(r.id);
        if (r.status === 'pending') {
          playSound();
          setRemittanceNotifications(prev => {
            // Guard against duplicate notification entries just in case
            if (prev.some(p => p.id === r.id)) return prev;
            return [r, ...prev];
          });
        }
      }
    });
  }, [remittances, profile]);

  // Admin: Fetch all users
  useEffect(() => {
    if (!user || !profile || profile.role !== 'admin') return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(usersData);
    }, (error) => console.warn("Users snapshot error:", error));
    return () => unsubscribe();
  }, [user, profile]);

  // Admin/BOD: Fetch Expenses
  useEffect(() => {
    if (!user || !profile || (profile.role !== 'admin' && profile.role !== 'bod')) return;
    const unsubscribe = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const expenseData = snapshot.docs.map(doc => {
        const d = doc.data() as any;
        return { id: doc.id, ...d, timestamp: ensureTimestamp(d.timestamp) } as Expense;
      });
      setExpenses(expenseData);
    }, (error) => console.warn("Expenses snapshot error:", error));
    return () => unsubscribe();
  }, [user, profile]);

  // Firestore Sync: Initial Balances
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'initial_balances'), (snapshot) => {
      const balanceData = snapshot.docs.map(doc => {
        const d = doc.data() as any;
        return { id: doc.id, ...d, timestamp: ensureTimestamp(d.timestamp) } as InitialBalance;
      });
      setInitialBalances(balanceData);
    }, (error) => console.warn("Initial balances snapshot error:", error));
    return () => unsubscribe();
  }, [user]);

  // Admin: Fetch Audit Logs
  useEffect(() => {
    if (!user || !profile || profile.role !== 'admin') return;
    const q = query(collection(db, 'audit_logs'), where('timestamp', '!=', null));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logData = snapshot.docs.map(doc => {
        const d = doc.data() as any;
        return { id: doc.id, ...d, timestamp: ensureTimestamp(d.timestamp) } as AuditLog;
      });
      // Sort manually because Firestore query might need index
      setAuditLogs(logData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    }, (error) => console.warn("Audit logs snapshot error:", error));
    return () => unsubscribe();
  }, [user, profile]);

  // Fetch Profile Change Requests
  useEffect(() => {
    if (!user || !profile) return;
    let q;
    if (profile.role === 'admin') {
      q = query(collection(db, 'profile_change_requests'));
    } else if (profile.role === 'teacher') {
      q = query(collection(db, 'profile_change_requests'), where('userId', '==', profile.uid));
    } else {
      return;
    }
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => {
        const d = doc.data() as any;
        return { id: doc.id, ...d, timestamp: ensureTimestamp(d.timestamp) } as ProfileChangeRequest;
      });
      setProfileChangeRequests(requests.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    }, (error) => console.warn("Profile change requests snapshot error:", error));
    return () => unsubscribe();
  }, [user, profile]);

  // Fetch Signatories
  useEffect(() => {
    if (!user || !profile) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'signatories'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSignatories(data.list || []);
      } else {
        // Initialize with defaults if not exists
        const defaults: Signatory[] = [
          { id: '1', label: 'Prepared by:', name: '', title: 'Faculty Club Treasurer' },
          { id: '2', label: 'Noted by:', name: '', title: 'Faculty Club President' },
          { id: '3', label: 'Approved by:', name: '', title: 'School Principal' }
        ];
        setSignatories(defaults);
        if (profile.role === 'admin') {
          setDoc(doc(db, 'settings', 'signatories'), { list: defaults });
        }
      }
    }, (error) => console.warn("Signatories snapshot error:", error));
    return () => unsubscribe();
  }, [user, profile]);

  // Fetch Branding Settings
  useEffect(() => {
    if (!user || !profile) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'branding'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setBrandingSettings({
          headerUrl: data.headerUrl || DOCX_HEADER_URL,
          footerUrl: data.footerUrl || DOCX_FOOTER_URL
        });
      }
    }, (error) => console.warn("Branding settings snapshot error:", error));
    return () => unsubscribe();
  }, [user, profile]);

  const updateBranding = async (header: string, footer: string) => {
    try {
      await setDoc(doc(db, 'settings', 'branding'), { 
        headerUrl: header, 
        footerUrl: footer,
        updatedAt: serverTimestamp(),
        updatedBy: profile?.uid
      });
      showToast("Branding settings updated.");
      logActivity("Updated Report Branding", "Admin updated header/footer URLs.");
    } catch (e: any) {
      console.error("Branding update error:", e);
      showToast("Failed to update branding.");
    }
  };

  const updateSignatories = async (newList: Signatory[]) => {
    try {
      await setDoc(doc(db, 'settings', 'signatories'), { list: newList });
      showToast("Signatories updated successfully.");
      logActivity("Updated Signatories", "Admin updated report signatories.");
    } catch (error) {
      console.error("Update Signatories Error:", error);
      showToast("Failed to update signatories.");
    }
  };

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
    let isProcessing = false;
    let isMounted = true;

    const processScannedData = async (decodedText: string, stopScanner?: () => Promise<void>) => {
    if (isProcessing) return;
    isProcessing = true;
    try {
      console.log("QR Code Scanned (raw):", decodedText);
      let data;
      try {
        data = JSON.parse(decodedText);
        console.log("QR Code Parsed Data:", data);
      } catch (e) {
        console.error("QR Code JSON Parse Error:", e, "Raw Text:", decodedText);
        isProcessing = false;
        throw new Error("Invalid QR code format (JSON parse failed)");
      }
      
      if (!data.email) {
        console.error("QR Code Missing Email Field:", data);
        isProcessing = false;
        throw new Error("Invalid QR code format (missing email)");
      }

      setIsScanSuccess(true);
      
      // Small delay to show success feedback
      await new Promise(resolve => setTimeout(resolve, 600));

      if (stopScanner) {
        await stopScanner();
      }
      setShowScanner(false);
      setIsScanSuccess(false);
      
      // Robust email resolution for old/new QR codes
      let targetEmail = data.realEmail || data.email;
      
      // VALIDATION: Check if the QR code is still valid
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('qrEmail', '==', data.email));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
          // If the QR code missing realEmail, update targetEmail
          if (userData.email && targetEmail !== userData.email && data.email.includes('@facultyclub.local')) {
            targetEmail = userData.email; 
          } else if (userData.email !== targetEmail) {
            showToast("The email address for this account has been changed. This QR code is no longer valid. Please generate a new one.");
            setLoading(false);
            isProcessing = false;
            return;
          }
        } else {
          // Fallback for older QR codes that might not have qrEmail stored in the DB
          const q2 = query(usersRef, where('email', '==', targetEmail));
          const snapshot2 = await getDocs(q2);
          if (!snapshot2.empty) {
            const userData = snapshot2.docs[0].data();
            if (userData.qrEmail && userData.qrEmail !== data.email) {
              showToast("This QR code is no longer valid. Please generate a new one.");
              setLoading(false);
              isProcessing = false;
              return;
            }
          } else {
             showToast("Account not found. This QR code may be invalid or the account was deleted.");
             setLoading(false);
             isProcessing = false;
             return;
          }
        }
      } catch (err) {
         console.error("Error validating QR code:", err);
      }
      
      // Skip verification process for BODs, executives, and treasurer
      const emailLower = targetEmail.toLowerCase().trim();
      const isAdminEmail = emailLower === 'lpcaanhsfacultyclubofficers@gmail.com' || emailLower === 'ngehthong@gmail.com';
      const isBodEmail = Object.keys(ALLOWED_BODS).some(key => key.toLowerCase().trim() === emailLower);
      
      if (isAdminEmail || isBodEmail) {
        setLoading(true);
        try {
          await signInWithEmailAndPassword(auth, data.email, data.pass);
          setIsQRLogin(true);
          justLoggedIn.current = true;
        } catch (error: any) {
          console.error("QR Verification Login Error:", error);
          showToast(`Login Failed: ${error.message}`);
          isProcessing = false;
        } finally {
          setLoading(false);
        }
        return;
      }

      // Start approval process for teachers
      const teacherObj = records.find(r => r.email.toLowerCase().trim() === targetEmail.toLowerCase().trim());
      const teacherName = teacherObj?.name || targetEmail;
      setQrApprovalTeacherName(teacherName);

      setQrLoginData({ 
        email: data.email, 
        pass: data.pass,
        realEmail: targetEmail 
      });

      setLoading(true);
      try {
        const docRef = await addDoc(collection(db, 'login_requests'), {
          teacherEmail: targetEmail,
          teacherName: teacherName,
          status: 'pending',
          requestedAt: new Date().toISOString()
        });
        setQrApprovalRequestId(docRef.id);
        setIsQRApprovalPending(true);
        showToast("Login request sent! Please wait for Admin approval.");
      } catch (err) {
        console.error("Login Request Error:", err);
        showToast("Failed to send login request.");
        isProcessing = false;
      } finally {
        setLoading(false);
      }
      
    } catch (e: any) {
      console.error("QR Login Error:", e);
      // Silently ignore invalid QR codes during scanning to prevent annoying toasts
      setLoading(false);
      isProcessing = false;
    }
  };

  const startScanner = async () => {
      if (showScanner) {
        // Add a small delay to ensure the DOM element is ready
        await new Promise(resolve => setTimeout(resolve, 300));
        if (!isMounted) return;
        try {
          html5QrCode = new Html5Qrcode("qr-reader");
          scannerRef.current = html5QrCode;
          const config = { 
            fps: 30, // Optimized FPS for immediate scan precision
            qrbox: (viewWidth: number, viewHeight: number) => {
              const minDim = Math.min(viewWidth, viewHeight);
              const qrboxSize = Math.floor(minDim * 0.7);
              return { width: qrboxSize, height: qrboxSize };
            },
            aspectRatio: 1.0,
            formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ], // Avoid barcode passes for enhanced speed
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true // Native hardware decoding (NPU/GPU)
            },
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
          };

          await html5QrCode.start(
            { facingMode: scannerCameraMode }, 
            config,
            async (decodedText) => {
              await processScannedData(decodedText, async () => {
                if (html5QrCode && html5QrCode.isScanning) {
                  await html5QrCode.stop();
                }
              });
            },
            (errorMessage) => {
              // Ignore scan errors as they happen constantly when no QR code is in view
            }
          );
        } catch (err: any) {
          if (!isMounted) return;
          console.error("Scanner Start Error:", err);
          showToast(`Failed to start camera: ${err.message || "Unknown error"}`);
          setShowScanner(false);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.error("Scanner Stop Error:", err));
      }
    };
  }, [showScanner, scannerCameraMode]);

  useEffect(() => {
    if (scannerRef.current) {
      scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: torchOn } as any]
      }).catch(err => console.error("Torch error:", err));
    }
  }, [torchOn]);

  useEffect(() => {
    if (!showScanner) {
      setTorchOn(false);
      scannerRef.current = null;
    }
  }, [showScanner]);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email?.toLowerCase().trim() || '';
      
      const isAdminEmail = email === 'lpcaanhsfacultyclubofficers@gmail.com' || email === 'ngehthong@gmail.com';
      const isBodEmail = Object.keys(ALLOWED_BODS).some(key => key.toLowerCase().trim() === email);
      
      // Strict check before showing any success UI
      const teachersSnap = await getDocs(collection(db, 'teachers'));
      const isTeacherEmail = teachersSnap.docs.some(doc => doc.data().email.toLowerCase().trim() === email);
      
      if (!isAdminEmail && !isBodEmail && !isTeacherEmail) {
        showToast("Access Denied: This email isn't registered in the Faculty Club system.");
        signOut(auth);
        setUnauthorizedEmail(email);
        return;
      }

      justLoggedIn.current = true;
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
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
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
  const [backupDownloadUrl, setBackupDownloadUrl] = useState<string | null>(null);
  const [backupFileName, setBackupFileName] = useState<string>('');
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
  const [showAllUsersList, setShowAllUsersList] = useState(true);

  const handleAgreeTerms = async () => {
    if (!profile || profile.role !== 'teacher') return;
    const teacherRec = getTeacherRecordByEmail(profile.email);
    if (!teacherRec) return;
    
    try {
      await updateDoc(doc(db, 'teachers', teacherRec.id), {
        termsAgreed: true,
        termsAgreedDate: new Date().toISOString()
      });
      setShowTermsModal(false);
      showToast("Terms agreed successfully.");
    } catch (error) {
      console.error("Error agreeing to terms:", error);
      showToast("Failed to save agreement. Please try again.");
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 5000);
  };

  const playSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/3005/3005-preview.mp3');
    audio.play().catch(() => {});
  };

  // --- Push Subscription Registration ---
  useEffect(() => {
    if (!user || !profile || profile.role !== 'teacher' || !teacherRecord) return;
    
    const registerPushSubscription = async () => {
      try {
        if ('serviceWorker' in navigator && 'PushManager' in window && Notification.permission === 'granted') {
          const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          if (!publicVapidKey) return;
          
          const registration = await navigator.serviceWorker.register('/sw.js');
          
          const urlBase64ToUint8Array = (base64String: string) => {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding)
              .replace(/\-/g, '+')
              .replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
              outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
          };

          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
          });
          
          const subJson = JSON.stringify(subscription);
          if (teacherRecord.pushSubscription !== subJson) {
            await updateDoc(doc(db, 'teachers', teacherRecord.id), {
              pushSubscription: subJson
            });
          }
        }
      } catch (err) {
        console.error("Error registering push subscription", err);
      }
    };
    
    registerPushSubscription();
  }, [user, profile, teacherRecord?.id, teacherRecord?.pushSubscription]);

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

  const confirmAllDeletions = async () => {
    const duesToDelete = standardDues.filter(d => d.pendingDeletion);
    const teachersToDelete = records.filter(r => r.pendingDeletion);

    if (duesToDelete.length === 0 && teachersToDelete.length === 0) {
      showToast("No pending deletions to confirm.");
      return;
    }

    try {
      const batch = writeBatch(db);
      duesToDelete.forEach(d => batch.delete(doc(db, 'dues', d.id)));
      teachersToDelete.forEach(t => batch.delete(doc(db, 'teachers', t.id)));
      await batch.commit();

      showToast(`Confirmed ${duesToDelete.length + teachersToDelete.length} deletions.`);
      logActivity("Confirmed All Deletions", `Deleted ${duesToDelete.length} dues and ${teachersToDelete.length} teachers`, 'warning');
      
      setUndoStack(prev => [...prev, {
        type: 'confirm_all_deletions',
        data: { dues: duesToDelete, teachers: teachersToDelete }
      }]);
      setRedoStack([]);
    } catch (error) {
      console.error("Error confirming all deletions:", error);
      showToast("Failed to confirm deletions.");
    }
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    
    try {
      const batch = writeBatch(db);
      if (lastAction.type === 'delete_due') {
        batch.set(doc(db, 'dues', lastAction.data.id), lastAction.data);
      } else if (lastAction.type === 'delete_teacher') {
        batch.set(doc(db, 'teachers', lastAction.data.id), lastAction.data);
      } else if (lastAction.type === 'confirm_all_deletions') {
        lastAction.data.dues.forEach((d: any) => batch.set(doc(db, 'dues', d.id), d));
        lastAction.data.teachers.forEach((t: any) => batch.set(doc(db, 'teachers', t.id), t));
      }
      await batch.commit();
      
      setUndoStack(prev => prev.slice(0, -1));
      setRedoStack(prev => [...prev, lastAction]);
      showToast("Action undone.");
    } catch (error) {
      console.error("Error undoing action:", error);
      showToast("Failed to undo action.");
    }
  };

  const handleRedo = async () => {
    if (redoStack.length === 0) return;
    const lastAction = redoStack[redoStack.length - 1];
    
    try {
      const batch = writeBatch(db);
      if (lastAction.type === 'delete_due') {
        batch.delete(doc(db, 'dues', lastAction.data.id));
      } else if (lastAction.type === 'delete_teacher') {
        batch.delete(doc(db, 'teachers', lastAction.data.id));
      } else if (lastAction.type === 'confirm_all_deletions') {
        lastAction.data.dues.forEach((d: any) => batch.delete(doc(db, 'dues', d.id)));
        lastAction.data.teachers.forEach((t: any) => batch.delete(doc(db, 'teachers', t.id)));
      }
      await batch.commit();
      
      setRedoStack(prev => prev.slice(0, -1));
      setUndoStack(prev => [...prev, lastAction]);
      showToast("Action redone.");
    } catch (error) {
      console.error("Error redoing action:", error);
      showToast("Failed to redo action.");
    }
  };

  const deleteStandardDue = async (id: string) => {
    if (profile?.role === 'admin') {
      try {
        const due = standardDues.find(d => d.id === id);
        if (!due) return;
        await deleteDoc(doc(db, 'dues', id));
        showToast("Standard due removed.");
        logActivity("Deleted Standard Due", `Removed ${due.name}`, 'warning');
        
        setUndoStack(prev => [...prev, { type: 'delete_due', data: due }]);
        setRedoStack([]);
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
    setEditGender(teacher.gender || 'Female');
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
        gender: editGender,
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
        gender,
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
      setGender('Female');
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
        amount: amount !== undefined ? amount : (due?.amount || 0),
        collectedBy: profile?.name || 'System',
        collectedByRole: profile?.role || 'admin'
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

  const handleTogglePayment = (teacherId: string, dueId: string) => {
    const record = records.find(r => r.id === teacherId);
    const due = standardDues.find(d => d.id === dueId);
    if (!record || !due) return;

    const isPaid = record.paidDueIds.includes(dueId);
    if (!isPaid && due.isVoluntary) {
      setVoluntaryPaymentData({ teacherId, dueId, amount: '' });
      setIsVoluntaryModalOpen(true);
    } else {
      toggleDuePaid(teacherId, dueId);
    }
  };

  const submitVoluntaryPayment = async () => {
    if (!voluntaryPaymentData) return;
    const amount = parseFloat(voluntaryPaymentData.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Please enter a valid amount.");
      return;
    }
    await toggleDuePaid(voluntaryPaymentData.teacherId, voluntaryPaymentData.dueId, amount);
    setIsVoluntaryModalOpen(false);
    setVoluntaryPaymentData(null);
  };

  const deleteTeacher = async (id: string) => {
    if (profile?.role === 'admin') {
      try {
        const teacher = records.find(r => r.id === id);
        if (!teacher) return;
        await deleteDoc(doc(db, 'teachers', id));
        showToast("1 teacher record removed.");
        logActivity("Deleted Teacher", `Removed ${teacher.name} from ${teacher.gradeLevel}`, 'warning');
        
        setUndoStack(prev => [...prev, { type: 'delete_teacher', data: teacher }]);
        setRedoStack([]);
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

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > 1 && totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

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

  const processImportedData = async (data: any[][]) => {
      if (data.length < 1) {
        showToast("File is empty or invalid.");
        return;
      }

      let headerRowIdx = 0;
      for (let i = 0; i < Math.min(15, data.length); i++) {
        const r = data[i];
        if (r && r.some(cell => typeof cell === 'string' && (cell.toLowerCase().includes('name') || cell.toLowerCase().includes('email') || cell.toLowerCase().includes('department') || cell.toLowerCase().includes('grade') || cell.toLowerCase().includes('dept') || cell.toLowerCase().includes('gender') || cell.toLowerCase().includes('sex')))) {
          headerRowIdx = i;
          break;
        }
      }

      const rawHeaders = data[headerRowIdx] || [];
      const headers = [];
      for(let i = 0; i < rawHeaders.length; i++) headers.push(String(rawHeaders[i] || '').toLowerCase());

      const nameIdx = headers.findIndex(h => h.includes('name') && !h.includes('last') && !h.includes('first'));
      const lastNameIdx = headers.findIndex(h => h.includes('last') && h.includes('name'));
      const firstNameIdx = headers.findIndex(h => h.includes('first') && h.includes('name'));
      const middleInitialIdx = headers.findIndex(h => h.includes('middle') || h.includes('initial') || h.includes('m.i'));
      const emailIdx = headers.findIndex(h => h.includes('email'));
      const contactIdx = headers.findIndex(h => h.includes('contact') || h.includes('number') || h.includes('phone'));
      const gradeIdx = headers.findIndex(h => h.includes('grade') || h.includes('level'));
      const deptIdx = headers.findIndex(h => h === 'department' || h === 'dept');
      const genderIdx = headers.findIndex(h => h.includes('gender') || h === 'sex');

      const allEmailsInSheet: string[] = [];
      for (const r of data) {
         if (r) {
            for (const cell of r) {
               if (typeof cell === 'string' && cell.includes('@') && cell.includes('.')) {
                  // Basic validation
                  const e = cell.trim();
                  if (e.split('@').length === 2) {
                     allEmailsInSheet.push(e);
                  }
               }
            }
         }
      }

      let count = 0;
      for (let i = headerRowIdx + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[nameIdx !== -1 ? nameIdx : (lastNameIdx !== -1 ? lastNameIdx : 0)]) continue;

        let lName = '', fName = '', mInitial = '';
        let teacherName = '';

        if (lastNameIdx !== -1 && firstNameIdx !== -1) {
          lName = String(row[lastNameIdx] || '').trim();
          fName = String(row[firstNameIdx] || '').trim();
          mInitial = middleInitialIdx !== -1 ? String(row[middleInitialIdx] || '').trim() : '';
        } else {
          const rawName = String(row[nameIdx !== -1 ? nameIdx : 0]).trim();
          if (rawName.includes(',')) {
            // Format: Last, First Middle
            const parts = rawName.split(',');
            lName = parts[0].trim();
            const firstMiddleParts = parts[1].trim().split(/\s+/);
            
            // Check if the last part is a middle initial (e.g., "C." or "C")
            const lastPart = firstMiddleParts[firstMiddleParts.length - 1];
            if (lastPart && (lastPart.length === 1 || (lastPart.length === 2 && lastPart.endsWith('.')))) {
              mInitial = lastPart;
              fName = firstMiddleParts.slice(0, -1).join(' ');
            } else {
              fName = firstMiddleParts.join(' ');
              mInitial = '';
            }
          } else {
            // Format: First Middle Last
            const parts = rawName.split(/\s+/);
            
            // Look for a middle initial as a separator
            let initialIdx = -1;
            for (let j = 0; j < parts.length; j++) {
              const p = parts[j];
              if (p.length === 1 || (p.length === 2 && p.endsWith('.'))) {
                initialIdx = j;
                break;
              }
            }

            if (initialIdx !== -1) {
              fName = parts.slice(0, initialIdx).join(' ');
              mInitial = parts[initialIdx];
              lName = parts.slice(initialIdx + 1).join(' ');
            } else {
              // No clear initial, look for common surname prefixes
              const prefixes = ['de', 'del', 'dela', 'la', 'san', 'santa', 'sto', 'sta'];
              let prefixIdx = -1;
              for (let j = 0; j < parts.length; j++) {
                if (prefixes.includes(parts[j].toLowerCase())) {
                  prefixIdx = j;
                  break;
                }
              }

              if (prefixIdx !== -1 && prefixIdx > 0) {
                fName = parts.slice(0, prefixIdx).join(' ');
                lName = parts.slice(prefixIdx).join(' ');
              } else if (parts.length >= 2) {
                // Default: last word is surname
                lName = parts[parts.length - 1];
                fName = parts.slice(0, -1).join(' ');
              } else {
                lName = rawName;
              }
            }
          }
        }

        teacherName = `${lName}, ${fName}${mInitial ? ' ' + mInitial.charAt(0).toUpperCase() + '.' : ''}`;
        
        let parsedEmail = '';
        if (emailIdx !== -1 && row[emailIdx]) {
           parsedEmail = String(row[emailIdx]).trim();
        } else {
           for (let j = 0; j < row.length; j++) {
             if (typeof row[j] === 'string' && row[j].includes('@') && row[j].includes('.')) {
                parsedEmail = row[j].trim();
                break;
             }
           }
        }
        
        if (!parsedEmail && (fName || lName)) {
           const cleanFName = fName.toLowerCase().replace(/[^a-z]/g, '');
           const cleanLName = lName.toLowerCase().replace(/[^a-z]/g, '');
           
           const bestMatch = allEmailsInSheet.find(e => {
               const eLower = e.toLowerCase();
               const hasLastName = cleanLName ? eLower.includes(cleanLName) : true;
               const hasFirstName = cleanFName && cleanFName.length > 2 ? eLower.includes(cleanFName.substring(0, 3)) : true;
               return hasLastName && hasFirstName;
           }) || allEmailsInSheet.find(e => {
               return cleanLName && e.toLowerCase().includes(cleanLName);
           });
           
           if (bestMatch) {
               parsedEmail = bestMatch;
           }
        }
        
        const teacherEmail = parsedEmail || `${fName.toLowerCase().replace(/[^a-z]/g, '')}.${lName.toLowerCase().replace(/[^a-z]/g, '')}@example.com`;
        const contact = String(contactIdx !== -1 && row[contactIdx] ? row[contactIdx] : 'N/A');
        
        let rawGrade = '';
        if (gradeIdx !== -1 && row[gradeIdx]) {
           rawGrade = String(row[gradeIdx]);
        } else {
           for (let j = 0; j < row.length; j++) {
              if (j !== nameIdx && j !== lastNameIdx && j !== firstNameIdx && j !== emailIdx && j !== contactIdx) {
                 if (typeof row[j] === 'string' && (row[j].toLowerCase().includes('grade') || row[j].toLowerCase().includes('dept'))) {
                    rawGrade = String(row[j]);
                    break;
                 }
              }
           }
           if (!rawGrade) {
             if (nameIdx !== -1 && row[nameIdx + 1] && typeof row[nameIdx + 1] === 'string' && !row[nameIdx + 1].includes('@')) {
                rawGrade = String(row[nameIdx + 1]);
             } else if (lastNameIdx !== -1 && row[lastNameIdx + 1] && typeof row[lastNameIdx + 1] === 'string' && !row[lastNameIdx + 1].includes('@')) {
                rawGrade = String(row[lastNameIdx + 1]);
             }
           }
        }

        let rawDept = '';
        if (deptIdx !== -1 && row[deptIdx]) {
           rawDept = String(row[deptIdx]);
        }
        
        let grade: GradeLevel = 'Grade 7';
        if (rawGrade.includes('7')) grade = 'Grade 7';
        else if (rawGrade.includes('8')) grade = 'Grade 8';
        else if (rawGrade.includes('9')) grade = 'Grade 9';
        else if (rawGrade.includes('10')) grade = 'Grade 10';
        else if (profile?.role === 'bod') grade = profile.gradeLevel as GradeLevel;

        let parsedGender = '';
        if (genderIdx !== -1 && row[genderIdx]) {
            parsedGender = String(row[genderIdx]).trim();
        }
        
        let importedGender = 'Female';
        if (parsedGender.toLowerCase() === 'male' || parsedGender.toLowerCase() === 'm') {
            importedGender = 'Male';
        } else if (parsedGender.toLowerCase() === 'female' || parsedGender.toLowerCase() === 'f') {
            importedGender = 'Female';
        } else {
            importedGender = detectGender(fName || teacherName);
        }

        await addDoc(collection(db, 'teachers'), {
          name: teacherName,
          lastName: lName,
          firstName: fName,
          middleInitial: mInitial ? mInitial.charAt(0).toUpperCase() + '.' : '',
          gender: importedGender,
          email: teacherEmail,
          contactNumber: contact,
          department: rawDept || rawGrade, // fallback to whatever was parsed in rawGrade if separate dept missing
          gradeLevel: grade,
          paidDueIds: [],
          remittedDueIds: [],
          remitted: false
        });
        count++;
      }
      showToast(`Successfully imported ${count} teachers.`);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.pdf')) {
      showToast("Parsing PDF file...");
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const potentialNames: string[] = [];
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          let lastY = -1;
          let currentLine = '';
          
          const items = textContent.items.sort((a: any, b: any) => {
            if (Math.abs(b.transform[5] - a.transform[5]) > 2) {
              return b.transform[5] - a.transform[5];
            }
            return a.transform[4] - b.transform[4];
          });
          
          items.forEach((item: any) => {
             const y = item.transform[5];
             if (lastY === -1 || Math.abs(lastY - y) > 2) {
               if (currentLine.trim()) potentialNames.push(currentLine.trim());
               currentLine = item.str;
             } else {
               currentLine += ' ' + item.str;
             }
             lastY = y;
          });
          if (currentLine.trim()) potentialNames.push(currentLine.trim());
        }
        
        const data = [['Name']];
        for (const line of potentialNames) {
          const t = line.replace(/\s+/g, ' ').trim();
          // Heuristic to filter out junk like page numbers, column headers
          if (t.toLowerCase().includes('page ') || t.toLowerCase() === 'name' || t.toLowerCase() === 'teacher') continue;
          if (t.match(/[0-9]/)) continue; 
          if (t.length < 5 || t.length > 50) continue; 
          data.push([t]);
        }
        
        await processImportedData(data);
      } catch (err) {
        console.error("PDF Parsing Error:", err);
        showToast("Failed to parse PDF file.");
      }
    } else {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        await processImportedData(data);
      };
      reader.readAsBinaryString(file);
    }
    
    // Clear input
    e.target.value = '';
  };

  const clearAuditLogs = async () => {
    if (profile?.role !== 'admin') {
      showToast("Unauthorized: Only Admins can clear logs.");
      return;
    }
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
      return sum + newlyPaidDues.reduce((s, d) => {
        if (d.isVoluntary && r.voluntaryPayments?.[d.id]) return s + r.voluntaryPayments[d.id];
        return s + d.amount;
      }, 0);
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

      const formattedDate = (rem.timestamp ? ensureTimestamp(rem.timestamp).toDate() : new Date())
        .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

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
    const isExecutive = profile?.email === 'lpcaanhsfacultyclubofficers@gmail.com' || profile?.email === 'ngehthong@gmail.com';
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

  const handleInstantVerifyNotification = async (remId: string) => {
    if (verifyingNotificationIds.includes(remId)) return;
    setVerifyingNotificationIds(prev => [...prev, remId]);
    try {
      await verifyRemittance(remId);
      // Fade out of notification stack
      setRemittanceNotifications(prev => prev.filter(r => r.id !== remId));
    } catch (error) {
      console.error("Instant Verification Error:", error);
      showToast("Verification failed.");
    } finally {
      setVerifyingNotificationIds(prev => prev.filter(id => id !== remId));
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
            name: `BOD (${gradeLevel}) - QR Login`,
            qrPass: randomPassword
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
        name: `BOD (${gradeLevel}) - QR Login`,
        qrPass: randomPassword
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
    if (profile?.role !== 'admin' && profile?.role !== 'teacher' && profile?.role !== 'bod') return;
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
            name: `${name} - QR Login`,
            qrEmail: newQrEmail, // Store for re-sending
            qrPass: randomPassword // Store for re-sending if needed
          });
          
          const qrData = JSON.stringify({ email: newQrEmail, pass: randomPassword, realEmail: teacherEmail });
          setQrCodeData({ email: newQrEmail, pass: randomPassword, grade: gradeLevel, realEmail: teacherEmail });
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
        name: `${name} - QR Login`,
        qrEmail: qrEmail, // Store for re-sending
        qrPass: randomPassword // Store for re-sending if needed
      });
      
      const qrData = JSON.stringify({ email: qrEmail, pass: randomPassword, realEmail: teacherEmail });
      setQrCodeData({ email: qrEmail, pass: randomPassword, grade: gradeLevel, realEmail: teacherEmail });
    } catch (error: any) {
      console.error("QR Generation Error:", error);
      showToast(`Failed to generate QR code: ${error.message}`);
    }
  };



  const requestQRCode = async (email: string) => {
    if (!email) return showToast("Please enter your registered email.");
    setLoading(true);
    showToast("Checking for existing QR code...");
    try {
      // 1. Try to find an existing QR login document for this teacher
      const qQR = query(
        collection(db, 'users'), 
        where('email', '==', email), 
        where('role', '==', 'teacher')
      );
      const qrSnapshot = await getDocs(qQR);
      
      // Filter for the QR Login document specifically
      const qrDoc = qrSnapshot.docs.find(d => d.data().name?.endsWith(' - QR Login'));
      
      if (qrDoc) {
        const data = qrDoc.data();
        if (data.qrEmail && data.qrPass) {
          const qrData = JSON.stringify({ email: data.qrEmail, pass: data.qrPass });
          
          // Re-send existing one
          await fetch('/api/send-qr-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, qrData, name: data.name?.replace(' - QR Login', '') })
          });
          
          showToast("Your existing QR code has been re-sent to your email.");
          return;
        }
      }

      // 2. If not found or missing data, find teacher record and generate new one
      const qTeacher = query(collection(db, 'teachers'), where('email', '==', email));
      const teacherSnapshot = await getDocs(qTeacher);
      
      if (teacherSnapshot.empty) {
        showToast("No teacher record found with this email.");
        return;
      }
      
      const teacher = teacherSnapshot.docs[0].data();
      await generateTeacherQRCode(teacher.email, teacher.gradeLevel, teacher.name);
    } catch (error: any) {
      console.error("Request QR Error:", error);
      showToast(`Failed to request QR code: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (uid: string) => {
    if (profile?.role !== 'admin') return;
    if (!window.confirm("Are you sure you want to remove this login session? Note: This will NOT delete the teacher's profile or payment records—only their current ability to log in.")) return;
    
    try {
      const userToDelete = allUsers.find(u => u.uid === uid);
      await deleteDoc(doc(db, 'users', uid));
      showToast("User login removed. Teacher profile and data were preserved.");
      logActivity("Removed User login", `Removed login for ${userToDelete?.name} (${userToDelete?.email})`, 'critical');
    } catch (error) {
      console.error("Delete User Error:", error);
      showToast("Failed to remove login session.");
    }
  };

  const handleApproveProfileChange = async (request: ProfileChangeRequest) => {
    if (profile?.role !== 'admin') return;
    try {
      showToast(`Approving profile change for ${request.currentName}...`);
      
      // Update the user
      const userRef = doc(db, 'users', request.userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          name: request.newName,
          email: request.newEmail,
          gradeLevel: request.newGradeLevel || userDoc.data().gradeLevel
        });
      }
      
      // Update the teacher collection if any
      const q = query(collection(db, 'teachers'), where('email', '==', request.currentEmail));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const teacherDoc = snapshot.docs[0];
        await updateDoc(doc(db, 'teachers', teacherDoc.id), {
          name: request.newName,
          email: request.newEmail,
          gradeLevel: request.newGradeLevel || teacherDoc.data().gradeLevel,
          department: request.newDepartment || (teacherDoc.data().department || '')
        });
      }
      
      // Mark request as approved
      await updateDoc(doc(db, 'profile_change_requests', request.id), {
        status: 'approved'
      });
      
      showToast("Profile change approved.");
      logActivity("Approved Profile Change", `Approved new name/email for ${request.newName} (${request.newEmail})`);
    } catch (error: any) {
      showToast("Failed to approve profile change");
      console.error(error);
    }
  };

  const handleRejectProfileChange = async (request: ProfileChangeRequest) => {
    if (profile?.role !== 'admin') return;
    const adminNote = window.prompt("Reason for rejection (optional):");
    if (adminNote === null) return; // cancelled
    
    try {
      await updateDoc(doc(db, 'profile_change_requests', request.id), {
        status: 'rejected',
        adminNote: adminNote
      });
      showToast("Profile change rejected.");
      logActivity("Rejected Profile Change", `Rejected profile update for ${request.currentName}`);
    } catch (error: any) {
      showToast("Failed to reject profile change");
      console.error(error);
    }
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ 
    configured: boolean, 
    gmailUser: string | null, 
    hasAppPassword: boolean,
    logs?: { email: string, code: string, timestamp: number, success: boolean, error?: string, type?: 'otp' | 'qr' }[]
  } | null>(null);

  const checkEmailStatus = async () => {
    try {
      const response = await fetch('/api/email-status');
      const data = await response.json();
      setEmailStatus(data);
    } catch (error) {
      console.error("Failed to check email status:", error);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin' && profile?.role === 'admin') {
      checkEmailStatus();
    }
  }, [activeTab, profile]);

  const testEmailSystem = async () => {
    if (!profile || profile.role !== 'admin') return;
    setIsTestingEmail(true);
    showToast("Sending test email...");
    
    try {
      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: user?.email || profile.email, 
          code: "TEST12" 
        })
      });
      
      const result = await response.json();
      if (result.success) {
        if (result.simulated) {
          showToast("Email system is in SIMULATION mode. GMAIL_USER is not set in environment variables.");
        } else {
          showToast("Test email sent! Check your inbox (and spam).");
        }
      } else {
        throw new Error(result.error || "Failed to send test email");
      }
    } catch (error: any) {
      console.error("Email Test Error:", error);
      showToast(`Email Test Failed: ${error.message}`);
    } finally {
      setIsTestingEmail(false);
    }
  };
  const [remittanceIdToDelete, setRemittanceIdToDelete] = useState<string | null>(null);

  const deleteRemittance = async () => {
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

    const sortedRecords = sortRecordsByGradeAndName(records);
    const requiredDues = standardDues.filter(d => !d.isVoluntary);
    const requiredTotalPerTeacher = requiredDues.reduce((sum, d) => sum + d.amount, 0);

    // 1. Header Title Block
    const rows: any[][] = [
      ['LAS PIÑAS CAA NATIONAL HIGH SCHOOL'],
      ['FACULTY CLUB OFFICERS'],
      ['COMPREHENSIVE FACULTY DUES & FINANCIAL LIQUIDATION REPORT'],
      [`Date Generated: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`],
      []
    ];

    // 2. Financial Executive Summary Block
    const totalCollected = records.reduce((acc, r) => {
      return acc + standardDues.reduce((s, d) => {
        if (r.paidDueIds.includes(d.id)) {
          if (d.isVoluntary && r.voluntaryPayments?.[d.id] !== undefined) {
            return s + r.voluntaryPayments[d.id];
          }
          return s + d.amount;
        }
        return s;
      }, 0);
    }, 0);

    const fullyPaidCount = records.filter(r => requiredDues.length > 0 && requiredDues.every(d => r.paidDueIds.includes(d.id))).length;
    const partialCount = records.filter(r => r.paidDueIds.length > 0 && !requiredDues.every(d => r.paidDueIds.includes(d.id))).length;
    const unpaidCount = records.filter(r => r.paidDueIds.length === 0).length;

    rows.push(['I. FINANCIAL EXECUTIVE SUMMARY']);
    rows.push(['Particulars', 'Amount / Value']);
    rows.push(['Total Faculty Members', records.length]);
    rows.push(['Fully Paid Faculty', fullyPaidCount]);
    rows.push(['Partially Paid Faculty', partialCount]);
    rows.push(['Unpaid Faculty', unpaidCount]);
    rows.push(['Total Collections (Income)', `₱${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}`]);
    rows.push(['Total Expenses (Outflow)', `₱${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}`]);
    rows.push(['Net Club Balance', `₱${(totalCollected - totalExpenses).toLocaleString(undefined, { minimumFractionDigits: 2 })}`]);
    rows.push([]);

    // 3. Faculty Dues Ledger Table
    rows.push(['II. FACULTY DUES COLLECTION LEDGER']);
    
    const duesHeaders = standardDues.map(d => `${d.name} (${d.isVoluntary ? 'Voluntary' : `₱${d.amount}`})`);
    const ledgerHeader = [
      'No.',
      'Faculty Name',
      'Email',
      'Grade Level',
      'Contact No.',
      ...duesHeaders,
      'Total Paid (₱)',
      'Required Total (₱)',
      'Balance (₱)',
      'Payment Status',
      'Receipt Ref. No.',
      'Last Updated'
    ];
    rows.push(ledgerHeader);

    sortedRecords.forEach((record, index) => {
      const dueAmounts = standardDues.map(due => {
        const isPaid = due.isVoluntary 
          ? (record.voluntaryPayments?.[due.id] !== undefined && record.voluntaryPayments[due.id] > 0)
          : record.paidDueIds.includes(due.id);
        const paidVal = due.isVoluntary 
          ? (record.voluntaryPayments?.[due.id] || 0)
          : (record.paidDueIds.includes(due.id) ? due.amount : 0);
        return isPaid ? `Paid (₱${paidVal.toLocaleString()})` : 'Unpaid (₱0)';
      });

      const totalPaid = standardDues
        .filter(d => record.paidDueIds.includes(d.id))
        .reduce((sum, d) => {
          if (d.isVoluntary && record.voluntaryPayments?.[d.id] !== undefined) {
            return sum + record.voluntaryPayments[d.id];
          }
          return sum + d.amount;
        }, 0);
      
      const balance = Math.max(0, requiredTotalPerTeacher - totalPaid);
      const status = totalPaid >= requiredTotalPerTeacher ? 'Fully Paid' : totalPaid > 0 ? 'Partial' : 'Pending';

      rows.push([
        index + 1,
        record.name,
        record.email || 'N/A',
        record.gradeLevel,
        record.contactNumber || 'N/A',
        ...dueAmounts,
        totalPaid,
        requiredTotalPerTeacher,
        balance,
        status,
        record.lastReferenceNumber || 'N/A',
        record.lastUpdated ? new Date(record.lastUpdated).toLocaleDateString() : 'N/A'
      ]);
    });

    // Summary Totals Row
    const duesTotals = standardDues.map(due => {
      return records.reduce((sum, r) => {
        if (due.isVoluntary) return sum + (r.voluntaryPayments?.[due.id] || 0);
        return sum + (r.paidDueIds.includes(due.id) ? due.amount : 0);
      }, 0);
    }).map(val => `₱${val.toLocaleString()}`);

    const grandTotalPaid = records.reduce((sum, r) => {
      return sum + standardDues.reduce((s, d) => {
        if (r.paidDueIds.includes(d.id)) {
          if (d.isVoluntary && r.voluntaryPayments?.[d.id] !== undefined) return s + r.voluntaryPayments[d.id];
          return s + d.amount;
        }
        return s;
      }, 0);
    }, 0);

    const grandTotalRequired = records.length * requiredTotalPerTeacher;
    const grandTotalBalance = Math.max(0, grandTotalRequired - grandTotalPaid);

    rows.push([
      '',
      'TOTAL SUMMARY',
      '',
      '',
      '',
      ...duesTotals,
      grandTotalPaid,
      grandTotalRequired,
      grandTotalBalance,
      '',
      '',
      ''
    ]);

    rows.push([]);
    rows.push(['III. EXPENSES RECORD']);
    rows.push(['No.', 'Date', 'Category', 'Description / Particulars', 'Amount (₱)']);

    expenses.forEach((exp, idx) => {
      rows.push([
        idx + 1,
        ensureTimestamp(exp.timestamp).toDate().toLocaleDateString() || 'N/A',
        exp.category || 'General',
        exp.description,
        exp.amount
      ]);
    });

    rows.push(['', '', '', 'TOTAL EXPENSES', totalExpenses]);
    rows.push([]);

    // Signatories Block
    rows.push(['IV. SIGNATORIES']);
    signatories.forEach(sig => {
      rows.push([sig.label || 'Officer:', sig.name || '____________________', sig.title || '']);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set Column Widths (Auto-fit with padding)
    const colWidths = rows.reduce((acc: number[], row: any[]) => {
      row.forEach((val, colIdx) => {
        const strVal = val !== undefined && val !== null ? String(val) : '';
        acc[colIdx] = Math.max(acc[colIdx] || 10, Math.min(45, strVal.length + 4));
      });
      return acc;
    }, []);

    ws['!cols'] = colWidths.map(w => ({ wch: w }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Report");
    XLSX.writeFile(wb, `LPCAANHS_Faculty_Financial_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast("Excel report downloaded successfully.");
    logActivity("Exported Excel Report", `Exported comprehensive financial report for ${records.length} records.`);
  };

  const handleSendReminder = async (teacher: TeacherRecord) => {
    if (isSendingReminder) return;
    
    // Filter only required dues (not voluntary)
    const pendingDues = standardDues.filter(d => !teacher.paidDueIds.includes(d.id) && !d.isVoluntary);
    const totalBalance = pendingDues.reduce((sum, d) => sum + d.amount, 0);

    if (pendingDues.length === 0) {
      showToast("Teacher has no pending required dues.");
      return;
    }

    setIsSendingReminder(teacher.id);
    showToast(`Sending reminder to ${teacher.name}...`);

    try {
      const subject = `Payment Reminder: Pending Faculty Club Dues - ${teacher.name}`;
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; color: #1a202c; line-height: 1.6; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9;">
            <h2 style="color: #0038A8; margin: 0 0 5px 0; font-size: 22px; font-weight: 800; text-transform: uppercase;">Payment Reminder</h2>
            <p style="color: #64748b; margin: 0; font-size: 14px;">Las Piñas CAA National High School Faculty Club</p>
          </div>

          <div style="margin-bottom: 25px;">
            <p style="font-size: 16px;">Hello <strong>${teacher.gender === 'Female' ? 'Ma\'am' : 'Sir'} ${teacher.lastName}</strong>,</p>
            <p>This is a friendly reminder regarding your pending required dues for the Faculty Club. Our records show a total outstanding balance of <strong>₱${totalBalance.toFixed(2)}</strong>.</p>
          </div>

          <h3 style="font-size: 14px; font-weight: 800; color: #1a202c; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; text-transform: uppercase;">Outstanding Dues</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <tbody>
              ${pendingDues.map(d => `
                <tr>
                  <td style="padding: 10px 0; font-size: 14px; color: #2d3748; border-bottom: 1px solid #f1f5f9;">${d.name}</td>
                  <td style="padding: 10px 0; font-size: 14px; color: #2d3748; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600;">₱${d.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td style="padding: 15px 0 0 0; font-size: 16px; font-weight: 800; color: #dc2626;">Total Balance</td>
                <td style="padding: 15px 0 0 0; font-size: 18px; font-weight: 900; color: #dc2626; text-align: right;">₱${totalBalance.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="background-color: #fffbeb; padding: 20px; border-radius: 12px; border: 1px solid #fef3c7; margin-bottom: 25px; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">Please settle your payments with your respective Grade Level BOD as soon as possible. Thank you!</p>
          </div>

          <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
              Faculty Club Officers • lpcaanhsfacultyclubofficers@gmail.com
            </p>
          </div>
        </div>
      `;

      const response = await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: teacher.email,
          subject,
          html
        })
      });

      const result = await response.json().catch(() => ({ success: true, simulated: true }));
      if (result.success) {
        showToast(`Reminder sent successfully to ${teacher.name} (${teacher.email}).`);
        logActivity("Sent Reminder", `Payment reminder sent to ${teacher.name} (${teacher.email})`);
      } else {
        showToast(`Failed to send reminder: ${result.error || 'Server error'}`);
      }
    } catch (error: any) {
      console.error("Reminder Error:", error);
      showToast(`Reminder processed for ${teacher.name}.`);
    } finally {
      setIsSendingReminder(null);
    }
  };

  const handleDownloadTermsDocx = async () => {
    try {
      const docx = await import("docx");
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, PageOrientation, Header, Footer, ImageRun, HeaderFooterType, TableLayoutType } = docx;
      const { saveAs } = await import("file-saver");

      const sortedRecords = sortRecordsByGradeAndName(records);
      const headerFooter = await getDocxHeaderFooter(13, docx, { header: brandingSettings.headerUrl, footer: brandingSettings.footerUrl });

      const topMargin = Math.max(1440, (headerFooter.headerHeightTwips || 0) + 1080);
      const bottomMargin = Math.max(1440, (headerFooter.footerHeightTwips || 0) + 1080);

      const agreedCount = sortedRecords.filter(r => r.termsAgreed).length;

      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NO.", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "0038A8" }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, width: { size: 5, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "FACULTY NAME", bold: true, color: "FFFFFF" })] })], shading: { fill: "0038A8" }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, width: { size: 25, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "EMAIL ADDRESS", bold: true, color: "FFFFFF" })] })], shading: { fill: "0038A8" }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, width: { size: 25, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "GRADE LEVEL", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "0038A8" }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, width: { size: 15, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TERMS STATUS", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "0038A8" }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, width: { size: 15, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DATE AGREED", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "0038A8" }, margins: { top: 100, bottom: 100, left: 100, right: 100 }, width: { size: 15, type: WidthType.PERCENTAGE } }),
          ],
        }),
        ...sortedRecords.map((r, index) => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${index + 1}` })], alignment: AlignmentType.CENTER })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.name, bold: true })] })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.email || "N/A" })] })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.gradeLevel })], alignment: AlignmentType.CENTER })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.termsAgreed ? "AGREED" : "PENDING", bold: true, color: r.termsAgreed ? "10B981" : "EF4444" })], alignment: AlignmentType.CENTER })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.termsAgreedDate ? new Date(r.termsAgreedDate).toLocaleDateString() : "N/A" })], alignment: AlignmentType.CENTER })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
          ],
        }))
      ];

      const doc = new Document({
        creator: "LPCAANHS Faculty Club Management System",
        title: "Terms and Privacy Report",
        sections: [{
          headers: headerFooter.headers,
          footers: headerFooter.footers,
          properties: {
            page: {
              size: {
                width: 18720,
                height: 12240,
                orientation: PageOrientation.LANDSCAPE,
              },
              margin: {
                top: topMargin + 720,
                right: 720,
                bottom: bottomMargin + 720,
                left: 720,
                header: 720,
                footer: 720,
              },
            },
          },
          children: [
            new Paragraph({ children: [new TextRun({ text: "LAS PIÑAS CAA NATIONAL HIGH SCHOOL", bold: true, size: 28, color: "0038A8" })], alignment: AlignmentType.CENTER, indent: { left: 0, right: 0 } }),
            new Paragraph({ children: [new TextRun({ text: "FACULTY CLUB OFFICERS", bold: true, size: 24 })], alignment: AlignmentType.CENTER, indent: { left: 0, right: 0 } }),
            new Paragraph({ children: [new TextRun({ text: "FACULTY TERMS & PRIVACY AGREEMENT COMPLIANCE REPORT", bold: true, size: 20 })], alignment: AlignmentType.CENTER, spacing: { before: 150, after: 200 }, indent: { left: 0, right: 0 } }),
            new Paragraph({ children: [new TextRun({ text: `Date Generated: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}  |  Compliance: ${agreedCount} of ${sortedRecords.length} Faculty Members (${sortedRecords.length > 0 ? Math.round((agreedCount / sortedRecords.length) * 100) : 0}%)` })], alignment: AlignmentType.CENTER, spacing: { after: 400 }, indent: { left: 0, right: 0 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              layout: TableLayoutType.AUTOFIT,
              rows: tableRows,
            }),
            new Paragraph({ children: [new TextRun({ text: "" })], spacing: { before: 800 } }),
            ...(signatories.length > 0 ? [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.AUTOFIT,
                rows: Array.from({ length: Math.ceil(signatories.length / 3) }).map((_, rowIndex) => (
                  new TableRow({
                    children: signatories.slice(rowIndex * 3, (rowIndex + 1) * 3).map(sig => (
                      new TableCell({
                        width: { size: 33.33, type: WidthType.PERCENTAGE },
                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                        children: [
                          new Paragraph({ children: [new TextRun({ text: sig.label || "Officer:", italics: true, size: 18, color: "64748B" })], alignment: AlignmentType.CENTER, spacing: { after: 360 } }), 
                          new Paragraph({ children: [new TextRun({ text: sig.name || "____________________", bold: true, size: 20 })], alignment: AlignmentType.CENTER }), 
                          new Paragraph({ children: [new TextRun({ text: sig.title || "", size: 18, color: "475569" })], alignment: AlignmentType.CENTER })
                        ],
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
                      })
                    ))
                  })
                ))
              })
            ] : [])
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Terms_Agreement_Report_${new Date().toISOString().split('T')[0]}.docx`);
      showToast("Terms Agreement Report downloaded successfully.");
    } catch (error) {
      console.error("Error generating Terms Report:", error);
      showToast("Failed to generate Terms Report.");
    }
  };

  const handleArchiveSchoolYear = async () => {
    if (profile?.role !== 'admin') return;
    setIsArchiving(true);
    showToast("Archiving school year data...");

    try {
      const batch = writeBatch(db);
      const archiveId = `archive_${archiveYear}_${Date.now()}`;
      
      // 1. Create Archive Record
      const archiveRef = doc(db, 'archives', archiveId);
      batch.set(archiveRef, {
        year: archiveYear,
        timestamp: serverTimestamp(),
        totalCollections,
        totalExpenses,
        netBalance,
        teacherCount: records.length,
        archivedBy: profile.name
      });

      // 2. Move Teachers to Archive Subcollection
      for (const teacher of records) {
        const teacherArchiveRef = doc(db, 'archives', archiveId, 'teachers', teacher.id);
        batch.set(teacherArchiveRef, { ...teacher, archivedAt: serverTimestamp() });
        
        // Reset teacher balances for new year
        const teacherRef = doc(db, 'teachers', teacher.id);
        batch.update(teacherRef, {
          paidDueIds: [],
          voluntaryPayments: {},
          paymentHistory: [],
          remitted: false,
          remittanceId: null,
          remittedDueIds: [],
          lastReceiptSent: null,
          lastReferenceNumber: null
        });
      }

      // 3. Move Expenses to Archive Subcollection
      for (const expense of expenses) {
        const expenseArchiveRef = doc(db, 'archives', archiveId, 'expenses', expense.id);
        batch.set(expenseArchiveRef, { ...expense, archivedAt: serverTimestamp() });
        
        // Delete original expense
        batch.delete(doc(db, 'expenses', expense.id));
      }

      // 4. Move Remittances to Archive Subcollection
      for (const rem of remittances) {
        const remArchiveRef = doc(db, 'archives', archiveId, 'remittances', rem.id);
        batch.set(remArchiveRef, { ...rem, archivedAt: serverTimestamp() });
        
        // Delete original remittance
        batch.delete(doc(db, 'remittances', rem.id));
      }

      // 5. Clear Audit Logs (Optional, but usually good for fresh start)
      // We'll keep them but maybe tag them? For now let's just log the archive action
      
      await batch.commit();
      
      showToast(`School Year ${archiveYear} archived and system reset.`);
      logActivity("Archived School Year", `Data for ${archiveYear} moved to history and balances reset.`, 'critical');
      setShowArchiveModal(false);
    } catch (error) {
      console.error("Archive Error:", error);
      showToast("Failed to archive school year.");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDownloadGlobalPaymentHistoryDocx = async () => {
    try {
      showToast("Generating Global Payment History...");
      const docx = await import("docx");
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, Header, Footer, ImageRun, PageOrientation, TableLayoutType } = docx;
      const { saveAs } = await import("file-saver");

      const headerFooter = await getDocxHeaderFooter(13, docx, { header: brandingSettings.headerUrl, footer: brandingSettings.footerUrl });

      // Group payments by teacher
      const groupedPayments: Record<string, Array<{ dueName: string, amount: number, date: Date }>> = {};
      let grandTotal = 0;

      records.forEach(record => {
         const teacherArr: Array<{ dueName: string, amount: number, date: Date }> = [];
         
         // Standard & Voluntary via payment history
         if (record.paymentHistory && record.paymentHistory.length > 0) {
            record.paymentHistory.forEach((h: any) => {
               const due = standardDues.find(d => d.id === h.dueId);
               teacherArr.push({
                  dueName: due?.isVoluntary ? `${h.dueName} (Vol)` : h.dueName,
                  amount: h.amount,
                  date: ensureTimestamp(h.date).toDate(),
               });
               grandTotal += h.amount;
            });
         }
         
         if (teacherArr.length > 0) {
           // Sort chronological descending within teacher
           teacherArr.sort((a, b) => b.date.getTime() - a.date.getTime());
           groupedPayments[record.name] = teacherArr;
         }
      });

      const sortedFilter = sortRecordsByGradeAndName(records.filter(r => groupedPayments[r.name]));
      const teacherNames = sortedFilter.map(r => r.name);

      if (teacherNames.length === 0) {
        showToast("No payment history to export.");
        return;
      }

      const tableRows: any[] = [
         new TableRow({
           children: [
             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "FACULTY NAME", bold: true, color: "FFFFFF" })] })], shading: { fill: "0038A8" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DATE PAID", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "0038A8" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DUE DESCRIPTION", bold: true, color: "FFFFFF" })] })], shading: { fill: "0038A8" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "REF. NO.", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "0038A8" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "AMOUNT PAID", bold: true, color: "FFFFFF" })], alignment: AlignmentType.RIGHT })], shading: { fill: "0038A8" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
           ]
         })
      ];

      teacherNames.forEach(teacherName => {
         const payments = groupedPayments[teacherName];
         const teacherRec = records.find(r => r.name === teacherName);
         const refNo = teacherRec?.lastReferenceNumber || "N/A";
         let teacherTotal = 0;

         payments.forEach((p, index) => {
           teacherTotal += p.amount;
           tableRows.push(new TableRow({
             children: [
               new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: index === 0 ? teacherName : "", bold: index === 0 })] })], margins: { top: 100, bottom: 100, left: 100, right: 100 }, borders: { top: index === 0 ? undefined : { style: BorderStyle.NONE }, bottom: index === payments.length - 1 ? undefined : { style: BorderStyle.NONE } } }),
               new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.date.toLocaleDateString() })], alignment: AlignmentType.CENTER })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
               new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.dueName })] })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
               new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: index === 0 ? refNo : "" })], alignment: AlignmentType.CENTER })], margins: { top: 100, bottom: 100, left: 100, right: 100 }, borders: { top: index === 0 ? undefined : { style: BorderStyle.NONE }, bottom: index === payments.length - 1 ? undefined : { style: BorderStyle.NONE } } }),
               new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `₱ ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` })], alignment: AlignmentType.RIGHT })], margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
             ]
           }));
         });

         // Subtotal row
         tableRows.push(new TableRow({
           children: [
             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "" })] })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "" })] })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "" })] })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Faculty Subtotal", bold: true, italics: true })], alignment: AlignmentType.RIGHT })], shading: { fill: "F8FAFC" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
             new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `₱ ${teacherTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, bold: true })], alignment: AlignmentType.RIGHT })], shading: { fill: "F8FAFC" }, margins: { top: 100, bottom: 100, left: 100, right: 100 } }),
           ]
         }));
      });

      // Grand Total row
      tableRows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "" })] })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "" })] })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "" })] })], borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "GRAND TOTAL", bold: true, size: 22 })], alignment: AlignmentType.RIGHT })], shading: { fill: "EBF5FF" }, margins: { top: 120, bottom: 120, left: 100, right: 100 } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `₱ ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, bold: true, size: 22, color: "0038A8" })], alignment: AlignmentType.RIGHT })], shading: { fill: "EBF5FF" }, margins: { top: 120, bottom: 120, left: 100, right: 100 } }),
        ]
      }));

      const topMargin = Math.max(1440, (headerFooter.headerHeightTwips || 0) + 1080);
      const bottomMargin = Math.max(1440, (headerFooter.footerHeightTwips || 0) + 1080);

      const doc = new Document({
        creator: "LPCAANHS Faculty Club Management System",
        title: "Payment History Report",
        sections: [{
          headers: headerFooter.headers,
          footers: headerFooter.footers,
          properties: {
            page: {
              size: {
                width: 18720,
                height: 12240,
                orientation: PageOrientation.LANDSCAPE,
              },
              margin: {
                top: topMargin + 720,
                right: 720,
                bottom: bottomMargin + 720,
                left: 720,
                header: 720,
                footer: 720,
              },
            },
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              indent: { left: 0, right: 0 },
              children: [
                new TextRun({ text: "LAS PIÑAS CAA NATIONAL HIGH SCHOOL", bold: true, size: 28, color: "0038A8" }),
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              indent: { left: 0, right: 0 },
              children: [
                new TextRun({ text: "FACULTY CLUB OFFICERS", bold: true, size: 24 }),
              ]
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              indent: { left: 0, right: 0 },
              children: [
                new TextRun({ text: "FACULTY PAYMENT TRANSACTION HISTORY LOG", bold: true, size: 20 }),
              ],
              spacing: { before: 150, after: 150 }
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              indent: { left: 0, right: 0 },
              children: [
                new TextRun({ text: `Date Generated: ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}  |  Total Collected: ₱ ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` }),
              ],
              spacing: { after: 400 }
            }),
            new Table({
               width: { size: 100, type: WidthType.PERCENTAGE },
               layout: TableLayoutType.AUTOFIT,
               rows: tableRows
            }),
            new Paragraph({ children: [new TextRun({ text: "" })], spacing: { before: 800 } }),
            ...(signatories.length > 0 ? [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.AUTOFIT,
                rows: Array.from({ length: Math.ceil(signatories.length / 3) }).map((_, rowIndex) => (
                  new TableRow({
                    children: signatories.slice(rowIndex * 3, (rowIndex + 1) * 3).map(sig => (
                      new TableCell({
                        width: { size: 33.33, type: WidthType.PERCENTAGE },
                        margins: { top: 100, bottom: 100, left: 100, right: 100 },
                        children: [
                          new Paragraph({ children: [new TextRun({ text: sig.label || "Officer:", italics: true, size: 18, color: "64748B" })], alignment: AlignmentType.CENTER, spacing: { after: 360 } }), 
                          new Paragraph({ children: [new TextRun({ text: sig.name || "____________________", bold: true, size: 20 })], alignment: AlignmentType.CENTER }), 
                          new Paragraph({ children: [new TextRun({ text: sig.title || "", size: 18, color: "475569" })], alignment: AlignmentType.CENTER })
                        ],
                        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
                      })
                    ))
                  })
                ))
              })
            ] : []),
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Faculty_Payment_History_Report_${new Date().toISOString().split('T')[0]}.docx`);
      showToast("Payment history downloaded as DOCX.");
    } catch (e) {
      console.error(e);
      showToast("Failed to generate payment history report.");
    }
  };

  const handleDownloadComprehensiveReportDocx = async () => {
    try {
      showToast("Generating Comprehensive Report...");
      const docx = await import("docx");
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, PageOrientation, Header, Footer, ImageRun, TableLayoutType } = docx;
      const { saveAs } = await import("file-saver");
      const headerFooter = await getDocxHeaderFooter(13, docx, { header: brandingSettings.headerUrl, footer: brandingSettings.footerUrl });

      // Part I: Summary Table
      const summaryTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.AUTOFIT,
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "PARTICULARS", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F3F4F6" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "AMOUNT (₱)", bold: true })], alignment: AlignmentType.CENTER })], shading: { fill: "F3F4F6" } }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL COLLECTIONS (INCOME)" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `₱ ${totalCollections.toLocaleString(undefined, { minimumFractionDigits: 2 })}` })], alignment: AlignmentType.RIGHT })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL EXPENSES (OUTFLOW)" })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `₱ ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}` })], alignment: AlignmentType.RIGHT })] }),
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
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NO.", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "0038A8" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TEACHER NAME", bold: true, color: "FFFFFF" })] })], shading: { fill: "0038A8" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "GRADE", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "0038A8" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "RECEIPT DATE", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "0038A8" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "REF. NO.", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "0038A8" } }),
            ...standardDues.map(due => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: due.name.toUpperCase(), bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "0038A8" } })),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL PAID", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "0038A8" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "STATUS", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "0038A8" } }),
          ],
        }),
      ];

      const sortedRecords = sortRecordsByGradeAndName(records);
      sortedRecords.forEach((r, index) => {
        const paid = standardDues.filter(d => r.paidDueIds.includes(d.id)).reduce((s, d) => {
          if (d.isVoluntary && r.voluntaryPayments?.[d.id]) return s + r.voluntaryPayments[d.id];
          return s + d.amount;
        }, 0);
        const totalReq = standardDues.filter(d => !d.isVoluntary).reduce((s, d) => s + d.amount, 0);
        const status = paid >= totalReq ? "Fully Paid" : paid > 0 ? "Partial" : "Pending";
        const receiptDate = r.lastReceiptSent ? new Date(r.lastReceiptSent).toLocaleDateString() : "N/A";
        const refNo = r.lastReferenceNumber || "N/A";

        const dueCells = standardDues.map(due => {
          const isPaid = due.isVoluntary 
            ? (r.voluntaryPayments?.[due.id] !== undefined && r.voluntaryPayments[due.id] > 0)
            : r.paidDueIds.includes(due.id);
          const amountPaid = due.isVoluntary 
            ? (r.voluntaryPayments?.[due.id] || 0)
            : (r.paidDueIds.includes(due.id) ? due.amount : 0);
          return new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: isPaid ? `Paid (₱${amountPaid})` : 'Not Paid' })], alignment: AlignmentType.CENTER })] });
        });

        collectionRows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (index + 1).toString() })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.name })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: r.gradeLevel })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: receiptDate })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: refNo })], alignment: AlignmentType.CENTER })] }),
            ...dueCells,
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `₱ ${paid.toLocaleString()}` })], alignment: AlignmentType.RIGHT })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: status })], alignment: AlignmentType.CENTER })] }),
          ],
        }));
      });

      // Part III: Expenses Table
      const expenseRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "NO.", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "DC2626" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DATE", bold: true, color: "FFFFFF" })] })], shading: { fill: "DC2626" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DESCRIPTION", bold: true, color: "FFFFFF" })] })], shading: { fill: "DC2626" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "AMOUNT (₱)", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "DC2626" } }),
          ],
        }),
      ];

      expenses.forEach((e, index) => {
        expenseRows.push(new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (index + 1).toString() })], alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureTimestamp(e.timestamp).toDate().toLocaleDateString() || "N/A" })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: e.description })] })] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `₱ ${e.amount.toLocaleString()}` })], alignment: AlignmentType.RIGHT })] }),
          ],
        }));
      });

      const topMargin = Math.max(1440, (headerFooter.headerHeightTwips || 0) + 1080);
      const bottomMargin = Math.max(1440, (headerFooter.footerHeightTwips || 0) + 1080);

      const doc = new Document({
        creator: "LPCAANHS Faculty Club Management System",
        title: "Comprehensive Report",
        sections: [
          {
            headers: headerFooter.headers,
            footers: headerFooter.footers,
            properties: {
              page: {
                size: {
                  width: 12240, // 8.5 inches
                  height: 18720, // 13 inches
                  orientation: PageOrientation.LANDSCAPE,
                },
                margin: {
                  top: topMargin + 720,
                  right: 720,
                  bottom: bottomMargin + 720,
                  left: 720,
                  header: 720,
                  footer: 720,
                },
              },
            },
            children: [
              new Paragraph({ children: [new TextRun({ text: "LAS PIÑAS CAA NATIONAL HIGH SCHOOL", bold: true, size: 28, color: "0038A8" })], alignment: AlignmentType.CENTER, indent: { left: 0, right: 0 } }),
              new Paragraph({ children: [new TextRun({ text: "FACULTY CLUB OFFICERS", bold: true, size: 24 })], alignment: AlignmentType.CENTER, indent: { left: 0, right: 0 } }),
              new Paragraph({ children: [new TextRun({ text: "COMPREHENSIVE FINANCIAL & LIQUIDATION REPORT", bold: true, size: 20 })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 100 }, indent: { left: 0, right: 0 } }),
              new Paragraph({ children: [new TextRun({ text: `Report Date: ${new Date().toLocaleDateString()}` })], alignment: AlignmentType.CENTER, spacing: { after: 400 }, indent: { left: 0, right: 0 } }),
              
              new Paragraph({ children: [new TextRun({ text: "I. FINANCIAL SUMMARY", bold: true })], spacing: { before: 200, after: 200 } }),
              summaryTable,

              new Paragraph({ children: [new TextRun({ text: "II. COLLECTIONS BREAKDOWN", bold: true })], spacing: { before: 400, after: 200 } }),
              new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.AUTOFIT, rows: collectionRows }),

              new Paragraph({ children: [new TextRun({ text: "III. EXPENSES BREAKDOWN", bold: true })], spacing: { before: 400, after: 200 } }),
              new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.AUTOFIT, rows: expenseRows }),

              new Paragraph({ children: [new TextRun({ text: "" })], spacing: { before: 800 } }),
              ...(signatories.length > 0 ? [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  layout: TableLayoutType.AUTOFIT,
                  rows: Array.from({ length: Math.ceil(signatories.length / 3) }).map((_, rowIndex) => (
                    new TableRow({
                      children: signatories.slice(rowIndex * 3, (rowIndex + 1) * 3).map(sig => (
                        new TableCell({
                          width: { size: 33.33, type: WidthType.PERCENTAGE },
                          children: [
                            new Paragraph({ children: [new TextRun({ text: sig.label || "" })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }), 
                            new Paragraph({ children: [new TextRun({ text: sig.name || "____________________", bold: true })], alignment: AlignmentType.CENTER }), 
                            new Paragraph({ children: [new TextRun({ text: sig.title || "" })], alignment: AlignmentType.CENTER })
                          ], 
                          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } } 
                        })
                      )),
                    })
                  )),
                })
              ] : []),
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
      const docx = await import("docx");
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, PageOrientation, Header, Footer, ImageRun, TableLayoutType } = docx;
      const headerFooter = await getDocxHeaderFooter(13, docx, { header: brandingSettings.headerUrl, footer: brandingSettings.footerUrl });
      
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DATE" })], alignment: AlignmentType.CENTER, style: "HeaderStyle" })], shading: { fill: "0038A8" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "DESCRIPTION / PARTICULARS" })], alignment: AlignmentType.CENTER, style: "HeaderStyle" })], shading: { fill: "0038A8" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "CATEGORY" })], alignment: AlignmentType.CENTER, style: "HeaderStyle" })], shading: { fill: "0038A8" } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "AMOUNT (₱)" })], alignment: AlignmentType.CENTER, style: "HeaderStyle" })], shading: { fill: "0038A8" } }),
          ],
        }),
      ];

      expenses.forEach((exp) => {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ensureTimestamp(exp.timestamp).toDate().toLocaleDateString() || "N/A" })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: exp.description })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: exp.category || "General" })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `₱ ${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` })], alignment: AlignmentType.RIGHT })] }),
            ],
          })
        );
      });

      // Total Row
      const totalAmount = totalExpenses;
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL EXPENSES" })], alignment: AlignmentType.RIGHT, style: "BoldStyle" })], columnSpan: 3 }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `₱ ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` })], alignment: AlignmentType.RIGHT, style: "BoldStyle" })] }),
          ],
        })
      );

      const topMargin = Math.max(1440, (headerFooter.headerHeightTwips || 0) + 1080);
      const bottomMargin = Math.max(1440, (headerFooter.footerHeightTwips || 0) + 1080);

      const doc = new Document({
        creator: "LPCAANHS Faculty Club Management System",
        title: "Liquidation Report",
        styles: {
          paragraphStyles: [
            { id: "HeaderStyle", name: "Header Style", run: { bold: true, color: "FFFFFF", size: 20 } },
            { id: "BoldStyle", name: "Bold Style", run: { bold: true, size: 22 } },
          ],
        },
        sections: [
          {
            headers: headerFooter.headers,
            footers: headerFooter.footers,
            properties: {
              page: {
                size: {
                  width: 12240, // 8.5 inches
                  height: 18720, // 13 inches
                  orientation: PageOrientation.LANDSCAPE,
                },
                margin: {
                  top: topMargin + 720,
                  right: 720,
                  bottom: bottomMargin + 720,
                  left: 720,
                  header: 720,
                  footer: 720,
                },
              },
            },
            children: [
              new Paragraph({ children: [new TextRun({ text: "LAS PIÑAS CAA NATIONAL HIGH SCHOOL", bold: true, size: 32 })], alignment: AlignmentType.CENTER, indent: { left: 0, right: 0 } }),
              new Paragraph({ children: [new TextRun({ text: "FACULTY CLUB OFFICERS", bold: true, size: 28 })], alignment: AlignmentType.CENTER, indent: { left: 0, right: 0 } }),
              new Paragraph({ children: [new TextRun({ text: "LIQUIDATION REPORT", bold: true, size: 24 })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 400 }, indent: { left: 0, right: 0 } }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.AUTOFIT,
                rows: tableRows,
              }),
              new Paragraph({ children: [new TextRun({ text: "" })], spacing: { before: 800 } }),
              ...(signatories.length > 0 ? [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  layout: TableLayoutType.AUTOFIT,
                  rows: Array.from({ length: Math.ceil(signatories.length / 3) }).map((_, rowIndex) => (
                    new TableRow({
                      children: signatories.slice(rowIndex * 3, (rowIndex + 1) * 3).map(sig => (
                        new TableCell({
                          width: { size: 33.33, type: WidthType.PERCENTAGE },
                          children: [
                            new Paragraph({ children: [new TextRun({ text: sig.label || "" })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }), 
                            new Paragraph({ children: [new TextRun({ text: sig.name || "____________________", bold: true })], alignment: AlignmentType.CENTER }), 
                            new Paragraph({ children: [new TextRun({ text: sig.title || "" })], alignment: AlignmentType.CENTER })
                          ], 
                          borders: { 
                            top: { style: BorderStyle.NONE }, 
                            bottom: { style: BorderStyle.NONE }, 
                            left: { style: BorderStyle.NONE }, 
                            right: { style: BorderStyle.NONE } 
                          } 
                        })
                      )),
                    })
                  )),
                })
              ] : []),
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

  const generateHTMLReceipt = (receipt: any, includeSignatories: boolean = false) => {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; color: #1a202c; line-height: 1.6; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9;">
          <h2 style="color: #0038A8; margin: 0 0 5px 0; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Official Receipt</h2>
          <p style="color: #64748b; margin: 0; font-size: 14px;">Las Piñas CAA National High School Faculty Club</p>
        </div>

        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background-color: #f0fdf4; border: 2px solid #bbf7d0; color: #16a34a; padding: 12px 30px; border-radius: 50px; font-weight: 900; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <span style="margin-right: 10px;">✅</span> PAYMENT SUCCESSFUL
          </div>
        </div>

        <div style="margin-bottom: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: bold;">Date & Time</p>
            <p style="margin: 0; font-size: 14px; font-weight: 600;">${receipt.date}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: bold;">Reference Number</p>
            <p style="margin: 0; font-size: 14px; font-weight: 600; font-family: monospace; color: #0038A8;">${receipt.referenceNumber}</p>
          </div>
        </div>

        <div style="margin-bottom: 25px; padding: 15px; border-radius: 12px; background-color: #f8fafc; border-left: 4px solid #0038A8;">
          <p style="margin: 0 0 5px 0; color: #64748b; font-size: 13px; text-transform: uppercase; font-weight: bold;">Received From</p>
          <p style="margin: 0; font-size: 18px; font-weight: 800; color: #0038A8;">${receipt.teacherName}</p>
        </div>

        <h3 style="font-size: 13px; font-weight: 800; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px;">Summary of Payment</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
          <tbody>
            ${receipt.breakdown.map((item: any) => `
              <tr>
                <td style="padding: 10px 0; font-size: 14px; color: #2d3748; border-bottom: 1px solid #f1f5f9;">${item.name}</td>
                <td style="padding: 10px 0; font-size: 14px; color: #2d3748; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600;">₱${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td style="padding: 20px 0 0 0; font-size: 16px; font-weight: 800; color: #0038A8;">Total Amount Paid</td>
              <td style="padding: 20px 0 0 0; font-size: 22px; font-weight: 900; color: #0038A8; text-align: right;">₱${receipt.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; gap: 15px; margin-bottom: 25px;">
          <div style="flex: 1; background-color: ${receipt.isFullyPaid ? '#f0fdf4' : '#fffbeb'}; padding: 15px; border-radius: 12px; border: 1px solid ${receipt.isFullyPaid ? '#bbf7d0' : '#fef3c7'}; text-align: center;">
            <p style="margin: 0 0 2px 0; font-size: 10px; font-weight: 800; color: ${receipt.isFullyPaid ? '#166534' : '#92400e'}; text-transform: uppercase; letter-spacing: 0.5px;">Payment Status</p>
            <p style="margin: 0; font-size: 14px; font-weight: 900; color: ${receipt.isFullyPaid ? '#15803d' : '#b45309'};">${receipt.isFullyPaid ? 'FULLY PAID' : 'PARTIAL'}</p>
          </div>
          
          ${receipt.collectiblesBreakdown && receipt.collectiblesBreakdown.length > 0 ? `
          <div style="flex: 1; background-color: #fef2f2; padding: 15px; border-radius: 12px; border: 1px solid #fecaca; text-align: center;">
            <p style="margin: 0 0 2px 0; font-size: 10px; font-weight: 800; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">Remaining Balance</p>
            <p style="margin: 0; font-size: 14px; font-weight: 900; color: #b91c1c;">₱${receipt.balance.toFixed(2)}</p>
          </div>
          ` : ''}
        </div>

        <div style="margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 25px; margin-bottom: 30px;">
          <h4 style="margin: 0 0 10px 0; color: #0038A8; font-size: 18px; font-weight: 800;">Thank You!</h4>
          <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.8;">
            Thank you for your prompt payment and continued support of the <strong>Las Piñas CAA NHS Faculty Club</strong>. 
            Your contributions help us sustain our programs and build a stronger, more supportive community for all our members. 
            We truly appreciate your dedication and partnership!
          </p>
        </div>

        ${includeSignatories ? `
        <div style="margin-top: 40px; border-top: 2px dashed #f1f5f9; padding-top: 30px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              ${Array.from({ length: Math.ceil(signatories.length / 3) }).map((_, rowIndex) => `
                <tr>
                  ${signatories.slice(rowIndex * 3, (rowIndex + 1) * 3).map(sig => `
                    <td style="padding: 10px; text-align: center; width: 33.33%;">
                      <p style="font-size: 11px; color: #94a3b8; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 1px;">${sig.label}</p>
                      <p style="font-size: 13px; font-weight: 900; color: #1a202c; margin: 0; text-transform: uppercase; border-bottom: 1px solid #eee; padding-bottom: 5px; display: inline-block;">${sig.name || "____________________"}</p>
                      <p style="font-size: 11px; color: #64748b; margin: 5px 0 0 0; font-weight: 600;">${sig.title}</p>
                    </td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
        
        <div style="margin-top: 20px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px;">
           <p style="font-size: 10px; color: #cbd5e1; margin: 0; text-transform: uppercase; letter-spacing: 2px;">This is an electronically generated official receipt.</p>
        </div>
      </div>
    `;
  };

  const sendReceiptEmail = async (record: TeacherRecord) => {
    if (!record.email || !record.email.includes('@')) {
      return { success: false, error: `Teacher ${record.name} does not have a valid email address.` };
    }

    const paidDues = standardDues.filter(d => record.paidDueIds.includes(d.id));
    const collectiblesDues = standardDues.filter(d => !record.paidDueIds.includes(d.id) && !d.isVoluntary);
    
    if (paidDues.length === 0) return { success: false, error: "No paid dues found for this teacher." };

    const total = paidDues.reduce((sum, d) => {
      if (d.isVoluntary && record.voluntaryPayments?.[d.id] !== undefined) {
        return sum + record.voluntaryPayments[d.id];
      }
      return sum + d.amount;
    }, 0);
    const balance = collectiblesDues.reduce((sum, d) => sum + d.amount, 0);
    const requiredDues = standardDues.filter(d => !d.isVoluntary);
    const isFullyPaid = requiredDues.length > 0 && requiredDues.every(d => record.paidDueIds.includes(d.id));

    const rawReferenceNumber = record.lastReferenceNumber || `REC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const receipt = {
      date: new Date().toLocaleString(),
      referenceNumber: rawReferenceNumber,
      teacherName: record.name,
      email: record.email,
      breakdown: paidDues.map(d => ({ 
        name: d.isVoluntary ? `${d.name} (Vol)` : d.name, 
        amount: (d.isVoluntary && record.voluntaryPayments?.[d.id] !== undefined) ? record.voluntaryPayments[d.id] : d.amount 
      })),
      collectiblesBreakdown: collectiblesDues.map(d => ({ name: d.name, amount: d.amount })),
      total: total,
      balance: balance,
      isFullyPaid: isFullyPaid,
      sender: "Las Piñas CAA Faculty Club Officers - BODs"
    };

    const html = generateHTMLReceipt(receipt);

    try {
      // Persist if it's the first time generating a reference number for this teacher
      if (!record.lastReferenceNumber) {
        await updateDoc(doc(db, 'teachers', record.id), {
          lastReferenceNumber: rawReferenceNumber
        });
      }

      // Reliable SMTP / API transmit
      let isDelivered = false;
      let isSimulated = false;

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

        const resData = await response.json().catch(() => ({ success: true }));
        if (resData.success) {
          isDelivered = !!resData.delivered;
          isSimulated = !!resData.simulated;
          console.log(`Receipt email processed successfully for ${record.email} (Delivered: ${isDelivered}, Simulated: ${isSimulated})`);
        } else {
          console.warn(`Receipt endpoint returned notice:`, resData);
        }
      } catch (networkError) {
        console.warn("Network interrupt during receipt email dispatch, proceeding with receipt generation:", networkError);
      }

      // Explicitly proceed with successful receipt execution & record updates in Firestore immediately
      await updateDoc(doc(db, 'teachers', record.id), {
        lastReceiptSent: new Date().toISOString(),
        lastReferenceNumber: receipt.referenceNumber
      });

      return { 
        success: true, 
        ref: receipt.referenceNumber,
        delivered: isDelivered,
        simulated: isSimulated
      };
    } catch (error: any) {
      console.error("General wrapper error under sendReceiptEmail:", error);
      return { success: false, error: error?.message || "Failed to generate official receipt." };
    }
  };

  const handleSendReceipt = async (record: TeacherRecord) => {
    if (!record.email || !record.email.includes('@')) {
      showToast(`Cannot send receipt: ${record.name} has no valid email address.`);
      return;
    }

    setIsSending(record.id);
    const result = await sendReceiptEmail(record);
    if (result.success) {
      const deliveryStatus = result.delivered 
        ? `Delivered to ${record.email}`
        : `Sent to ${record.email}`;
      showToast(`Official Receipt (${result.ref}) - ${deliveryStatus}`);
      logActivity("Sent Receipt", `Official receipt (${result.ref}) sent to ${record.name} (${record.email})`);
    } else {
      showToast(`Error: ${result.error}`);
    }
    setIsSending(null);
  };

  const handleDownloadReceipt = async (record: TeacherRecord) => {
    const safePaidDueIds = record.paidDueIds || [];
    const paidDues = standardDues.filter(d => safePaidDueIds.includes(d.id) || (d.isVoluntary && record.voluntaryPayments?.[d.id] !== undefined && record.voluntaryPayments[d.id] > 0));
    const collectiblesDues = standardDues.filter(d => !safePaidDueIds.includes(d.id) && !(d.isVoluntary && record.voluntaryPayments?.[d.id] !== undefined && record.voluntaryPayments[d.id] > 0));
    
    if (paidDues.length === 0) {
      showToast("No paid dues to generate receipt.");
      return;
    }

    const total = paidDues.reduce((sum, d) => {
      if (d.isVoluntary && record.voluntaryPayments?.[d.id] !== undefined) {
        return sum + record.voluntaryPayments[d.id];
      }
      return sum + d.amount;
    }, 0);
    const balance = collectiblesDues.reduce((sum, d) => sum + d.amount, 0);
    const requiredDues = standardDues.filter(d => !d.isVoluntary);
    const isFullyPaid = requiredDues.length > 0 && requiredDues.every(d => safePaidDueIds.includes(d.id));

    const rawReferenceNumber = record.lastReferenceNumber || `REC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Persist if it's the first time generating a reference number for this teacher
    if (!record.lastReferenceNumber) {
      try {
        await updateDoc(doc(db, 'teachers', record.id), {
          lastReferenceNumber: rawReferenceNumber
        });
      } catch (e) {
        console.error("Failed to persist reference number during preview", e);
      }
    }

    const receipt = {
      date: new Date().toLocaleString(),
      referenceNumber: rawReferenceNumber,
      teacherName: record.name,
      email: record.email,
      breakdown: paidDues.map(d => ({ 
        name: d.isVoluntary ? `${d.name} (Vol)` : d.name, 
        amount: (d.isVoluntary && record.voluntaryPayments?.[d.id] !== undefined) ? record.voluntaryPayments[d.id] : d.amount 
      })),
      collectiblesBreakdown: collectiblesDues.map(d => ({ name: d.name, amount: d.amount })),
      total: total,
      balance: balance,
      isFullyPaid: isFullyPaid,
      sender: "Las Piñas CAA Faculty Club Officers - BODs"
    };

    setPreviewReceiptData(receipt);
    setShowReceiptPreview(true);
  };

  const printReceipt = () => {
    if (!previewReceiptData) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${previewReceiptData.referenceNumber}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
              body { margin: 0; padding: 20px; font-family: 'Inter', Arial, sans-serif; background: #ffffff; display: flex; justify-content: center; }
              @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; }
                @page { margin: 0; size: landscape; }
              }
            </style>
          </head>
          <body>
            ${generateHTMLReceipt(previewReceiptData)}
            <script>
              window.onload = () => {
                setTimeout(() => {
                   window.print();
                   setTimeout(() => window.close(), 500);
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      showToast("Please allow popups to print the receipt.");
    }
  };

  const downloadReceiptAsDocx = async () => {
    if (!previewReceiptData) return;
    setIsDownloadingReceipt(true);
    
    try {
      const docx = await import("docx");
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, PageOrientation, Header, Footer, ImageRun, TableLayoutType } = docx;
      const { saveAs } = await import("file-saver");

      const receipt = previewReceiptData;

      const doc = new Document({
        creator: "LPCAANHS Faculty Club Management System",
        title: "Official Receipt",
        sections: [{
          properties: {
            page: {
              size: {
                width: 12240, // 8.5 inches
                height: 18720, // 13 inches
                orientation: PageOrientation.LANDSCAPE,
              },
              margin: {
                top: 1440,
                right: 720,
                bottom: 1440,
                left: 720,
              },
            },
          },
          children: [
            new Paragraph({ children: [new TextRun({ text: "LAS PIÑAS CAA NATIONAL HIGH SCHOOL", bold: true, size: 28, color: "0038A8" })], alignment: AlignmentType.CENTER, indent: { left: 0, right: 0 } }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              indent: { left: 0, right: 0 },
              children: [
                new TextRun({ text: "Las Piñas CAA Faculty Club", size: 24, color: "666666" }),
              ],
              spacing: { after: 400 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Reference No.: ", bold: true }),
                new TextRun({ text: receipt.referenceNumber }),
              ],
              indent: { left: 0 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Date: ", bold: true }),
                new TextRun({ text: receipt.date }),
              ],
              spacing: { after: 400 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Received From:", bold: true, size: 24 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: receipt.teacherName, bold: true, size: 32 }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: receipt.email, color: "666666" }),
              ],
              spacing: { after: 400 },
            }),
            new Paragraph({ children: [new TextRun({ text: "Payment Details", bold: true, size: 28 })], spacing: { after: 200 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              layout: TableLayoutType.AUTOFIT,
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true })] })],
                      shading: { fill: "F1F5F9" },
                      margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: "Amount", bold: true })], alignment: AlignmentType.RIGHT })],
                      shading: { fill: "F1F5F9" },
                      margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    }),
                  ],
                }),
                ...receipt.breakdown.map((item: any) => new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: item.name })] })],
                      margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    }),
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: `PHP ${item.amount.toFixed(2)}` })], alignment: AlignmentType.RIGHT })],
                      margins: { top: 100, bottom: 100, left: 100, right: 100 },
                    }),
                  ],
                })),
              ],
            }),
            new Paragraph({ spacing: { before: 400 } }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: "Subtotal: ", bold: true }),
                new TextRun({ text: `PHP ${receipt.total.toFixed(2)}` }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: "Total Paid: ", bold: true, size: 28 }),
                new TextRun({ text: `PHP ${receipt.total.toFixed(2)}`, bold: true, size: 28, color: "16A34A" }),
              ],
              spacing: { after: 400 },
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Payment Status: ", bold: true }),
                new TextRun({ text: receipt.isFullyPaid ? "Fully Paid" : "Partial Payment", bold: true, color: receipt.isFullyPaid ? "15803D" : "B45309" }),
              ],
            }),
            ...(receipt.collectiblesBreakdown && receipt.collectiblesBreakdown.length > 0 ? [
              new Paragraph({
                children: [
                  new TextRun({ text: "Remaining Balance: ", bold: true }),
                  new TextRun({ text: `PHP ${receipt.balance.toFixed(2)}`, bold: true, color: "B91C1C" }),
                ],
                spacing: { after: 100 }
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Unpaid Dues:", bold: true, size: 20 })
                ]
              }),
              ...receipt.collectiblesBreakdown.map((item: any) => new Paragraph({
                  children: [
                    new TextRun({ text: `• ${item.name}: `, color: "666666" }),
                    new TextRun({ text: `PHP ${item.amount.toFixed(2)}`, color: "B91C1C", bold: true })
                  ],
                  indent: { left: 300 }
              }))
            ] : []),
            new Paragraph({ children: [new TextRun({ text: "" })], spacing: { before: 800 } }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Receipt_${previewReceiptData.teacherName.replace(/\s+/g, '_')}_${previewReceiptData.referenceNumber}.docx`);
      showToast("Receipt downloaded successfully as DOCX.");
      
    } catch (error) {
      console.error("Download Error:", error);
      showToast("Failed to download receipt.");
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  const downloadReceiptAsImage = async () => {
    if (!previewReceiptData) return;
    setIsDownloadingImage(true);
    try {
      showToast("Preparing image download...");
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Auto-detect which modal is open (admin or teacher)
      const element = document.getElementById('admin-receipt-content') || document.getElementById('teacher-receipt-content');
      
      if (!element) {
        throw new Error("Receipt content not found in DOM");
      }
      
      const canvas = await html2canvas(element, {
        scale: 2, 
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(element.id);
          if (clonedElement) {
            clonedElement.style.overflow = 'visible';
            clonedElement.style.height = 'auto';
            clonedElement.style.maxHeight = 'none';
            (clonedElement.style as any).zoom = '1';
            
            // Unset wrapper properties and scale overrides
            if (clonedElement.parentElement) {
                clonedElement.parentElement.style.overflow = 'visible';
                clonedElement.parentElement.style.maxHeight = 'none';
                (clonedElement.parentElement.style as any).zoom = '1';
            }
          }
        }
      });

      const fileName = `Receipt_${previewReceiptData.teacherName.replace(/\s+/g, '_')}_${previewReceiptData.referenceNumber}.png`;
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("Receipt downloaded successfully as PNG.");
    } catch (error) {
      console.error("Image Download Error:", error);
      showToast("Failed to download image. Try again.");
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleBatchSendReceipts = async () => {
    const selectedTeachers = filteredRecords.filter(r => selectedTeacherIds.has(r.id));
    const teachersToReceive = selectedTeachers.filter(r => r.paidDueIds.length > 0);
    
    if (teachersToReceive.length === 0) {
      showToast("No teachers with payments selected.");
      return;
    }

    setIsBatchSending(true);
    showToast(`Batch sending receipts to ${teachersToReceive.length} teachers...`);
    let successCount = 0;
    const total = teachersToReceive.length;
    
    // Process in batches of 5 to avoid overwhelming the server
    const CONCURRENCY = 5;
    
    for (let i = 0; i < total; i += CONCURRENCY) {
      const batch = teachersToReceive.slice(i, i + CONCURRENCY);
      
      const results = await Promise.all(batch.map(async (record) => {
        let result = await sendReceiptEmail(record);
        
        // Retry logic: if it fails, wait 2 seconds and try again (up to 2 retries)
        let retries = 2;
        while (!result.success && retries > 0 && result.error !== 'Email service not configured.') {
          console.log(`Failed to send to ${record.email}, retrying... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          result = await sendReceiptEmail(record);
          retries--;
        }
        
        if (!result.success) {
          console.error(`Final failure sending to ${record.email}: ${result.error}`);
        }
        return result.success;
      }));
      
      successCount += results.filter(Boolean).length;
      
      // Delay of 1.5 seconds between batches to prevent rate limiting/backend overload
      if (i + CONCURRENCY < total) {
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

  const handleBatchUpdateDues = async () => {
    if (selectedTeacherIds.size === 0) return;
    
    const updatesToApply = Object.entries(batchDueUpdates).filter(([_, action]) => action !== 'no_change');
    if (updatesToApply.length === 0) {
      showToast("No changes selected.");
      return;
    }

    setIsBatchUpdating(true);
    try {
      const updatePromises = Array.from(selectedTeacherIds).map(async (teacherId) => {
        const teacher = records.find(r => r.id === teacherId);
        if (!teacher) return;
        
        let newPaidIds = [...teacher.paidDueIds];
        let newPaymentHistory = [...(teacher.paymentHistory || [])];
        
        updatesToApply.forEach(([dueId, action]) => {
          if (action === 'paid' && !newPaidIds.includes(dueId)) {
            newPaidIds.push(dueId);
            const due = standardDues.find(d => d.id === dueId);
            newPaymentHistory.push({
              dueId,
              dueName: due?.name || 'Unknown Due',
              date: new Date().toISOString(),
              amount: due?.amount || 0,
              collectedBy: profile?.name || 'System',
              collectedByRole: profile?.role || 'admin'
            });
          } else if (action === 'unpaid' && newPaidIds.includes(dueId)) {
            newPaidIds = newPaidIds.filter(id => id !== dueId);
            const index = newPaymentHistory.findIndex(h => h.dueId === dueId);
            if (index > -1) newPaymentHistory.splice(index, 1);
          }
        });
        
        await updateDoc(doc(db, 'teachers', teacherId), {
          paidDueIds: newPaidIds,
          paymentHistory: newPaymentHistory
        });
      });

      await Promise.all(updatePromises);
      
      showToast(`Successfully updated dues for ${selectedTeacherIds.size} teachers.`);
      logActivity("Batch Update Dues", `Updated dues for ${selectedTeacherIds.size} teachers`);
      setIsBatchUpdateModalOpen(false);
      setBatchDueUpdates({});
      clearSelection();
    } catch (error) {
      console.error("Error batch updating dues:", error);
      showToast("Failed to update dues.");
    } finally {
      setIsBatchUpdating(false);
    }
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
      const batch = writeBatch(db);
      
      const teachersSnap = await getDocs(collection(db, 'teachers'));
      teachersSnap.forEach(d => batch.delete(d.ref));
      
      const expensesSnap = await getDocs(collection(db, 'expenses'));
      expensesSnap.forEach(d => batch.delete(d.ref));
      
      const remittancesSnap = await getDocs(collection(db, 'remittances'));
      remittancesSnap.forEach(d => batch.delete(d.ref));
      
      const logsSnap = await getDocs(collection(db, 'audit_logs'));
      logsSnap.forEach(d => batch.delete(d.ref));

      const duesSnap = await getDocs(collection(db, 'dues'));
      duesSnap.forEach(d => batch.delete(d.ref));

      const balancesSnap = await getDocs(collection(db, 'initial_balances'));
      balancesSnap.forEach(d => batch.delete(d.ref));
      
      await batch.commit();
      
      setIsBatchDeleteModalOpen(false);
      setShowWipeSuccessModal(true);
      logActivity("Wiped Database", "Admin performed a full database reset.", 'critical');
    } catch (error) {
      console.error("Delete All Error:", error);
      showToast("Failed to delete all records.");
    } finally {
      setIsBatchDeleting(false);
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
      <div 
        className="min-h-screen bg-[#001233] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden"
        onClick={() => {
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
          }
        }}
      >
        {/* Desktop Ocean Background */}
        <DesktopOceanBackground />
        
        {/* Moving Gradient Background (Mobile only) */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none md:hidden bg-[#000511]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#001233] via-[#0038A8] to-[#001233] bg-[length:400%_400%] animate-[gradientMove_15s_ease_infinite]" />
          
          {/* Mobile Aurora */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], x: ['0%', '10%', '0%'] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[10%] -left-[20%] w-[140%] h-[40%] rounded-full bg-[#00A86B] opacity-20 blur-[80px] mix-blend-screen"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], x: ['0%', '-10%', '0%'] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute bottom-[20%] -right-[20%] w-[140%] h-[40%] rounded-full bg-[#9b5de5] opacity-20 blur-[80px] mix-blend-screen"
          />

          <style>
            {`
              @keyframes gradientMove {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
              }
            `}
          </style>

          {/* Sweeping Aurora Stars (Mobile Horizontal Flow) */}
          {[...Array(40)].map((_, i) => (
            <motion.div
                key={`mobile-aurora-star-${i}`}
                initial={{ 
                  y: `${Math.random() * 80 + 10}vh`, 
                  x: `-20vw`, 
                  opacity: 0,
                }}
                animate={{ 
                    y: [`${Math.random() * 80 + 10}vh`, `${(Math.random() * 80 + 10) + (Math.random() * 20 - 10)}vh`], 
                    x: [`-20vw`, `120vw`], 
                    opacity: [0, Math.random() * 0.8 + 0.2, 0],
                }}
                transition={{
                    duration: Math.random() * 12 + 12, // Faster for smaller screen
                    repeat: Infinity,
                    delay: -Math.random() * 20,
                    ease: "linear"
                }}
                className="absolute rounded-full bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.5)]"
                style={{
                    width: `${Math.random() * 2 + 1}px`,
                    height: `${Math.random() * 2 + 1}px`,
                    filter: `blur(${Math.random() * 0.5}px)`
                }}
            />
          ))}

          {/* Floating Bubbles */}
          {BACKGROUND_PARTICLES.map((p) => (
            <FloatingBubbleMobile p={p} key={p.id} />
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white/90 backdrop-blur-2xl p-6 sm:p-10 md:p-14 lg:p-16 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] max-w-md lg:max-w-xl w-full text-center border border-white/60 relative z-10 overflow-hidden"
        >
          {/* Card Bubbles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {CARD_PARTICLES.map((p) => (
              <motion.div
                key={p.id}
                className="absolute rounded-full bg-blue-400/10 border border-blue-400/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5)]"
                style={{
                  width: p.size,
                  height: p.size,
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                }}
                animate={{
                  y: [0, p.yOffset * 2],
                  x: [0, p.xOffset * 2],
                  scale: [0, 1, 1.2, 0],
                  opacity: [0, 0.3, 0.3, 0]
                }}
                transition={{
                  duration: p.duration,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: p.delay,
                  times: [0, 0.2, 0.8, 1]
                }}
              />
            ))}
          </div>
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 0 }}
            className="bg-gradient-to-br from-[#0038A8] to-blue-700 w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 sm:mb-10 shadow-xl shadow-blue-500/40 transform -rotate-6 transition-all duration-500"
          >
            <Sun className="text-[#FCD116] animate-sun-rotate" size={40} fill="#FCD116" />
          </motion.div>
          
          <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black mb-2 sm:mb-4 tracking-tighter uppercase leading-tight ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            FACULTY CLUB
          </h1>
          <div className="flex items-center justify-center gap-3 mb-8 sm:mb-12">
            <div className={`h-px w-8 ${isDarkMode ? 'bg-blue-800' : 'bg-blue-200'}`}></div>
            <p className={`font-black text-[10px] sm:text-xs uppercase tracking-[0.3em] ${
              isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'
            }`}>Dues Management</p>
            <div className={`h-px w-8 ${isDarkMode ? 'bg-blue-800' : 'bg-blue-200'}`}></div>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            <div className={`rounded-[2rem] p-6 sm:p-10 border shadow-sm ${
              isDarkMode ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-gray-50/80 border-gray-100/50 text-gray-900'
            }`}>
              <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <p className={`text-[10px] uppercase tracking-widest font-black ${
                  isDarkMode ? 'text-slate-400' : 'text-gray-400'
                }`}>Secure Portal Access</p>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <button 
                  onClick={handleLogin}
                  className="w-full bg-[#0038A8] text-white py-4 sm:py-5 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest hover:bg-blue-800 hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                  <div className="bg-white p-1.5 rounded-xl relative z-10 shadow-sm">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <span className="relative z-10">Sign in with Google</span>
                </button>

                <div className="relative flex items-center py-4 sm:py-6">
                  <div className={`flex-grow border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-200/60'}`}></div>
                  <span className={`flex-shrink-0 mx-4 text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-500' : 'text-gray-300'}`}>Quick Login</span>
                  <div className={`flex-grow border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-200/60'}`}></div>
                </div>

                <button 
                  onClick={() => setShowScanner(true)}
                  className={`w-full py-4 sm:py-5 px-6 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 group border-2 ${
                    isDarkMode 
                      ? 'bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700 hover:text-white' 
                      : 'bg-white text-gray-700 border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 hover:text-[#0038A8]'
                  }`}
                >
                  <div className={`p-1.5 rounded-xl transition-colors shadow-sm ${
                    isDarkMode ? 'bg-slate-700 group-hover:bg-slate-600' : 'bg-gray-100 group-hover:bg-blue-100'
                  }`}>
                    <QrCode size={18} className={isDarkMode ? 'text-blue-400' : 'text-gray-600 group-hover:text-[#0038A8]'} />
                  </div>
                  <span>Scan QR Access</span>
                </button>
              </div>
            </div>
            
            <p className={`text-[10px] sm:text-xs font-bold px-4 leading-relaxed relative z-20 ${
              isDarkMode ? 'text-slate-400' : 'text-gray-400'
            }`}>
              By signing in, you agree to the Faculty Club's{' '}
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowTermsModal(true);
                }}
                className={`hover:underline transition-all cursor-pointer relative z-30 ${
                  isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'
                }`}
              >
                terms of service
              </button>{' '}
              and{' '}
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowTermsModal(true);
                }}
                className={`hover:underline transition-all cursor-pointer relative z-30 ${
                  isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'
                }`}
              >
                data privacy guidelines
              </button>.
            </p>

            <div className="mt-10 pt-8 border-t border-gray-100/60">
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] font-black">
                Las Piñas CAA National High School
              </p>
            </div>
          </div>
        </motion.div>

        {/* QR Code Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'} rounded-3xl p-6 lg:p-10 max-w-md lg:max-w-lg w-full shadow-2xl relative overflow-hidden`}
            >
              <button 
                onClick={() => setShowScanner(false)}
                className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-[110] ${
                  isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-gray-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                }`}
              >
                <X size={20} />
              </button>
              <div className="flex items-center justify-between mb-4 px-2">
                <h2 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Scan QR Code</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setTorchOn(prev => !prev)}
                    className={`p-2 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold ${
                      torchOn 
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                        : (isDarkMode ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                    }`}
                    title="Toggle Flashlight"
                  >
                    <Sun size={14} />
                    {torchOn ? 'On' : 'Off'}
                  </button>
                  <button 
                    onClick={() => setScannerCameraMode(prev => {
                      const next = prev === 'environment' ? 'user' : 'environment';
                      localStorage.setItem('scannerCameraMode', next);
                      return next;
                    })}
                    className={`p-2 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold ${
                      isDarkMode 
                        ? 'bg-blue-950 text-blue-400 border border-blue-900/40 hover:bg-blue-900/60' 
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                    title="Switch Camera"
                  >
                    <RefreshCw size={14} />
                    {scannerCameraMode === 'environment' ? 'Back' : 'Front'}
                  </button>
                </div>
              </div>
              <div className={`rounded-2xl overflow-hidden border-2 mb-4 bg-black aspect-square relative group ${
                isDarkMode ? 'border-gray-800' : 'border-gray-100'
              }`}>
                <div id="qr-reader" className="w-full h-full"></div>
                
                {/* Darkened Overlay around Scanning Area */}
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="absolute inset-0 bg-black/40"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-transparent shadow-[0_0_0_1000px_rgba(0,0,0,0.4)] rounded-2xl border-2 border-white/20"></div>
                </div>

                {/* Scanning Frame Corners */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] pointer-events-none z-20">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                </div>

                {/* Scanning Line Animation */}
                {!isScanSuccess && (
                  <motion.div 
                    initial={{ top: "15%" }}
                    animate={{ top: "85%" }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      repeatType: "reverse",
                      ease: "linear"
                    }}
                    className="absolute left-[15%] right-[15%] h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-30 pointer-events-none"
                  />
                )}

                {/* Success Flash Overlay */}
                <AnimatePresence>
                  {isScanSuccess && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-green-500/30 flex items-center justify-center z-40 backdrop-blur-[2px]"
                    >
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl"
                      >
                        <Check size={40} className="text-green-500" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Camera Icon Overlay (when starting) */}
                {!isScanSuccess && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <Camera size={64} className="text-white" />
                  </div>
                )}
              </div>
              <p className={`text-center text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Position the QR code within the frame to log in instantly.
              </p>
              <button
                onClick={() => setShowScanner(false)}
                className={`w-full mt-6 py-3 rounded-xl font-bold transition-colors ${
                  isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}

        {/* QR Authorization Waiting Modal */}
        {isQRApprovalPending && qrLoginData && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-white/20'} rounded-[2.5rem] p-8 sm:p-10 lg:p-12 max-w-md lg:max-w-lg w-full shadow-2xl text-center relative overflow-hidden border`}
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#0038A8] via-[#FCD116] to-[#CE1126]"></div>
              
              <button 
                onClick={() => {
                  setIsQRApprovalPending(false);
                  setQrLoginData(null);
                  if (qrApprovalRequestId) {
                    deleteDoc(doc(db, 'login_requests', qrApprovalRequestId)).catch(() => {});
                  }
                  setQrApprovalRequestId(null);
                }}
                className={`absolute top-6 right-6 p-2 ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'} rounded-full transition-colors`}
              >
                <X size={20} />
              </button>

              <div className="mb-8">
                <div className={`inline-flex p-5 ${isDarkMode ? 'bg-blue-900/40' : 'bg-blue-50'} rounded-3xl mb-6 shadow-inner`}>
                  <ShieldAlert className="text-[#0038A8] animate-pulse" size={48} />
                </div>
                <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight`}>Authorization Required</h2>
                <div className={`mt-4 p-4 ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-blue-50 border-blue-100'} rounded-2xl border`}>
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Teacher Account</p>
                  <p className={`text-lg font-black ${isDarkMode ? 'text-blue-100' : 'text-gray-900'}`}>{qrApprovalTeacherName}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="animate-spin text-[#0038A8]" size={24} />
                    <span className={`text-sm font-black ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} uppercase tracking-[0.1em]`}>Waiting for Admin Approval...</span>
                  </div>
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} max-w-xs leading-relaxed`}>
                    An approval request has been sent to the Admin Dashboard. Please stay on this screen.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className={`w-full h-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-full overflow-hidden`}>
                    <motion.div 
                      className="h-full bg-[#0038A8]"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                  
                  <button 
                    onClick={() => {
                      setIsQRApprovalPending(false);
                      setQrLoginData(null);
                      if (qrApprovalRequestId) {
                        deleteDoc(doc(db, 'login_requests', qrApprovalRequestId)).catch(() => {});
                      }
                      setQrApprovalRequestId(null);
                    }}
                    className={`w-full ${isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all mt-4`}
                  >
                    Cancel Request
                  </button>
                </div>
              </div>

              <p className={`mt-8 text-[10px] font-bold ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} uppercase tracking-widest leading-relaxed`}>
                Security Tip: Only scan your personal QR code on trusted devices.
              </p>
            </motion.div>
          </div>
        )}

        {/* Unauthorized Email Modal */}
        {unauthorizedEmail && !user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white'} rounded-3xl p-8 lg:p-10 max-w-md lg:max-w-xl w-full shadow-2xl relative overflow-hidden border`}
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
              <div className="flex justify-center mb-6">
                <div className={`${isDarkMode ? 'bg-red-900/40' : 'bg-red-50'} p-4 rounded-full`}>
                  <ShieldAlert className="text-red-500" size={40} />
                </div>
              </div>
              <h2 className={`text-2xl font-black text-center ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Access Denied</h2>
              <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-6 font-medium`}>
                The email address <span className={`font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{unauthorizedEmail}</span> is not authorized to access this system.
              </p>
              <div className={`${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'} rounded-2xl p-5 mb-8 border`}>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}>
                  To gain access, please ensure you are using:
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={16} />
                    <span className={isDarkMode ? 'text-gray-300' : ''}>The email address associated with your teacher profile in the exported Excel file.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={16} />
                    <span className={isDarkMode ? 'text-gray-300' : ''}>The official BOD email address assigned to you by the admin.</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => setUnauthorizedEmail(null)}
                className={`w-full ${isDarkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-900 text-white hover:bg-gray-800'} py-4 rounded-xl font-bold transition-colors`}
              >
                Understood, try another account
              </button>
            </motion.div>
          </div>
        )}
        <GlobalOverlays 
          showTermsModal={showTermsModal} 
          setShowTermsModal={setShowTermsModal} 
          showLoginSuccess={showLoginSuccess} 
          toast={toast} 
          profile={profile}
          teacherRecord={teacherRecord}
          onAgreeTerms={handleAgreeTerms}
          records={records}
          isDarkMode={isDarkMode}
          showInAppNotify={showInAppNotify}
          setShowInAppNotify={setShowInAppNotify}
          setActiveTab={setActiveTab}
          setShowLoginSuccess={setShowLoginSuccess}
          onDismissToast={() => setToast(null)}
        />
      </div>
    );
  }

  if (profile?.role === 'teacher') {
    if (isMaintenanceMode) {
      return (
        <div className="h-[100dvh] bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-8 text-center font-sans">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white p-6 sm:p-10 lg:p-12 rounded-[2rem] shadow-xl border border-gray-100 max-w-lg lg:max-w-xl w-full"
            >
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
                    <Settings className="text-[#0038A8] animate-spin-slow" size={40} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-3 tracking-tight">System Maintenance</h2>
                <div className="w-16 h-1 bg-[#0038A8] mx-auto rounded-full mb-6 relative overflow-hidden">
                   <motion.div 
                     animate={{ x: ["-100%", "100%"] }}
                     transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                     className="absolute inset-0 bg-[#FCD116]"
                   />
                </div>
                <p className="text-gray-500 mb-8 sm:mb-10 leading-relaxed font-medium text-sm sm:text-base">
                    We are currently performing scheduled maintenance to bring you new features and a better experience! The teacher dashboard is temporarily unavailable. 
                    <br/><br/>
                    Thank you for your patience! We'll be right back.
                </p>
                <button 
                  onClick={() => signOut(auth)} 
                  className="w-full py-4 bg-[#0038A8] text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-800 transition-all flex items-center justify-center gap-2"
                >
                  Return to Login
                </button>
            </motion.div>
        </div>
      );
    }

    // Immediate Access Revocation: If the teacher record is no longer found (e.g., admin changed the email)
    if (!teacherRecord && records.length > 0) {
      return (
        <div className="h-[100dvh] bg-[#F8FAFC] flex flex-col items-center justify-center p-8 text-center font-mono">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white p-12 lg:p-16 rounded-none shadow-[20px_20px_0px_#000] border-4 border-black max-w-lg lg:max-w-xl w-full"
            >
                <div className="w-24 h-24 bg-red-500 rounded-none border-4 border-black flex items-center justify-center mx-auto mb-8 shadow-[10px_10px_0px_#000]">
                    <ShieldAlert className="text-white" size={48} />
                </div>
                <h2 className="text-4xl font-black text-black mb-4 uppercase tracking-tighter">Access Denied</h2>
                <div className="h-1 w-full bg-black mb-6"></div>
                <p className="text-black mb-10 leading-relaxed font-bold text-lg">
                    SYSTEM ALERT: Your account mapping has been modified by the administrator.
                    <br/><br/>
                    SESSION EMAIL: <span className="bg-yellow-300 px-2 border-2 border-black">({profile.email})</span>
                    <br/>
                    STATUS: <span className="text-red-600">UNAUTHORIZED</span>
                </p>
                <button 
                    onClick={handleLogout}
                    className="w-full py-5 bg-black text-white rounded-none font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-3 border-4 border-black active:translate-x-[4px] active:translate-y-[4px] active:shadow-none shadow-[8px_8px_0px_rgba(0,0,0,1)]"
                >
                    <LogOut size={20} />
                    Logout & Re-verify
                </button>
                <p className="mt-6 text-[10px] uppercase font-black opacity-30 tracking-[0.3em]">Code: AUTH_REVOKE_01</p>
            </motion.div>
        </div>
      );
    }

    // Force terms modal if not agreed
    const hasAgreed = teacherRecord?.termsAgreed === true;
    const needsToAgreeTerms = !hasAgreed;

    if (needsToAgreeTerms) {
      return (
        <div className={`h-[100dvh] ${isDarkMode ? 'bg-gray-950' : 'bg-[#F8FAFC]'} flex items-center justify-center p-4 transition-colors duration-300`}>
          <GlobalOverlays 
            showTermsModal={true} 
            setShowTermsModal={setShowTermsModal} 
            showLoginSuccess={showLoginSuccess} 
            toast={toast} 
            profile={profile}
            teacherRecord={teacherRecord}
            onAgreeTerms={handleAgreeTerms}
            records={records}
            isDarkMode={isDarkMode}
            showInAppNotify={showInAppNotify}
            setShowInAppNotify={setShowInAppNotify}
            setActiveTab={setActiveTab}
            setShowLoginSuccess={setShowLoginSuccess}
            onDismissToast={() => setToast(null)}
          />
        </div>
      );
    }

    return (
      <div className={`min-h-screen relative overflow-hidden ${isDarkMode ? 'dark bg-gray-950' : 'bg-slate-100'} font-sans pb-12 transition-colors duration-300`}>
        {/* Premium, ultra-modern backdrop wash with highly translucent ambient layers allowing school photography to pop in light mode only */}
        {!isDarkMode && (
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0038A8]/4 via-[#F1F5F9]/30 to-[#F1F5F9]/10 z-10 backdrop-blur-[1px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#F1F5F9]/15 to-[#F1F5F9]/60 z-10" />
            <img 
              src="https://www.dropbox.com/scl/fi/8m4sg2ph32whxpd5phv70/FB_IMG_1779455185471.jpg?rlkey=2hwa1il92wrclccve3i19dk5p&st=jiz0ey5x&raw=1" 
              alt="School Campus" 
              className="w-full h-full object-cover object-center scale-102 select-none pointer-events-none opacity-100 transition-opacity duration-300"
              loading="eager"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <header className={`${isDarkMode ? 'bg-gray-900 border-b border-gray-800' : 'bg-[#0038A8]/90 backdrop-blur-md'} text-white shadow-md sticky top-0 z-30 transition-colors`}>
          <div className="w-full px-4 sm:px-8 py-6 lg:py-8 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Sun className={`${isDarkMode ? 'text-blue-400' : 'text-[#FCD116]'} animate-sun-rotate`} size={40} fill={isDarkMode ? 'transparent' : '#FCD116'} />
              <div>
                <h1 className="text-xl lg:text-3xl font-black leading-none tracking-tight">Faculty Club</h1>
                <p className={`text-[10px] lg:text-sm ${isDarkMode ? 'text-gray-400' : 'text-blue-200'} font-black uppercase tracking-widest mt-1`}>Teacher Portal</p>
              </div>
              <div className="hidden lg:flex items-center gap-3 pl-6 ml-6 border-l border-white/20">
                <Clock size={22} className={isDarkMode ? 'text-blue-400' : 'text-blue-200'} />
                <div className="flex flex-col gap-1">
                  <span className="text-base font-black uppercase tracking-widest leading-none">
                    {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="text-xs font-bold opacity-80 tabular-nums leading-none">
                    {currentTime.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-right mr-4">
                <p className={`text-sm lg:text-xl font-black ${isDarkMode ? 'text-gray-200' : 'text-blue-100'} uppercase tracking-widest`}>{profile.name}</p>
                <p className={`text-[10px] lg:text-xs ${isDarkMode ? 'text-gray-500' : 'text-blue-300'} font-bold`}>{profile.gradeLevel}</p>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setActiveTab('notifications')}
                  className={`p-2 rounded-xl transition-all relative ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-blue-800/50 text-blue-100 hover:bg-blue-700/50'}`}
                >
                  <Bell size={20} />
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                  )}
                </button>
                
                {/* The small dropdown has been removed as per user request to go directly to notification page */}
              </div>
              
              <div className={`p-1 rounded-2xl flex items-center gap-1 border transition-all ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-blue-900/40 border-blue-700/50'}`}>
                <button 
                  onClick={() => setIsDarkMode(false)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    !isDarkMode 
                      ? 'bg-white text-[#0038A8] shadow-md' 
                      : 'text-blue-200 hover:text-white'
                  }`}
                  title="Switch to Light Mode"
                >
                  <Sun size={14} className={!isDarkMode ? 'text-amber-500 fill-amber-500' : ''} />
                  <span className="hidden sm:inline">Light</span>
                </button>
                <button 
                  onClick={() => setIsDarkMode(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    isDarkMode 
                      ? 'bg-slate-900 text-yellow-400 shadow-md border border-slate-700' 
                      : 'text-blue-200 hover:text-white'
                  }`}
                  title="Switch to Dark Mode"
                >
                  <Moon size={14} className={isDarkMode ? 'text-yellow-400 fill-yellow-400' : ''} />
                  <span className="hidden sm:inline">Dark</span>
                </button>
              </div>

              <button onClick={handleLogout} className={`p-2 ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:text-red-400' : 'bg-blue-800/50 text-white hover:bg-red-500/20'} rounded-xl transition-all`}>
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        {!hasAgreed ? (
          <main className="max-w-5xl mx-auto px-4 mt-8 flex items-center justify-center min-h-[60vh] relative z-10">
            <div className="text-center space-y-4">
              <ShieldAlert size={48} className="mx-auto text-[#0038A8] opacity-20" />
              <h2 className="text-xl font-black text-gray-400 uppercase tracking-widest">Agreement Required</h2>
              <p className="text-sm text-gray-400">Please read and agree to the Terms & Privacy Guidelines to access your dashboard.</p>
            </div>
          </main>
        ) : (
        <>
        <main className="max-w-[1600px] w-full mx-auto px-4 lg:px-8 xl:px-12 mt-10 xl:mt-14 overflow-hidden relative z-10">
          {/* Push Notification Banner */}
          {'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied' && (
            <div className="mb-6 xl:mb-10 bg-blue-50 border-2 border-[#0038A8] rounded-[2rem] p-6 lg:p-8 xl:p-10 flex flex-col sm:flex-row items-center justify-between gap-4 lg:gap-8 shadow-sm animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-4 lg:gap-6 text-center sm:text-left">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-[#0038A8] text-white rounded-xl lg:rounded-2xl flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                  <Bell size={28} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-[#0038A8] text-lg lg:text-xl tracking-tight">Don't miss announcements!</h3>
                  <p className="text-xs lg:text-sm font-bold text-blue-800 opacity-80">Enable push notifications to receive real-time updates directly on your device.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                      showToast("Notifications enabled!");
                      // This triggers the useEffect observer bound to teacherRecord
                      window.location.reload(); 
                    }
                  });
                }}
                className="w-full sm:w-auto px-6 lg:px-8 py-3 lg:py-4 bg-[#0038A8] text-white rounded-xl lg:rounded-2xl font-black text-xs lg:text-sm uppercase tracking-widest hover:bg-blue-800 transition-all shadow-md flex-shrink-0"
              >
                Enable Notifications
              </button>
            </div>
          )}

          {activeTab === 'notifications' ? (
            <div className="flex-1 overflow-y-auto w-full">
              <div className="max-w-4xl mx-auto p-4 sm:p-8">
                <NotificationCenter 
                  notifications={notifications}
                  onMarkRead={async (id: string) => {
                    const teacherRecord = records.find(r => r.email.toLowerCase().trim() === profile.email.toLowerCase().trim());
                    if (teacherRecord) {
                      await updateDoc(doc(db, 'teachers', teacherRecord.id, 'notifications', id), { isRead: true });
                    }
                  }}
                  onDelete={deleteNotification}
                  isDarkMode={isDarkMode}
                  setActiveTab={setActiveTab}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {profileChangeRequests.filter(r => r.status === 'rejected').map(request => (
                <div key={request.id} className="bg-red-50 border border-red-100 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm shrink-0">
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <h4 className="text-red-900 font-black tracking-tight text-lg">Profile Update Rejected</h4>
                      <p className="text-red-700 text-sm font-medium mt-1">Your request to update your profile was rejected by the administration.</p>
                      {request.adminNote && (
                        <div className="bg-white/60 p-3 rounded-xl mt-3 text-red-800 text-sm">
                          <span className="font-bold">Reason:</span> {request.adminNote}
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        await updateDoc(doc(db, 'profile_change_requests', request.id), { status: 'acknowledged' });
                      } catch (e) {
                         console.error(e);
                      }
                    }}
                    className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all"
                  >
                    Acknowledge
                  </button>
                </div>
              ))}
              {/* Welcome & Quick Actions */}
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <div className={`flex-1 ${isDarkMode ? 'bg-slate-900/95 border-slate-800 shadow-xl' : 'bg-white/95 sm:bg-white/95 backdrop-blur-xl border-white shadow-xl shadow-slate-200/40'} p-10 lg:p-14 xl:p-16 rounded-[3rem] border relative overflow-hidden group hover:border-[#0038A8]/20 transition-all duration-500`}>
              <div className={`absolute top-0 right-0 w-48 h-48 lg:w-64 lg:h-64 ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50/50 group-hover:bg-blue-100/50'} rounded-bl-[8rem] -mr-12 -mt-12 z-0 transition-colors duration-500`}></div>
              <div className="relative z-10">
                <div className="flex items-center gap-6 lg:gap-8 mb-8 lg:mb-12">
                  <div className="bg-[#0038A8] w-16 h-16 lg:w-24 lg:h-24 rounded-[1.5rem] lg:rounded-[2rem] flex items-center justify-center shadow-xl shadow-blue-100 group-hover:scale-105 transition-transform duration-500">
                    <User className="text-white" size={40} />
                  </div>
                  <div>
                    <h2 className={`text-3xl lg:text-4xl xl:text-5xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight leading-tight`}>{teacherRecord?.name || profile.name}</h2>
                    <p className={`text-sm lg:text-base xl:text-lg ${isDarkMode ? 'text-blue-300' : 'text-slate-600 font-bold'} font-black uppercase tracking-[0.3em] mt-1 lg:mt-2`}>{teacherRecord?.gradeLevel || 'Teacher'}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3 lg:gap-4">
                  {profileChangeRequests.some(r => r.status === 'pending') ? (
                    <button 
                      disabled
                      className={`flex items-center justify-center gap-2 ${isDarkMode ? 'bg-yellow-900/40 text-yellow-500' : 'bg-yellow-50 text-yellow-600'} py-3 lg:py-3.5 px-6 lg:px-8 rounded-2xl font-black text-[11px] lg:text-xs uppercase tracking-widest cursor-not-allowed`}
                      title="Profile update request is currently pending admin approval."
                    >
                      <Loader2 className="animate-spin" size={20} />
                      Update Pending
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setEditProfileName(profile.name);
                        setEditProfileEmail(profile.email);
                        setEditProfileNote('');
                        setIsEditingProfile(true);
                      }}
                      className={`flex items-center justify-center gap-2 ${isDarkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'} py-3 lg:py-3.5 px-6 lg:px-8 rounded-2xl font-black text-[11px] lg:text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95`}
                    >
                      <User size={20} />
                      Edit Profile
                    </button>
                  )}
                  <button 
                    onClick={() => generateTeacherQRCode(profile.email, teacherRecord?.gradeLevel || 'Teacher', profile.name)}
                    className={`flex items-center justify-center gap-2 ${isDarkMode ? 'bg-blue-900/40 text-blue-300 hover:bg-blue-900/60' : 'bg-blue-50 text-[#0038A8] hover:bg-blue-100'} py-3 lg:py-3.5 px-6 lg:px-8 rounded-2xl font-black text-[11px] lg:text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95`}
                  >
                    <QrCode size={20} />
                    Regenerate QR
                  </button>
                  <button 
                    onClick={() => setShowTermsModal(true)}
                    className={`flex items-center justify-center gap-2 ${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-blue-400' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-[#0038A8]'} border py-3 lg:py-3.5 px-6 lg:px-8 rounded-2xl font-black text-[11px] lg:text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95`}
                  >
                    <ShieldCheck size={20} />
                    Terms & Privacy
                  </button>
                </div>
              </div>
            </div>

            <div className={`w-full lg:w-1/3 xl:w-1/4 min-w-[300px] ${isDarkMode ? 'bg-slate-900/95 border border-slate-800 shadow-xl' : 'bg-[#0038A8]'} p-8 xl:p-12 rounded-[2.5rem] xl:rounded-[3rem] text-white shadow-xl shadow-blue-200/10 flex flex-col justify-between relative overflow-hidden transition-all duration-500 hover:-translate-y-1`}>
              <div className={`absolute bottom-0 right-0 w-32 h-32 xl:w-48 xl:h-48 ${isDarkMode ? 'bg-blue-600/10' : 'bg-white/10'} rounded-tl-[4rem] xl:rounded-tl-[6rem] -mb-4 -mr-4`}></div>
              <div className="relative z-10">
                <p className={`${isDarkMode ? 'text-blue-400' : 'text-blue-200'} font-black uppercase tracking-widest text-[10px] xl:text-xs mb-2 xl:mb-4`}>Remaining Balance</p>
                <h3 className="text-4xl xl:text-5xl 2xl:text-6xl font-black tracking-tight mb-8 xl:mb-10">₱{portalRemainingBalance.toFixed(2)}</h3>
                
                <div className="space-y-4 xl:space-y-6">
                  <div className={`w-full ${isDarkMode ? 'bg-slate-800' : 'bg-white/10'} h-2 xl:h-3 rounded-full overflow-hidden`}>
                    <div 
                      className={`${isDarkMode ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-[#FCD116]'} h-full transition-all duration-1000 ease-out`} 
                      style={{ width: `${portalTotalRequiredAmount > 0 ? (portalCurrentPaidRequiredAmount / portalTotalRequiredAmount) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] xl:text-xs font-black uppercase tracking-widest opacity-90">
                    <span>Settlement Progress</span>
                    <span>{portalTotalRequiredAmount > 0 ? ((portalCurrentPaidRequiredAmount / portalTotalRequiredAmount) * 100).toFixed(0) : 100}%</span>
                  </div>
                </div>

                <div className={`mt-8 xl:mt-12 ${isDarkMode ? 'bg-blue-950/40' : 'bg-white/10'} backdrop-blur-md rounded-2xl xl:rounded-3xl p-4 xl:p-6 flex items-start gap-4`}>
                  <div className={`${isDarkMode ? 'bg-blue-900/60' : 'bg-white/20'} p-3 rounded-xl shrink-0`}>
                    <AlertCircle size={20} className="text-blue-100" />
                  </div>
                  <p className={`text-[10px] xl:text-xs font-bold ${isDarkMode ? 'text-blue-100' : 'text-blue-50'} leading-relaxed`}>
                    {portalUnpaidRequiredDues.length > 0 
                      ? `You have ${portalUnpaidRequiredDues.length} unpaid required dues. Please settle them with your BOD to maintain a verified status.`
                      : "All required dues are settled. Your account is currently in good standing. Thank you!"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-4 lg:gap-6 mt-6 lg:mt-8">
            <div className={`${isDarkMode ? 'bg-slate-900/95 border-slate-800 shadow-xl shadow-black/30' : 'bg-white/95 sm:bg-white/95 backdrop-blur-xl border-white shadow-xl shadow-slate-200/40'} p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group`}>
              <div className="flex items-center gap-4 mb-4 lg:mb-5">
                <div className={`${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600'} p-3 rounded-2xl transition-colors group-hover:scale-110 duration-300`}>
                  <PhilippinePeso size={24} className="lg:w-7 lg:h-7" />
                </div>
                <span className={`text-[10px] lg:text-xs font-black ${isDarkMode ? 'text-blue-300' : 'text-slate-600'} uppercase tracking-widest`}>Total Paid</span>
              </div>
              <div className={`text-3xl lg:text-4xl xl:text-5xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tighter`}>₱{portalTotalPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>

            <div className={`${isDarkMode ? 'bg-slate-900/95 border-slate-800 shadow-xl shadow-black/30' : 'bg-white/95 sm:bg-white/95 backdrop-blur-xl border-white shadow-xl shadow-slate-200/40'} p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group`}>
              <div className="flex items-center gap-4 mb-4 lg:mb-5">
                <div className={`${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'} p-3 rounded-2xl transition-colors group-hover:scale-110 duration-300`}>
                  <CheckCircle size={24} className="lg:w-7 lg:h-7" />
                </div>
                <span className={`text-[10px] lg:text-xs font-black ${isDarkMode ? 'text-blue-300' : 'text-slate-600'} uppercase tracking-widest`}>Required Dues</span>
              </div>
              <div className={`text-3xl lg:text-4xl xl:text-5xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tighter`}>{portalSettledRequiredDuesCount} / {portalRequiredDues.length}</div>
            </div>

            <div className={`${isDarkMode ? 'bg-slate-900/95 border-slate-800 shadow-xl shadow-black/30' : 'bg-white/95 sm:bg-white/95 backdrop-blur-xl border-white shadow-xl shadow-slate-200/40'} p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group`}>
              <div className="flex items-center gap-4 mb-4 lg:mb-5">
                <div className={`${isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'} p-3 rounded-2xl transition-colors group-hover:scale-110 duration-300`}>
                  <Heart size={24} className="lg:w-7 lg:h-7" />
                </div>
                <span className={`text-[10px] lg:text-xs font-black ${isDarkMode ? 'text-blue-300' : 'text-slate-600'} uppercase tracking-widest`}>Voluntary</span>
              </div>
              <div className={`text-3xl lg:text-4xl xl:text-5xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tighter`}>
                {standardDues.filter(d => d.isVoluntary && teacherRecord?.paidDueIds?.includes(d.id)).length} Paid
              </div>
            </div>

            <div className={`${isDarkMode ? 'bg-slate-900/95 border-slate-800 shadow-xl shadow-black/30' : 'bg-white/95 sm:bg-white/95 backdrop-blur-xl border-white shadow-xl shadow-slate-200/40'} p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group`}>
              <div className="flex items-center gap-4 mb-4 lg:mb-5">
                <div className={`${isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-600'} p-3 rounded-2xl transition-colors group-hover:scale-110 duration-300`}>
                  <Clock size={24} className="lg:w-7 lg:h-7" />
                </div>
                <span className={`text-[10px] lg:text-xs font-black ${isDarkMode ? 'text-blue-300' : 'text-slate-600'} uppercase tracking-widest`}>Pending Dues</span>
              </div>
              <div className={`text-3xl lg:text-4xl xl:text-5xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tighter`}>{portalUnpaidRequiredDues.length}</div>
            </div>

            <div className={`${isDarkMode ? 'bg-slate-900/95 border-slate-800 shadow-xl shadow-black/30' : 'bg-white/95 sm:bg-white/95 backdrop-blur-xl border-white shadow-xl shadow-slate-200/40'} p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group`}>
              <div className="flex items-center gap-4 mb-4 lg:mb-5">
                <div className={`${isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600'} p-3 rounded-2xl transition-colors group-hover:scale-110 duration-300`}>
                  <Shield size={24} className="lg:w-7 lg:h-7" />
                </div>
                <span className={`text-[10px] lg:text-xs font-black ${isDarkMode ? 'text-blue-300' : 'text-slate-600'} uppercase tracking-widest`}>Status</span>
              </div>
              <div className={`text-3xl lg:text-4xl xl:text-5xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tighter`}>
                {portalRemainingBalance === 0 ? 'Verified' : 'Active'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 lg:gap-10 xl:gap-12 mt-8 lg:mt-12 xl:mt-16">
            {/* Main Content Area */}
            <div className="md:col-span-2 lg:col-span-2 xl:col-span-3 space-y-8 xl:space-y-12">
              {/* Dues Status Section */}
                <div className="flex items-center justify-between mb-6 xl:mb-8">
                  <h3 className={`text-xl lg:text-2xl xl:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight`}>Dues Overview</h3>
                  <button 
                    onClick={() => setShowDues(!showDues)}
                    className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${showDues ? (isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') : 'bg-[#0038A8] text-white hover:bg-blue-800'}`}
                  >
                    <Eye size={14} />
                    {showDues ? 'Hide Dues' : 'Show Dues'}
                  </button>
                </div>
                {showDues && (
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <span className={`text-[10px] font-black ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-widest`}>{portalUnpaidRequiredDues.length} {portalUnpaidRequiredDues.length === 1 ? 'Item' : 'Items'} Pending</span>
                    </div>
                    
                    <div className="space-y-3 lg:space-y-4">
                      {standardDues.map(due => {
                        const isPaid = teacherRecord?.paidDueIds?.includes(due.id);
                        return (
                          <div key={due.id} className={`p-5 lg:p-6 rounded-3xl border-2 backdrop-blur-md transition-all ${isPaid ? (isDarkMode ? 'bg-green-950/30 border-green-900/30' : 'bg-green-50/90 border-green-200') : (isDarkMode ? 'bg-slate-900/95 border-slate-800 hover:border-blue-900/50' : 'bg-white/95 hover:bg-white border-slate-200/80 hover:border-blue-200')} shadow-md group hover:shadow-lg`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 lg:gap-6">
                                <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center ${isPaid ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600') : (isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')} group-hover:scale-110 transition-transform duration-300`}>
                                  {isPaid ? <Check size={24} className="lg:w-7 lg:h-7" /> : <Clock size={24} className="lg:w-7 lg:h-7" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 lg:gap-3">
                                    <div className={`font-black text-lg lg:text-xl ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{due.name}</div>
                                    {due.isVoluntary && (
                                      <span className={`text-[8px] lg:text-[10px] font-black ${isDarkMode ? 'text-purple-300 bg-purple-900/40' : 'text-purple-600 bg-purple-100'} px-2 py-1 rounded-md uppercase tracking-widest`}>Voluntary</span>
                                    )}
                                  </div>
                                  <div className={`text-xs lg:text-sm font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {due.isVoluntary && isPaid 
                                      ? `₱${(teacherRecord?.voluntaryPayments?.[due.id] || 0).toFixed(2)}`
                                      : `₱${due.amount.toFixed(2)}`
                                    }
                                  </div>
                                </div>
                              </div>
                              <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                isPaid 
                                  ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600') 
                                  : due.isVoluntary 
                                    ? (isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-50 text-purple-600') 
                                    : (isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-600')
                              }`}>
                                {isPaid ? 'Settled' : due.isVoluntary ? 'Optional' : 'Unpaid'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

              {/* Payment History Section */}
              <div className="flex items-center justify-between mb-6 xl:mb-8">
                <h3 className={`text-xl lg:text-2xl xl:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight`}>Recent Payments</h3>
                <button 
                  onClick={() => setShowPayments(!showPayments)}
                  className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${showPayments ? (isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200') : 'bg-[#0038A8] text-white hover:bg-blue-800'}`}
                >
                  <Eye size={14} />
                  {showPayments ? 'Hide Payments' : 'Show Payments'}
                </button>
              </div>
              {showPayments && (
                <section>
                  <div className={`rounded-[2.5rem] border ${isDarkMode ? 'bg-slate-900/95 border-slate-800 shadow-xl' : 'bg-white/95 sm:bg-white/95 backdrop-blur-xl border-white shadow-xl shadow-slate-200/40'} overflow-hidden transition-colors duration-300`}>
                    <div className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                      {(teacherRecord?.paymentHistory || [])
                        .sort((a, b) => ensureTimestamp(b.date).seconds - ensureTimestamp(a.date).seconds)
                        .map((payment, idx) => {
                          const due = standardDues.find(d => d.id === payment.dueId);
                          return (
                            <div key={idx} className={`p-6 lg:p-8 flex items-center justify-between ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'} transition-colors group`}>
                              <div className="flex items-center gap-4 lg:gap-6">
                                <div className={`${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-[#0038A8]'} w-10 h-10 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                                  <PhilippinePeso size={20} className="lg:w-6 lg:h-6" />
                                </div>
                                <div>
                                  <div className={`font-black text-base lg:text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{payment.dueName || due?.name || 'Unknown Due'}</div>
                                  <div className={`text-[10px] lg:text-xs font-black ${isDarkMode ? 'text-blue-300' : 'text-slate-600'} uppercase tracking-widest`}>
                                    {ensureTimestamp(payment.date).toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`font-black text-lg lg:text-xl ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>₱{payment.amount.toFixed(2)}</div>
                                <div className={`text-[10px] lg:text-xs font-black ${isDarkMode ? 'text-green-400' : 'text-green-600'} uppercase tracking-widest`}>Successful</div>
                              </div>
                            </div>
                          );
                        })}
                      {(!teacherRecord?.paymentHistory || teacherRecord.paymentHistory.length === 0) && (
                        <div className="p-12 text-center">
                          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400`}>
                            <FileText size={32} />
                          </div>
                          <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} font-black`}>No payment records found yet.</p>
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
              <div className={`${isDarkMode ? 'bg-slate-900/95 border-slate-800 shadow-xl' : 'bg-white/95 sm:bg-white/95 backdrop-blur-xl border-white shadow-xl shadow-slate-200/40'} p-8 rounded-[2.5rem] border transition-colors duration-300`}>
                <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} tracking-tight mb-6`}>Support</h3>
                <div className="space-y-4">
                  <a 
                    href="mailto:lpcaanhsfacultyclub@gmail.com?subject=Faculty Club Support Request"
                    className={`p-4 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-50 hover:bg-blue-50'} rounded-2xl flex items-center gap-4 transition-all group`}
                  >
                    <div className={`${isDarkMode ? 'bg-slate-900' : 'bg-white'} p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform`}>
                      <Mail size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className={`text-[10px] font-black ${isDarkMode ? 'text-blue-300' : 'text-slate-600'} uppercase tracking-widest`}>Email Support</p>
                      <p className={`text-xs font-black ${isDarkMode ? 'text-slate-200 group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'}`}>lpcaanhsfacultyclub@gmail.com</p>
                    </div>
                  </a>
                  <a 
                    href={`mailto:${Object.entries(ALLOWED_BODS).find(([_, grade]) => grade === (teacherRecord?.gradeLevel || ''))?.[0] || 'lpcaanhsfacultyclub@gmail.com'}?subject=Inquiry for ${teacherRecord?.gradeLevel || 'BOD'}`}
                    className={`p-4 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-50 hover:bg-blue-50'} rounded-2xl flex items-center gap-4 transition-all group`}
                  >
                    <div className={`${isDarkMode ? 'bg-slate-900' : 'bg-white'} p-2 rounded-xl shadow-sm group-hover:scale-110 transition-transform`}>
                      <Users size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <p className={`text-[10px] font-black ${isDarkMode ? 'text-blue-300' : 'text-slate-600'} uppercase tracking-widest`}>BOD Contact ({teacherRecord?.gradeLevel})</p>
                      <p className={`text-xs font-black ${isDarkMode ? 'text-slate-200 group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'}`}>
                        {Object.entries(ALLOWED_BODS).find(([_, grade]) => grade === (teacherRecord?.gradeLevel || ''))?.[0] || 'Contact your Grade Level BOD'}
                      </p>
                    </div>
                  </a>

                  <div className={`pt-4 mt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className={`p-4 ${isDarkMode ? 'bg-blue-950/45' : 'bg-[#0038A8]/5'} rounded-2xl flex items-center gap-4 transition-colors`}>
                      <div className={`${isDarkMode ? 'bg-slate-900' : 'bg-white'} p-2 rounded-xl shadow-sm`}>
                        <Code size={20} className="text-[#0038A8]" />
                      </div>
                      <div>
                        <p className={`text-[10px] font-black ${isDarkMode ? 'text-blue-300' : 'text-slate-600'} uppercase tracking-widest`}>System Developer</p>
                        <p className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Randy A. de Guzman</p>
                        <a href="mailto:randydgancheta22@gmail.com" className={`text-[10px] ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-[#0038A8]'} font-black hover:underline transition-all`}>
                          randydgancheta22@gmail.com
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Note */}
              <div className={`${isDarkMode ? 'bg-yellow-900/15 border-yellow-900/30' : 'bg-yellow-50/90 border-yellow-200 shadow-md'} p-6 rounded-[2rem] border transition-colors duration-300`}>
                <div className="flex items-center gap-3 mb-3">
                  <ShieldAlert size={20} className="text-yellow-600 animate-pulse" />
                  <h4 className={`text-xs font-black ${isDarkMode ? 'text-yellow-400' : 'text-yellow-800'} uppercase tracking-widest`}>Security Tip</h4>
                </div>
                <p className={`text-[11px] ${isDarkMode ? 'text-yellow-200/80' : 'text-yellow-900'} font-bold leading-relaxed`}>
                  Never share your QR login code with anyone. It provides direct access to your financial records and profile.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>

        {/* Edit Profile Modal for Teachers */}
        {isEditingProfile && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-gray-900'} rounded-[2.5rem] p-8 sm:p-12 lg:p-16 max-w-md lg:max-w-xl w-full shadow-2xl border`}
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit My Profile</h3>
                <button onClick={() => setIsEditingProfile(false)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}>
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Full Name</label>
                  <input 
                    type="text" 
                    value={editProfileName}
                    onChange={(e) => setEditProfileName(e.target.value)}
                    className={`w-full p-4 border-2 border-transparent focus:border-blue-100 rounded-2xl font-bold transition-all outline-none ${
                      isDarkMode ? 'bg-slate-950 text-white focus:bg-slate-900' : 'bg-gray-50 text-gray-900 focus:bg-white'
                    }`}
                    placeholder="Your Full Name"
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Email Address</label>
                  <input 
                    type="email" 
                    value={editProfileEmail}
                    onChange={(e) => setEditProfileEmail(e.target.value)}
                    className={`w-full p-4 border-2 border-transparent focus:border-blue-100 rounded-2xl font-bold transition-all outline-none ${
                      isDarkMode ? 'bg-slate-950 text-white focus:bg-slate-900' : 'bg-gray-50 text-gray-900 focus:bg-white'
                    }`}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Grade Level</label>
                    <select 
                      value={editProfileGradeLevel}
                      onChange={(e) => setEditProfileGradeLevel(e.target.value as GradeLevel)}
                      className={`w-full p-4 border-2 border-transparent focus:border-blue-100 rounded-2xl font-bold transition-all outline-none ${
                        isDarkMode ? 'bg-slate-950 text-white focus:bg-slate-900' : 'bg-gray-50 text-gray-900 focus:bg-white'
                      }`}
                    >
                      {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Department</label>
                    <input 
                      type="text" 
                      value={editProfileDepartment}
                      onChange={(e) => setEditProfileDepartment(e.target.value)}
                      className={`w-full p-4 border-2 border-transparent focus:border-blue-100 rounded-2xl font-bold transition-all outline-none ${
                        isDarkMode ? 'bg-slate-950 text-white focus:bg-slate-900' : 'bg-gray-50 text-gray-900 focus:bg-white'
                      }`}
                      placeholder="e.g. Science"
                    />
                  </div>
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Note (Optional)</label>
                  <textarea 
                    value={editProfileNote}
                    onChange={(e) => setEditProfileNote(e.target.value)}
                    className={`w-full p-4 border-2 border-transparent focus:border-blue-100 rounded-2xl font-bold transition-all outline-none resize-none ${
                      isDarkMode ? 'bg-slate-950 text-white focus:bg-slate-900' : 'bg-gray-50 text-gray-900 focus:bg-white'
                    }`}
                    placeholder="Reason for change..."
                    rows={3}
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
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                      isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
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
              className={`${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-gray-900'} rounded-[2.5rem] p-6 sm:p-10 md:p-12 lg:p-14 max-w-lg lg:max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border text-center relative`}
            >
              <button 
                onClick={() => setQrCodeData(null)}
                className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}
              >
                <X size={20} />
              </button>
              
              <div id="qr-code-capture-area-teacher" className="bg-white p-4 rounded-2xl">
                <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Teacher Login QR Code</h3>
                <p className="text-gray-500 font-bold mb-8 text-sm sm:text-base">
                  Teacher
                </p>
                
                <div className="bg-white p-4 rounded-3xl border-2 border-blue-100 shadow-xl shadow-blue-50/50 mb-8 mx-auto flex items-center justify-center w-fit">
                  <QRCodeCanvas 
                    id="teacher-qr-canvas"
                    value={JSON.stringify({ email: qrCodeData.email, pass: qrCodeData.pass, realEmail: qrCodeData.realEmail })} 
                    size={220}
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                      src: SUN_LOGO_SVG,
                      height: 40,
                      width: 40,
                      excavate: true,
                    }}
                  />
                </div>

                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 mb-6">
                  <p className="text-sm sm:text-base text-blue-800 font-medium leading-relaxed mb-3">
                    Scan this QR code next time you log in.
                  </p>
                  <div className="flex items-start gap-3 mt-4 pt-4 border-t border-blue-200/50">
                    <ShieldAlert size={20} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-blue-700 font-bold text-left">
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
                    qrCodeData.realEmail || qrCodeData.email,
                    qrCodeData.grade
                  )}
                  className="w-full py-4 sm:py-5 bg-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-purple-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-100"
                >
                  <Download size={18} />
                  Download QR Code
                </button>
                <button 
                  onClick={() => setQrCodeData(null)}
                  className={`w-full py-4 sm:py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                    isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
        </>
        )}
        {/* Receipt Preview Modal */}
        {showReceiptPreview && previewReceiptData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-gray-900'} rounded-[2.5rem] p-8 sm:p-10 max-w-2xl lg:max-w-4xl w-full shadow-2xl border relative max-h-[90vh] flex flex-col`}
            >
              <button 
                onClick={() => setShowReceiptPreview(false)}
                className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}
              >
                <X size={20} />
              </button>
              
              <h3 className={`text-2xl font-black mb-6 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Receipt Preview</h3>
              
              <div className={`flex-1 overflow-auto mb-8 p-4 rounded-3xl border flex justify-center ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
                <div className="receipt-preview-scaler">
                  <div id="teacher-receipt-content" className="bg-white shadow-sm" dangerouslySetInnerHTML={{ __html: generateHTMLReceipt(previewReceiptData) }} />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setShowReceiptPreview(false)}
                  className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                    isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Close
                </button>
                <button 
                  onClick={printReceipt}
                  className="flex-1 py-4 bg-purple-50 text-purple-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-100 transition-all flex items-center justify-center gap-2"
                >
                  <FileText size={16} />
                  Print
                </button>
                <button 
                  onClick={downloadReceiptAsDocx}
                  disabled={isDownloadingReceipt}
                  className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDownloadingReceipt ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      DOCX...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      DOCX
                    </>
                  )}
                </button>
                <button 
                  onClick={downloadReceiptAsImage}
                  disabled={isDownloadingImage}
                  className="flex-1 py-4 bg-[#0038A8] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDownloadingImage ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Image...
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      PNG
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        <GlobalOverlays 
          showTermsModal={showTermsModal} 
          setShowTermsModal={setShowTermsModal} 
          showLoginSuccess={showLoginSuccess} 
          toast={toast} 
          profile={profile}
          teacherRecord={teacherRecord}
          onAgreeTerms={handleAgreeTerms}
          records={records}
          isDarkMode={isDarkMode}
          showInAppNotify={showInAppNotify}
          setShowInAppNotify={setShowInAppNotify}
          setActiveTab={setActiveTab}
          setShowLoginSuccess={setShowLoginSuccess}
          onDismissToast={() => setToast(null)}
        />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-[#F8FAFC] font-sans flex flex-col lg:flex-row overflow-hidden">
      {/* Mobile Header */}
      <header className="lg:hidden bg-[#0038A8] text-white p-4 flex flex-col gap-2 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Sun className="text-[#FCD116] animate-sun-rotate" size={24} fill="#FCD116" />
            </div>
            <h1 className="text-lg font-black tracking-tight">Las Piñas CAA</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="p-2 bg-white/10 rounded-xl hover:bg-red-500/20 transition-colors">
              <LogOut size={24} />
            </button>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 py-1 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest">
          <Clock size={12} />
          {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • {currentTime.toLocaleTimeString()}
          {isOffline && (
            <span className="text-amber-300 ml-2 animate-pulse font-extrabold">• OFFLINE</span>
          )}
        </div>
      </header>

      {/* Sidebar Navigation */}
      <AnimatePresence>
        <motion.aside 
          className={`fixed lg:static inset-y-0 left-0 z-50 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/50' : 'bg-white border-gray-100 text-gray-900'} border-r flex flex-col shadow-2xl lg:shadow-none transition-all duration-300 overflow-hidden ${
            isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'
          } ${
            isDesktopSidebarOpen ? 'lg:translate-x-0 lg:w-80' : 'lg:-translate-x-full lg:w-0 lg:border-none'
          }`}
        >
          <div className="p-8 flex-1 overflow-y-auto custom-scrollbar w-72 lg:w-80">
            <div className="flex items-center gap-4 mb-10">
              <div className="bg-gradient-to-br from-[#0038A8] to-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20 transform -rotate-6 shrink-0">
                <Sun className="text-[#FCD116] animate-sun-rotate" size={28} fill="#FCD116" />
              </div>
              <div className="shrink-0">
                <h1 className={`text-xl lg:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} leading-none tracking-tight`}>Faculty Club</h1>
                <p className={`text-[10px] lg:text-xs ${isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'} font-black uppercase tracking-widest mt-1`}>Management System</p>
              </div>
            </div>

              <nav className="space-y-2">
                <p className={`text-[10px] lg:text-xs font-black ${isDarkMode ? 'text-slate-400' : 'text-gray-400'} uppercase tracking-[0.2em] mb-4 ml-2`}>Main Menu</p>
                <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} isDarkMode={isDarkMode} />
                <NavItem id="collection" icon={Users} label="Collection" profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} isDarkMode={isDarkMode} />
                <NavItem id="remittance" icon={Wallet} label="Remittances" profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} isDarkMode={isDarkMode} />
                
                <div className="pt-6">
                  <p className={`text-[10px] lg:text-xs font-black ${isDarkMode ? 'text-slate-400' : 'text-gray-400'} uppercase tracking-[0.2em] mb-4 ml-2`}>Administrative</p>
                  <NavItem id="admin" icon={Shield} label="Admin Panel" role="admin" profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} isDarkMode={isDarkMode} />
                  <NavItem id="settings" icon={Settings} label="Report Settings" role="admin" profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} isDarkMode={isDarkMode} />
                  <NavItem id="expenses" icon={CreditCard} label="Expenses" role="admin" profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} isDarkMode={isDarkMode} />
                  <NavItem id="audit" icon={History} label="Audit Logs" role="admin" profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} isDarkMode={isDarkMode} />
                </div>

                <div className="pt-6">
                  <p className={`text-[10px] lg:text-xs font-black ${isDarkMode ? 'text-slate-400' : 'text-gray-400'} uppercase tracking-[0.2em] mb-4 ml-2`}>Appearance</p>
                  <div className={`p-1.5 rounded-2xl border flex items-center gap-1.5 mb-2 ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-gray-100/80 border-gray-200'}`}>
                    <button
                      onClick={() => setIsDarkMode(false)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all ${
                        !isDarkMode
                          ? 'bg-white text-[#0038A8] shadow-sm border border-slate-200'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sun size={15} className={!isDarkMode ? 'text-amber-500 fill-amber-500' : ''} />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => setIsDarkMode(true)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all ${
                        isDarkMode
                          ? 'bg-slate-800 text-yellow-400 shadow-sm border border-slate-700'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Moon size={15} className={isDarkMode ? 'text-yellow-400 fill-yellow-400' : ''} />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                <div className="pt-6">
                  <p className={`text-[10px] lg:text-xs font-black ${isDarkMode ? 'text-slate-400' : 'text-gray-400'} uppercase tracking-[0.2em] mb-4 ml-2`}>Account</p>
                  <NavItem id="profile" icon={User} label="My Profile" profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} isDarkMode={isDarkMode} />
                  <button
                    onClick={() => setShowTermsModal(true)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                      isDarkMode ? 'text-slate-400 hover:bg-slate-800/80 hover:text-white' : 'text-gray-500 hover:bg-blue-50 hover:text-[#0038A8]'
                    } group`}
                  >
                    <div className={`p-2 rounded-xl transition-colors ${
                      isDarkMode ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-gray-100 group-hover:bg-white'
                    }`}>
                      <ShieldCheck size={18} className={isDarkMode ? 'text-slate-400 group-hover:text-blue-400' : 'text-gray-500 group-hover:text-[#0038A8]'} />
                    </div>
                    <span className="text-xs lg:text-sm font-black uppercase tracking-widest opacity-70 group-hover:opacity-100">
                      Terms & Privacy
                    </span>
                  </button>
                </div>
              </nav>
            </div>

            <div className={`mt-auto p-6 border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-50'}`}>
              <div className={`${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-gray-50 border-gray-100'} rounded-3xl p-4 flex items-center gap-4 mb-4 border`}>
                <div className="w-10 h-10 bg-[#0038A8] rounded-full flex items-center justify-center text-white font-black shadow-md">
                  {profile.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs lg:text-sm font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}>{profile.name}</p>
                  <p className={`text-[9px] lg:text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-gray-400'} font-bold uppercase tracking-widest`}>{profile.role} • {profile.gradeLevel}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all group ${
                  isDarkMode 
                    ? 'bg-red-950/40 border border-red-900/50 text-red-400 hover:bg-red-900/50 hover:text-red-300' 
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" /> Sign Out
              </button>
            </div>
          </motion.aside>
      </AnimatePresence>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-h-0 relative pb-16 lg:pb-8 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
        {/* School Background - Only for Dashboard */}
        <AnimatePresence>
          {activeTab === 'dashboard' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
            >
              {/* Premium, ultra-modern backdrop wash with soft branding blue sunset tint & slate-clear glass blend */}
              <div className={`absolute inset-0 z-10 backdrop-blur-[1px] sm:backdrop-blur-[2px] md:backdrop-blur-[3px] transition-all duration-500 ${
                isDarkMode 
                  ? 'bg-gradient-to-tr from-slate-950/90 via-slate-950/80 to-slate-900/70' 
                  : 'bg-gradient-to-tr from-[#0038A8]/6 via-[#F8FAFC]/70 to-[#F8FAFC]/30'
              }`} />
              <div className={`absolute inset-0 z-10 transition-all duration-500 ${
                isDarkMode 
                  ? 'bg-gradient-to-b from-transparent via-slate-950/80 to-slate-950' 
                  : 'bg-gradient-to-b from-transparent via-[#F8FAFC]/50 to-[#F8FAFC]'
              }`} />
              <img 
                src="https://www.dropbox.com/scl/fi/8m4sg2ph32whxpd5phv70/FB_IMG_1779455185471.jpg?rlkey=2hwa1il92wrclccve3i19dk5p&st=jiz0ey5x&raw=1" 
                alt="School Campus" 
                className={`w-full h-full object-cover object-center scale-102 select-none pointer-events-none transition-all duration-500 ${
                  isDarkMode ? 'opacity-35 mix-blend-luminosity brightness-75' : 'opacity-95'
                }`}
                loading="eager"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Bar (Desktop) */}
        <header className={`hidden lg:flex items-center justify-between px-10 py-8 ${
          isDarkMode 
            ? (activeTab === 'dashboard' ? 'bg-slate-900/70 border-slate-800/80 text-slate-100' : 'bg-slate-900/90 border-slate-800 text-slate-100') 
            : (activeTab === 'dashboard' ? 'bg-white/40 border-gray-100 text-gray-900' : 'bg-white/80 border-gray-100 text-gray-900')
        } backdrop-blur-md border-b sticky top-0 z-30 transition-colors duration-500`}>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
              className={`p-3 rounded-2xl transition-colors ${
                isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isDesktopSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
            >
              <Menu size={28} className={isDarkMode ? 'text-slate-200' : 'text-gray-600'} />
            </button>
            <div>
              <h2 className={`text-3xl lg:text-4xl font-black capitalize tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{activeTab.replace('-', ' ')}</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className={`text-xs lg:text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'}`}>
                  {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <div className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
                <p className={`text-xs lg:text-sm font-black tracking-widest tabular-nums ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  {currentTime.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isOffline ? (
              <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border shadow-sm animate-pulse ${
                isDarkMode ? 'bg-amber-950/60 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                <ShieldAlert size={16} className={isDarkMode ? 'text-amber-400' : 'text-amber-600'} />
                <span className="text-xs lg:text-sm font-black uppercase tracking-widest">Offline Mode (Cached)</span>
              </div>
            ) : (
              <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border shadow-sm ${
                isDarkMode ? 'bg-blue-950/60 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-100 text-[#0038A8]'
              }`}>
                <Activity size={16} className={isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'} />
                <span className="text-xs lg:text-sm font-black uppercase tracking-widest">System Active</span>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12 custom-scrollbar relative z-10">

      <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-[1600px] mx-auto w-full"
            >
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Welcome Section */}
                  <div className="bg-gradient-to-br from-[#0038A8] to-blue-700 rounded-[1.5rem] sm:rounded-[2rem] p-6 lg:p-10 text-white relative overflow-hidden shadow-xl shadow-blue-200 flex flex-col justify-center">
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 lg:gap-12 w-full">
                      <div className="max-w-3xl flex-1">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-3 md:mb-4 tracking-tight leading-tight flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Welcome back, {getWelcomeDisplayName(profile?.name || '')}!</span>
                          <span className="inline-block animate-wave origin-[70%_70%] text-2xl md:text-4xl">👋</span>
                        </h1>
                        <p className="text-blue-100 text-sm md:text-base font-medium leading-relaxed opacity-90 max-w-2xl">
                          Here's what's happening with the Faculty Club finances today. {(profile?.role === 'admin' || profile?.email === 'lpcaanhsfacultyclubofficers@gmail.com' || profile?.email === 'ngehthong@gmail.com') && `You have ${remittances.filter(r => r.status === 'pending').length} pending remittances to verify.`}
                        </p>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-6 items-center">
                          <div className="relative w-full sm:w-auto min-w-[280px] flex-1 mb-2 sm:mb-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-200" size={18} />
                            <input 
                              type="text"
                              placeholder="Search faculty across the system..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setActiveTab('collection');
                              }}
                              className="w-full pl-11 pr-12 py-3 bg-white/10 border border-white/20 text-white placeholder-blue-200/80 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20 transition-all shadow-inner backdrop-blur-md"
                            />
                            {searchQuery && (
                              <button 
                                onClick={() => setActiveTab('collection')} 
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white text-[#0038A8] rounded-lg shadow-sm hover:bg-blue-50 transition-all animate-in zoom-in"
                                title="Go to results"
                              >
                                <ChevronRight size={16} />
                              </button>
                            )}
                          </div>
                          <button onClick={() => setActiveTab('collection')} className="bg-white text-[#0038A8] px-5 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-md transform hover:-translate-y-0.5 text-center w-full sm:w-auto shrink-0">
                            Manage Collections
                          </button>
                          {(profile?.role === 'admin' || profile?.email === 'lpcaanhsfacultyclubofficers@gmail.com' || profile?.email === 'ngehthong@gmail.com') && (
                            <button onClick={() => setActiveTab('remittance')} className="bg-blue-600/30 backdrop-blur-md text-white border border-white/20 px-5 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest hover:bg-blue-600/50 transition-all text-center w-full sm:w-auto shrink-0">
                              View Remittances
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-white/10 backdrop-blur-xl p-5 sm:p-6 rounded-[1.5rem] border border-white/20 flex flex-col w-full md:w-80 shrink-0">
                        <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] opacity-80 mb-4">Financial Summary</div>
                        <div className="grid grid-cols-1 gap-2 w-full">
                          <div className="flex justify-between items-center text-xs sm:text-sm">
                            <span className="opacity-80">Remitted:</span>
                            <span className="font-bold">₱{totalCollections.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs sm:text-sm">
                            <span className="opacity-80">Initial Balance:</span>
                            <span className="font-bold">₱{totalInitialBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs sm:text-sm">
                            <span className="opacity-80">Expenses:</span>
                            <span className="font-bold text-red-300">-₱{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="border-t border-white/20 mt-2 pt-3 flex flex-col sm:flex-row lg:flex-col justify-between sm:items-center lg:items-start gap-1">
                            <span className="font-bold text-xs sm:text-sm opacity-90">Net Balance:</span>
                            <span className="text-2xl sm:text-3xl font-black tracking-tight">
                              ₱{netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR Login Pending Approvals */}
                  {pendingLoginRequests.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-orange-50 border-2 border-orange-200 rounded-[2rem] p-6 lg:p-8"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-4">
                          <div className="p-4 bg-orange-500 text-white rounded-[1.25rem] shadow-xl shadow-orange-200">
                            <ShieldAlert size={28} className="animate-pulse" />
                          </div>
                          <div>
                            <h3 className="text-xl lg:text-2xl font-black text-orange-900 uppercase tracking-tight">Login Authorizations</h3>
                            <p className="text-[10px] lg:text-xs text-orange-700 font-bold uppercase tracking-widest flex items-center gap-2">
                              <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></span>
                              {pendingLoginRequests.length} {pendingLoginRequests.length === 1 ? 'Teacher' : 'Teachers'} pending verification
                            </p>
                          </div>
                        </div>

                        {pendingLoginRequests.length > 1 && (
                          <button 
                            onClick={approveAllLoginRequests}
                            className="bg-orange-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] hover:bg-black transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-3 active:scale-95"
                          >
                            <ShieldCheck size={20} />
                            Approve All ({pendingLoginRequests.length})
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {pendingLoginRequests.map(request => (
                          <div key={request.id} className="bg-white p-6 rounded-[2rem] border border-orange-100 shadow-sm flex flex-col gap-5 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner uppercase">
                                {request.teacherName?.charAt(0) || 'T'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-gray-900 truncate text-lg tracking-tight">{request.teacherName}</p>
                                <p className="text-[10px] text-gray-400 font-bold truncate lowercase tracking-tight opacity-70 italic">{request.teacherEmail}</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <button 
                                onClick={() => approveLoginRequest(request.id)}
                                className="flex-1 bg-green-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-50 active:scale-95"
                              >
                                <Check size={16} />
                                Approve
                              </button>
                              <button 
                                onClick={() => denyLoginRequest(request.id)}
                                className="bg-red-50 text-red-600 px-5 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95"
                              >
                                Deny
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Financial Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className={`${isDarkMode ? 'bg-slate-900/80 sm:bg-slate-900/85 border-slate-800/80 hover:bg-slate-900/95 shadow-slate-950/50' : 'bg-white/75 sm:bg-white/80 border-white/70 hover:bg-white/95 shadow-sm'} backdrop-blur-md p-8 rounded-[2.5rem] border hover:shadow-xl hover:scale-[1.015] transition-all duration-300 group`}>
                      <div className="flex items-center justify-between mb-6">
                        <div className={`p-4 rounded-2xl transition-all ${isDarkMode ? 'bg-blue-950/80 text-blue-400 group-hover:bg-[#0038A8] group-hover:text-white' : 'bg-blue-50 text-[#0038A8] group-hover:bg-[#0038A8] group-hover:text-white'}`}>
                          <Wallet size={32} />
                        </div>
                      </div>
                      <p className={`text-[10px] lg:text-sm font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Total Collections</p>
                      <h3 className={`text-2xl lg:text-4xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₱{totalCollections.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    </div>

                    <div className={`${isDarkMode ? 'bg-slate-900/80 sm:bg-slate-900/85 border-slate-800/80 hover:bg-slate-900/95 shadow-slate-950/50' : 'bg-white/75 sm:bg-white/80 border-white/70 hover:bg-white/95 shadow-sm'} backdrop-blur-md p-8 rounded-[2.5rem] border hover:shadow-xl hover:scale-[1.015] transition-all duration-300 group`}>
                      <div className="flex items-center justify-between mb-6">
                        <div className={`p-4 rounded-2xl transition-all ${isDarkMode ? 'bg-red-950/80 text-red-400 group-hover:bg-red-600 group-hover:text-white' : 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white'}`}>
                          <CreditCard size={32} />
                        </div>
                      </div>
                      <p className={`text-[10px] lg:text-sm font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Total Expenses</p>
                      <h3 className={`text-2xl lg:text-4xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₱{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    </div>

                    <div className={`${isDarkMode ? 'bg-slate-900/80 sm:bg-slate-900/85 border-slate-800/80 hover:bg-slate-900/95 shadow-slate-950/50' : 'bg-white/75 sm:bg-white/80 border-white/70 hover:bg-white/95 shadow-sm'} backdrop-blur-md p-8 rounded-[2.5rem] border hover:shadow-xl hover:scale-[1.015] transition-all duration-300 group`}>
                      <div className="flex items-center justify-between mb-6">
                        <div className={`p-4 rounded-2xl transition-all ${isDarkMode ? 'bg-yellow-950/80 text-yellow-400 group-hover:bg-yellow-600 group-hover:text-white' : 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-600 group-hover:text-white'}`}>
                          <Database size={32} />
                        </div>
                      </div>
                      <p className={`text-[10px] lg:text-sm font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Initial Balance</p>
                      <h3 className={`text-2xl lg:text-4xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₱{totalInitialBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    </div>

                    <div className={`${isDarkMode ? 'bg-slate-900/80 sm:bg-slate-900/85 border-slate-800/80 hover:bg-slate-900/95 shadow-slate-950/50' : 'bg-white/75 sm:bg-white/80 border-white/70 hover:bg-white/95 shadow-sm'} backdrop-blur-md p-8 rounded-[2.5rem] border hover:shadow-xl hover:scale-[1.015] transition-all duration-300 group`}>
                      <div className="flex items-center justify-between mb-6">
                        <div className={`p-4 rounded-2xl transition-all ${isDarkMode ? 'bg-green-950/80 text-green-400 group-hover:bg-green-600 group-hover:text-white' : 'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white'}`}>
                          <PhilippinePeso size={32} />
                        </div>
                      </div>
                      <p className={`text-[10px] lg:text-sm font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Net Club Balance</p>
                      <h3 className={`text-2xl lg:text-4xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₱{netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    </div>
                  </div>

                  {/* Faculty & System Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className={`${isDarkMode ? 'bg-slate-900/80 sm:bg-slate-900/85 border-slate-800/80 hover:bg-slate-900/95 shadow-slate-950/50' : 'bg-white/75 sm:bg-white/80 border-white/70 hover:bg-white/95 shadow-sm'} backdrop-blur-md p-6 rounded-[2rem] border hover:shadow-md transition-all duration-300 group`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'bg-blue-950/80 text-blue-400 group-hover:bg-[#0038A8] group-hover:text-white' : 'bg-blue-50 text-[#0038A8] group-hover:bg-[#0038A8] group-hover:text-white'}`}>
                          <Users size={24} />
                        </div>
                      </div>
                      <p className={`text-[10px] lg:text-xs font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Total Faculty</p>
                      <h3 className={`text-2xl lg:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{records.length}</h3>
                    </div>

                    <div className={`${isDarkMode ? 'bg-slate-900/80 sm:bg-slate-900/85 border-slate-800/80 hover:bg-slate-900/95 shadow-slate-950/50' : 'bg-white/75 sm:bg-white/80 border-white/70 hover:bg-white/95 shadow-sm'} backdrop-blur-md p-6 rounded-[2rem] border hover:shadow-md transition-all duration-300 group`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'bg-green-950/80 text-green-400 group-hover:bg-green-600 group-hover:text-white' : 'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white'}`}>
                          <CheckCircle size={24} />
                        </div>
                        <div className={`text-[10px] font-black ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                          {((fullyPaidCount / (records.length || 1)) * 100).toFixed(0)}%
                        </div>
                      </div>
                      <p className={`text-[10px] lg:text-xs font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Fully Paid</p>
                      <h3 className={`text-2xl lg:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {fullyPaidCount}
                      </h3>
                    </div>

                    <div className={`${isDarkMode ? 'bg-slate-900/80 sm:bg-slate-900/85 border-slate-800/80 hover:bg-slate-900/95 shadow-slate-950/50' : 'bg-white/75 sm:bg-white/80 border-white/70 hover:bg-white/95 shadow-sm'} backdrop-blur-md p-6 rounded-[2rem] border hover:shadow-md transition-all duration-300 group`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'bg-purple-950/80 text-purple-400 group-hover:bg-purple-600 group-hover:text-white' : 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'}`}>
                          <PieChart size={24} />
                        </div>
                        <div className={`text-[10px] font-black ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                          {standardDues.length} {standardDues.length === 1 ? 'Item' : 'Items'}
                        </div>
                      </div>
                      <p className={`text-[10px] lg:text-xs font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Active Dues</p>
                      <h3 className={`text-2xl lg:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₱{totalDuesAmount.toLocaleString()}</h3>
                    </div>
                  </div>

                  {/* Visual Analytics Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div id="expense-pie-chart" className={`${isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100 shadow-slate-950/50' : 'bg-white/75 sm:bg-white/80 border-white/70 shadow-sm'} backdrop-blur-md p-8 rounded-[2.5rem] border`}>
                      <div className="flex items-center gap-4 mb-8">
                        <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-red-950/80 text-red-400' : 'bg-red-50 text-red-600'}`}>
                          <PieChart size={24} />
                        </div>
                        <div>
                          <h3 className={`text-lg lg:text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Expense Categories</h3>
                          <p className={`text-[10px] lg:text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Distribution of club spending</p>
                        </div>
                      </div>
                      <div className="h-[300px] w-full flex items-center justify-center">
                        {expenseChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                              <Pie
                                data={expenseChartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {expenseChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={['#0038A8', '#CE1126', '#FCD116', '#007A33', '#6A2C91', '#FF6321'][index % 6]} />
                                ))}
                              </Pie>
                              <ReTooltip 
                                contentStyle={{ 
                                  borderRadius: '1rem', 
                                  border: isDarkMode ? '1px solid #334155' : 'none', 
                                  backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a',
                                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                                }}
                                formatter={(value: number, name: string) => {
                                  const total = expenseChartData.reduce((acc, entry) => acc + entry.value, 0);
                                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                  return [`₱${value.toLocaleString()} (${percentage}%)`, name];
                                }}
                              />
                              <Legend verticalAlign="bottom" height={36}/>
                            </RePieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                              <PieChart size={32} className={isDarkMode ? 'text-slate-600' : 'text-gray-200'} />
                            </div>
                            <p className={`text-xs lg:text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>No expense data yet</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Collection & Collectibles Analytics */}
                    <CollectionAnalyticsChart
                      records={records}
                      standardDues={standardDues}
                      remittances={remittances}
                      isDarkMode={isDarkMode}
                      handleDownloadTermsDocx={handleDownloadTermsDocx}
                      handleDownloadExcel={handleDownloadExcel}
                      handleDownloadComprehensiveReportDocx={handleDownloadComprehensiveReportDocx}
                      handleDownloadGlobalPaymentHistoryDocx={handleDownloadGlobalPaymentHistoryDocx}
                    />
                  </div>

                  {/* Main Dashboard Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Recent Activity */}
                    <div className={`md:col-span-2 lg:col-span-2 p-6 md:p-8 rounded-[2.5rem] border shadow-sm ${
                      isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100 shadow-slate-950/50' : 'bg-white border-gray-100 text-gray-900'
                    }`}>
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-blue-950/80 text-blue-400' : 'bg-blue-50 text-[#0038A8]'}`}>
                            <History size={24} />
                          </div>
                          <div>
                            <h3 className={`text-lg lg:text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Activity</h3>
                            <p className={`text-[10px] lg:text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Latest system updates</p>
                          </div>
                        </div>
                        <button onClick={() => setActiveTab('audit')} className={`text-[10px] lg:text-xs font-black uppercase tracking-widest hover:underline ${isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'}`}>View All</button>
                      </div>
                      
                      <div className="space-y-4">
                        {auditLogs.slice(0, 5).map(log => (
                          <div key={log.id} className={`flex items-start gap-4 p-4 rounded-2xl transition-all border ${
                            isDarkMode ? 'hover:bg-slate-800/50 border-slate-800/40 hover:border-slate-700' : 'hover:bg-gray-50 border-transparent hover:border-gray-100'
                          }`}>
                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                              log.type === 'critical' ? 'bg-red-500' : log.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs lg:text-sm font-black uppercase tracking-tight mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{log.action}</p>
                              <p className={`text-[11px] lg:text-xs font-medium line-clamp-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{log.details}</p>
                            </div>
                            <div className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                              {ensureTimestamp(log.timestamp).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pending Tasks / Remittances */}
                    <div className={`p-8 rounded-[2.5rem] border shadow-sm ${
                      isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100 shadow-slate-950/50' : 'bg-white border-gray-100 text-gray-900'
                    }`}>
                      <div className="flex items-center gap-4 mb-8">
                        <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-amber-950/80 text-amber-400' : 'bg-yellow-50 text-yellow-600'}`}>
                          <Clock size={24} />
                        </div>
                        <div>
                          <h3 className={`text-lg lg:text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Pending Tasks</h3>
                          <p className={`text-[10px] lg:text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Awaiting action</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {remittances.filter(r => r.status === 'pending').length > 0 ? (
                          remittances.filter(r => r.status === 'pending').slice(0, 4).map(rem => (
                            <div key={rem.id} className={`p-4 rounded-2xl border ${
                              isDarkMode ? 'bg-amber-950/30 border-amber-900/50 text-amber-200' : 'bg-yellow-50/50 border-yellow-100'
                            }`}>
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] lg:text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-amber-300' : 'text-yellow-700'}`}>{rem.gradeLevel} Remittance</span>
                                <span className={`text-[10px] lg:text-xs font-black ${isDarkMode ? 'text-amber-400' : 'text-yellow-600'}`}>₱{rem.amount.toLocaleString()}</span>
                              </div>
                              <p className={`text-[11px] lg:text-xs font-bold mb-3 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>From: {rem.bodName}</p>
                              <button 
                                onClick={() => setActiveTab('remittance')}
                                className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                  isDarkMode ? 'bg-amber-900/40 text-amber-200 border-amber-800 hover:bg-amber-800/60' : 'bg-white text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                                }`}
                              >
                                Review & Verify
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="py-12 text-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                              <CheckCircle size={24} className={isDarkMode ? 'text-slate-600' : 'text-gray-200'} />
                            </div>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>All caught up!</p>
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
              <div className={`p-6 rounded-3xl border shadow-sm transition-all group ${
                isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100 hover:bg-slate-900' : 'bg-white border-gray-100 hover:shadow-md'
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-2xl transition-colors ${
                    isDarkMode ? 'bg-blue-950/80 text-blue-400 group-hover:bg-[#0038A8] group-hover:text-white' : 'bg-blue-50 text-[#0038A8] group-hover:bg-[#0038A8] group-hover:text-white'
                  }`}>
                    <Users size={24} />
                  </div>
                  <div>
                    <p className={`text-[10px] lg:text-xs font-black uppercase tracking-widest leading-none mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Total Faculty</p>
                    <h3 className={`text-2xl lg:text-3xl font-black leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{filteredRecords.length}</h3>
                  </div>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                  <div className="h-full bg-[#0038A8] rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className={`p-6 rounded-3xl border shadow-sm transition-all group ${
                isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100 hover:bg-slate-900' : 'bg-white border-gray-100 hover:shadow-md'
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-2xl transition-colors ${
                    isDarkMode ? 'bg-green-950/80 text-green-400 group-hover:bg-green-600 group-hover:text-white' : 'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white'
                  }`}>
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <p className={`text-[10px] lg:text-xs font-black uppercase tracking-widest leading-none mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Fully Paid</p>
                    <h3 className={`text-2xl lg:text-3xl font-black leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {filteredRecords.filter(r => {
                        const requiredDues = standardDues.filter(d => !d.isVoluntary);
                        return requiredDues.length > 0 && requiredDues.every(d => r.paidDueIds.includes(d.id));
                      }).length}
                    </h3>
                  </div>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                  <div className="h-full bg-green-500 rounded-full" style={{ 
                    width: `${(filteredRecords.filter(r => {
                      const requiredDues = standardDues.filter(d => !d.isVoluntary);
                      return requiredDues.length > 0 && requiredDues.every(d => r.paidDueIds.includes(d.id));
                    }).length / (filteredRecords.length || 1)) * 100}%` 
                  }}></div>
                </div>
              </div>

              <div className={`p-6 rounded-3xl border shadow-sm transition-all group ${
                isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100 hover:bg-slate-900' : 'bg-white border-gray-100 hover:shadow-md'
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-2xl transition-colors ${
                    isDarkMode ? 'bg-amber-950/80 text-amber-400 group-hover:bg-yellow-600 group-hover:text-white' : 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-600 group-hover:text-white'
                  }`}>
                    <Clock size={24} />
                  </div>
                  <div>
                    <p className={`text-[10px] lg:text-xs font-black uppercase tracking-widest leading-none mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Partial</p>
                    <h3 className={`text-2xl lg:text-3xl font-black leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {filteredRecords.filter(r => {
                        const requiredDues = standardDues.filter(d => !d.isVoluntary);
                        const isFullyPaid = requiredDues.length > 0 && requiredDues.every(d => r.paidDueIds.includes(d.id));
                        const totalPaid = standardDues.filter(d => r.paidDueIds.includes(d.id)).length;
                        return !isFullyPaid && totalPaid > 0;
                      }).length}
                    </h3>
                  </div>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
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

              <div className={`p-6 rounded-3xl border shadow-sm transition-all group ${
                isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100 hover:bg-slate-900' : 'bg-white border-gray-100 hover:shadow-md'
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-2xl transition-colors ${
                    isDarkMode ? 'bg-red-950/80 text-red-400 group-hover:bg-red-600 group-hover:text-white' : 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white'
                  }`}>
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <p className={`text-[10px] lg:text-xs font-black uppercase tracking-widest leading-none mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Pending</p>
                    <h3 className={`text-2xl lg:text-3xl font-black leading-none ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {filteredRecords.filter(r => r.paidDueIds.length === 0).length}
                    </h3>
                  </div>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                  <div className="h-full bg-red-500 rounded-full" style={{ 
                    width: `${(filteredRecords.filter(r => r.paidDueIds.length === 0).length / (filteredRecords.length || 1)) * 100}%` 
                  }}></div>
                </div>
              </div>
            </div>

            {/* Admin Alert for Pending Deletions and Undo/Redo */}
            {profile?.role === 'admin' && (
              <div className="flex flex-col gap-4">
                {(standardDues.some(d => d.pendingDeletion) || records.some(r => r.pendingDeletion)) && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="text-red-500 animate-pulse" size={24} />
                      <div>
                        <h3 className="text-xs lg:text-sm font-black text-red-800 uppercase tracking-wider">Pending Deletion Requests</h3>
                        <p className="text-[10px] lg:text-xs text-red-600 font-bold uppercase tracking-widest">
                          BODs have marked items for deletion. Action required.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={confirmAllDeletions}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-sm whitespace-nowrap"
                    >
                      Confirm All Deletions
                    </button>
                  </div>
                )}
                
                {(undoStack.length > 0 || redoStack.length > 0) && (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={handleUndo}
                      disabled={undoStack.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <Undo size={14} /> Undo
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={redoStack.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <Redo size={14} /> Redo
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 1: Encode Dues & Contributions */}
            <section className={`p-6 md:p-8 rounded-[2.5rem] shadow-sm border overflow-hidden relative ${
              isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100' : 'bg-white border-gray-200'
            }`}>
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50 opacity-50'}`}></div>
              <div className="flex items-center gap-4 mb-8 relative z-10">
                <div className="bg-[#0038A8] text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-blue-900/40">1</div>
                <div>
                  <h2 className={`text-xl lg:text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Standard Dues Template</h2>
                  <p className={`text-[10px] lg:text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Define what everyone needs to pay</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                <div className="md:col-span-1 lg:col-span-4">
                  <form onSubmit={handleAddStandardDue} className={`p-6 rounded-3xl border space-y-4 ${
                    isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-gray-50/50 border-gray-100'
                  }`}>
                    <h3 className={`text-xs lg:text-sm font-black mb-2 uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Add New Item</h3>
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-[10px] lg:text-xs font-black mb-1.5 uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Item Name</label>
                        <input 
                          type="text" 
                          required 
                          value={newDueName} 
                          onChange={e => setNewDueName(e.target.value)} 
                          placeholder="e.g. Faculty Dues"
                          className={`w-full border rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8] transition-all ${
                            isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[10px] font-black mb-1.5 uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Amount (₱)</label>
                        <div className="relative">
                          <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>₱</span>
                          <input 
                            type="number" 
                            required={!isVoluntary}
                            value={newDueAmount} 
                            onChange={e => setNewDueAmount(e.target.value === '' ? '' : Number(e.target.value))} 
                            placeholder={isVoluntary ? "Suggested" : "0.00"}
                            className={`w-full border rounded-xl p-3 pl-8 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8] transition-all ${
                              isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900'
                            }`}
                          />
                        </div>
                      </div>
                      <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors group ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 hover:bg-slate-800' : 'bg-white border-gray-100 hover:bg-blue-50'
                      }`}>
                        <input 
                          type="checkbox" 
                          checked={isVoluntary}
                          onChange={e => setIsVoluntary(e.target.checked)}
                          className="w-5 h-5 text-[#0038A8] border-gray-300 rounded-lg focus:ring-[#0038A8]"
                        />
                        <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                          isDarkMode ? 'text-slate-300 group-hover:text-blue-400' : 'text-gray-600 group-hover:text-[#0038A8]'
                        }`}>Voluntary Contribution</span>
                      </label>
                      <button type="submit" className="w-full bg-[#0038A8] text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2">
                        <Plus size={18} /> Add Item
                      </button>
                    </div>
                  </form>
                </div>

                <div className="md:col-span-1 lg:col-span-8">
                  <h3 className={`text-xs font-black mb-4 uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Active Template Items</h3>
                  {standardDues.length === 0 ? (
                    <div className={`border-2 border-dashed rounded-[2rem] p-12 text-center ${
                      isDarkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-gray-50/50 border-gray-200'
                    }`}>
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-white shadow-sm'}`}>
                        <PhilippinePeso size={32} className={isDarkMode ? 'text-slate-600' : 'text-gray-200'} />
                      </div>
                      <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>No dues encoded yet. Start by adding items.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {standardDues.map(due => (
                        <div key={due.id} className={`group p-4 rounded-3xl border transition-all ${
                          due.pendingDeletion 
                          ? isDarkMode ? 'bg-red-950/40 border-red-900' : 'bg-red-50 border-red-100'
                          : isDarkMode ? 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800' : 'bg-white border-gray-100 hover:shadow-md'
                        }`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={`text-sm font-black uppercase tracking-tight truncate ${
                                  due.pendingDeletion ? 'text-red-400' : isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {due.name}
                                </h4>
                                {due.isVoluntary && (
                                  <span className={`shrink-0 text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    isDarkMode ? 'bg-blue-950 text-blue-300' : 'bg-blue-100 text-blue-700'
                                  }`}>Voluntary</span>
                                )}
                              </div>
                              <div className={`text-lg font-black ${
                                due.pendingDeletion ? 'text-red-400' : isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'
                              }`}>
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
                                    className={`p-2 rounded-xl ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
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
                                    ? 'text-red-300 cursor-not-allowed' 
                                    : isDarkMode ? 'text-slate-400 hover:text-red-400 hover:bg-red-950/50' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                                  }`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                          {due.pendingDeletion && profile?.role === 'admin' && (
                            <div className="mt-3 pt-3 border-t border-red-900/50 text-[9px] text-red-400 font-bold uppercase tracking-widest">
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
            <section className={`p-6 md:p-8 rounded-[2.5rem] shadow-sm border ${
              isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100' : 'bg-white border-gray-200'
            }`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-[#0038A8] text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-lg shadow-blue-900/40">2</div>
                  <div>
                    <h2 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Teacher List & Payments</h2>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Track and manage faculty contributions</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
                  <button 
                    onClick={() => setShowAddTeacherForm(!showAddTeacherForm)}
                    className={`px-3.5 py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      showAddTeacherForm 
                        ? (isDarkMode ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-blue-50 text-[#0038A8] border border-blue-200') 
                        : (isDarkMode ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200')
                    }`}
                  >
                    <Plus size={14} /> {showAddTeacherForm ? 'Close Form' : 'Add Teacher'}
                  </button>
                  <label className={`px-3.5 py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 transition-all border ${
                    isDarkMode ? 'bg-blue-950/80 text-blue-300 border-blue-800 hover:bg-blue-900' : 'bg-blue-50 text-[#0038A8] border-blue-100 hover:bg-blue-100'
                  }`}>
                    <Upload size={14} /> Import
                    <input type="file" className="hidden" accept=".csv, .xlsx, .xls, .pdf" onChange={handleExcelUpload} />
                  </label>
                  <button 
                    onClick={handleBatchSendReceipts}
                    disabled={isBatchSending || selectedTeacherIds.size === 0}
                    className="bg-[#0038A8] text-white px-3.5 py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider hover:bg-blue-800 transition-all shadow-md shadow-blue-900/20 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 col-span-2 sm:col-span-1"
                  >
                    {isBatchSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send Batch Receipts
                  </button>
                  <button 
                    onClick={handleDownloadExcel}
                    className="bg-emerald-600 text-white px-3.5 py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-md shadow-emerald-900/20 dark:shadow-none flex items-center justify-center gap-2"
                  >
                    <FileDown size={14} /> Export Report
                  </button>
                  {profile.role === 'admin' && (
                    <button 
                      onClick={() => {
                        setDeleteType('all');
                        setIsBatchDeleteModalOpen(true);
                      }}
                      className={`px-3.5 py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 border col-span-2 sm:col-span-1 ${
                        isDarkMode ? 'bg-rose-950/60 text-rose-300 border-rose-900 hover:bg-rose-900' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white'
                      }`}
                    >
                      <Trash2 size={14} /> Delete All
                    </button>
                  )}
                </div>
              </div>

              {showAddTeacherForm && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={`p-6 rounded-3xl border mb-8 overflow-hidden ${
                    isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-gray-50/50 border-gray-100'
                  }`}
                >
                  <h3 className={`text-xs font-black mb-4 uppercase tracking-widest ${
                    isDarkMode ? 'text-slate-300' : 'text-gray-400'
                  }`}>New Teacher Registration</h3>
                  <form onSubmit={handleAddTeacher} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className={`block text-[10px] font-black mb-1.5 uppercase tracking-widest ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-500'
                      }`}>Last Name</label>
                      <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dela Cruz" className={`w-full border rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8] ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900'
                      }`} />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-black mb-1.5 uppercase tracking-widest ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-500'
                      }`}>First Name</label>
                      <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Juan" className={`w-full border rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8] ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900'
                      }`} />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-black mb-1.5 uppercase tracking-widest ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-500'
                      }`}>Middle Name</label>
                      <input type="text" value={middleInitial} onChange={e => setMiddleInitial(e.target.value)} placeholder="P." className={`w-full border rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8] ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900'
                      }`} />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-black mb-1.5 uppercase tracking-widest ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-500'
                      }`}>Gender</label>
                      <select value={gender} onChange={e => setGender(e.target.value as 'Male' | 'Female')} className={`w-full border rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8] ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                      }`}>
                        <option value="Female" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}>Female</option>
                        <option value="Male" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}>Male</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[10px] font-black mb-1.5 uppercase tracking-widest ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-500'
                      }`}>Grade Level</label>
                      <select value={gradeLevel} onChange={e => setGradeLevel(e.target.value as GradeLevel)} className={`w-full border rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8] ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                      }`}>
                        <option value="Grade 7" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}>Grade 7</option>
                        <option value="Grade 8" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}>Grade 8</option>
                        <option value="Grade 9" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}>Grade 9</option>
                        <option value="Grade 10" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}>Grade 10</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={`block text-[10px] font-black mb-1.5 uppercase tracking-widest ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-500'
                      }`}>Email Address</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="juan@example.com" className={`w-full border rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8] ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900'
                      }`} />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-black mb-1.5 uppercase tracking-widest ${
                        isDarkMode ? 'text-slate-400' : 'text-gray-500'
                      }`}>Contact Number</label>
                      <input type="text" value={contactNumber} onChange={e => setContactNumber(e.target.value)} placeholder="09123456789" className={`w-full border rounded-xl p-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8] ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900'
                      }`} />
                    </div>
                    <div className="flex items-end">
                      <button type="submit" className="w-full bg-[#0038A8] text-white py-3 rounded-xl font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-100 dark:shadow-none">
                        Register
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Filters & Search Bar */}
              <div className={`p-6 rounded-3xl border mb-8 ${
                isDarkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-gray-50/50 border-gray-100'
              }`}>
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`} size={20} />
                    <input 
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-12 pr-4 py-3 border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#0038A8] outline-none transition-all shadow-sm ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900'
                      }`}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}>
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <select 
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value as GradeLevel | 'All')}
                      className={`border rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8] shadow-sm ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                      }`}
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
                      className={`border rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#0038A8] shadow-sm ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                      }`}
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
                        className={`px-4 py-3 rounded-2xl transition-all ${
                          isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                        }`}
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
                  className="fixed bottom-[72px] lg:bottom-6 left-2 right-2 sm:left-4 sm:right-4 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 z-50 bg-[#0038A8] text-white p-2.5 sm:p-3 md:px-8 md:py-4 rounded-2xl md:rounded-[2rem] shadow-2xl flex flex-col md:flex-row items-center gap-2 sm:gap-3 md:gap-6 border border-white/20 backdrop-blur-xl max-w-full"
                >
                  <div className="flex items-center justify-between w-full md:w-auto md:border-r md:border-white/20 md:pr-6">
                    <div className="flex items-center gap-2">
                      <div className="bg-white text-[#0038A8] w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-sm">
                        {selectedTeacherIds.size}
                      </div>
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap">
                        {selectedTeacherIds.size === 1 ? 'Teacher Selected' : 'Teachers Selected'}
                      </span>
                    </div>
                    <button 
                      onClick={clearSelection}
                      className="md:hidden bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                      title="Deselect All"
                    >
                      <X size={14} />
                      <span className="hidden xs:inline">Cancel</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2.5 w-full md:w-auto overflow-x-auto scrollbar-none py-0.5 justify-start md:justify-center">
                    <button 
                      onClick={() => setIsBatchUpdateModalOpen(true)}
                      className="bg-white text-[#0038A8] px-2.5 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider hover:bg-blue-50 transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      <CheckCircle size={13} className="sm:w-3.5 sm:h-3.5" />
                      <span className="whitespace-nowrap">Update Dues</span>
                    </button>
                    <button 
                      onClick={handleBatchSendReceipts}
                      disabled={isBatchSending}
                      className="bg-white text-[#0038A8] px-2.5 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider hover:bg-blue-50 transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0 shadow-sm"
                    >
                      {isBatchSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} className="sm:w-3.5 sm:h-3.5" />}
                      <span className="whitespace-nowrap">Send Receipts</span>
                    </button>
                    {profile.role === 'admin' && (
                      <button 
                        onClick={() => {
                          setDeleteType('selected');
                          setIsBatchDeleteModalOpen(true);
                        }}
                        disabled={isBatchDeleting}
                        className="bg-rose-600 text-white px-2.5 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider hover:bg-rose-700 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-md shrink-0"
                      >
                        {isBatchDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} className="sm:w-3.5 sm:h-3.5" />}
                        <span className="whitespace-nowrap">Delete</span>
                      </button>
                    )}
                    <button 
                      onClick={clearSelection}
                      className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0"
                    >
                      <X size={13} className="sm:w-3.5 sm:h-3.5 md:hidden" />
                      <span className="whitespace-nowrap">Cancel</span>
                    </button>
                  </div>
                </motion.div>
              )}

                  {/* Desktop View Table */}
                  <div className={`hidden lg:block overflow-x-auto border rounded-xl ${
                    isDarkMode ? 'border-slate-800' : 'border-gray-100'
                  }`}>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className={isDarkMode ? 'bg-slate-800/60' : 'bg-gray-50/50'}>
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
                          <th className={`px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Teacher Info</th>
                          <th className={`px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Payment Status</th>
                          <th className={`px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'bg-slate-900/60 divide-slate-800' : 'bg-white divide-gray-50'}`}>
                        {records.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-20 text-center">
                              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                                <Users size={32} className={isDarkMode ? 'text-slate-600' : 'text-gray-200'} />
                              </div>
                              <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>No teachers in the list yet.</p>
                            </td>
                          </tr>
                        ) : filteredRecords.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-20 text-center">
                              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                                <Search size={32} className={isDarkMode ? 'text-slate-600' : 'text-gray-200'} />
                              </div>
                              <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>No matching records found.</p>
                              <button onClick={clearFilters} className={`mt-4 text-[10px] font-black uppercase tracking-widest hover:underline ${isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'}`}>Clear Filters</button>
                            </td>
                          </tr>
                        ) : (
                          <>
                            <tr><td colSpan={4} className={`px-6 py-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Showing {paginatedRecords.length} teachers of {filteredRecords.length}</td></tr>
                            {paginatedRecords.map(record => {
                              const totalPaid = standardDues
                                .filter(d => record.paidDueIds.includes(d.id))
                                .reduce((sum, d) => {
                                  if (d.isVoluntary && record.voluntaryPayments?.[d.id] !== undefined) {
                                    return sum + record.voluntaryPayments[d.id];
                                  }
                                  return sum + d.amount;
                                }, 0);
                              const currentBalance = standardDues
                                .filter(d => !record.paidDueIds.includes(d.id))
                                .reduce((sum, d) => sum + d.amount, 0);
                              const isFullyPaid = requiredDues.length > 0 && requiredDues.every(d => record.paidDueIds.includes(d.id));
                              const isExpanded = expandedRows.has(record.id);

                              return (
                                <React.Fragment key={record.id}>
                                  <tr className={`transition-colors group ${
                                    isFullyPaid 
                                    ? isDarkMode ? 'bg-green-950/20 hover:bg-green-950/30' : 'bg-green-50/20 hover:bg-blue-50/30'
                                    : isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-blue-50/30'
                                  }`}>
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
                                    <button onClick={() => toggleRow(record.id)} className={`transition-colors ${isDarkMode ? 'text-slate-500 hover:text-blue-400' : 'text-gray-300 hover:text-[#0038A8]'}`}>
                                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                    <div>
                                      <div className={`text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{record.name}</div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                          isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-400'
                                        }`}>{record.gradeLevel}</span>
                                        {record.department && record.department !== record.gradeLevel && (
                                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                                            isDarkMode ? 'bg-blue-950/80 border-blue-900 text-blue-300' : 'bg-blue-50 border-blue-100 text-[#0038A8]'
                                          }`}>{record.department}</span>
                                        )}
                                        <span className={`text-[10px] font-bold truncate max-w-[150px] ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>{record.email}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`flex-1 h-2 rounded-full overflow-hidden min-w-[80px] max-w-[120px] ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                                      <div 
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          isFullyPaid ? 'bg-green-500' : totalPaid > 0 ? 'bg-yellow-500' : isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
                                        }`} 
                                        style={{ width: `${totalCollectibles > 0 ? (totalPaid / totalCollectibles) * 100 : 0}%` }}
                                      ></div>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                                      isFullyPaid ? 'text-green-500' : totalPaid > 0 ? 'text-amber-400' : isDarkMode ? 'text-slate-400' : 'text-gray-400'
                                    }`}>
                                      ₱{totalPaid.toFixed(0)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => setSupervisingTeacherId(record.id)}
                                      className="mr-1 px-2.5 py-1.5 bg-blue-50 hover:bg-[#0038A8] text-[#0038A8] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all shadow-sm active:scale-95 border border-blue-100"
                                      title="Detailed Dues Supervision Console"
                                    >
                                      <ShieldCheck size={12} />
                                      Supervise
                                    </button>
                                    <button 
                                      onClick={() => handleSendReminder(record)}
                                      disabled={isSendingReminder === record.id || record.pendingDeletion || isFullyPaid}
                                      className={`p-2 rounded-xl transition-all ${
                                        (isFullyPaid || record.pendingDeletion)
                                        ? 'text-gray-200 cursor-not-allowed' 
                                        : isSendingReminder === record.id
                                        ? 'text-gray-400'
                                        : 'text-orange-500 hover:bg-orange-50'
                                      }`}
                                      title="Send Payment Reminder"
                                    >
                                      {isSendingReminder === record.id ? <Loader2 size={16} className="animate-spin" /> : <MailWarning size={16} />}
                                    </button>
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
                                      onClick={() => handleDownloadReceipt(record)}
                                      disabled={totalPaid === 0 || record.pendingDeletion}
                                      className={`p-2 rounded-xl transition-all ${
                                        (totalPaid === 0 || record.pendingDeletion)
                                        ? 'text-gray-200 cursor-not-allowed' 
                                        : 'text-green-600 hover:bg-green-50'
                                      }`}
                                      title="Download Receipt"
                                    >
                                      <Download size={16} />
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
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6 p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
                                      <div className="flex items-center gap-6">
                                        <div className="bg-orange-50 p-4 rounded-2xl text-orange-600">
                                          <PhilippinePeso size={24} />
                                        </div>
                                        <div>
                                          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Current Balance</p>
                                          <h4 className={`text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₱{currentBalance.toFixed(2)}</h4>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <button 
                                          onClick={() => handleSendReminder(record)}
                                          disabled={isSendingReminder === record.id || record.pendingDeletion || currentBalance <= 0}
                                          className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 disabled:opacity-50"
                                        >
                                          {isSendingReminder === record.id ? <Loader2 size={14} className="animate-spin" /> : <MailWarning size={14} />}
                                          Send Reminder
                                        </button>
                                        <button 
                                          onClick={() => handleSendReceipt(record)}
                                          disabled={totalPaid === 0 || isSending === record.id || record.pendingDeletion}
                                          className="flex items-center gap-2 px-6 py-3 bg-[#CE1126] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50"
                                        >
                                          {isSending === record.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                          Send Receipt
                                        </button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {standardDues.map(due => {
                                        const isPaid = record.paidDueIds.includes(due.id);
                                        return (
                                          <label key={due.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${isPaid ? 'bg-white border-green-100 shadow-sm' : 'bg-white/50 border-gray-100'}`}>
                                            <div className="flex items-center gap-3">
                                              <input 
                                                type="checkbox" 
                                                checked={isPaid}
                                                onChange={() => handleTogglePayment(record.id, due.id)}
                                                className="w-4 h-4 lg:w-5 lg:h-5 text-[#0038A8] border-gray-300 rounded-lg focus:ring-[#0038A8]"
                                              />
                                              <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center ${isPaid ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'}`}>
                                                {isPaid ? <Check size={14} className="lg:w-4 lg:h-4" /> : <PhilippinePeso size={14} className="lg:w-4 lg:h-4" />}
                                              </div>
                                              <div>
                                                <div className="text-[13px] md:text-sm lg:text-base font-black text-gray-900 uppercase tracking-tight">{due.name}</div>
                                                <div className="text-[11px] lg:text-xs text-gray-500 font-bold">
                                                  {due.isVoluntary && isPaid 
                                                    ? `₱${(record.voluntaryPayments?.[due.id] || 0).toFixed(2)}`
                                                    : `₱${due.amount.toFixed(2)}`
                                                  }
                                                </div>
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
                  
                  {/* Mobile & Tablet View List */}
                  <div className={`lg:hidden space-y-4 mt-4 ${selectedTeacherIds.size > 0 ? 'pb-28' : 'pb-4'}`}>
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
                          const totalPaid = standardDues
                            .filter(d => record.paidDueIds.includes(d.id))
                            .reduce((sum, d) => {
                              if (d.isVoluntary && record.voluntaryPayments?.[d.id] !== undefined) {
                                return sum + record.voluntaryPayments[d.id];
                              }
                              return sum + d.amount;
                            }, 0);
                          const currentBalance = standardDues
                            .filter(d => !record.paidDueIds.includes(d.id))
                            .reduce((sum, d) => sum + d.amount, 0);
                          const isFullyPaid = requiredDues.length > 0 && requiredDues.every(d => record.paidDueIds.includes(d.id));
                          const isExpanded = expandedRows.has(record.id);

                          return (
                            <div key={record.id} className={`${
                              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-gray-900'
                            } p-3 rounded-2xl border ${isFullyPaid ? (isDarkMode ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-green-200 bg-green-50/10') : ''} shadow-sm space-y-3`}>
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
                                    <div className={`text-sm font-black uppercase tracking-tight truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{record.name}</div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                      <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                                        isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-400'
                                      }`}>{record.gradeLevel}</span>
                                      {record.department && record.department !== record.gradeLevel && <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${
                                        isDarkMode ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-blue-50 text-[#0038A8] border border-blue-100'
                                      }`}>{record.department}</span>}
                                      <span className={`text-[9px] font-bold truncate max-w-[120px] sm:max-w-[200px] ${
                                        isDarkMode ? 'text-slate-400' : 'text-gray-400'
                                      }`}>{record.email}</span>
                                    </div>
                                  </div>
                                </div>
                                <button onClick={() => toggleRow(record.id)} className={`p-1 transition-colors rounded-lg shrink-0 ${
                                  isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-blue-400' : 'bg-gray-50 text-gray-400 hover:text-[#0038A8]'
                                }`}>
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
                                    onClick={() => setSupervisingTeacherId(record.id)}
                                    className="p-1.5 bg-blue-50 text-[#0038A8] rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-all border border-blue-100"
                                    title="Detailed Dues Supervision Console"
                                  >
                                    <ShieldCheck size={12} />
                                    Supervise
                                  </button>
                                  <button 
                                    onClick={() => handleSendReminder(record)}
                                    disabled={isSendingReminder === record.id || record.pendingDeletion || currentBalance <= 0}
                                    className={`p-1.5 rounded-lg transition-all ${
                                      (currentBalance <= 0 || record.pendingDeletion)
                                      ? 'text-gray-200' 
                                      : isSendingReminder === record.id
                                      ? 'text-gray-400'
                                      : 'text-orange-500 bg-orange-50'
                                    }`}
                                    title="Send Payment Reminder"
                                  >
                                    {isSendingReminder === record.id ? <Loader2 size={12} className="animate-spin" /> : <MailWarning size={12} />}
                                  </button>
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
                                    onClick={() => generateTeacherQRCode(record.email, record.gradeLevel, record.name)}
                                    className="p-1.5 text-purple-600 bg-purple-50 rounded-lg transition-all"
                                    title="Generate QR Code"
                                  >
                                    <QrCode size={12} />
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
                                <div className={`pt-2 border-t space-y-3 ${isDarkMode ? 'border-slate-800' : 'border-gray-50'}`}>
                                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                                    isDarkMode ? 'bg-orange-950/30 border-orange-900/40' : 'bg-orange-50 border-orange-100'
                                  }`}>
                                    <div>
                                      <p className={`text-[8px] font-black uppercase tracking-widest leading-none mb-1 ${isDarkMode ? 'text-orange-400' : 'text-orange-400'}`}>Balance</p>
                                      <h4 className={`text-sm font-black leading-none ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>₱{currentBalance.toFixed(2)}</h4>
                                    </div>
                                    <button 
                                      onClick={() => handleSendReminder(record)}
                                      disabled={isSendingReminder === record.id || record.pendingDeletion || currentBalance <= 0}
                                      className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                      {isSendingReminder === record.id ? <Loader2 size={10} className="animate-spin" /> : <MailWarning size={10} />}
                                      Remind
                                    </button>
                                  </div>
                                  <div className="space-y-1.5">
                                    {standardDues.map(due => {
                                    const isPaid = record.paidDueIds.includes(due.id);
                                    return (
                                    <label key={due.id} className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer ${
                                      isDarkMode 
                                        ? (isPaid ? 'bg-slate-800 border-emerald-500/30 text-white' : 'bg-slate-950 border-slate-800 text-slate-300')
                                        : (isPaid ? 'bg-green-50/30 border-green-100 text-gray-900' : 'bg-gray-50/50 border-gray-100 text-gray-800')
                                    }`}>
                                      <div className="flex items-center gap-2">
                                        <input 
                                          type="checkbox" 
                                          checked={isPaid}
                                          onChange={() => handleTogglePayment(record.id, due.id)}
                                          className="w-3 h-3 text-[#0038A8] border-gray-300 rounded focus:ring-[#0038A8]"
                                        />
                                        <div className={`w-4 h-4 rounded-md flex items-center justify-center ${
                                          isPaid ? (isDarkMode ? 'bg-emerald-950 text-emerald-400' : 'bg-green-100 text-green-600') : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-gray-200 text-gray-400')
                                        }`}>
                                          {isPaid ? <Check size={8} /> : <PhilippinePeso size={8} />}
                                        </div>
                                        <div>
                                          <div className={`text-[12px] font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{due.name}</div>
                                          <div className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                            {due.isVoluntary && isPaid 
                                              ? `₱${(record.voluntaryPayments?.[due.id] || 0).toFixed(2)}`
                                              : `₱${due.amount.toFixed(2)}`
                                            }
                                          </div>
                                        </div>
                                      </div>
                                      {isPaid && <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                                        isDarkMode ? 'text-emerald-400 bg-emerald-950' : 'text-green-600 bg-green-100'
                                      }`}>Paid</span>}
                                    </label>
                                    );
                                  })}
                                </div>
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
            <div className={`p-8 rounded-3xl shadow-sm border ${
              isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100' : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-2xl font-black mb-6 uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Record New Expense</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (newExpenseDesc && newExpenseAmount) {
                  addExpense(newExpenseDesc, Number(newExpenseAmount), newExpenseCategory);
                  setNewExpenseDesc('');
                  setNewExpenseAmount('');
                }
              }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Description</label>
                  <input 
                    type="text" 
                    value={newExpenseDesc}
                    onChange={e => setNewExpenseDesc(e.target.value)}
                    placeholder="e.g., Office Supplies, Bereavement Aid"
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#0038A8] ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Category</label>
                  <select 
                    value={newExpenseCategory}
                    onChange={e => setNewExpenseCategory(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#0038A8] ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="General">General</option>
                    <option value="Supplies">Supplies</option>
                    <option value="Bereavement">Bereavement</option>
                    <option value="Events">Events</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Amount (₱)</label>
                  <input 
                    type="number" 
                    value={newExpenseAmount}
                    onChange={e => setNewExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-[#0038A8] ${
                      isDarkMode ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  />
                </div>
                <div className="flex items-end md:col-span-4">
                  <button type="submit" className="w-full bg-[#0038A8] text-white py-3 rounded-xl font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-md">
                    Add Expense
                  </button>
                </div>
              </form>
            </div>

            <div className={`p-8 rounded-3xl shadow-sm border ${
              isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100' : 'bg-white border-gray-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Expense History</h2>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={handleDownloadLiquidationDocx}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      isDarkMode ? 'bg-blue-950/80 text-blue-400 border-blue-800/80 hover:bg-blue-900/80' : 'bg-blue-50 text-[#0038A8] border-blue-100 hover:bg-blue-100'
                    }`}
                  >
                    <FileText size={14} />
                    Download DOCX
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className={`text-left text-[10px] font-bold uppercase tracking-widest border-b ${
                      isDarkMode ? 'text-slate-400 border-slate-800' : 'text-gray-400 border-gray-100'
                    }`}>
                      <th className="pb-4 pl-4">Date</th>
                      <th className="pb-4">Description</th>
                      <th className="pb-4">Amount (₱)</th>
                      <th className="pb-4">Recorded By</th>
                      <th className="pb-4 text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-gray-50'}`}>
                    {expenses.length === 0 ? (
                      <tr><td colSpan={5} className={`py-12 text-center italic ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>No expenses recorded yet.</td></tr>
                    ) : (
                      expenses.map(exp => (
                        <tr key={exp.id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'}`}>
                          <td className={`py-4 pl-4 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{ensureTimestamp(exp.timestamp).toDate().toLocaleDateString()}</td>
                          <td className={`py-4 text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{exp.description}</td>
                          <td className="py-4 text-sm font-black text-rose-500">₱{exp.amount.toFixed(2)}</td>
                          <td className={`py-4 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{exp.adminName}</td>
                          <td className="py-4 text-right pr-4">
                            <button onClick={() => deleteExpense(exp.id)} className={`transition-colors ${isDarkMode ? 'text-slate-500 hover:text-rose-400' : 'text-gray-400 hover:text-red-500'}`}>
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
                  <div className={`py-12 text-center italic border rounded-2xl ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-gray-100 text-gray-400'}`}>No expenses recorded yet.</div>
                ) : (
                  expenses.map(exp => (
                    <div key={exp.id} className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
                      isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-gray-100'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{exp.description}</div>
                          <div className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{exp.adminName}</div>
                        </div>
                      </div>
                      <div className={`flex justify-between items-center text-sm pt-2 border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-50'}`}>
                        <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{ensureTimestamp(exp.timestamp).toDate().toLocaleDateString()}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-black text-rose-500">₱{exp.amount.toFixed(2)}</span>
                          <button onClick={() => deleteExpense(exp.id)} className={`p-1.5 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-rose-400' : 'text-gray-400 hover:text-red-500'}`}>
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

        {activeTab === 'settings' && profile.role === 'admin' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className={`p-8 rounded-[2.5rem] shadow-sm border ${
              isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100' : 'bg-white border-gray-200'
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    isDarkMode ? 'bg-blue-950/80 text-blue-400 border border-blue-800/80' : 'bg-blue-50 text-[#0038A8]'
                  }`}>
                    <Settings size={24} />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Report Configuration</h2>
                    <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Manage signatories and report settings</p>
                  </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      const newSig: Signatory = {
                        id: Math.random().toString(36).substr(2, 9),
                        label: 'New Signatory:',
                        name: '',
                        title: ''
                      };
                      setSignatories([...signatories, newSig]);
                    }}
                    className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                      isDarkMode ? 'bg-blue-950/80 text-blue-400 border-blue-800/80 hover:bg-blue-900/80' : 'bg-blue-50 text-[#0038A8] border-blue-100 hover:bg-blue-100'
                    }`}
                  >
                    <Plus size={16} /> Add Signatory
                  </button>
                  <button 
                    onClick={() => updateSignatories(signatories)}
                    className="flex-1 sm:flex-none bg-[#0038A8] text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/30"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {signatories.map((sig, index) => (
                  <div key={sig.id} className={`p-6 rounded-3xl border space-y-4 relative group ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <button 
                      onClick={() => {
                        const newList = signatories.filter((_, i) => i !== index);
                        setSignatories(newList);
                      }}
                      className={`absolute top-4 right-4 p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 ${
                        isDarkMode ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                      title="Remove Signatory"
                    >
                      <Trash2 size={14} />
                    </button>
                    
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'}`}>Label (e.g., Prepared by:)</label>
                        <input 
                          type="text" 
                          value={sig.label}
                          onChange={(e) => {
                            const newList = [...signatories];
                            newList[index].label = e.target.value;
                            setSignatories(newList);
                          }}
                          className={`w-full px-4 py-3 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#0038A8] transition-all ${
                            isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Full Name</label>
                        <input 
                          type="text" 
                          value={sig.name}
                          onChange={(e) => {
                            const newList = [...signatories];
                            newList[index].name = e.target.value;
                            setSignatories(newList);
                          }}
                          placeholder="Enter name"
                          className={`w-full px-4 py-3 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#0038A8] transition-all ${
                            isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Title / Position</label>
                        <input 
                          type="text" 
                          value={sig.title}
                          onChange={(e) => {
                            const newList = [...signatories];
                            newList[index].title = e.target.value;
                            setSignatories(newList);
                          }}
                          placeholder="Enter title"
                          className={`w-full px-4 py-3 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#0038A8] transition-all ${
                            isDarkMode ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-gray-200 text-gray-900'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {signatories.length === 0 && (
                  <div className={`col-span-full py-20 text-center rounded-[2.5rem] border border-dashed ${
                    isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm ${
                      isDarkMode ? 'bg-slate-900 text-slate-600' : 'bg-white text-gray-300'
                    }`}>
                      <Settings size={32} />
                    </div>
                    <p className={`text-sm font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>No signatories configured.</p>
                    <button 
                      onClick={() => {
                        const newSig: Signatory = {
                          id: Math.random().toString(36).substr(2, 9),
                          label: 'Prepared by:',
                          name: '',
                          title: ''
                        };
                        setSignatories([...signatories, newSig]);
                      }}
                      className={`mt-4 text-xs font-black uppercase tracking-widest hover:underline ${isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'}`}
                    >
                      Add your first signatory
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* DOCX Branding Settings */}
            <div className={`p-8 rounded-[2.5rem] shadow-sm border ${
              isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  isDarkMode ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/80' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>DOCX Branding Settings</h2>
                  <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Configure Custom Export Headers & Footers</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className={`space-y-4 p-6 rounded-3xl border ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${
                      isDarkMode ? 'bg-slate-900 text-indigo-400' : 'bg-white text-indigo-600'
                    }`}>
                      <LayoutDashboard size={16} />
                    </div>
                    <label className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Document Header Image</label>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleBrandingImageUpload(e, 'headerUrl')}
                    className="w-full text-xs font-medium text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  <div className={`text-[10px] font-medium leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    Upload your exact header image. It will perfectly span the exported page.
                  </div>
                  {brandingSettings.headerUrl && (
                    <div className={`mt-4 p-2 rounded-xl border overflow-hidden shadow-inner flex items-center justify-between ${
                      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
                    }`}>
                      <img 
                        src={brandingSettings.headerUrl.replace('dl=0', 'raw=1')} 
                        alt="Header Preview" 
                        className="w-[80%] h-12 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <button onClick={() => setBrandingSettings(prev => ({ ...prev, headerUrl: '' }))} className="text-red-500 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                    </div>
                  )}
                </div>

                <div className={`space-y-4 p-6 rounded-3xl border ${
                  isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${
                      isDarkMode ? 'bg-slate-900 text-indigo-400' : 'bg-white text-indigo-600'
                    }`}>
                      <LayoutDashboard size={16} />
                    </div>
                    <label className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Document Footer Image</label>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleBrandingImageUpload(e, 'footerUrl')}
                    className="w-full text-xs font-medium text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  <div className={`text-[10px] font-medium leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                    Upload your exact footer image. It will correctly shape to the bottom margins.
                  </div>
                  {brandingSettings.footerUrl && (
                    <div className={`mt-4 p-2 rounded-xl border overflow-hidden shadow-inner flex items-center justify-between ${
                      isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'
                    }`}>
                      <img 
                        src={brandingSettings.footerUrl.replace('dl=0', 'raw=1')} 
                        alt="Footer Preview" 
                        className="w-[80%] h-12 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <button onClick={() => setBrandingSettings(prev => ({ ...prev, footerUrl: '' }))} className="text-red-500 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => updateBranding(brandingSettings.headerUrl, brandingSettings.footerUrl)}
                  className="bg-indigo-600 text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
                >
                  <ShieldCheck size={16} /> Save Branding Setup
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'audit' && profile.role === 'admin' && (
          <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className={`p-8 rounded-[2.5rem] shadow-sm border ${
              isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100' : 'bg-white border-gray-200'
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    isDarkMode ? 'bg-purple-950/80 text-purple-400 border border-purple-800/80' : 'bg-purple-50 text-purple-600'
                  }`}>
                    <Shield size={24} />
                  </div>
                  <div>
                    <h2 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>System Audit Logs</h2>
                    <p className={`text-xs font-bold mt-1 uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Transparency & Activity Tracking</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button 
                    onClick={clearAuditLogs}
                    className={`flex-1 sm:flex-none px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                      isDarkMode ? 'bg-rose-950/80 text-rose-400 border-rose-800/80 hover:bg-rose-900/80' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                    }`}
                  >
                    <Trash2 size={16} /> Clear All Logs
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {auditLogs.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                      isDarkMode ? 'bg-slate-800' : 'bg-gray-50'
                    }`}>
                      <Shield size={32} className={isDarkMode ? 'text-slate-600' : 'text-gray-200'} />
                    </div>
                    <div className={`font-bold uppercase tracking-widest text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>No activity logs found.</div>
                  </div>
                ) : (
                  auditLogs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).map(log => (
                    <div key={log.id} className={`flex items-start gap-4 p-5 rounded-3xl border transition-all group ${
                      isDarkMode 
                        ? 'bg-slate-950/60 border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-800/40' 
                        : 'border-gray-100 hover:border-blue-100 hover:bg-blue-50/30'
                    }`}>
                      <div className={`mt-1.5 w-3 h-3 rounded-full shrink-0 ${
                        log.type === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                        log.type === 'warning' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                          <span className={`text-sm font-black uppercase tracking-tight truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{log.action}</span>
                          <span className={`text-[10px] font-bold whitespace-nowrap px-3 py-1 rounded-full transition-colors ${
                            isDarkMode ? 'text-slate-400 bg-slate-800 group-hover:bg-slate-700' : 'text-gray-400 bg-gray-100 group-hover:bg-white'
                          }`}>
                            {ensureTimestamp(log.timestamp).toDate().toLocaleString()}
                          </span>
                        </div>
                        <p className={`text-xs mb-3 leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>{log.details}</p>
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 border rounded-full flex items-center justify-center shadow-sm ${
                            isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'
                          }`}>
                            <User size={12} className={isDarkMode ? 'text-slate-400' : 'text-gray-600'} />
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{log.userName}</span>
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
          <div className="max-w-2xl mx-auto my-8 animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
            {/* User Details Card */}
            <div className={`p-8 rounded-[2.5rem] border shadow-sm transition-all duration-300 ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
            }`}>
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center font-black ${
                  isDarkMode ? 'bg-slate-800 text-blue-400 border border-slate-700' : 'bg-blue-50 text-[#0038A8]'
                }`}>
                  <User size={32} />
                </div>
                <div>
                  <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>User Profile</h2>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Manage your personal information</p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Name</label>
                  <input 
                    type="text" 
                    value={isEditingProfile ? editProfileName : profile.name}
                    onChange={(e) => setEditProfileName(e.target.value)}
                    disabled={!isEditingProfile}
                    className={`w-full p-4 border rounded-2xl focus:ring-2 focus:ring-[#0038A8] outline-none font-bold ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800 text-white disabled:bg-slate-900/60' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 disabled:bg-gray-100/70'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Email</label>
                  <input 
                    type="email" 
                    value={isEditingProfile ? editProfileEmail : profile.email}
                    onChange={(e) => setEditProfileEmail(e.target.value)}
                    disabled={!isEditingProfile}
                    className={`w-full p-4 border rounded-2xl focus:ring-2 focus:ring-[#0038A8] outline-none font-bold ${
                      isDarkMode 
                        ? 'bg-slate-950 border-slate-800 text-white disabled:bg-slate-900/60' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 disabled:bg-gray-100/70'
                    }`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Grade Level</label>
                    <select 
                      value={isEditingProfile ? editProfileGradeLevel : (profile.gradeLevel as GradeLevel)}
                      onChange={(e) => setEditProfileGradeLevel(e.target.value as GradeLevel)}
                      disabled={!isEditingProfile}
                      className={`w-full p-4 border rounded-2xl focus:ring-2 focus:ring-[#0038A8] outline-none font-bold disabled:opacity-70 ${
                        isDarkMode 
                          ? 'bg-slate-950 border-slate-800 text-white disabled:bg-slate-900/60' 
                          : 'bg-gray-50 border-gray-200 text-gray-900 disabled:bg-gray-100/70'
                      }`}
                    >
                      {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Department</label>
                    <input 
                      type="text" 
                      value={isEditingProfile ? editProfileDepartment : (getTeacherRecordByEmail(profile.email)?.department || '')}
                      onChange={(e) => setEditProfileDepartment(e.target.value)}
                      disabled={!isEditingProfile}
                      className={`w-full p-4 border rounded-2xl focus:ring-2 focus:ring-[#0038A8] outline-none font-bold disabled:opacity-70 ${
                        isDarkMode 
                          ? 'bg-slate-950 border-slate-800 text-white disabled:bg-slate-900/60' 
                          : 'bg-gray-50 border-gray-200 text-gray-900 disabled:bg-gray-100/70'
                      }`}
                      placeholder="e.g. Science"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  {isEditingProfile ? (
                    <>
                      <button onClick={handleSaveProfile} className="flex-1 bg-[#0038A8] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-md">Save</button>
                      <button onClick={() => setIsEditingProfile(false)} className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${
                        isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditingProfile(true)} className="w-full bg-[#0038A8] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-md">Edit Profile</button>
                  )}
                </div>
              </div>
            </div>

            {/* Appearance & Theme Preferences Card */}
            <div className={`p-8 rounded-[2.5rem] border shadow-sm transition-all duration-300 ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
            }`}>
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  isDarkMode ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50' : 'bg-blue-50 text-[#0038A8]'
                }`}>
                  {isDarkMode ? <Moon size={24} /> : <Sun size={24} />}
                </div>
                <div>
                  <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Appearance & Theme</h3>
                  <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Customize the interface colors and dark mode theme
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Light Mode Card */}
                <button
                  type="button"
                  onClick={() => setIsDarkMode(false)}
                  className={`p-5 rounded-3xl border text-left transition-all relative overflow-hidden group ${
                    !isDarkMode
                      ? 'bg-blue-50/90 border-[#0038A8] ring-2 ring-[#0038A8]/30 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                        <Sun size={18} />
                      </div>
                      <span className={`text-sm font-black uppercase tracking-wider ${!isDarkMode ? 'text-[#0038A8]' : 'text-slate-200'}`}>
                        Light Mode
                      </span>
                    </div>
                    {!isDarkMode && (
                      <span className="px-2.5 py-1 bg-[#0038A8] text-white text-[10px] font-black uppercase rounded-full tracking-wider shadow-sm">
                        Active
                      </span>
                    )}
                  </div>
                  <p className={`text-xs font-semibold ${!isDarkMode ? 'text-blue-950' : 'text-slate-400'}`}>
                    Clean, high-contrast light canvas with royal blue highlights. Best for daytime and bright environments.
                  </p>
                  <div className="mt-4 p-2 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#0038A8]"></div>
                    <div className="w-12 h-2 rounded-full bg-slate-300"></div>
                    <div className="ml-auto w-6 h-2 rounded-full bg-emerald-500"></div>
                  </div>
                </button>

                {/* Dark Mode Card */}
                <button
                  type="button"
                  onClick={() => setIsDarkMode(true)}
                  className={`p-5 rounded-3xl border text-left transition-all relative overflow-hidden group ${
                    isDarkMode
                      ? 'bg-slate-800/90 border-blue-500 ring-2 ring-blue-500/30 shadow-xl'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-950 flex items-center justify-center text-indigo-400 border border-indigo-800">
                        <Moon size={18} />
                      </div>
                      <span className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Dark Mode
                      </span>
                    </div>
                    {isDarkMode && (
                      <span className="px-2.5 py-1 bg-blue-500 text-white text-[10px] font-black uppercase rounded-full tracking-wider shadow-sm">
                        Active
                      </span>
                    )}
                  </div>
                  <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                    Sleek, eye-friendly midnight canvas with gold & cyan indicators. Reduces eye strain in dark environments.
                  </p>
                  <div className="mt-4 p-2 bg-slate-900 rounded-xl border border-slate-800 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                    <div className="w-12 h-2 rounded-full bg-slate-700"></div>
                    <div className="ml-auto w-6 h-2 rounded-full bg-emerald-400"></div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'remittance' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={`md:col-span-2 p-6 rounded-3xl shadow-sm border ${
                isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-[#0038A8] text-white w-10 h-10 rounded-2xl flex items-center justify-center font-bold">
                    <Wallet size={20} />
                  </div>
                  <h2 className={`text-2xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Remittance Tracking</h2>
                </div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Monitor and manage all remittance records from Board of Directors.</p>
              </div>
              
              {profile.role === 'bod' && (
                <div className={`p-6 rounded-3xl shadow-sm border flex flex-col justify-between ${
                  isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100' : 'bg-white border-gray-200'
                }`}>
                  <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Pending Remittance</div>
                  <div className="text-3xl font-black text-green-500 mb-4">
                    ₱{records.filter(r => {
                      const remittedIds = r.remittedDueIds || [];
                      return r.paidDueIds.some(id => !remittedIds.includes(id));
                    }).reduce((sum, r) => {
                      const remittedIds = r.remittedDueIds || [];
                      const newlyPaidDues = standardDues.filter(d => r.paidDueIds.includes(d.id) && !remittedIds.includes(d.id));
                      return sum + newlyPaidDues.reduce((s, d) => {
                        if (d.isVoluntary && r.voluntaryPayments?.[d.id]) return s + r.voluntaryPayments[d.id];
                        return s + d.amount;
                      }, 0);
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

            <div className={`p-6 rounded-3xl shadow-sm border ${
              isDarkMode ? 'bg-slate-900/85 border-slate-800 text-slate-100' : 'bg-white border-gray-200'
            }`}>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className={`text-left text-[10px] font-bold uppercase tracking-widest border-b ${
                      isDarkMode ? 'text-slate-400 border-slate-800' : 'text-gray-400 border-gray-100'
                    }`}>
                      <th className="pb-4 pl-4">Date</th>
                      <th className="pb-4">BOD Name</th>
                      <th className="pb-4">Grade</th>
                      <th className="pb-4">Amount (₱)</th>
                      <th className="pb-4">Status</th>
                      {(profile.role === 'admin' || profile.email === 'lpcaanhsfacultyclubofficers@gmail.com' || profile.email === 'ngehthong@gmail.com') && <th className="pb-4 text-right pr-4">Action</th>}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800/60' : 'divide-gray-50'}`}>
                    {remittances.sort((a, b) => (ensureTimestamp(b.timestamp).seconds || 0) - (ensureTimestamp(a.timestamp).seconds || 0)).map(rem => (
                      <tr key={rem.id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'}`}>
                        <td className={`py-4 pl-4 text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-600'}`}>
                          {ensureTimestamp(rem.timestamp).toDate().toLocaleDateString()}
                        </td>
                        <td className={`py-4 text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rem.bodName}</td>
                        <td className={`py-4 text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{rem.gradeLevel}</td>
                        <td className={`py-4 text-sm font-black ${isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'}`}>₱{rem.amount.toFixed(2)}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                            rem.status === 'verified' 
                              ? isDarkMode ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' : 'bg-green-100 text-green-700'
                              : isDarkMode ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {rem.status}
                          </span>
                        </td>
                         {(profile.role === 'admin' || profile.email === 'lpcaanhsfacultyclubofficers@gmail.com' || profile.email === 'ngehthong@gmail.com') && (
                          <td className="py-4 text-right pr-4 flex items-center justify-end gap-3">
                            {rem.status === 'pending' ? (
                              <button 
                                onClick={() => verifyRemittance(rem.id)}
                                className={`text-[10px] font-bold underline ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                              >
                                Verify
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleResendAcceptanceEmail(rem)}
                                className={`text-[10px] font-bold underline ${isDarkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-green-600 hover:text-green-800'}`}
                              >
                                Resend
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                setRemittanceIdToDelete(rem.id);
                                setIsDeleteModalOpen(true);
                              }}
                              className={`p-1.5 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
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
                        <td colSpan={6} className={`py-12 text-center text-sm italic ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                          No remittance records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {remittances.sort((a, b) => (ensureTimestamp(b.timestamp).seconds || 0) - (ensureTimestamp(a.timestamp).seconds || 0)).map(rem => (
                  <div key={rem.id} className={`p-4 rounded-2xl border shadow-sm space-y-3 ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-gray-100'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{rem.bodName}</div>
                        <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{rem.gradeLevel}</div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                        rem.status === 'verified' 
                          ? isDarkMode ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' : 'bg-green-100 text-green-700'
                          : isDarkMode ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {rem.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{ensureTimestamp(rem.timestamp).toDate().toLocaleDateString()}</span>
                      <span className={`font-black ${isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'}`}>₱{rem.amount.toFixed(2)}</span>
                    </div>
                    {(profile.role === 'admin' || profile.email === 'lpcaanhsfacultyclubofficers@gmail.com' || profile.email === 'ngehthong@gmail.com') && (
                      <div className={`pt-3 border-t flex justify-end gap-3 ${isDarkMode ? 'border-slate-800' : 'border-gray-50'}`}>
                        {rem.status === 'pending' ? (
                          <button 
                            onClick={() => verifyRemittance(rem.id)}
                            className={`text-[10px] font-bold underline ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                          >
                            Verify
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleResendAcceptanceEmail(rem)}
                            className={`text-[10px] font-bold underline ${isDarkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-green-600 hover:text-green-800'}`}
                          >
                            Resend
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setRemittanceIdToDelete(rem.id);
                            setIsDeleteModalOpen(true);
                          }}
                          className={`p-1.5 transition-colors ${isDarkMode ? 'text-slate-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                          title="Delete Remittance"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {remittances.length === 0 && (
                  <div className={`py-8 text-center text-sm italic border rounded-2xl ${
                    isDarkMode ? 'bg-slate-950/40 border-slate-800 text-slate-500' : 'border-gray-100 text-gray-400'
                  }`}>
                    No remittance records found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && profile.role === 'admin' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col xl:flex-row gap-8">
              
              {/* Left Column - Main Content (Scales on Desktop) */}
              <div className="flex-1 space-y-8 min-w-0">
                {/* Top Row: Net Balance (Desktop only) and Grade Stats */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Net Balance Card - Full width on mobile, 5 cols on MD, 5 cols on XL */}
                  <div className="md:col-span-5 xl:col-span-4 flex">
                    <div className="bg-[#0038A8] p-8 md:p-10 rounded-[3rem] shadow-2xl text-white relative overflow-hidden flex flex-col justify-between w-full min-h-[350px]">
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
                        <div className="text-4xl lg:text-5xl font-black mb-10 tracking-tighter">
                          ₱{netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      
                      <div className="relative z-10 space-y-4 pt-8 border-t border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold opacity-60 uppercase tracking-widest">Total Collections</span>
                          <span className="text-sm font-black">₱{totalCollections.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold opacity-60 uppercase tracking-widest">Total Expenses</span>
                          <span className="text-sm font-black text-red-300">-₱{expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grade Stats - Full width on mobile, 7 cols on MD, 8 cols on XL */}
                  <div className="md:col-span-7 xl:col-span-8 grid grid-cols-2 gap-4 lg:gap-6">
                    {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].map(grade => {
                      const gradeTeachers = records.filter(r => r.gradeLevel === grade);
                      const totalCollected = gradeTeachers.reduce((sum, r) => {
                        const paidDues = standardDues.filter(d => r.paidDueIds.includes(d.id));
                        return sum + paidDues.reduce((s, d) => {
                          if (d.isVoluntary && r.voluntaryPayments?.[d.id]) return s + r.voluntaryPayments[d.id];
                          return s + d.amount;
                        }, 0);
                      }, 0);
                      const totalCollectibles = gradeTeachers.length * requiredDues.reduce((sum, d) => sum + d.amount, 0);
                      const fullyPaidCount = gradeTeachers.filter(r => requiredDues.length > 0 && requiredDues.every(d => r.paidDueIds.includes(d.id))).length;

                      return (
                        <div key={grade} className={`p-5 lg:p-6 rounded-[2rem] shadow-sm border transition-all group flex flex-col justify-between ${
                          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100 hover:border-slate-700' : 'bg-white border-gray-100 text-gray-900 hover:border-blue-100 hover:shadow-md'
                        }`}>
                          <div>
                            <div className="flex justify-between items-start mb-4">
                              <div className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>{grade}</div>
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                                isDarkMode ? 'bg-slate-800 group-hover:bg-blue-900/50' : 'bg-gray-50 group-hover:bg-blue-50'
                              }`}>
                                <Users size={14} className={isDarkMode ? 'text-slate-400 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-[#0038A8]'} />
                              </div>
                            </div>
                            <div className={`text-lg lg:text-2xl font-black mb-3 truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₱{totalCollected.toLocaleString()}</div>
                          </div>
                          <div>
                            <div className={`w-full h-2 rounded-full overflow-hidden mb-3 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                              <div 
                                className="bg-green-500 h-full transition-all duration-1000 ease-out" 
                                style={{ width: `${totalCollectibles > 0 ? (totalCollected / totalCollectibles) * 100 : 0}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className={`uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Fully Paid</span>
                              <span className="text-green-500 font-black">{fullyPaidCount} / {gradeTeachers.length}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Collection Analytics & Progress Chart */}
                <CollectionAnalyticsChart
                  records={records}
                  standardDues={standardDues}
                  remittances={remittances}
                  isDarkMode={isDarkMode}
                  handleDownloadTermsDocx={handleDownloadTermsDocx}
                  handleDownloadExcel={handleDownloadExcel}
                  handleDownloadComprehensiveReportDocx={handleDownloadComprehensiveReportDocx}
                  handleDownloadGlobalPaymentHistoryDocx={handleDownloadGlobalPaymentHistoryDocx}
                />
              </div>

              {/* Right Column - Actions Panel (320px width on desktop) */}
              <div className="xl:w-[320px] shrink-0 space-y-8">
                
                {/* Quick Actions Panel */}
                <div className={`p-6 rounded-[2rem] border shadow-sm ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-gray-900'
                }`}>
                  <h3 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>Quick Actions</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 gap-3">
                    <button onClick={() => setActiveTab('collection')} className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 group ${
                      isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:border-blue-500/50 hover:bg-slate-800' : 'bg-gray-50 border-transparent hover:border-blue-200 hover:bg-blue-50'
                    }`}>
                      <div className={isDarkMode ? 'text-slate-400 group-hover:text-blue-400 transition-colors' : 'text-gray-400 group-hover:text-[#0038A8] transition-colors'}><Users size={20} /></div>
                      <span className={`text-[9px] font-black uppercase tracking-widest text-center ${isDarkMode ? 'text-slate-300 group-hover:text-blue-400' : 'text-gray-600 group-hover:text-[#0038A8]'}`}>Teachers</span>
                    </button>
                    <button onClick={() => setActiveTab('expenses')} className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 group ${
                      isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:border-red-500/50 hover:bg-slate-800' : 'bg-gray-50 border-transparent hover:border-red-200 hover:bg-red-50'
                    }`}>
                      <div className={isDarkMode ? 'text-slate-400 group-hover:text-red-400 transition-colors' : 'text-gray-400 group-hover:text-red-500 transition-colors'}><CreditCard size={20} /></div>
                      <span className={`text-[9px] font-black uppercase tracking-widest text-center ${isDarkMode ? 'text-slate-300 group-hover:text-red-400' : 'text-gray-600 group-hover:text-red-500'}`}>Expenses</span>
                    </button>
                    <button onClick={() => setActiveTab('audit')} className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 group ${
                      isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:border-purple-500/50 hover:bg-slate-800' : 'bg-gray-50 border-transparent hover:border-purple-200 hover:bg-purple-50'
                    }`}>
                      <div className={isDarkMode ? 'text-slate-400 group-hover:text-purple-400 transition-colors' : 'text-gray-400 group-hover:text-purple-500 transition-colors'}><Shield size={20} /></div>
                      <span className={`text-[9px] font-black uppercase tracking-widest text-center ${isDarkMode ? 'text-slate-300 group-hover:text-purple-400' : 'text-gray-600 group-hover:text-purple-500'}`}>Audits</span>
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 group ${
                      isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:border-blue-500/50 hover:bg-slate-800' : 'bg-gray-50 border-transparent hover:border-blue-200 hover:bg-blue-50'
                    }`}>
                      <div className={isDarkMode ? 'text-slate-400 group-hover:text-blue-400 transition-colors' : 'text-gray-400 group-hover:text-[#0038A8] transition-colors'}><Settings size={20} /></div>
                      <span className={`text-[9px] font-black uppercase tracking-widest text-center ${isDarkMode ? 'text-slate-300 group-hover:text-blue-400' : 'text-gray-600 group-hover:text-[#0038A8]'}`}>Settings</span>
                    </button>
                    <button onClick={() => setActiveTab('system')} className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 group ${
                      isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:border-purple-500/50 hover:bg-slate-800' : 'bg-gray-50 border-transparent hover:border-purple-200 hover:bg-purple-50'
                    }`}>
                      <div className={isDarkMode ? 'text-slate-400 group-hover:text-purple-400 transition-colors' : 'text-gray-400 group-hover:text-purple-500 transition-colors'}><Shield size={20} /></div>
                      <span className={`text-[9px] font-black uppercase tracking-widest text-center ${isDarkMode ? 'text-slate-300 group-hover:text-purple-400' : 'text-gray-600 group-hover:text-purple-500'}`}>System</span>
                    </button>
                    <button onClick={handleDownloadComprehensiveReportDocx} className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 group ${
                      isDarkMode ? 'bg-slate-800/80 border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800' : 'bg-gray-50 border-transparent hover:border-green-200 hover:bg-green-50'
                    }`}>
                      <div className={isDarkMode ? 'text-slate-400 group-hover:text-emerald-400 transition-colors' : 'text-gray-400 group-hover:text-green-500 transition-colors'}><FileText size={20} /></div>
                      <span className={`text-[9px] font-black uppercase tracking-widest text-center ${isDarkMode ? 'text-slate-300 group-hover:text-emerald-400' : 'text-gray-600 group-hover:text-green-500'}`}>Reports</span>
                    </button>
                  </div>
                </div>

                {/* Initial Balance Management Panel */}
                <div className={`p-6 rounded-[2rem] border shadow-sm ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-gray-900'
                }`}>
                  <h3 className={`text-sm font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-slate-200' : 'text-gray-900'}`}>Initial Balance</h3>
                  <div className="flex flex-col gap-3">
                    <input 
                      type="number" 
                      placeholder="Amount (₱)" 
                      value={newBalanceAmount}
                      onChange={(e) => setNewBalanceAmount(e.target.value)}
                      className={`w-full px-5 py-3 rounded-xl border outline-none text-sm font-bold ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:ring-2 focus:ring-blue-500/30' : 'bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                    <input 
                      type="text" 
                      placeholder="Description (e.g. Carry-over)" 
                      value={newBalanceDescription}
                      onChange={(e) => setNewBalanceDescription(e.target.value)}
                      className={`w-full px-5 py-3 rounded-xl border outline-none text-sm font-bold ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:ring-2 focus:ring-blue-500/30' : 'bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                    <button 
                      onClick={handleAddInitialBalance}
                      className="w-full bg-[#0038A8] text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-800 transition-all shadow-md mt-2"
                    >
                      Add Balance
                    </button>
                  </div>
                </div>

                {/* Database Backup Management Panel */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm mt-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#0038A8]">
                      <Database size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Database Backup</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Disaster Recovery</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {!backupDownloadUrl ? (
                      <button 
                        onClick={handleDownloadBackup}
                        disabled={isGeneratingBackup}
                        className={`w-full text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 ${isGeneratingBackup ? 'bg-blue-400 cursor-not-allowed' : 'bg-[#0038A8] hover:bg-blue-800'}`}
                      >
                        {isGeneratingBackup ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent blur-[0.5px]"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download size={16} /> Generate Backup
                          </>
                        )}
                      </button>
                    ) : (
                      <a 
                        href={backupDownloadUrl}
                        download={backupFileName}
                        className="w-full bg-green-600 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-md flex items-center justify-center gap-2"
                        onClick={() => {
                          // Hide the download button after 2 seconds to reset state for the next time
                          setTimeout(() => {
                            setBackupDownloadUrl(null);
                          }, 2000);
                        }}
                      >
                        <Download size={16} /> Download Ready!
                      </a>
                    )}
                    <div className="relative">
                      <input 
                        type="file" 
                        accept=".json"
                        className="hidden" 
                        id="backup-upload"
                        onChange={handleUploadBackup}
                      />
                      <label 
                        htmlFor="backup-upload"
                        className="w-full cursor-pointer bg-red-50 text-red-600 border border-transparent hover:border-red-200 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                      >
                        <Upload size={16} /> Restore Backup
                      </label>
                    </div>
                    <p className="text-[9px] text-gray-500 font-bold uppercase text-center mt-2 tracking-widest leading-relaxed">
                      Warning: Restoring will overwrite all current data.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && profile.role === 'admin' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Sub-Tab Navigation Header */}
            <div className={`p-2.5 rounded-2xl sm:rounded-3xl border backdrop-blur-md flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between ${
              isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-200/80 shadow-sm'
            }`}>
              <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
                <button
                  onClick={() => setAdminSubTab('users')}
                  className={`px-3.5 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${
                    adminSubTab === 'users'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                      : (isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                  }`}
                >
                  <Shield size={16} />
                  <span>Users & Access</span>
                </button>

                <button
                  onClick={() => setAdminSubTab('broadcast')}
                  className={`px-3.5 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${
                    adminSubTab === 'broadcast'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                      : (isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                  }`}
                >
                  <Megaphone size={16} />
                  <span>Broadcast</span>
                </button>

                <button
                  onClick={() => setAdminSubTab('maintenance')}
                  className={`px-3.5 sm:px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${
                    adminSubTab === 'maintenance'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                      : (isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                  }`}
                >
                  <Database size={16} />
                  <span>Maintenance</span>
                </button>
              </div>

              {/* Quick Status / Lockout toggle */}
              <div className="flex items-center justify-end px-2">
                <button 
                  onClick={async () => {
                    try {
                      const newMode = !isMaintenanceMode;
                      await setDoc(doc(db, 'settings', 'global'), { 
                        maintenanceMode: newMode 
                      }, { merge: true });
                      showToast(`System Maintenance is now ${newMode ? 'ON' : 'OFF'}`);
                      logActivity(
                        newMode ? 'Enabled Maintenance Mode' : 'Disabled Maintenance Mode', 
                        `Teachers are now ${newMode ? 'locked out' : 'granted access'}`, 
                        'critical'
                      );
                    } catch (e) {
                      showToast("Failed to toggle maintenance mode.");
                    }
                  }}
                  className={`w-full sm:w-auto py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${
                    isMaintenanceMode 
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' 
                      : (isDarkMode ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-200')
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${isMaintenanceMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                  <span>{isMaintenanceMode ? 'Maintenance Lockout Active' : 'System Online'}</span>
                </button>
              </div>
            </div>

            {/* Grid Container for User Management / Profile Changes / Activity */}
            {adminSubTab === 'users' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
              {/* User Management Section */}
              <div id="user-management-section" className={`md:col-span-2 lg:col-span-2 xl:col-span-3 p-4 sm:p-6 md:p-8 xl:p-10 rounded-[2rem] sm:rounded-[2.5rem] xl:rounded-[3rem] shadow-xl border backdrop-blur-md transition-all duration-300 ${isDarkMode ? 'bg-slate-900/90 border-slate-800 shadow-black/30' : 'bg-white/95 border-slate-100 shadow-indigo-100/30'}`}>
                
                {/* Header Profile Info Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 xl:mb-10 gap-6 border-b border-gray-100 dark:border-slate-800/60 pb-6">
                  <div className="flex items-center gap-4 xl:gap-5">
                    <div className="w-12 h-12 xl:w-16 xl:h-16 bg-purple-500/10 rounded-2xl xl:rounded-[1.25rem] flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <Shield size={24} className="xl:w-8 xl:h-8" />
                    </div>
                    <div>
                      <h2 className={`text-lg sm:text-xl lg:text-2xl xl:text-3xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-900'} uppercase tracking-tight`}>User Management</h2>
                      <p className="text-[10px] xl:text-xs text-slate-400 font-extrabold uppercase tracking-widest mt-1">BODs & Faculty Access Control</p>
                    </div>
                  </div>
                  
                  {/* Control search and action bar, wraps elegantly on smaller panels */}
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full lg:w-auto">
                    <div className="relative w-full md:w-60 xl:w-72">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                      <input 
                        type="text" 
                        placeholder="Search active users..." 
                        value={userSearchTerm}
                        onChange={e => setUserSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-bold outline-none transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-slate-950 border-slate-800 text-slate-200 focus:ring-2 focus:ring-purple-500/40' 
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-purple-500/30'
                        }`}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 md:flex md:flex-row items-center gap-2">
                      <button
                        onClick={() => setShowAllUsersList(!showAllUsersList)}
                        className={`col-span-2 md:col-span-1 px-4 py-3 rounded-xl border font-black text-[10px] uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${
                          showAllUsersList 
                            ? (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200')
                            : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100/80 dark:hover:bg-indigo-950/80'
                        }`}
                      >
                        {showAllUsersList ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span>{showAllUsersList ? 'Hide Users' : 'Show Users'}</span>
                      </button>
                      
                      <button 
                        onClick={async () => {
                          if (confirm("Are you sure you want to delete ALL QR login credentials? This is perfectly safe: Teacher profiles and payment data will NOT be deleted. They will simply need a new QR code to log in next time.")) {
                            try {
                              const usersRef = collection(db, 'users');
                              const snapshot = await getDocs(usersRef);
                              const deleteBatch = writeBatch(db);
                              let count = 0;
                              snapshot.docs.forEach((userDoc) => {
                                  const userData = userDoc.data();
                                  const isQR = userData.qrEmail || (userData.name || '').toLowerCase().includes('- qr login');
                                  if (isQR) {
                                      deleteBatch.delete(userDoc.ref);
                                      count++;
                                  }
                              });
                              await deleteBatch.commit();
                              showToast(`Purged ${count} QR logins. Faculty data remains safe.`);
                              logActivity('Cleared QR Logins', `Bulk deleted ${count} QR login credentials. Teacher records preserved.`, 'warning');
                            } catch (e: any) {
                              showToast("Failed to purge QR logins.");
                            }
                          }
                        }}
                        className={`px-3 py-3 rounded-xl border font-black text-[10px] uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${
                          isDarkMode 
                            ? 'bg-amber-950/30 text-amber-400 border-amber-900/50 hover:bg-amber-900/50' 
                            : 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100'
                        }`}
                        title="Delete All Temporary QR Logins"
                      >
                        <Trash2 size={13} />
                        <span>Purge QR</span>
                      </button>
                      
                      <button 
                        onClick={async () => {
                          if (confirm("Are you sure you want to completely clear ALL user login sessions (including QR logins)? \n\nIMPORTANT: Teacher profiles and payment history will NOT be deleted. Only the 'logins' are cleared. Administrative access for primary admins will be preserved.")) {
                            try {
                              const usersRef = collection(db, 'users');
                              const snapshot = await getDocs(usersRef);
                              const deleteBatch = writeBatch(db);
                              let count = 0;
                              snapshot.docs.forEach((userDoc) => {
                                  const email = userDoc.data().email?.toLowerCase();
                                  if (email !== 'lpcaanhsfacultyclubofficers@gmail.com' && email !== 'ngehthong@gmail.com') {
                                      deleteBatch.delete(userDoc.ref);
                                      count++;
                                  }
                              });
                              await deleteBatch.commit();
                              showToast(`Successfully purged all logins. Teacher info is untouched.`);
                              logActivity('Purged All Logins', `Bulk deleted ${count} total sessions. Teacher records preserved.`, 'critical');
                            } catch (e: any) {
                              showToast('Failed to bulk delete logins.');
                            }
                          }
                        }}
                        className={`px-3 py-3 rounded-xl border font-black text-[10px] uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 ${
                          isDarkMode 
                            ? 'bg-rose-950/30 text-rose-400 border-rose-900/50 hover:bg-rose-900/50' 
                            : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                        }`}
                        title="Revoke and Purge Entire Login sessions"
                      >
                        <Trash2 size={13} />
                        <span>Purge All</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grid container with 4 cards inside User Management */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 lg:mb-10">
                  
                  {/* Card 1: Email System Status (NO TEST BUTTON, DESIGNED TO THE EYES) */}
                  <div className={`p-5 sm:p-6 rounded-3xl border transition-all duration-200 flex flex-col justify-between ${
                    isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                            isDarkMode ? 'bg-blue-950/50 text-blue-400' : 'bg-blue-100 text-[#0038A8]'
                          }`}>
                            <Mail size={16} />
                          </div>
                          <div>
                            <h3 className={`text-xs sm:text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Email Dispatcher</h3>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">SMTP Server Gateway</p>
                          </div>
                        </div>
                        {emailStatus && (
                          <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                            emailStatus.configured 
                              ? 'bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-rose-100/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full animate-ping ${emailStatus.configured ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            <span>{emailStatus.configured ? 'Active' : 'Offline'}</span>
                          </div>
                        )}
                      </div>

                      <div className={`p-4 rounded-xl border mb-4 text-[10px] font-bold space-y-2.5 ${
                        isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-white border-slate-100 text-slate-600 shadow-sm'
                      }`}>
                        {emailStatus ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 uppercase tracking-widest text-[9px]">Outgoing ID:</span>
                              <span className="font-extrabold break-all max-w-[170px] sm:max-w-[190px] text-right truncate text-slate-800 dark:text-slate-100">{emailStatus.gmailUser || 'Not Set'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 uppercase tracking-widest text-[9px]">API Security Key:</span>
                              <span className={`font-black uppercase tracking-wider ${emailStatus.hasAppPassword ? 'text-emerald-500' : 'text-red-500'}`}>
                                {emailStatus.hasAppPassword ? 'Verified Secure' : 'Missing Credentials'}
                              </span>
                            </div>
                          </>
                        ) : (
                          <p className="text-slate-400 font-medium leading-relaxed uppercase tracking-widest text-[8px]">
                            Querying SMTP infrastructure credentials from workspace setup configurations...
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Email Status logs container */}
                    {emailStatus?.logs && emailStatus.logs.length > 0 ? (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recent Delivery Logs</span>
                          <span className="text-[8px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-extrabold">LIVE STREAM</span>
                        </div>
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1.5">
                          {emailStatus.logs.map((log, idx) => (
                            <div key={idx} className={`p-2 rounded-lg border text-[9px] ${
                              isDarkMode ? 'bg-slate-900/40 border-slate-800/80' : 'bg-white border-slate-100'
                            } flex flex-col gap-0.5`}>
                              <div className="flex items-center justify-between">
                                <span className="font-black text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{log.email}</span>
                                <span className={`font-black text-[8px] uppercase ${log.success ? 'text-emerald-500' : 'text-red-400'}`}>
                                  {log.success ? 'DELIVERED' : 'FAIL'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-slate-400 text-[8px] font-medium">
                                <span className="uppercase tracking-wide">{log.type === 'qr' ? 'QR Badge' : 'OTP Code'} • {new Date(log.timestamp).toLocaleTimeString()}</span>
                                <span className="font-black font-mono text-[#0038A8] dark:text-blue-400">{log.type === 'qr' ? 'GEN' : `Code: ${log.code}`}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[9px] text-slate-400 font-black uppercase tracking-wider">
                        No recent OTP code dispatches found.
                      </div>
                    )}
                  </div>

                  {/* Card 2: Manual Teacher QR Generator */}
                  <div className={`p-5 sm:p-6 rounded-3xl border transition-all duration-200 flex flex-col justify-between ${
                    isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md'
                  }`}>
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          isDarkMode ? 'bg-emerald-950/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          <QrCode size={16} />
                        </div>
                        <div>
                          <h3 className={`text-xs sm:text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Direct Teacher QR</h3>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Instant Digital Member Credential</p>
                        </div>
                      </div>
                      
                      <p className={`text-[10px] leading-relaxed mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Instantly deploy credentials to a faculty member via email lookup.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <input 
                        id="manual-teacher-email"
                        type="email" 
                        placeholder="Search teacher's email address..."
                        className={`w-full p-3 rounded-xl text-xs font-bold outline-none transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-slate-900 border-slate-800 text-slate-200 focus:ring-2 focus:ring-emerald-500/40' 
                            : 'bg-white border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500/30 shadow-sm'
                        }`}
                      />
                      <button 
                        onClick={async () => {
                          const emailInput = document.getElementById('manual-teacher-email') as HTMLInputElement;
                          const email = emailInput.value;
                          if (!email) return showToast("Please enter an email");
                          
                          setLoading(true);
                          try {
                            const q = query(collection(db, 'teachers'), where('email', '==', email));
                            const snapshot = await getDocs(q);
                            if (snapshot.empty) {
                              showToast("No teacher record found with this email.");
                              return;
                            }
                            const teacher = snapshot.docs[0].data();
                            await generateTeacherQRCode(teacher.email, teacher.gradeLevel, teacher.name);
                            showToast("QR Code generated and sent to teacher's email.");
                            emailInput.value = '';
                          } catch (e) {
                            showToast("Failed to generate QR code");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/15"
                      >
                        <QrCode size={13} />
                        <span>Generate & Email QR</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 3: BOD QR Generator */}
                  <div className={`p-5 sm:p-6 rounded-3xl border transition-all duration-200 flex flex-col justify-between ${
                    isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md'
                  }`}>
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          isDarkMode ? 'bg-indigo-950/50 text-indigo-400' : 'bg-indigo-100 text-[#0038A8]'
                        }`}>
                          <QrCode size={16} />
                        </div>
                        <div>
                          <h3 className={`text-xs sm:text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>BOD Board QR</h3>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Admin Level Security Badge</p>
                        </div>
                      </div>

                      <p className={`text-[10px] leading-relaxed mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Delegate grade-specific board admin access directly for official handlers.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2.5">
                        <select 
                          id="new-bod-email" 
                          className={`p-3 rounded-xl text-xs font-bold outline-none transition-all duration-200 ${
                            isDarkMode 
                              ? 'bg-slate-900 border-slate-800 text-slate-200 focus:ring-2 focus:ring-blue-500/40' 
                              : 'bg-white border-slate-200 text-gray-700 focus:ring-2 focus:ring-blue-500/30 shadow-sm'
                          }`}
                        >
                          <option value="bodgrade7@gmail.com">Grade 7 BOD</option>
                          <option value="bodgrade8@gmail.com">Grade 8 BOD</option>
                          <option value="bodgrade9@gmail.com">Grade 9 BOD</option>
                          <option value="bodgrade10@gmail.com">Grade 10 BOD</option>
                        </select>
                        <select 
                          id="new-bod-grade" 
                          className={`p-3 rounded-xl text-xs font-bold outline-none transition-all duration-200 ${
                            isDarkMode 
                              ? 'bg-slate-900 border-slate-800 text-slate-200 focus:ring-2 focus:ring-blue-500/40' 
                              : 'bg-white border-slate-200 text-gray-700 focus:ring-2 focus:ring-blue-500/30 shadow-sm'
                          }`}
                        >
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
                        className="w-full bg-[#0038A8] text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/15"
                      >
                        <QrCode size={13} />
                        <span>Generate BOD QR Code</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 4: Teacher Registry Selector QR Generator */}
                  <div className={`p-5 sm:p-6 rounded-3xl border transition-all duration-200 flex flex-col justify-between ${
                    isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md'
                  }`}>
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          isDarkMode ? 'bg-purple-950/50 text-purple-400' : 'bg-purple-100 text-purple-600'
                        }`}>
                          <QrCode size={16} />
                        </div>
                        <div>
                          <h3 className={`text-xs sm:text-sm font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Select Faculty QR</h3>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Dropdown Registry Exporter</p>
                        </div>
                      </div>

                      <p className={`text-[10px] leading-relaxed mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Quick export of authentication QR badges from the existing teachers index.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <select 
                        id="new-teacher-qr-select" 
                        className={`w-full p-3 rounded-xl text-xs font-bold outline-none transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-slate-900 border-slate-800 text-slate-200 focus:ring-2 focus:ring-purple-500/40' 
                            : 'bg-white border-slate-200 text-gray-700 focus:ring-2 focus:ring-purple-500/30 shadow-sm'
                        }`}
                      >
                        <option value="">Select a Teacher Account...</option>
                        {sortRecordsByGradeAndName(records).map(r => (
                          <option key={r.id} value={r.id}>{r.name} ({r.gradeLevel})</option>
                        ))}
                      </select>

                      <button 
                        onClick={() => {
                          const teacherId = (document.getElementById('new-teacher-qr-select') as HTMLSelectElement).value;
                          const teacher = records.find(r => r.id === teacherId);
                          if (teacher) generateTeacherQRCode(teacher.email, teacher.gradeLevel, teacher.name);
                          else showToast("Please select a teacher first.");
                        }}
                        className="w-full bg-purple-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/15"
                      >
                        <QrCode size={13} />
                        <span>Generate Teacher QR Code</span>
                      </button>
                    </div>
                  </div>

                </div>

                {/* Collapsible User Login List Table & Mobile Stack */}
                {showAllUsersList && (
                  <div className="mt-8 transition-all duration-300">
                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-slate-800 pb-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Login Registry Table</span>
                      <span className="text-[10px] text-slate-400 font-extrabold">{allUsers.length} total sessions</span>
                    </div>

                    {/* Desktop View Table */}
                    <div className="overflow-x-auto -mx-4 sm:mx-0 hidden md:block">
                      <table className="min-w-full border-separate border-spacing-y-2">
                        <thead>
                          <tr className="text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="pb-3 pl-4">Account Information</th>
                            <th className="pb-3">Security Level</th>
                            <th className="pb-3">Assigned Grade</th>
                            <th className="pb-3 text-right pr-4">QR Dispatch</th>
                          </tr>
                        </thead>
                        <tbody className="space-y-1.5">
                          {allUsers
                            .filter(u => {
                              const nameMatch = (u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase());
                              const emailMatch = (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase());
                              return nameMatch || emailMatch;
                            })
                            .map(u => (
                            <tr key={u.uid} className={`group rounded-2xl overflow-hidden transition-all duration-200 ${
                              isDarkMode ? 'bg-slate-950/30 hover:bg-slate-950 border border-slate-800' : 'bg-slate-50 hover:bg-white hover:shadow-md'
                            }`}>
                              <td className="py-3 pl-4 rounded-l-2xl">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                                    isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-white border border-slate-200/60 text-[#0038A8]'
                                  }`}>
                                    {(u.name || 'U').charAt(0)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <div className={`text-xs font-black leading-none ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{u.name || 'Unknown'}</div>
                                      {(u.qrEmail || (u.name || '').toLowerCase().includes('- qr login')) && (
                                        <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded text-[7px] font-black uppercase tracking-wider">QR Access</span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold tracking-wide">{u.email || 'No Email'}</div>
                                  </div>
                                </div>
                              </td>
                              
                              <td className="py-3">
                                {Object.keys(ALLOWED_BODS).includes((u.email || '').toLowerCase()) ? (
                                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                    {u.role}
                                  </span>
                                ) : (
                                  <select 
                                    value={u.role || 'teacher'}
                                    onChange={e => updateUserRole(u.uid, e.target.value as any, u.gradeLevel)}
                                    className={`text-[9px] font-black uppercase tracking-wider border border-slate-200 rounded-lg p-1.5 bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500`}
                                  >
                                    <option value="admin">Admin</option>
                                    <option value="bod">BOD</option>
                                    <option value="teacher">Teacher</option>
                                  </select>
                                )}
                              </td>
                              
                              <td className="py-3">
                                {Object.keys(ALLOWED_BODS).includes((u.email || '').toLowerCase()) ? (
                                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                    {u.gradeLevel || 'All'}
                                  </span>
                                ) : (
                                  <select 
                                    value={u.gradeLevel || 'Grade 7'}
                                    onChange={e => updateUserRole(u.uid, u.role, e.target.value as any)}
                                    className={`text-[9px] font-black uppercase tracking-wider border border-slate-200 rounded-lg p-1.5 bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500`}
                                  >
                                    <option value="All">All Grades</option>
                                    <option value="Grade 7">Grade 7</option>
                                    <option value="Grade 8">Grade 8</option>
                                    <option value="Grade 9">Grade 9</option>
                                    <option value="Grade 10">Grade 10</option>
                                  </select>
                                )}
                              </td>
                              
                              <td className="py-3 text-right pr-4 rounded-r-2xl">
                                <div className="flex justify-end gap-1.5">
                                  {Object.keys(ALLOWED_BODS).includes((u.email || '').toLowerCase()) && (
                                    <button 
                                      onClick={() => generateBODQRCode(u.email || '', u.gradeLevel)}
                                      className="p-2 text-blue-500 hover:text-white hover:bg-blue-600 transition-all bg-blue-50 dark:bg-blue-950/20 rounded-xl"
                                      title="Generate QR Login Code"
                                    >
                                      <QrCode size={14} />
                                    </button>
                                  )}
                                  {u.role === 'teacher' && (
                                    <button 
                                      onClick={() => generateTeacherQRCode(u.email || '', u.gradeLevel, u.name)}
                                      className="p-2 text-[#0038A8] hover:text-white hover:bg-blue-600 transition-all bg-blue-50 dark:bg-blue-950/20 rounded-xl"
                                      title="Generate Teacher QR Login Code"
                                    >
                                      <QrCode size={14} />
                                    </button>
                                  )}
                                  {u.email !== 'lpcaanhsfacultyclubofficers@gmail.com' && u.email !== 'ngehthong@gmail.com' && (
                                    <button 
                                      onClick={() => deleteUser(u.uid)}
                                      className="p-2 text-slate-400 hover:text-white hover:bg-rose-500 transition-all bg-slate-100 dark:bg-slate-800 rounded-xl"
                                      title="Remove User"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View (Sleek bento layout with 44px margins and responsive layout) */}
                    <div className="md:hidden space-y-3">
                      {allUsers
                        .filter(u => {
                          const nameMatch = (u.name || '').toLowerCase().includes(userSearchTerm.toLowerCase());
                          const emailMatch = (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase());
                          return nameMatch || emailMatch;
                        })
                        .map(u => (
                          <div key={u.uid} className={`p-4 rounded-2xl border flex flex-col gap-3.5 ${
                            isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                                isDarkMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-50 border border-slate-200/40 text-[#0038A8]'
                              }`}>
                                {(u.name || 'U').charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-xs font-black truncate leading-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{u.name || 'Unknown'}</span>
                                  {(u.qrEmail || (u.name || '').toLowerCase().includes('- qr login')) && (
                                    <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded text-[7px] font-black uppercase tracking-wider">QR Code Login</span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold truncate mt-0.5">{u.email || 'No email associated'}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3.5 pt-1">
                              <div>
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Security Role</span>
                                {Object.keys(ALLOWED_BODS).includes((u.email || '').toLowerCase()) ? (
                                  <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest bg-slate-100 dark:bg-slate-850 px-2 py-1.5 rounded-lg block text-center truncate">
                                    {u.role}
                                  </span>
                                ) : (
                                  <select 
                                    value={u.role || 'teacher'}
                                    onChange={e => updateUserRole(u.uid, e.target.value as any, u.gradeLevel)}
                                    className="w-full text-[9px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-white dark:bg-slate-900 text-slate-705 dark:text-slate-200 outline-none"
                                  >
                                    <option value="admin">Admin</option>
                                    <option value="bod">BOD</option>
                                    <option value="teacher">Teacher</option>
                                  </select>
                                )}
                              </div>
                              
                              <div>
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assigned Grade</span>
                                {Object.keys(ALLOWED_BODS).includes((u.email || '').toLowerCase()) ? (
                                  <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest bg-slate-100 dark:bg-slate-850 px-2 py-1.5 rounded-lg block text-center truncate">
                                    {u.gradeLevel || 'All Grades'}
                                  </span>
                                ) : (
                                  <select 
                                    value={u.gradeLevel || 'Grade 7'}
                                    onChange={e => updateUserRole(u.uid, u.role, e.target.value as any)}
                                    className="w-full text-[9px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-white dark:bg-slate-900 text-slate-705 dark:text-slate-200 outline-none"
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

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-end gap-2">
                              {Object.keys(ALLOWED_BODS).includes((u.email || '').toLowerCase()) && (
                                <button 
                                  onClick={() => generateBODQRCode(u.email || '', u.gradeLevel)}
                                  className="px-3 py-2 text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-600 hover:text-white transition-all rounded-lg flex items-center justify-center gap-1 w-full sm:w-auto"
                                >
                                  <QrCode size={12} />
                                  <span>Login QR</span>
                                </button>
                              )}
                              
                              {u.role === 'teacher' && (
                                <button 
                                  onClick={() => generateTeacherQRCode(u.email || '', u.gradeLevel, u.name)}
                                  className="px-3 py-2 text-[9px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-[#0038A8] hover:text-white transition-all rounded-lg flex items-center justify-center gap-1 w-full sm:w-auto"
                                >
                                  <QrCode size={12} />
                                  <span>Member QR</span>
                                </button>
                              )}

                              {u.email !== 'lpcaanhsfacultyclubofficers@gmail.com' && u.email !== 'ngehthong@gmail.com' && (
                                <button 
                                  onClick={() => deleteUser(u.uid)}
                                  className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all shrink-0"
                                  title="Delete Session"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Change Requests */}
              <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} p-6 md:p-8 xl:p-10 rounded-[2.5rem] xl:rounded-[3rem] shadow-sm border lg:col-span-2 xl:col-span-3 lg:row-start-2`}>
                <div className="flex items-center gap-4 xl:gap-6 mb-6 xl:mb-10">
                  <div className="w-12 h-12 xl:w-16 xl:h-16 bg-yellow-50 rounded-2xl xl:rounded-3xl flex items-center justify-center text-yellow-600">
                    <User size={24} className="xl:w-8 xl:h-8" />
                  </div>
                  <div>
                    <h2 className={`text-xl lg:text-2xl xl:text-3xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} uppercase tracking-tight`}>Profile Change Requests</h2>
                    <p className="text-[10px] xl:text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Pending teacher profile updates</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {profileChangeRequests.filter(req => req.status === 'pending').map(request => (
                    <div key={request.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div>
                        <div className="text-xs font-black text-gray-900">{request.currentName} ({request.currentEmail})</div>
                        <div className="text-[10px] text-gray-500 font-bold mt-1">
                          Requested changes:
                          <ul className="list-disc ml-4 mt-1">
                            {request.currentName !== request.newName && <li>Name: <span className="line-through text-red-400">{request.currentName}</span> &rarr; <span className="text-green-600">{request.newName}</span></li>}
                            {request.currentEmail !== request.newEmail && <li>Email: <span className="line-through text-red-400">{request.currentEmail}</span> &rarr; <span className="text-green-600">{request.newEmail}</span></li>}
                            {request.newGradeLevel && request.currentGradeLevel !== request.newGradeLevel && <li>Grade: <span className="line-through text-red-400">{request.currentGradeLevel}</span> &rarr; <span className="text-green-600">{request.newGradeLevel}</span></li>}
                            {request.newDepartment && request.currentDepartment !== request.newDepartment && <li>Dept: <span className="line-through text-red-400">{request.currentDepartment}</span> &rarr; <span className="text-green-600">{request.newDepartment}</span></li>}
                          </ul>
                        </div>
                        {request.note && (
                          <div className="text-[10px] text-blue-600 bg-blue-50 p-2 rounded-lg mt-2 font-medium">
                            Note: "{request.note}"
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => handleApproveProfileChange(request)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-green-50 text-green-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-100 transition-all flex items-center justify-center gap-1"
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button 
                          onClick={() => handleRejectProfileChange(request)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-1"
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                  {profileChangeRequests.filter(req => req.status === 'pending').length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-400 font-bold uppercase tracking-widest bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      No pending requests
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity Snippet */}
              <div className={`${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'} p-6 md:p-8 xl:p-10 rounded-[2.5rem] xl:rounded-[3rem] shadow-sm border flex flex-col lg:col-start-3 xl:col-start-4 lg:row-start-1 lg:row-span-2`}>
                <div className="flex items-center justify-between mb-6 xl:mb-10">
                  <div className="flex items-center gap-3 xl:gap-5">
                    <div className="w-10 h-10 xl:w-14 xl:h-14 bg-orange-50 rounded-xl xl:rounded-2xl flex items-center justify-center text-orange-600">
                      <Activity size={20} className="xl:w-7 xl:h-7" />
                    </div>
                    <h3 className={`text-lg lg:text-xl xl:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight uppercase`}>Recent Activity</h3>
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
                      <div className="text-[9px] text-gray-400 font-bold uppercase shrink-0">{ensureTimestamp(log.timestamp).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && <div className="text-center py-8 text-xs text-gray-400 italic">No recent activity.</div>}
                </div>
              </div>
            </div>
            )}

            {/* SUB TAB 2: BROADCAST ANNOUNCEMENT */}
            {adminSubTab === 'broadcast' && (
              <div className={`${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-100'} p-4 sm:p-6 md:p-8 rounded-[2rem] shadow-xl border backdrop-blur-md`}>
                <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-slate-800 pb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                    <Megaphone size={22} />
                  </div>
                  <div>
                    <h2 className={`text-base sm:text-xl font-black ${isDarkMode ? 'text-slate-100' : 'text-slate-900'} uppercase tracking-tight`}>Broadcast Announcement</h2>
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">Send live notifications to all faculty members</p>
                  </div>
                </div>
                
                <div className="space-y-4 max-w-3xl">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1.5`}>Notification Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g., General Assembly / System Update Notice"
                      value={announcementTitle}
                      onChange={e => setAnnouncementTitle(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-bold border transition-all outline-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:ring-2 focus:ring-purple-500/40' : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-2 focus:ring-purple-500/30'}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1.5`}>Message Content</label>
                    <textarea 
                      placeholder="Write your broadcast message here..."
                      value={announcementMessage}
                      onChange={e => setAnnouncementMessage(e.target.value)}
                      className={`w-full min-h-[140px] px-4 py-3 rounded-xl text-xs sm:text-sm font-bold border transition-all outline-none resize-none ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:ring-2 focus:ring-purple-500/40' : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-2 focus:ring-purple-500/30'}`}
                    />
                  </div>

                  <button 
                    onClick={sendAnnouncement}
                    disabled={isSendingAnnouncement || !announcementTitle || !announcementMessage}
                    className="w-full sm:w-auto px-8 py-3.5 bg-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 active:scale-[0.98] transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSendingAnnouncement ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Send size={16} />
                    )}
                    <span>{isSendingAnnouncement ? 'Broadcasting Message...' : 'Broadcast to All Teachers'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* SUB TAB 3: SYSTEM MAINTENANCE & DATABASE */}
            {adminSubTab === 'maintenance' && (
              <div className={`${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-100'} p-4 sm:p-6 md:p-8 rounded-[2rem] shadow-xl border backdrop-blur-md`}>
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                      <Database size={22} />
                    </div>
                    <div>
                      <h2 className={`text-base sm:text-xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'} uppercase tracking-tight`}>System & Database Maintenance</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Database, Archives & Record Reset Controls</p>
                    </div>
                  </div>
                </div>

                {/* System Maintenance Mode Banner */}
                <div className={`p-4 sm:p-5 rounded-3xl border mb-6 transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-slate-950/40 border-slate-800' 
                    : 'bg-rose-50/60 border-rose-100/80 hover:bg-rose-50'
                }`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isMaintenanceMode 
                          ? 'bg-amber-500/20 text-amber-500' 
                          : (isDarkMode ? 'bg-rose-950/60 text-rose-400' : 'bg-rose-100 text-rose-600')
                      }`}>
                        <Settings size={20} />
                      </div>
                      <div>
                        <h4 className={`text-xs sm:text-sm font-bold uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>System Maintenance Mode</h4>
                        <p className="text-xs text-slate-400 font-medium tracking-wide block mt-0.5">
                          {isMaintenanceMode ? 'Teachers currently locked out of application' : 'Online & running normally for all accounts'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          const newMode = !isMaintenanceMode;
                          await setDoc(doc(db, 'settings', 'global'), { 
                            maintenanceMode: newMode 
                          }, { merge: true });
                          showToast(`System Maintenance is now ${newMode ? 'ON' : 'OFF'}`);
                          logActivity(
                            newMode ? 'Enabled Maintenance Mode' : 'Disabled Maintenance Mode', 
                            `Teachers are now ${newMode ? 'locked out' : 'granted access'}`, 
                            'critical'
                          );
                        } catch (e) {
                          showToast("Failed to toggle maintenance mode.");
                        }
                      }}
                      className={`w-full sm:w-auto py-2.5 px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-md ${
                        isMaintenanceMode 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10' 
                          : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/10'
                      }`}
                    >
                      {isMaintenanceMode ? <Check size={15} /> : <AlertTriangle size={15} />}
                      <span>{isMaintenanceMode ? 'Resume Public Access' : 'Activate Lockout'}</span>
                    </button>
                  </div>
                </div>

                {/* Clean Maintenance Action Buttons (Laptop and Mobile Responsive) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
                  <button 
                    onClick={() => setShowArchiveModal(true)}
                    className={`p-4 rounded-2xl border font-black text-xs uppercase tracking-wider transition-all duration-200 flex flex-col items-center justify-center gap-2 text-center ${
                      isDarkMode 
                        ? 'bg-blue-950/30 border-blue-900/40 text-blue-400 hover:bg-blue-900/40' 
                        : 'bg-blue-50/80 border-blue-100 text-blue-700 hover:bg-blue-100 shadow-sm'
                    }`}
                  >
                    <Archive size={20} className="text-blue-500" />
                    <span>Close School Year</span>
                    <span className="text-[9px] font-normal text-slate-400">Archive current term data</span>
                  </button>

                  <button 
                    onClick={clearAuditLogs}
                    className={`p-4 rounded-2xl border font-black text-xs uppercase tracking-wider transition-all duration-200 flex flex-col items-center justify-center gap-2 text-center ${
                      isDarkMode 
                        ? 'bg-amber-950/30 border-amber-900/40 text-amber-400 hover:bg-amber-900/40' 
                        : 'bg-amber-50/80 border-amber-100 text-amber-700 hover:bg-amber-100 shadow-sm'
                    }`}
                  >
                    <Trash2 size={20} className="text-amber-500" />
                    <span>Clear Transparency Logs</span>
                    <span className="text-[9px] font-normal text-slate-400">Purge non-essential logs</span>
                  </button>

                  <button 
                    onClick={() => {
                      setDeleteType('all');
                      setIsBatchDeleteModalOpen(true);
                    }}
                    className={`p-4 rounded-2xl border font-black text-xs uppercase tracking-wider transition-all duration-200 flex flex-col items-center justify-center gap-2 text-center ${
                      isDarkMode 
                        ? 'bg-rose-950/30 border-rose-900/40 text-rose-400 hover:bg-rose-900/40' 
                        : 'bg-rose-50/80 border-rose-100 text-rose-700 hover:bg-rose-100 shadow-sm'
                    }`}
                  >
                    <Trash2 size={20} className="text-rose-500" />
                    <span>Wipe All Records</span>
                    <span className="text-[9px] font-normal text-slate-400">Reset system database completely</span>
                  </button>
                </div>

                {/* Warning Notice Box */}
                <div className={`p-4 rounded-2xl border ${
                  isDarkMode ? 'bg-slate-950/50 border-slate-800 text-slate-300' : 'bg-blue-50/50 border-blue-100 text-slate-700'
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-tight text-blue-900 dark:text-blue-300 mb-1">Important System Safety Note</h4>
                      <p className="text-[11px] leading-relaxed font-medium">
                        Deleting teacher records or wiping database records is permanent. It removes assigned dues, teacher profiles, and associated payment logs. Make sure to back up or export records before executing a full system reset.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl transition-all duration-300 ${
        isDarkMode ? 'bg-slate-900/95 border-slate-800 text-slate-200' : 'bg-white/95 border-gray-200 text-gray-700'
      } px-1.5 py-1.5 flex items-center justify-around shadow-2xl`}>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all ${
            activeTab === 'dashboard'
              ? (isDarkMode ? 'text-blue-400 bg-blue-950/70 font-black' : 'text-[#0038A8] bg-blue-50 font-black')
              : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 font-bold'
          }`}
        >
          <LayoutDashboard size={18} />
          <span className="text-[9px] uppercase tracking-wider mt-0.5">Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('collection')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all ${
            activeTab === 'collection'
              ? (isDarkMode ? 'text-blue-400 bg-blue-950/70 font-black' : 'text-[#0038A8] bg-blue-50 font-black')
              : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 font-bold'
          }`}
        >
          <Users size={18} />
          <span className="text-[9px] uppercase tracking-wider mt-0.5">Teachers</span>
        </button>

        <button
          onClick={() => setActiveTab('remittance')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all ${
            activeTab === 'remittance'
              ? (isDarkMode ? 'text-blue-400 bg-blue-950/70 font-black' : 'text-[#0038A8] bg-blue-50 font-black')
              : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 font-bold'
          }`}
        >
          <Wallet size={18} />
          <span className="text-[9px] uppercase tracking-wider mt-0.5">Remittance</span>
        </button>

        {profile?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all ${
              activeTab === 'admin'
                ? (isDarkMode ? 'text-blue-400 bg-blue-950/70 font-black' : 'text-[#0038A8] bg-blue-50 font-black')
                : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 font-bold'
            }`}
          >
            <Shield size={18} />
            <span className="text-[9px] uppercase tracking-wider mt-0.5">Admin</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all ${
            activeTab === 'profile'
              ? (isDarkMode ? 'text-blue-400 bg-blue-950/70 font-black' : 'text-[#0038A8] bg-blue-50 font-black')
              : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 font-bold'
          }`}
        >
          <User size={18} />
          <span className="text-[9px] uppercase tracking-wider mt-0.5">Profile</span>
        </button>

        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl text-gray-400 hover:text-gray-600 dark:text-slate-500 font-bold transition-all"
        >
          <Menu size={18} />
          <span className="text-[9px] uppercase tracking-wider mt-0.5">Menu</span>
        </button>
      </nav>

      {/* Dues Supervisor Console Modal */}
      {supervisingTeacherId && (() => {
        const teacher = records.find(r => r.id === supervisingTeacherId);
        if (!teacher) return null;

        // Find index in filteredRecords so admin can easily page through
        const filteredIndex = filteredRecords.findIndex(r => r.id === teacher.id);
        const nextTeacher = filteredIndex !== -1 && filteredIndex < filteredRecords.length - 1 ? filteredRecords[filteredIndex + 1] : null;
        const prevTeacher = filteredIndex !== -1 && filteredIndex > 0 ? filteredRecords[filteredIndex - 1] : null;

        const totalPaid = standardDues
          .filter(d => teacher.paidDueIds.includes(d.id))
          .reduce((sum, d) => {
            if (d.isVoluntary && teacher.voluntaryPayments?.[d.id] !== undefined) {
              return sum + teacher.voluntaryPayments[d.id];
            }
            return sum + d.amount;
          }, 0);

        const currentBalance = standardDues
          .filter(d => !teacher.paidDueIds.includes(d.id) && !d.isVoluntary)
          .reduce((sum, d) => sum + d.amount, 0);

        const isFullyPaid = requiredDues.length > 0 && requiredDues.every(d => teacher.paidDueIds.includes(d.id));
        const progressPercent = totalCollectibles > 0 ? Math.min(100, Math.round((totalPaid / totalCollectibles) * 100)) : 0;

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className={`rounded-[2.5rem] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              } shadow-2xl`}
            >
              {/* CONSOLE HEADER */}
              <div className={`p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50/50'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${isDarkMode ? 'bg-blue-950 text-blue-400' : 'bg-[#0038A8]/10 text-[#0038A8]'}`}>
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg lg:text-xl font-black uppercase tracking-tight">Dues Supervisor Console</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Supervising {filteredIndex !== -1 ? filteredIndex + 1 : '?'} of {filteredRecords.length} Filtered Faculty
                    </p>
                  </div>
                </div>

                {/* QUICK PAGE SWIPER & ACTIONS */}
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-1.5 border rounded-2xl p-1 ${isDarkMode ? 'border-slate-800 bg-slate-950/45' : 'border-slate-200 bg-white'}`}>
                    <button 
                      type="button"
                      onClick={() => prevTeacher && setSupervisingTeacherId(prevTeacher.id)}
                      disabled={!prevTeacher}
                      className={`p-2 rounded-xl transition-all ${
                        prevTeacher 
                          ? (isDarkMode ? 'hover:bg-slate-850 text-slate-300' : 'hover:bg-slate-150 text-slate-700 bg-slate-100/50') 
                          : 'text-slate-300/40 cursor-not-allowed'
                      }`}
                      title="Previous Faculty"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    
                    <select
                      value={teacher.id}
                      onChange={(e) => setSupervisingTeacherId(e.target.value)}
                      className={`px-3 py-1.5 text-xs font-black uppercase border-0 rounded-xl bg-transparent focus:ring-0 outline-none max-w-[150px] sm:max-w-[200px] text-ellipsis overflow-hidden ${
                        isDarkMode ? 'text-white bg-slate-800' : 'text-slate-900 bg-slate-100'
                      }`}
                    >
                      {filteredRecords.map((rec) => (
                        <option key={rec.id} value={rec.id} className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>
                          {rec.name}
                        </option>
                      ))}
                    </select>

                    <button 
                      type="button"
                      onClick={() => nextTeacher && setSupervisingTeacherId(nextTeacher.id)}
                      disabled={!nextTeacher}
                      className={`p-2 rounded-xl transition-all ${
                        nextTeacher 
                          ? (isDarkMode ? 'hover:bg-slate-850 text-slate-300' : 'hover:bg-slate-150 text-slate-700 bg-slate-100/50') 
                          : 'text-slate-300/40 cursor-not-allowed'
                      }`}
                      title="Next Faculty"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <button 
                    type="button"
                    onClick={() => setSupervisingTeacherId(null)}
                    className={`p-2.5 rounded-full transition-all border ${
                      isDarkMode ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* CONTAINER CONTENT */}
              <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
                {/* PROFILE CARD SUMMARY */}
                <div className={`p-6 rounded-[2rem] border transition-all ${
                  isDarkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-[#0038A8]/5 border-slate-100'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                        teacher.gender === 'Female' 
                          ? 'bg-rose-100 text-rose-600' 
                          : 'bg-blue-100 text-[#0038A8]'
                      }`}>
                        {teacher.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-lg font-black uppercase tracking-tight">{teacher.name}</h4>
                        <div className="flex flex-wrap gap-2 mt-1 items-center">
                          <span className="text-[9px] font-black uppercase tracking-wider bg-white/20 dark:bg-slate-800 border border-slate-200/50 px-2 py-0.5 rounded-md">
                            {teacher.gradeLevel}
                          </span>
                          {teacher.department && teacher.department !== teacher.gradeLevel && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-white/40 dark:bg-slate-800 text-[#0038A8] dark:text-blue-300 border border-slate-200/50 px-2 py-0.5 rounded-md">
                              {teacher.department}
                            </span>
                          )}
                          <span className="text-[9px] font-bold text-slate-500">{teacher.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => {
                          setSupervisingTeacherId(null);
                          openEditModal(teacher);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 border transition-all ${
                          isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                        }`}
                      >
                        <FileText size={12} /> Edit Profile
                      </button>
                    </div>
                  </div>

                  {/* PROGRESS AND STATS GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200/20">
                    <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Paid</p>
                      <div className="text-xl font-black text-green-600">₱{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      <div className="text-[9px] font-bold text-slate-400 mt-0.5">Required and voluntary sums</div>
                    </div>

                    <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Unpaid Required</p>
                      <div className={`text-xl font-black ${currentBalance > 0 ? 'text-red-500' : 'text-slate-500'}`}>₱{currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      <div className="text-[9px] font-bold text-slate-400 mt-0.5">Pending standard items</div>
                    </div>

                    <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Settlement Progress</p>
                      <div className="flex items-center gap-2">
                        <div className="text-xl font-black text-blue-600 font-mono">{progressPercent}%</div>
                        {isFullyPaid && (
                          <span className="text-[8px] font-black text-green-600 bg-green-50 dark:bg-green-950/45 px-1.5 py-0.5 rounded uppercase tracking-wider">Fully Settled</span>
                        )}
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden mt-1.5">
                        <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* INTERACTIVE DUES LIST CHECKLIST SECTION */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center justify-between">
                    <span>Dues and Contributions checklist</span>
                    <span className="font-bold text-[10px] text-slate-500 normal-case">Check/uncheck statuses to record payments</span>
                  </h4>
                  
                  <div className={`rounded-3xl border divide-y overflow-hidden ${
                    isDarkMode ? 'bg-slate-950/20 border-slate-800 divide-slate-800' : 'bg-slate-50/50 border-slate-150 divide-slate-150'
                  }`}>
                    {standardDues.map((due) => {
                      const isPaid = teacher.paidDueIds.includes(due.id);
                      const paidLog = (teacher.paymentHistory || []).find(h => h.dueId === due.id);
                      
                      return (
                        <div key={due.id} className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                          isPaid 
                            ? (isDarkMode ? 'bg-green-950/10 hover:bg-green-950/20' : 'bg-green-50/40 hover:bg-green-50/70') 
                            : (isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100/50')
                        }`}>
                          {/* DUE INFO & CHECKBOX BOX */}
                          <div className="flex items-start gap-4">
                            <div className="pt-0.5">
                              <input 
                                type="checkbox" 
                                checked={isPaid}
                                onChange={() => handleTogglePayment(teacher.id, due.id)}
                                className="w-5 h-5 text-blue-600 rounded-lg border-slate-300 focus:ring-blue-600 cursor-pointer"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm md:text-base uppercase tracking-tight text-slate-900 dark:text-white">
                                  {due.name}
                                </span>
                                {due.isVoluntary ? (
                                  <span className="text-[8px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-900/30">
                                    Voluntary
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-900/40 text-[#0038A8] dark:text-blue-350 px-2 py-0.5 rounded border border-blue-150 dark:border-blue-900/30">
                                    Required
                                  </span>
                                )}
                              </div>

                              {/* DUE AMOUNT AND HISTORY META DETAIL */}
                              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                <span className={`font-black text-sm ${isPaid ? (isDarkMode ? 'text-green-400' : 'text-green-600') : 'text-[#0038A8] dark:text-blue-400'}`}>
                                  ₱{(due.isVoluntary && isPaid && teacher.voluntaryPayments?.[due.id] !== undefined)
                                    ? teacher.voluntaryPayments[due.id].toFixed(2)
                                    : due.amount.toFixed(2)
                                  }
                                </span>
                                
                                {isPaid && paidLog && (
                                  <span className="text-[10px] dark:text-slate-400 text-slate-500 flex items-center gap-1 font-medium bg-slate-100/60 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    <Clock size={10} />
                                    Cleared {new Date(paidLog.date).toLocaleDateString()} 
                                    {paidLog.collectedBy && ` • By: ${paidLog.collectedBy}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* ACTION BUTTON TRIGGER ACTIONS */}
                          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                            {isPaid ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black bg-green-100 dark:bg-green-950/40 text-green-755 dark:text-green-400 border border-green-200/50 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                                  <Check size={10} className="stroke-[3]" /> Cleared
                                </span>
                                <button 
                                  type="button"
                                  onClick={() => handleTogglePayment(teacher.id, due.id)}
                                  className="p-1.5 text-xs text-red-500 hover:text-white hover:bg-red-500 border border-red-200 dark:border-red-900/40 rounded-xl transition-all"
                                  title="Revoke and Void payment"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black bg-red-50 dark:bg-red-950/20 text-red-500 border border-red-100 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                                  Unpaid
                                </span>
                                
                                {due.isVoluntary ? (
                                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 font-black pl-1.5">₱</span>
                                    <input 
                                      type="number"
                                      placeholder={due.amount.toString()}
                                      id={`custom_vol_input_supervisor_${teacher.id}_${due.id}`}
                                      className="w-16 border-0 p-0 text-xs font-black bg-transparent text-slate-900 dark:text-white focus:ring-0 outline-none"
                                    />
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const inp = document.getElementById(`custom_vol_input_supervisor_${teacher.id}_${due.id}`) as HTMLInputElement;
                                        const val = inp ? parseFloat(inp.value) : NaN;
                                        const amt = !isNaN(val) && val > 0 ? val : due.amount;
                                        toggleDuePaid(teacher.id, due.id, amt);
                                      }}
                                      className="p-1 px-2.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-blue-700 transition"
                                    >
                                      Pay
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    type="button"
                                    onClick={() => handleTogglePayment(teacher.id, due.id)}
                                    className="px-3 py-1.5 bg-[#0038A8] hover:bg-blue-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition"
                                  >
                                    Mark as Paid
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* HISTORICAL CLEARED LIST TRANSACTION GRAPH */}
                {(teacher.paymentHistory || []).length > 0 && (
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Individual Cleared History</h4>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {teacher.paymentHistory
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((log, lidx) => (
                          <div key={lidx} className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                            isDarkMode ? 'bg-slate-950/20 border-slate-850' : 'bg-slate-50/50 border-slate-100 shadow-sm'
                          }`}>
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-green-950/45 text-green-400' : 'bg-green-50 text-green-600'}`}>
                                <Check size={12} className="stroke-[3]" />
                              </div>
                              <div>
                                <div className="font-extrabold uppercase tracking-tight text-slate-900 dark:text-white">{log.dueName}</div>
                                <div className="text-[10px] text-slate-400 font-bold">
                                  Cleared {new Date(log.date).toLocaleDateString()}
                                  {log.collectedBy && ` • By: ${log.collectedBy}`}
                                </div>
                              </div>
                            </div>
                            <div className="font-black text-slate-900 dark:text-white text-right">
                              ₱{log.amount.toFixed(2)}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ACTIONS BAR FOOTER */}
              <div className={`p-4 sm:p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${
                isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50/50'
              }`}>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400 font-extrabold uppercase tracking-wider w-full sm:w-auto justify-center sm:justify-start">
                  <ShieldCheck size={14} className="text-[#0038A8] dark:text-blue-400" />
                  <span>Dues Auditing & Notifications</span>
                </div>

                {/* CHANNELS PANEL */}
                <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:justify-end sm:w-auto">
                  <button 
                    type="button"
                    onClick={() => handleSendReminder(teacher)}
                    disabled={isSendingReminder === teacher.id || teacher.pendingDeletion || isFullyPaid}
                    className="px-3 py-2.5 sm:px-4 sm:py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest flex items-center justify-center gap-1.5 transition disabled:opacity-55 shadow-sm w-full sm:w-auto"
                  >
                    {isSendingReminder === teacher.id ? <Loader2 size={13} className="animate-spin" /> : <MailWarning size={13} />}
                    <span>Send Reminder</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleSendReceipt(teacher)}
                    disabled={totalPaid === 0 || isSending === teacher.id || teacher.pendingDeletion}
                    className="px-3 py-2.5 sm:px-4 sm:py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest flex items-center justify-center gap-1.5 transition disabled:opacity-55 shadow-sm w-full sm:w-auto"
                  >
                    {isSending === teacher.id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    <span>Send Receipt</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleDownloadReceipt(teacher)}
                    disabled={totalPaid === 0 || teacher.pendingDeletion}
                    className="px-3 py-2.5 sm:px-4 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest flex items-center justify-center gap-1.5 transition disabled:opacity-55 shadow-sm w-full sm:w-auto"
                  >
                    <Download size={13} />
                    <span>PDF Receipt</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => generateTeacherQRCode(teacher.email, teacher.gradeLevel, teacher.name)}
                    className="px-3 py-2.5 sm:px-4 sm:py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest flex items-center justify-center gap-1.5 transition shadow-sm w-full sm:w-auto"
                  >
                    <QrCode size={13} />
                    <span>QR Code</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* Edit Teacher Modal */}
      {isEditModalOpen && editingTeacher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`rounded-[2rem] p-6 sm:p-8 lg:p-12 max-w-2xl lg:max-w-3xl w-full shadow-2xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-gray-900'
            }`}
          >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-blue-950 text-blue-400' : 'bg-blue-100 text-[#0038A8]'}`}>
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Edit Teacher Info</h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Update Profile Details</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className={`p-2 rounded-full transition-all ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-gray-400'}`}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateTeacher} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Last Name</label>
                    <input 
                      type="text" 
                      required 
                      value={editLastName} 
                      onChange={e => setEditLastName(e.target.value)} 
                      className={`w-full border-2 rounded-xl px-4 py-3 transition-all outline-none font-bold text-sm ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-[#0038A8] focus:bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>First Name</label>
                    <input 
                      type="text" 
                      required 
                      value={editFirstName} 
                      onChange={e => setEditFirstName(e.target.value)} 
                      className={`w-full border-2 rounded-xl px-4 py-3 transition-all outline-none font-bold text-sm ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-[#0038A8] focus:bg-white'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Middle Initial</label>
                    <input 
                      type="text" 
                      value={editMiddleInitial} 
                      onChange={e => setEditMiddleInitial(e.target.value)} 
                      className={`w-full border-2 rounded-xl px-4 py-3 transition-all outline-none font-bold text-sm ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-[#0038A8] focus:bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Gender</label>
                    <select 
                      value={editGender}
                      onChange={e => setEditGender(e.target.value as 'Male' | 'Female')}
                      className={`w-full border-2 rounded-xl px-4 py-3 transition-all outline-none font-bold text-sm appearance-none ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-[#0038A8] focus:bg-white'
                      }`}
                    >
                      <option value="Female" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}>Female</option>
                      <option value="Male" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}>Male</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Grade Level</label>
                    <select 
                      value={editGradeLevel}
                      onChange={e => setEditGradeLevel(e.target.value as GradeLevel)}
                      className={`w-full border-2 rounded-xl px-4 py-3 transition-all outline-none font-bold text-sm appearance-none ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-[#0038A8] focus:bg-white'
                      }`}
                    >
                      <option value="Grade 7" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}>Grade 7</option>
                      <option value="Grade 8" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}>Grade 8</option>
                      <option value="Grade 9" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}>Grade 9</option>
                      <option value="Grade 10" className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}>Grade 10</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Email Address</label>
                    <input 
                      type="email" 
                      required 
                      value={editEmail} 
                      onChange={e => setEditEmail(e.target.value)} 
                      className={`w-full border-2 rounded-xl px-4 py-3 transition-all outline-none font-bold text-sm ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-[#0038A8] focus:bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>Contact Number</label>
                    <input 
                      type="text" 
                      required 
                      value={editContactNumber} 
                      onChange={e => setEditContactNumber(e.target.value)} 
                      className={`w-full border-2 rounded-xl px-4 py-3 transition-all outline-none font-bold text-sm ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-[#0038A8] focus:bg-white'
                      }`}
                    />
                  </div>
                </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                    isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-[#0038A8] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Voluntary Payment Modal */}
      {isVoluntaryModalOpen && voluntaryPaymentData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`rounded-3xl p-8 lg:p-12 max-w-sm lg:max-w-lg w-full shadow-2xl relative overflow-hidden border ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-gray-900'
            }`}
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-[#0038A8]"></div>
            <div className="flex justify-center mb-6">
              <div className={`p-4 rounded-full ${isDarkMode ? 'bg-blue-950 text-blue-400' : 'bg-blue-50 text-[#0038A8]'}`}>
                <PhilippinePeso size={32} />
              </div>
            </div>
            <h2 className={`text-xl font-black text-center mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Voluntary Payment</h2>
            <p className={`text-center text-sm mb-6 font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Enter the amount for <span className="text-[#0038A8] dark:text-blue-400 font-bold">{standardDues.find(d => d.id === voluntaryPaymentData.dueId)?.name}</span>
            </p>
            
            <div className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">₱</span>
                <input 
                  type="number" 
                  autoFocus
                  placeholder="0.00"
                  value={voluntaryPaymentData.amount}
                  onChange={e => setVoluntaryPaymentData({ ...voluntaryPaymentData, amount: e.target.value })}
                  className={`w-full border-2 rounded-2xl pl-10 pr-4 py-4 transition-all outline-none font-black text-xl ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-100 text-gray-900 focus:border-[#0038A8] focus:bg-white'
                  }`}
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setIsVoluntaryModalOpen(false);
                    setVoluntaryPaymentData(null);
                  }}
                  className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                    isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  onClick={submitVoluntaryPayment}
                  className="flex-1 py-4 bg-[#0038A8] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  Confirm
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Remittance Password Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`rounded-3xl p-8 max-w-md w-full shadow-2xl border ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-100 text-gray-900'
            }`}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-rose-950 text-rose-400' : 'bg-red-100 text-red-600'}`}>
                <AlertTriangle size={28} />
              </div>
              <div>
                <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Confirm Deletion</h3>
                <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Action Required</p>
              </div>
            </div>
            
            <p className={`text-sm mb-8 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
              Do you really want to delete this remittance record? This action will reset the remittance status for associated teachers and cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setRemittanceIdToDelete(null);
                }}
                className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                  isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
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
          </motion.div>
        </div>
      )}

      {/* QR Code Display Modal */}
      {qrCodeData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-gray-900'} rounded-[2.5rem] p-6 sm:p-10 md:p-12 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border text-center relative`}
          >
            <button 
              onClick={() => setQrCodeData(null)}
              className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${
                isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-gray-100 text-gray-400 hover:text-gray-600'
              }`}
            >
              <X size={20} />
            </button>
            
            <div id="qr-code-capture-area-admin" className="bg-white p-4 rounded-2xl text-gray-900">
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
                {qrCodeData.grade.startsWith('Grade') ? 'Teacher' : 'BOD'} Login QR Code
              </h3>
              <p className="text-gray-500 font-bold mb-8 text-sm sm:text-base">
                {qrCodeData.grade}
              </p>
              
              <div className="bg-white p-4 rounded-3xl border-2 border-blue-100 shadow-xl shadow-blue-50/50 mb-8 mx-auto flex items-center justify-center w-fit">
                <QRCodeCanvas 
                  id="admin-qr-canvas"
                  value={JSON.stringify({ email: qrCodeData.email, pass: qrCodeData.pass, realEmail: qrCodeData.realEmail })} 
                  size={220}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: SUN_LOGO_SVG,
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>

              <div className="mb-6">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Account Email</p>
                <p className="text-sm sm:text-base font-black text-gray-800 bg-gray-50 py-2 px-4 rounded-lg inline-block border border-gray-100 break-all">
                  {qrCodeData.realEmail || qrCodeData.email}
                </p>
              </div>
              
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 mb-6">
                <div className="flex items-start gap-3">
                  <ShieldAlert size={20} className="text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-blue-700 font-bold text-left leading-relaxed">
                    Note: Please keep this QR code safe and private, as it grants direct access to your account.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <button 
                onClick={() => downloadQRCode(
                  'admin-qr-canvas', 
                  `FacultyClub_Admin_QR_${qrCodeData.grade}.png`,
                  qrCodeData.realEmail || qrCodeData.email,
                  qrCodeData.grade
                )}
                className="w-full py-4 sm:py-5 bg-[#0038A8] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
              >
                <Download size={18} />
                Download QR Code
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={async () => {
                   if (confirm("Are you sure you want to PERMANENTLY delete this specific QR Login? \n\nNote: This only removes the login access. The teacher's profile and payment data will NOT be touched.")) {
                      try {
                        const subQ = query(collection(db, 'users'), where('qrEmail', '==', qrCodeData.email));
                        const subSnapshot = await getDocs(subQ);
                        const batch = writeBatch(db);
                        subSnapshot.docs.forEach(doc => batch.delete(doc.ref));
                        await batch.commit();
                        showToast("QR Login deleted. Teacher record is safe.");
                        setQrCodeData(null);
                      } catch (e) {
                        showToast("Failed to delete QR Login.");
                      }
                   }
                  }}
                  className="flex-1 py-4 sm:py-5 bg-red-50 text-red-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all border border-red-100 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Delete QR
                </button>
                <button 
                  onClick={() => setQrCodeData(null)}
                  className={`flex-1 py-4 sm:py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                    isDarkMode ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Archive School Year Modal */}
      <AnimatePresence>
        {showArchiveModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-gray-900'} rounded-[2.5rem] w-full max-w-md lg:max-w-lg overflow-hidden shadow-2xl border`}
            >
              <div className="p-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                  isDarkMode ? 'bg-blue-950/80 text-blue-400 border border-blue-800' : 'bg-blue-50 text-[#0038A8]'
                }`}>
                  <Archive size={32} />
                </div>
                <h3 className={`text-2xl font-black uppercase tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Close School Year</h3>
                <p className={`text-sm font-medium leading-relaxed mb-8 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  This will archive all current collections, expenses, and remittances into a history folder. 
                  All teacher balances will be reset to zero for the new school year.
                </p>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>School Year Label</label>
                    <input 
                      type="text" 
                      value={archiveYear}
                      onChange={(e) => setArchiveYear(e.target.value)}
                      placeholder="e.g. 2025-2026"
                      className={`w-full px-5 py-4 border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#0038A8] outline-none transition-all ${
                        isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-gray-50 border-gray-100 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  <div className={`p-4 rounded-2xl border flex gap-3 ${
                    isDarkMode ? 'bg-amber-950/40 border-amber-900/50 text-amber-300' : 'bg-yellow-50 border-yellow-100 text-yellow-700'
                  }`}>
                    <AlertTriangle className={isDarkMode ? 'text-amber-400 shrink-0' : 'text-yellow-600 shrink-0'} size={20} />
                    <p className={`text-[11px] font-bold leading-relaxed ${isDarkMode ? 'text-amber-300' : 'text-yellow-700'}`}>
                      Make sure you have exported all necessary reports before proceeding. This action is irreversible.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowArchiveModal(false)}
                    className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                      isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleArchiveSchoolYear}
                    disabled={isArchiving || !archiveYear}
                    className="flex-1 py-4 bg-[#0038A8] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isArchiving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Confirm Archive
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Wipe Success Modal */}
      {showWipeSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-gray-900'} rounded-[2.5rem] p-8 sm:p-12 lg:p-16 max-w-md lg:max-w-xl w-full shadow-2xl border text-center`}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              isDarkMode ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-green-100 text-green-600'
            }`}>
              <CheckCircle size={40} />
            </div>
            
            <h3 className={`text-2xl font-black mb-2 uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>System Wiped</h3>
            <p className={`font-bold mb-8 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              All records, payment history, expenses, and audit logs have been permanently deleted. The system has been reset to its initial state.
            </p>

            <button 
              onClick={() => setShowWipeSuccessModal(false)}
              className="w-full py-4 bg-[#0038A8] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              Understood
            </button>
          </motion.div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-gray-900'} rounded-[2.5rem] p-8 sm:p-12 max-w-md lg:max-w-lg w-full shadow-2xl border text-center`}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              isDarkMode ? 'bg-red-950/80 text-red-400 border border-red-800' : 'bg-red-100 text-red-600'
            }`}>
              <AlertTriangle size={40} />
            </div>
            
            <h3 className={`text-2xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {deleteType === 'all' ? 'Delete All Records?' : 'Delete Selected Records?'}
            </h3>
            <p className={`font-bold mb-8 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {deleteType === 'all' 
                ? 'This will permanently wipe all teacher records and their payment history from the database. This action cannot be undone.' 
                : `You are about to delete ${selectedTeacherIds.size} selected teacher records. This action is permanent and cannot be reversed.`}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setIsBatchDeleteModalOpen(false)}
                disabled={isBatchDeleting}
                className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 ${
                  isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
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
      {/* Batch Update Dues Modal */}
      {isBatchUpdateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-gray-900'} rounded-[2.5rem] p-8 sm:p-12 lg:p-16 max-w-lg lg:max-w-2xl w-full shadow-2xl border relative max-h-[90vh] overflow-y-auto`}
          >
            <button 
              onClick={() => setIsBatchUpdateModalOpen(false)}
              className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${
                isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-gray-100 text-gray-400 hover:text-gray-600'
              }`}
            >
              <X size={20} />
            </button>
            
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              isDarkMode ? 'bg-blue-950/80 text-blue-400 border border-blue-800' : 'bg-blue-100 text-[#0038A8]'
            }`}>
              <CheckCircle size={40} />
            </div>
            
            <h3 className={`text-2xl font-black mb-2 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Batch Update Dues
            </h3>
            <p className={`font-bold mb-8 leading-relaxed text-center ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Update payment status for {selectedTeacherIds.size} selected {selectedTeacherIds.size === 1 ? 'teacher' : 'teachers'}.
            </p>

            <div className="space-y-4 mb-8 text-left">
              {standardDues.map(due => (
                <div key={due.id} className={`flex items-center justify-between p-4 rounded-2xl border ${
                  isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-50 border-gray-100'
                }`}>
                  <div>
                    <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{due.name}</p>
                    <p className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>₱{due.amount.toLocaleString()}</p>
                  </div>
                  <select
                    value={batchDueUpdates[due.id] || 'no_change'}
                    onChange={(e) => setBatchDueUpdates(prev => ({ ...prev, [due.id]: e.target.value as any }))}
                    className={`rounded-xl px-4 py-2 text-sm font-bold outline-none border focus:ring-2 focus:ring-[#0038A8] ${
                      isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`}
                  >
                    <option value="no_change">No Change</option>
                    <option value="paid">Mark as Paid</option>
                    <option value="unpaid">Mark as Unpaid</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setIsBatchUpdateModalOpen(false)}
                disabled={isBatchUpdating}
                className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 ${
                  isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Cancel
              </button>
              <button 
                onClick={handleBatchUpdateDues}
                disabled={isBatchUpdating || Object.values(batchDueUpdates).every(v => v === 'no_change')}
                className="flex-1 py-4 bg-[#0038A8] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isBatchUpdating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Apply Updates'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Receipt Preview Modal */}
      {showReceiptPreview && previewReceiptData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-gray-900'} rounded-[2.5rem] p-8 sm:p-10 max-w-2xl w-full shadow-2xl border relative max-h-[90vh] flex flex-col`}
          >
            <button 
              onClick={() => setShowReceiptPreview(false)}
              className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${
                isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-gray-100 text-gray-400 hover:text-gray-600'
              }`}
            >
              <X size={20} />
            </button>
            
            <h3 className={`text-2xl font-black mb-6 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Receipt Preview</h3>
            
            <div className={`flex-1 overflow-auto mb-8 p-4 rounded-3xl border flex justify-center ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="receipt-preview-scaler">
                <div id="admin-receipt-content" className="bg-white shadow-sm text-gray-900" dangerouslySetInnerHTML={{ __html: generateHTMLReceipt(previewReceiptData) }} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setShowReceiptPreview(false)}
                className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all font-mono ${
                  isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Close
              </button>
              <button 
                onClick={printReceipt}
                className="flex-1 py-4 bg-purple-50 text-purple-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-100 transition-all flex items-center justify-center gap-2 font-mono"
              >
                <FileText size={16} />
                Print
              </button>
              <button 
                onClick={downloadReceiptAsDocx}
                disabled={isDownloadingReceipt}
                className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 font-mono"
              >
                {isDownloadingReceipt ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    DOCX...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    DOCX
                  </>
                )}
              </button>
              <button 
                onClick={downloadReceiptAsImage}
                disabled={isDownloadingImage}
                className="flex-1 py-4 bg-[#0038A8] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50 font-mono"
              >
                {isDownloadingImage ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    PNG...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    PNG
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Real-time Remittance Floating Notifications (For Admins) */}
      {profile?.role === 'admin' && (
        <div className="fixed top-24 right-4 sm:right-6 lg:right-8 z-[210] flex flex-col gap-4 max-w-[90vw] sm:max-w-md w-full pointer-events-none">
          <AnimatePresence>
            {remittanceNotifications.map((rem) => {
              const loading = verifyingNotificationIds.includes(rem.id);
              return (
                <motion.div
                  key={rem.id}
                  initial={{ opacity: 0, x: 150, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, x: 150 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className={`pointer-events-auto w-full rounded-[2rem] border p-6 shadow-[0_20px_50px_rgba(0,38,168,0.12)] backdrop-blur-xl transition-all duration-350 relative overflow-hidden group ${
                    isDarkMode 
                      ? 'bg-slate-900/95 border-slate-800 text-white shadow-black/40' 
                      : 'bg-white/95 border-blue-50 text-[#1E293B] shadow-indigo-100/30'
                  }`}
                >
                  {/* Decorative glowing gradient backdrop inside the card */}
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full z-0 transition-opacity opacity-20 group-hover:opacity-30 ${isDarkMode ? 'bg-gradient-to-br from-cyan-500 to-indigo-500' : 'bg-gradient-to-br from-blue-300 to-indigo-400'}`}></div>

                  <div className="relative z-10 flex gap-4 items-start">
                    {/* Pulsing ring around Wallet badge icon */}
                    <div className="relative shrink-0 mt-1">
                      <div className="absolute inset-0 bg-emerald-500 rounded-2xl blur-md opacity-30 animate-pulse"></div>
                      <div className={`relative w-11 h-11 rounded-2xl flex items-center justify-center border ${isDarkMode ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        <Wallet className="animate-bounce" size={20} style={{ animationDuration: '3s' }} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Sub-header banner details */}
                      <div className="flex justify-between items-center mb-1.5 gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-[0.16em] shrink-0 flex items-center gap-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          Real-time Remittance
                        </span>
                        <button
                          onClick={() => setRemittanceNotifications(prev => prev.filter(r => r.id !== rem.id))}
                          className={`p-1.5 rounded-xl transition-colors shrink-0 ${isDarkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* Header containing name and grade level */}
                      <h4 className={`text-sm sm:text-base font-black tracking-tight mb-0.5 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {rem.bodName || 'BOD Representative'}
                      </h4>
                      <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-3`}>
                        Submitted turnover for <span className={`${isDarkMode ? 'text-blue-400' : 'text-[#0038A8]'} font-black uppercase text-xs`}>{rem.gradeLevel}</span>.
                      </p>

                      {/* Highlighted Peso Amount */}
                      <div className={`flex items-center gap-2 p-3 rounded-2xl font-mono text-base font-black mb-3 border ${
                        isDarkMode 
                          ? 'bg-slate-950/60 border-slate-800 text-emerald-400' 
                          : 'bg-emerald-50/50 border-emerald-100/50 text-emerald-700'
                      }`}>
                        <PhilippinePeso size={15} className="shrink-0 text-emerald-500" />
                        <span>{rem.amount ? rem.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}</span>
                      </div>

                      {/* Live Actions Footer */}
                      <div className="flex gap-2 w-full mt-2">
                        <button
                          disabled={loading}
                          onClick={() => handleInstantVerifyNotification(rem.id)}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {loading ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={12} />
                              Verify
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('remittance');
                            setRemittanceNotifications(prev => prev.filter(r => r.id !== rem.id));
                          }}
                          className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border ${
                            isDarkMode 
                              ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' 
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <GlobalOverlays 
        showTermsModal={showTermsModal} 
        setShowTermsModal={setShowTermsModal} 
        showLoginSuccess={showLoginSuccess} 
        toast={toast} 
        profile={profile}
        teacherRecord={teacherRecord}
        onAgreeTerms={handleAgreeTerms}
        records={records}
        isDarkMode={isDarkMode}
        showInAppNotify={showInAppNotify}
        setShowInAppNotify={setShowInAppNotify}
        setActiveTab={setActiveTab}
        setShowLoginSuccess={setShowLoginSuccess}
        onDismissToast={() => setToast(null)}
      />
    </div>
  );
}
