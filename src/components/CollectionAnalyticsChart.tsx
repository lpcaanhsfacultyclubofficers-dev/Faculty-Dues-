import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend 
} from 'recharts';
import { 
  BarChart3, PieChart as PieIcon, TrendingUp, Users, CheckCircle2, 
  Clock, AlertCircle, Coins, ShieldCheck, FileText, History
} from 'lucide-react';

type GradeLevel = 'Grade 7' | 'Grade 8' | 'Grade 9' | 'Grade 10';

type StandardDue = {
  id: string;
  name: string;
  amount: number;
  isVoluntary?: boolean;
};

type TeacherRecord = {
  id: string;
  name: string;
  gradeLevel: GradeLevel;
  paidDueIds: string[];
  voluntaryPayments?: Record<string, number>;
  remitted?: boolean;
  paymentHistory?: { dueId: string; dueName: string; date: string; amount: number }[];
};

type Remittance = {
  id: string;
  amount: number;
  timestamp: any;
  status: 'pending' | 'verified';
};

interface CollectionAnalyticsChartProps {
  records: TeacherRecord[];
  standardDues: StandardDue[];
  remittances: Remittance[];
  isDarkMode: boolean;
  handleDownloadTermsDocx: () => void;
  handleDownloadExcel: () => void;
  handleDownloadComprehensiveReportDocx: () => void;
  handleDownloadGlobalPaymentHistoryDocx: () => void;
}

