
import { useState, useEffect, useMemo } from 'react';
import { 
  db, auth, 
  collection, doc, onSnapshot, query, where, 
  updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch 
} from '../firebase'; // Adjust this path in Expo to your firebase config

// --- Types ---
export type GradeLevel = 'Grade 7' | 'Grade 8' | 'Grade 9' | 'Grade 10';

export type StandardDue = {
  id: string;
  name: string;
  amount: number;
  isVoluntary?: boolean;
  pendingDeletion?: boolean;
};

export type TeacherRecord = {
  id: string;
  name: string;
  email: string;
  gradeLevel: GradeLevel;
  paidDueIds: string[];
  voluntaryPayments?: Record<string, number>;
  lastReceiptSent?: string;
  pendingDeletion?: boolean;
};

// --- The "Brain" Hook ---
export function useFacultyLogic(user: any, profile: any) {
  const [records, setRecords] = useState<TeacherRecord[]>([]);
  const [standardDues, setStandardDues] = useState<StandardDue[]>([]);
  const [remittances, setRemittances] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [initialBalances, setInitialBalances] = useState<any[]>([]);

  // 1. Real-time Listeners
  useEffect(() => {
    if (!user) return;

    const unsubDues = onSnapshot(collection(db, 'dues'), (snapshot) => {
      setStandardDues(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StandardDue)));
    });

    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      setRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TeacherRecord)));
    });

    const unsubRemit = onSnapshot(collection(db, 'remittances'), (snapshot) => {
      setRemittances(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubExp = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      setExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubBal = onSnapshot(collection(db, 'initialBalances'), (snapshot) => {
      setInitialBalances(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubDues();
      unsubTeachers();
      unsubRemit();
      unsubExp();
      unsubBal();
    };
  }, [user]);

  // 2. Financial Calculations
  const stats = useMemo(() => {
    const totalCollections = remittances
      .filter(r => r.status === 'verified')
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalInitialBalance = initialBalances.reduce((sum, b) => sum + (b.amount || 0), 0);
    const netBalance = (totalCollections + totalInitialBalance) - totalExpenses;

    return { totalCollections, totalExpenses, totalInitialBalance, netBalance };
  }, [remittances, expenses, initialBalances]);

  // 3. Core Actions (Mobile Friendly)
  
  // Toggle Payment Status
  const toggleDuePaid = async (teacherId: string, dueId: string, voluntaryAmount?: number) => {
    const teacher = records.find(r => r.id === teacherId);
    if (!teacher) return;

    const isPaid = teacher.paidDueIds.includes(dueId);
    const newPaidIds = isPaid 
      ? teacher.paidDueIds.filter(id => id !== dueId)
      : [...teacher.paidDueIds, dueId];

    const updateData: any = { paidDueIds: newPaidIds };
    
    if (voluntaryAmount !== undefined) {
      updateData.voluntaryPayments = {
        ...(teacher.voluntaryPayments || {}),
        [dueId]: voluntaryAmount
      };
    }

    try {
      await updateDoc(doc(db, 'teachers', teacherId), updateData);
      return { success: true };
    } catch (e) {
      return { success: false, error: e };
    }
  };

  // Reliable Batch Email Logic (Ported from our recent update)
  const batchSendReceipts = async (selectedIds: string[], sendEmailFn: (record: TeacherRecord) => Promise<any>) => {
    const teachersToReceive = records.filter(r => selectedIds.includes(r.id) && r.paidDueIds.length > 0);
    let successCount = 0;

    for (let i = 0; i < teachersToReceive.length; i++) {
      const record = teachersToReceive[i];
      
      let result = await sendEmailFn(record);
      
      // Retry logic (2 retries)
      let retries = 2;
      while (!result.success && retries > 0) {
        await new Promise(res => setTimeout(res, 2000));
        result = await sendEmailFn(record);
        retries--;
      }
      
      if (result.success) successCount++;
      
      // 3-second delay to prevent rate limits
      if (i < teachersToReceive.length - 1) {
        await new Promise(res => setTimeout(res, 3000));
      }
    }
    return successCount;
  };

  return {
    records,
    standardDues,
    remittances,
    expenses,
    stats,
    actions: {
      toggleDuePaid,
      batchSendReceipts
    }
  };
}
