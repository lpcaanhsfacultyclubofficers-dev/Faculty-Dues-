import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, where } from '../firebase';

export function useFacultyLogic(user: any, options: { role: string }) {
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({ netBalance: 0, totalCollections: 0, totalExpenses: 0 });

  useEffect(() => {
    if (!user) return;

    // Simple listener for teachers
    const q = query(collection(db, 'users'), where('role', '==', 'teacher'));
    const unsub = onSnapshot(q, (snap) => {
      const usersList: any[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        usersList.push({
          id: doc.id,
          name: data.displayName || data.email,
          gradeLevel: data.gradeLevel || 'Faculty',
          paidDueIds: data.paidDueIds || [],
          ...data
        });
      });
      setRecords(usersList);
    });

    // Simple listener for stats (mocked up from generic collections logic)
    // You can update this based on your actual collections
    const unsubDocs = onSnapshot(collection(db, 'transactions'), (snap) => {
      let income = 0;
      let expense = 0;
      snap.forEach(doc => {
        const data = doc.data();
        if (data.type === 'income') income += data.amount || 0;
        if (data.type === 'expense') expense += data.amount || 0;
      });
      setStats({
        totalCollections: income,
        totalExpenses: expense,
        netBalance: income - expense
      });
    });

    return () => {
      unsub();
      unsubDocs();
    };
  }, [user]);

  return { records, stats };
}