export const CollectionAnalyticsChart: React.FC<CollectionAnalyticsChartProps> = ({
  records,
  standardDues,
  remittances,
  isDarkMode,
  handleDownloadTermsDocx,
  handleDownloadExcel,
  handleDownloadComprehensiveReportDocx,
  handleDownloadGlobalPaymentHistoryDocx
}) => {
  const [activeTab, setActiveTab] = useState<'dues' | 'grades' | 'trends' | 'collectibles'>('dues');
  const [metricMode, setMetricMode] = useState<'teachers' | 'pesos'>('teachers');

  // Filter required vs voluntary dues
  const requiredDues = useMemo(() => standardDues.filter(d => !d.isVoluntary), [standardDues]);
  const requiredDuesTotalPerTeacher = useMemo(() => requiredDues.reduce((s, d) => s + d.amount, 0), [requiredDues]);

  // Overall Statistics Calculations
  const stats = useMemo(() => {
    const totalTeachers = records.length;
    
    // Fully paid teachers (paid all required dues)
    const fullyPaidCount = records.filter(r => 
      requiredDues.length > 0 && requiredDues.every(d => r.paidDueIds.includes(d.id))
    ).length;

    // Partially paid teachers (paid at least one due but not all)
    const partiallyPaidCount = records.filter(r => 
      r.paidDueIds.length > 0 && !requiredDues.every(d => r.paidDueIds.includes(d.id))
    ).length;

    // Zero payment teachers
    const unpaidCount = records.filter(r => r.paidDueIds.length === 0).length;

    // Financial totals
    let totalCollectedPesos = 0;
    records.forEach(r => {
      standardDues.forEach(d => {
        if (r.paidDueIds.includes(d.id)) {
          if (d.isVoluntary && r.voluntaryPayments?.[d.id]) {
            totalCollectedPesos += r.voluntaryPayments[d.id];
          } else {
            totalCollectedPesos += d.amount;
          }
        }
      });
    });

    const totalCollectiblesPesos = totalTeachers * requiredDuesTotalPerTeacher;
    const remainingCollectiblesPesos = Math.max(0, totalCollectiblesPesos - totalCollectedPesos);
    const collectionRate = totalCollectiblesPesos > 0 
      ? Math.min(100, (totalCollectedPesos / totalCollectiblesPesos) * 100) 
      : 0;

    return {
      totalTeachers,
      fullyPaidCount,
      partiallyPaidCount,
      unpaidCount,
      totalCollectedPesos,
      totalCollectiblesPesos,
      remainingCollectiblesPesos,
      collectionRate
    };
  }, [records, standardDues, requiredDues, requiredDuesTotalPerTeacher]);

  // Chart Data 1: By Dues Item
  const duesChartData = useMemo(() => {
    return standardDues.map(due => {
      const paidTeachersCount = records.filter(r => r.paidDueIds.includes(due.id)).length;
      const unpaidTeachersCount = records.length - paidTeachersCount;
      const collectedPesos = records.reduce((sum, r) => {
        if (r.paidDueIds.includes(due.id)) {
          if (due.isVoluntary && r.voluntaryPayments?.[due.id]) {
            return sum + r.voluntaryPayments[due.id];
          }
          return sum + due.amount;
        }
        return sum;
      }, 0);
      const remainingPesos = due.isVoluntary ? 0 : Math.max(0, (records.length * due.amount) - collectedPesos);
      const percentage = records.length > 0 ? Math.round((paidTeachersCount / records.length) * 100) : 0;

      return {
        id: due.id,
        name: due.name.length > 14 ? due.name.substring(0, 12) + '...' : due.name,
        fullName: due.name,
        amount: due.amount,
        paidTeachers: paidTeachersCount,
        unpaidTeachers: unpaidTeachersCount,
        totalTeachers: records.length,
        collectedPesos,
        remainingPesos,
        percentage,
        isVoluntary: !!due.isVoluntary
      };
    });
  }, [standardDues, records]);

  // Chart Data 2: By Grade Level
  const gradeChartData = useMemo(() => {
    const grades: GradeLevel[] = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
    return grades.map(grade => {
      const gradeTeachers = records.filter(r => r.gradeLevel === grade);
      const totalTeachers = gradeTeachers.length;

      const fullyPaid = gradeTeachers.filter(r => 
        requiredDues.length > 0 && requiredDues.every(d => r.paidDueIds.includes(d.id))
      ).length;

      const partiallyPaid = gradeTeachers.filter(r => 
        r.paidDueIds.length > 0 && !requiredDues.every(d => r.paidDueIds.includes(d.id))
      ).length;

      const unpaid = gradeTeachers.filter(r => r.paidDueIds.length === 0).length;

      let collectedPesos = 0;
      gradeTeachers.forEach(r => {
        standardDues.forEach(d => {
          if (r.paidDueIds.includes(d.id)) {
            if (d.isVoluntary && r.voluntaryPayments?.[d.id]) {
              collectedPesos += r.voluntaryPayments[d.id];
            } else {
              collectedPesos += d.amount;
            }
          }
        });
      });

      const totalCollectibles = totalTeachers * requiredDuesTotalPerTeacher;
      const remainingPesos = Math.max(0, totalCollectibles - collectedPesos);
      const percentage = totalCollectibles > 0 ? Math.round((collectedPesos / totalCollectibles) * 100) : 0;

      return {
        grade,
        totalTeachers,
        fullyPaid,
        partiallyPaid,
        unpaid,
        collectedPesos,
        remainingPesos,
        totalCollectibles,
        percentage
      };
    });
  }, [records, standardDues, requiredDues, requiredDuesTotalPerTeacher]);

  // Chart Data 3: Monthly Collection & Cumulative Trends
  const monthlyTrendsData = useMemo(() => {
    const monthNames = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const monthlyMap: Record<string, number> = {};
    monthNames.forEach(m => { monthlyMap[m] = 0; });

    let activeRemittances = remittances.filter(r => r.status === 'verified');
    if (activeRemittances.length === 0) {
      records.forEach(r => {
        r.paymentHistory?.forEach(ph => {
          if (ph.date) {
            const dateObj = new Date(ph.date);
            if (!isNaN(dateObj.getTime())) {
              const monthStr = dateObj.toLocaleString('en-US', { month: 'short' });
              if (monthlyMap[monthStr] !== undefined) {
                monthlyMap[monthStr] += ph.amount || 0;
              }
            }
          }
        });
      });
    } else {
      activeRemittances.forEach(rem => {
        let dateObj: Date | null = null;
        if (rem.timestamp?.seconds) {
          dateObj = new Date(rem.timestamp.seconds * 1000);
        } else if (typeof rem.timestamp === 'string') {
          dateObj = new Date(rem.timestamp);
        }
        if (dateObj && !isNaN(dateObj.getTime())) {
          const monthStr = dateObj.toLocaleString('en-US', { month: 'short' });
          if (monthlyMap[monthStr] !== undefined) {
            monthlyMap[monthStr] += rem.amount || 0;
          }
        }
      });
    }

    const hasData = Object.values(monthlyMap).some(v => v > 0);

    if (!hasData && stats.totalCollectedPesos > 0) {
      const currentMonthIndex = new Date().getMonth();
      const schoolMonths = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
      const elapsedMonthsCount = Math.max(1, schoolMonths.indexOf(currentMonthIndex) + 1);
      const avgPerMonth = Math.round(stats.totalCollectedPesos / elapsedMonthsCount);
      
      for (let i = 0; i < elapsedMonthsCount; i++) {
        monthlyMap[monthNames[i]] = i === elapsedMonthsCount - 1 
          ? stats.totalCollectedPesos - (avgPerMonth * (elapsedMonthsCount - 1))
          : avgPerMonth;
      }
    }

    let runningCumulative = 0;
    return monthNames.map(m => {
      const monthlyAmount = monthlyMap[m] || 0;
      runningCumulative += monthlyAmount;
      return {
        month: m,
        monthly: monthlyAmount,
        cumulative: runningCumulative
      };
    });
  }, [remittances, records, stats.totalCollectedPesos]);

  // Chart Data 4: Collectibles Donut Chart Data
  const collectiblesPieData = useMemo(() => {
    return [
      { name: 'Collected Dues', value: stats.totalCollectedPesos, color: '#10B981' },
      { name: 'Remaining Collectibles', value: stats.remainingCollectiblesPesos, color: '#F43F5E' }
    ];
  }, [stats]);

  const teacherStatusPieData = useMemo(() => {
    return [
      { name: 'Fully Paid Teachers', value: stats.fullyPaidCount, color: '#10B981' },
      { name: 'Partially Paid Teachers', value: stats.partiallyPaidCount, color: '#F59E0B' },
      { name: 'Unpaid Teachers', value: stats.unpaidCount, color: '#EF4444' }
    ].filter(d => d.value > 0);
  }, [stats]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 sm:p-4 rounded-2xl shadow-xl border text-xs font-bold space-y-1.5 backdrop-blur-md ${
          isDarkMode 
            ? 'bg-slate-900/95 border-slate-700 text-slate-100' 
            : 'bg-white/95 border-gray-100 text-gray-800'
        }`}>
          <p className="text-xs sm:text-sm font-black border-b pb-1 border-gray-200/20">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5" style={{ color: entry.color || entry.fill }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color || entry.fill }}></span>
                {entry.name}:
              </span>
              <span className="font-black">
                {typeof entry.value === 'number' && (entry.name.toLowerCase().includes('pesos') || entry.name.toLowerCase().includes('collection') || entry.name.toLowerCase().includes('cumulative') || entry.name.toLowerCase().includes('collectibles') || entry.name.toLowerCase().includes('monthly'))
                  ? `₱${entry.value.toLocaleString()}`
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`p-4 sm:p-6 md:p-8 rounded-3xl sm:rounded-[2.5rem] shadow-sm border transition-all ${
      isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-gray-100 text-gray-900'
    }`}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b pb-6 border-slate-200/10">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
            isDarkMode ? 'bg-blue-950/80 text-blue-400 border border-blue-800/80' : 'bg-blue-50 text-[#0038A8]'
          }`}>
            <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`text-base sm:text-xl md:text-2xl font-black uppercase tracking-tight leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Collection & Collectibles Analytics
              </h2>
              <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shrink-0 ${
                isDarkMode ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-blue-100 text-[#0038A8]'
              }`}>
                Live
              </span>
            </div>
            <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest mt-0.5 sm:mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Teacher Dues Payment Status & Financial Breakdown
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <button onClick={handleDownloadTermsDocx} className={`p-2.5 sm:p-3 rounded-2xl transition-all flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider ${
            isDarkMode ? 'bg-purple-950/60 text-purple-300 border border-purple-800 hover:bg-purple-900/80' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
          }`} title="Terms Agreement Report">
            <ShieldCheck size={16} /> <span className="hidden sm:inline">Terms</span>
          </button>
          <button onClick={handleDownloadExcel} className={`p-2.5 sm:p-3 rounded-2xl transition-all flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider ${
            isDarkMode ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/80' : 'bg-green-50 text-green-700 hover:bg-green-100'
          }`} title="Excel Report">
            <FileText size={16} /> <span className="hidden sm:inline">Excel</span>
          </button>
          <button onClick={handleDownloadComprehensiveReportDocx} className={`p-2.5 sm:p-3 rounded-2xl transition-all flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider ${
            isDarkMode ? 'bg-blue-950/60 text-blue-300 border border-blue-800 hover:bg-blue-900/80' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`} title="Comprehensive DOCX Report">
            <FileText size={16} /> <span className="hidden sm:inline">Docx</span>
          </button>
          <button onClick={handleDownloadGlobalPaymentHistoryDocx} className={`p-2.5 sm:p-3 rounded-2xl transition-all flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider ${
            isDarkMode ? 'bg-amber-950/60 text-amber-300 border border-amber-800 hover:bg-amber-900/80' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
          }`} title="All Faculty Payments Log">
            <History size={16} /> <span className="hidden sm:inline">Logs</span>
          </button>
        </div>
      </div>

      {/* Top Summary Statistics Cards Grid - 2x2 on Mobile, 4x1 on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
        {/* Card 1: Fully Paid Teachers */}
        <div className={`p-3.5 sm:p-5 rounded-2xl border transition-all ${
          isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50/80 border-gray-100'
        }`}>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest leading-tight ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Fully Paid Faculty
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <span className={`text-base sm:text-xl md:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.fullyPaidCount} <span className="text-[10px] sm:text-xs font-normal text-slate-400">/ {stats.totalTeachers}</span>
            </span>
            <span className="text-[9px] sm:text-xs font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
              {stats.totalTeachers > 0 ? Math.round((stats.fullyPaidCount / stats.totalTeachers) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Card 2: Pending Faculty */}
        <div className={`p-3.5 sm:p-5 rounded-2xl border transition-all ${
          isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50/80 border-gray-100'
        }`}>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest leading-tight ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Pending Faculty
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <span className={`text-base sm:text-xl md:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.partiallyPaidCount + stats.unpaidCount} <span className="text-[10px] sm:text-xs font-normal text-slate-400 hidden sm:inline">teachers</span>
            </span>
            <span className="text-[9px] sm:text-xs font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
              {stats.partiallyPaidCount} Partial
            </span>
          </div>
        </div>

        {/* Card 3: Total Collected */}
        <div className={`p-3.5 sm:p-5 rounded-2xl border transition-all ${
          isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50/80 border-gray-100'
        }`}>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest leading-tight ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Total Collected
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <span className={`text-base sm:text-xl md:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              ₱{stats.totalCollectedPesos.toLocaleString()}
            </span>
            <span className="text-[9px] sm:text-xs font-black text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
              {stats.collectionRate.toFixed(0)}% Rate
            </span>
          </div>
        </div>

        {/* Card 4: Uncollected Collectibles */}
        <div className={`p-3.5 sm:p-5 rounded-2xl border transition-all ${
          isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50/80 border-gray-100'
        }`}>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest leading-tight ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              Uncollected Collectibles
            </span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <span className={`text-base sm:text-xl md:text-2xl font-black ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`}>
              ₱{stats.remainingCollectiblesPesos.toLocaleString()}
            </span>
            <span className="text-[9px] sm:text-xs font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-full">
              Remaining
            </span>
          </div>
        </div>
      </div>

      {/* Tab Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Navigation Tabs */}
        <div className={`flex flex-wrap p-1 sm:p-1.5 rounded-2xl border gap-1 overflow-x-auto ${
          isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-gray-100/80 border-gray-200/60'
        }`}>
          <button
            onClick={() => setActiveTab('dues')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'dues'
                ? (isDarkMode ? 'bg-blue-600 text-white shadow-md' : 'bg-[#0038A8] text-white shadow-md')
                : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900')
            }`}
          >
            <BarChart3 size={14} /> By Dues Item
          </button>

          <button
            onClick={() => setActiveTab('grades')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'grades'
                ? (isDarkMode ? 'bg-blue-600 text-white shadow-md' : 'bg-[#0038A8] text-white shadow-md')
                : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900')
            }`}
          >
            <Users size={14} /> By Grade Level
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'trends'
                ? (isDarkMode ? 'bg-blue-600 text-white shadow-md' : 'bg-[#0038A8] text-white shadow-md')
                : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900')
            }`}
          >
            <TrendingUp size={14} /> Monthly Trends
          </button>

          <button
            onClick={() => setActiveTab('collectibles')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === 'collectibles'
                ? (isDarkMode ? 'bg-blue-600 text-white shadow-md' : 'bg-[#0038A8] text-white shadow-md')
                : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-gray-600 hover:text-gray-900')
            }`}
          >
            <PieIcon size={14} /> Financial Ratio
          </button>
        </div>

        {/* Metric Toggle (Teachers Count vs Pesos Amount) */}
        {(activeTab === 'dues' || activeTab === 'grades') && (
          <div className={`flex items-center p-1 rounded-2xl border shrink-0 ${
            isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-gray-100 border-gray-200/60'
          }`}>
            <button
              onClick={() => setMetricMode('teachers')}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all ${
                metricMode === 'teachers'
                  ? (isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900 shadow-sm')
                  : (isDarkMode ? 'text-slate-400' : 'text-gray-500')
              }`}
            >
              Teachers Count
            </button>
            <button
              onClick={() => setMetricMode('pesos')}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all ${
                metricMode === 'pesos'
                  ? (isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900 shadow-sm')
                  : (isDarkMode ? 'text-slate-400' : 'text-gray-500')
              }`}
            >
              Collectibles (₱)
            </button>
          </div>
        )}
      </div>

      {/* Main Chart Rendering Area */}
      <div className={`p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl border ${
        isDarkMode ? 'bg-slate-950/40 border-slate-800/80' : 'bg-gray-50/50 border-gray-100'
      }`}>
        {/* Tab 1: By Dues Item */}
        {activeTab === 'dues' && (
          <div>
            <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {metricMode === 'teachers' ? 'Paid vs Unpaid Faculty per Due Item' : 'Amount Collected vs Remaining Collectibles (₱)'}
              </h3>
              <span className={`text-[10px] sm:text-[11px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                {standardDues.length} Dues Configured
              </span>
            </div>

            <div className="h-[280px] sm:h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={duesChartData} margin={{ top: 15, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={isDarkMode ? 0.15 : 0.4} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => metricMode === 'pesos' ? `₱${val}` : `${val}`}
                  />
                  <ReTooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px', fontSize: '10px', fontWeight: 'bold' }}
                  />

                  {metricMode === 'teachers' ? (
                    <>
                      <Bar dataKey="paidTeachers" name="Paid Teachers" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="unpaidTeachers" name="Unpaid Teachers" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="collectedPesos" name="Collected Amount (₱)" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="remainingPesos" name="Remaining Collectibles (₱)" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Dues Cards Grid Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 mt-4 sm:mt-6">
              {duesChartData.map(due => (
                <div key={due.id} className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100 shadow-sm'
                }`}>
                  <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                    <span className={`text-xs font-black truncate max-w-[150px] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {due.fullName}
                    </span>
                    <span className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full ${
                      due.percentage >= 80 ? 'bg-emerald-500/10 text-emerald-500' : due.percentage >= 50 ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {due.percentage}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-bold mb-2">
                    <span className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>
                      Fee: ₱{due.amount.toLocaleString()}
                    </span>
                    <span className={isDarkMode ? 'text-slate-300' : 'text-gray-700'}>
                      {due.paidTeachers} / {due.totalTeachers} Paid
                    </span>
                  </div>
                  <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`}>
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-700" 
                      style={{ width: `${due.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: By Grade Level */}
        {activeTab === 'grades' && (
          <div>
            <div className="mb-3 sm:mb-4 flex justify-between items-center">
              <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                {metricMode === 'teachers' ? 'Faculty Status per Grade Level' : 'Grade Level Collectibles (₱)'}
              </h3>
              <span className={`text-[10px] sm:text-[11px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                4 Grade Levels
              </span>
            </div>

            <div className="h-[280px] sm:h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeChartData} margin={{ top: 15, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={isDarkMode ? 0.15 : 0.4} />
                  <XAxis 
                    dataKey="grade" 
                    tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: 800 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => metricMode === 'pesos' ? `₱${val}` : `${val}`}
                  />
                  <ReTooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '10px', fontWeight: 'bold' }} />

                  {metricMode === 'teachers' ? (
                    <>
                      <Bar dataKey="fullyPaid" name="Fully Paid Teachers" stackId="a" fill="#10B981" maxBarSize={32} />
                      <Bar dataKey="partiallyPaid" name="Partially Paid Teachers" stackId="a" fill="#F59E0B" maxBarSize={32} />
                      <Bar dataKey="unpaid" name="Unpaid Teachers" stackId="a" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="collectedPesos" name="Collected Amount (₱)" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="remainingPesos" name="Remaining Collectibles (₱)" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Grade Level Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-4 sm:mt-6">
              {gradeChartData.map(g => (
                <div key={g.grade} className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100 shadow-sm'
                }`}>
                  <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                    <span className={`text-xs font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {g.grade}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                      {g.percentage}%
                    </span>
                  </div>
                  <div className="text-base sm:text-lg font-black mb-1">
                    ₱{g.collectedPesos.toLocaleString()}
                  </div>
                  <div className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {g.fullyPaid} / {g.totalTeachers} Fully Paid
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Monthly Collection & Cumulative Trends */}
        {activeTab === 'trends' && (
          <div>
            <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div>
                <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  COLLECTION TRENDS — MONTHLY & CUMULATIVE COLLECTIONS
                </h3>
                <p className={`text-[10px] sm:text-[11px] font-bold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Monthly remitted dues vs total accumulated club funds (₱)
                </p>
              </div>
              <div className="flex items-center gap-3 text-[10px] sm:text-xs font-black">
                <span className="flex items-center gap-1 text-blue-500">
                  <span className="w-2.5 h-2.5 bg-[#0038A8] rounded-sm inline-block"></span> Monthly
                </span>
                <span className="flex items-center gap-1 text-rose-500">
                  <span className="w-2.5 h-2.5 bg-[#DC2626] rounded-full inline-block"></span> Cumulative
                </span>
              </div>
            </div>

            <div className="h-[280px] sm:h-[380px] w-full pt-2 sm:pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyTrendsData} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={isDarkMode ? 0.15 : 0.4} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: 800 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: isDarkMode ? '#94A3B8' : '#64748B', fontSize: 10, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₱${val}`}
                  />
                  <ReTooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="monthly" 
                    name="Monthly Remitted Collections" 
                    fill="#0038A8" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={24} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulative" 
                    name="Cumulative Total" 
                    stroke="#DC2626" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#DC2626', strokeWidth: 2, stroke: '#FFFFFF' }} 
                    activeDot={{ r: 6, fill: '#DC2626', stroke: '#FFFFFF', strokeWidth: 2 }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 4: Financial Ratio & Pie Chart */}
        {activeTab === 'collectibles' && (
          <div>
            <div className="mb-4 sm:mb-6 text-center">
              <h3 className={`text-xs sm:text-base font-black uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-gray-800'}`}>
                FACULTY PAYMENT & COLLECTIBLES DISTRIBUTION
              </h3>
              <p className={`text-[10px] sm:text-xs font-bold ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                Visual breakdown of collected vs uncollected mandatory club funds
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-center">
              {/* Pie Chart 1: Collectibles Pesos */}
              <div className="flex flex-col items-center">
                <h4 className={`text-[10px] sm:text-xs font-black uppercase tracking-widest mb-1 sm:mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Collectibles Balance (₱)
                </h4>
                <div className="h-[220px] sm:h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={collectiblesPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {collectiblesPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ReTooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center mt-1 sm:mt-2">
                  <span className="text-xl sm:text-2xl font-black text-emerald-500">
                    {stats.collectionRate.toFixed(1)}%
                  </span>
                  <span className={`block text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Collection Rate Achieved
                  </span>
                </div>
              </div>

              {/* Pie Chart 2: Teacher Payment Status */}
              <div className="flex flex-col items-center">
                <h4 className={`text-[10px] sm:text-xs font-black uppercase tracking-widest mb-1 sm:mb-2 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                  Teacher Compliance Ratio
                </h4>
                <div className="h-[220px] sm:h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={teacherStatusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {teacherStatusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ReTooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center mt-1 sm:mt-2">
                  <span className={`text-xl sm:text-2xl font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {stats.fullyPaidCount} / {stats.totalTeachers}
                  </span>
                  <span className={`block text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Faculty Fully Settled
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
