"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  RefreshCw, TrendingUp, Search, Plus, Trash2, Wallet, 
  Edit2, Check, X, AlertCircle, Loader2, PlayCircle, 
  ChevronDown, Activity, Layers, Box, Coins 
} from 'lucide-react';
import { Account, Asset } from '../types';

const API_URL = "http://localhost:8000";

const CATEGORIES = [
    { label: '주식', value: '주식', color: 'bg-red-500', icon: TrendingUp },
    { label: '채권', value: '채권', color: 'bg-blue-500', icon: Activity },
    { label: '원자재', value: '원자재', color: 'bg-yellow-500', icon: Layers },
    { label: '현금', value: '현금', color: 'bg-emerald-500', icon: Wallet },
    { label: '기타', value: '기타', color: 'bg-gray-400', icon: Box }
];

// --- Components ---

const Toast = ({ message, type, onClose }: { message: string, type: 'info' | 'error', onClose: () => void }) => {
  if (!message) return null;
  const bgClass = type === 'error' ? 'bg-red-500' : 'bg-blue-600';
  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 ${bgClass} text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50 animate-bounce-in`}>
      {type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-0.5"><X size={14}/></button>
    </div>
  );
};

const CategorySelector = ({ current, onSelect }: { current: string, onSelect: (val: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const currentCat = CATEGORIES.find(c => c.value === current) || CATEGORIES[0];
    const Icon = currentCat.icon;

    return (
        <div className="relative" ref={ref}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`w-8 h-8 rounded-full ${currentCat.color} flex items-center justify-center text-white shadow-sm hover:scale-110 transition-transform`}
                title={`카테고리: ${currentCat.label}`}
            >
                <Icon size={14} strokeWidth={3} />
            </button>
            {isOpen && (
                <div className="absolute top-10 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl w-36 py-2 animate-in fade-in zoom-in duration-200">
                    <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase">자산 카테고리</p>
                    {CATEGORIES.map(cat => {
                        const CatIcon = cat.icon;
                        return (
                            <button
                                key={cat.value}
                                onClick={() => { onSelect(cat.value); setIsOpen(false); }}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-sm text-left w-full transition-colors"
                            >
                                <span className={`w-6 h-6 rounded-full ${cat.color} flex items-center justify-center text-white`}>
                                    <CatIcon size={10} strokeWidth={3} />
                                </span>
                                <span className={current === cat.value ? "font-bold text-gray-900" : "text-gray-600"}>
                                    {cat.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};


export default function Home() {
  // --- State ---
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false); // 로딩 완료 여부 체크
  
  // UI State
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null); 
  const [executeConfirmId, setExecuteConfirmId] = useState<number | null>(null); 
  const [loadingRowId, setLoadingRowId] = useState<number | null>(null); 
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' as 'info' | 'error' }); 
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived State
  const activeAccount = accounts.find(acc => acc.id === activeAccountId);
  
  // --- Actions ---
  
  const showToast = (message: string, type: 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), 3000);
  };

  const fetchAccounts = useCallback(async () => {
    try {
        const res = await fetch(`${API_URL}/accounts`);
        const data = await res.json();
        setAccounts(data);
        setIsLoaded(true);

        // 계좌가 있으면 자동으로 선택 (현재 선택된 계좌가 유효하지 않을 경우)
        if (data.length > 0) {
             setActiveAccountId(prev => {
                const stillExists = data.find((a: Account) => a.id === prev);
                return stillExists ? prev : data[0].id;
            });
        } else {
            setActiveAccountId(null);
        }
    } catch (e) {
        console.error(e);
        showToast("데이터를 불러오는데 실패했습니다.", 'error');
        setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Account Management
  const createAccount = async () => {
      if (!newAccountName.trim() || isSubmitting) return;
      setIsSubmitting(true);
      try {
          const res = await fetch(`${API_URL}/accounts`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: newAccountName, cash: 0 })
          });
          if(res.ok) {
              setNewAccountName('');
              setIsAddingAccount(false);
              await fetchAccounts();
          }
      } catch (e) { console.error(e); }
      finally { setIsSubmitting(false); }
  };

  const deleteActiveAccount = async () => {
      if(!activeAccount) return;
      if(!confirm("현재 계좌를 삭제하시겠습니까?")) return;
      try {
          await fetch(`${API_URL}/accounts/${activeAccount.id}`, { method: "DELETE" });
          // 삭제 후 fetchAccounts 호출 -> 리스트가 0개면 activeAccountId가 null이 됨 -> Empty State 표시
          fetchAccounts();
          showToast("계좌가 삭제되었습니다.");
      } catch(e) { console.error(e); }
  };

  const updateAccountName = async () => {
      if(!activeAccount || !tempName.trim()) return;
      try {
          await fetch(`${API_URL}/accounts/${activeAccount.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: tempName })
          });
          setIsEditingName(false);
          fetchAccounts();
      } catch(e) { console.error(e); }
  };
  
  const updateCash = async (val: string) => {
      if(!activeAccount) return;
      const numVal = parseFloat(val.replace(/,/g, ''));
      if(isNaN(numVal)) return;
      
      try {
        await fetch(`${API_URL}/accounts/${activeAccount.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cash: numVal })
        });
        fetchAccounts();
      } catch(e) { console.error(e); }
  };

  // Asset Management
  const addAsset = async () => {
      if(!activeAccount) return;
      try {
          await fetch(`${API_URL}/assets`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  account_id: activeAccount.id,
                  name: "",
                  category: "주식"
              })
          });
          fetchAccounts();
      } catch(e) { console.error(e); }
  };

  const updateAsset = async (id: number, field: string, value: string | number) => {
      let finalVal = value;
      if (typeof value === 'string' && ['price', 'avgPrice', 'qty', 'targetRatio'].includes(field)) {
          finalVal = parseFloat(value.replace(/,/g, '')) || 0;
      }
      
      const fieldMap: Record<string, string> = {
          'targetRatio': 'target_weight',
          'avgPrice': 'avg_price',
          'price': 'current_price',
          'qty': 'quantity'
      };
      
      const beField = fieldMap[field] || field;

      try {
          await fetch(`${API_URL}/assets/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ [beField]: finalVal })
          });
          fetchAccounts();
      } catch(e) { console.error(e); }
  };

  const deleteAsset = async (id: number) => {
      try {
          await fetch(`${API_URL}/assets/${id}`, { method: "DELETE" });
          setDeleteConfirmId(null);
          fetchAccounts();
      } catch(e) { console.error(e); }
  };

  // Execution
  const executeTrade = async (asset: Asset) => {
      try {
          const res = await fetch(`${API_URL}/assets/execute`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  asset_id: asset.id,
                  action_quantity: asset.action_quantity,
                  price: asset.current_price
              })
          });
          if(!res.ok) {
              const err = await res.json();
              showToast(err.detail, 'error');
              return;
          }
          setExecuteConfirmId(null);
          showToast(`${asset.name} ${asset.action_quantity > 0 ? '매수' : '매도'} 완료!`);
          fetchAccounts();
      } catch(e) { console.error(e); }
  };

  // External APIs (Gemini Logic Placeholder)
  const updatePricesWithAI = async () => {
      if(!activeAccount) return;
      setIsLoadingPrices(true);
      try {
        const apiKey = ""; 
        if(!apiKey) {
            showToast("API Key가 설정되지 않았습니다.", 'error');
            return;
        }
        
        const itemsToSearch = activeAccount.assets.map(p => `${p.name}(${p.code || ''})`).join(', ');
        const prompt = `
            Search Naver Finance current prices for: ${itemsToSearch}.
            Use codes as primary key.
            Return JSON ONLY: { "Exact Name": 12345 }
        `;
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }] })
            }
        );
        
        const data = await response.json();
        let resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (resultText) {
            resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
            const start = resultText.indexOf('{');
            const end = resultText.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                const priceMap = JSON.parse(resultText.substring(start, end + 1));
                
                for(const asset of activeAccount.assets) {
                    const newPrice = priceMap[asset.name];
                    if(newPrice) {
                        await fetch(`${API_URL}/assets/${asset.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ current_price: Number(newPrice) })
                        });
                    }
                }
                fetchAccounts();
                showToast("시세 업데이트 완료!");
            }
        }
      } catch(e) { 
          console.error(e); 
          showToast("업데이트 실패", 'error'); 
      } finally {
          setIsLoadingPrices(false);
      }
  };


  // --- Render ---
  
  const formatNumber = (num: number) => Math.round(num).toLocaleString('ko-KR');

  // Case 0: Loading first time
  if (!isLoaded) return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-400 gap-2">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <p>포트폴리오 불러오는 중...</p>
      </div>
  );

  // Case 1: No accounts (Empty State)
  if (accounts.length === 0) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 font-sans text-gray-800 relative">
              <header className="absolute top-0 left-0 w-full p-6">
                <div className="max-w-7xl mx-auto flex items-center gap-2">
                     <TrendingUp className="text-blue-600" /> 
                     <span className="text-xl font-bold">Snowball Allocator</span>
                </div>
              </header>

              <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md w-full border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Wallet size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">환영합니다!</h2>
                  <p className="text-gray-500 mb-8 leading-relaxed">
                      아직 관리 중인 포트폴리오가 없습니다.<br/>
                      새 포트폴리오를 만들어 자산 관리를 시작해보세요.
                  </p>
                  
                  <div className="flex flex-col gap-3">
                    <input 
                        type="text" 
                        value={newAccountName} 
                        onChange={(e) => setNewAccountName(e.target.value)} 
                        placeholder="포트폴리오 이름 (예: 퇴직연금)" 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-center font-medium"
                        onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && createAccount()}
                        autoFocus
                    />
                    <button 
                        onClick={createAccount} 
                        disabled={!newAccountName.trim()}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
                    >
                        시작하기
                    </button>
                  </div>
              </div>
          </div>
      );
  }

  // Case 2: Something wrong (activeAccount not found even though accounts exist)
  if (!activeAccount) {
      return (
        <div className="min-h-screen flex items-center justify-center">
            <button onClick={() => fetchAccounts()} className="text-blue-600 hover:underline">
                계좌 다시 불러오기
            </button>
        </div>
      );
  }

  // Case 3: Main Dashboard
  return (
    <div className="max-w-full mx-auto p-4 bg-gray-50 min-h-screen font-sans text-gray-800 relative">
      {toast.message && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />}
      
      <header className="mb-6 flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="text-blue-600" /> Snowball Allocator
          </h1>
          <p className="text-sm text-gray-500 mt-1">계좌별 자산 배분 & 리밸런싱 매니저</p>
        </div>
      </header>

      {/* Account Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
        {accounts.map(acc => (
          <button key={acc.id} onClick={() => setActiveAccountId(acc.id)} className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 border transition-all ${activeAccountId === acc.id ? 'bg-gray-800 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            <Wallet size={14} /> {acc.name}
          </button>
        ))}
        {isAddingAccount ? (
          <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-full px-3 py-1 shadow-sm">
            <input type="text" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="계좌명" className="w-24 text-sm outline-none" autoFocus onKeyDown={(e) => { 
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) createAccount(); 
                if (e.key === 'Escape') setIsAddingAccount(false); 
            }} />
            <button onClick={createAccount} className="text-blue-600"><Check size={16} /></button>
            <button onClick={() => setIsAddingAccount(false)} className="text-gray-400"><X size={16} /></button>
          </div>
        ) : (
          <button onClick={() => setIsAddingAccount(true)} className="px-3 py-2 rounded-full text-sm font-medium bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1 hover:bg-blue-100 transition-colors"><Plus size={14} /> 계좌 추가</button>
        )}
      </div>

      <div className="space-y-6">
        {/* Account Header */}
        <div className="flex justify-between items-end border-b border-gray-200 pb-2">
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} className="text-xl font-bold border-b-2 border-blue-500 outline-none bg-transparent" autoFocus />
                <button onClick={updateAccountName} className="p-1 text-green-600"><Check size={20}/></button>
              </div>
            ) : (
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                {activeAccount.name} 현황 <button onClick={() => { setTempName(activeAccount.name); setIsEditingName(true); }} className="text-gray-400 hover:text-gray-600"><Edit2 size={16}/></button>
              </h2>
            )}
          </div>
          <button onClick={deleteActiveAccount} className="text-xs text-red-400 hover:text-red-600 underline flex items-center gap-1"><Trash2 size={12} /> 계좌 삭제</button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-500">
            <h3 className="text-gray-500 text-sm font-medium">총 자산 (주식+현금)</h3>
            <p className="text-2xl font-bold mt-1 text-gray-900">{formatNumber(activeAccount.total_asset_value)}원</p>
          </div>
          <div className={`bg-white p-5 rounded-xl shadow-sm border-l-4 ${activeAccount.total_pl_amount >= 0 ? 'border-red-500' : 'border-blue-500'}`}>
            <h3 className="text-gray-500 text-sm font-medium">총 평가 손익</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold ${activeAccount.total_pl_amount >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {activeAccount.total_pl_amount > 0 ? '+' : ''}{formatNumber(activeAccount.total_pl_amount)}원
              </span>
              <span className={`text-sm font-medium ${activeAccount.total_pl_rate >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                ({activeAccount.total_pl_rate > 0 ? '+' : ''}{activeAccount.total_pl_rate.toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-emerald-500">
            <h3 className="text-gray-500 text-sm font-medium">투자 자산 (평가금)</h3>
            <p className="text-2xl font-bold mt-1 text-gray-900">{formatNumber(activeAccount.total_invested_value)}원</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-amber-500">
            <h3 className="text-gray-500 text-sm font-medium">보유 현금 (예수금)</h3>
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="text" 
                value={activeAccount.cash.toLocaleString('ko-KR')} 
                onChange={(e) => updateCash(e.target.value)}
                className="text-2xl font-bold border-b-2 border-amber-200 focus:border-amber-500 outline-none w-full bg-transparent" 
              />
              <span className="text-gray-400">원</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="text-xs text-gray-500 leading-relaxed">
              * 평단가와 수량을 입력하면 손익이 자동 계산됩니다. <br/>
              * '매수/매도' 버튼 클릭 시 계좌 예수금과 평단가가 실제 반영됩니다.
            </div>
            <button onClick={updatePricesWithAI} disabled={isLoadingPrices} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${isLoadingPrices ? 'bg-indigo-50 text-indigo-400 border-indigo-100' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 shadow-sm'}`}>
              {isLoadingPrices ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />} AI 시세 업데이트
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100/50 text-gray-500 font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-4 w-12 text-center">분류</th>
                  <th className="p-4 min-w-[150px]">종목명/코드</th>
                  <th className="p-4 text-center">목표비중</th>
                  <th className="p-4 text-right text-gray-400">평단가(원)</th>
                  <th className="p-4 text-right">현재가(원)</th>
                  <th className="p-4 text-right">수량</th>
                  <th className="p-4 text-right">손익(%)</th>
                  <th className="p-4 text-right">평가금액</th>
                  <th className="p-4 text-right bg-blue-50/50 text-blue-600">목표금액</th>
                  <th className="p-4 text-center bg-blue-50/50">리밸런싱 매매</th>
                  <th className="p-4 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeAccount.assets.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="p-4 text-center align-middle">
                      <CategorySelector 
                        current={item.category} 
                        onSelect={(val) => updateAsset(item.id, 'category', val)} 
                      />
                    </td>
                    <td className="p-4">
                      <input 
                        type="text" 
                        value={item.name} 
                        onChange={(e) => updateAsset(item.id, 'name', e.target.value)} 
                        className="w-full font-bold text-gray-900 border-b border-transparent focus:border-blue-400 outline-none bg-transparent" 
                        placeholder="종목명" 
                      />
                      <div className="flex items-center gap-1 mt-1">
                        <input 
                            type="text" 
                            value={item.code || ''} 
                            onChange={(e) => updateAsset(item.id, 'code', e.target.value)}
                            className="w-20 text-[10px] text-gray-400 border-b border-transparent focus:border-blue-400 outline-none bg-transparent font-mono" 
                            placeholder="CODE" 
                        />
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center bg-white border border-gray-200 rounded-md px-2 py-1 shadow-sm w-20 mx-auto">
                        <input type="number" step="0.1" value={item.target_weight} onChange={(e) => updateAsset(item.id, 'targetRatio', e.target.value)} className="w-full text-center outline-none font-bold text-gray-700" />
                        <span className="text-gray-400 text-[10px]">%</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <input type="text" value={item.avg_price.toLocaleString('ko-KR')} onChange={(e) => updateAsset(item.id, 'avgPrice', e.target.value)} className="w-24 text-right border-b border-gray-200 focus:border-blue-500 outline-none text-gray-400 text-xs" placeholder="0" />
                    </td>
                    <td className="p-4 text-right">
                      <input type="text" value={item.current_price.toLocaleString('ko-KR')} onChange={(e) => updateAsset(item.id, 'price', e.target.value)} className="w-24 text-right border-b border-gray-200 focus:border-blue-500 outline-none font-bold text-gray-700" placeholder="0" />
                    </td>
                    <td className="p-4 text-right">
                      <input type="text" value={item.quantity.toLocaleString('ko-KR')} onChange={(e) => updateAsset(item.id, 'qty', e.target.value)} className="w-16 text-right border-b border-gray-200 focus:border-blue-500 outline-none font-medium" placeholder="0" />
                    </td>
                    <td className="p-4 text-right">
                      <div className={`text-xs font-bold ${item.pl_amount >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                        {item.pl_amount > 0 ? '+' : ''}{formatNumber(item.pl_amount)}
                      </div>
                      <div className={`text-[10px] font-medium ${item.pl_rate >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                        ({item.pl_rate.toFixed(2)}%)
                      </div>
                    </td>
                    <td className="p-4 text-right font-bold text-gray-900">
                      {formatNumber(item.current_value)}
                      <div className="text-[10px] text-gray-400 font-normal">{item.current_weight.toFixed(1)}%</div>
                    </td>
                    <td className="p-4 text-right bg-blue-50/30 font-bold text-blue-700">
                      {formatNumber(item.target_value)}
                    </td>
                    <td className="p-4 text-center bg-blue-50/30">
                      {item.action_quantity !== 0 ? (
                        executeConfirmId === item.id ? (
                          <div className="flex items-center justify-center gap-1 animate-in slide-in-from-right-2">
                              <button onClick={() => executeTrade(item)} className="bg-green-600 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-green-700 shadow-sm transition-colors">체결</button>
                              <button onClick={() => setExecuteConfirmId(null)} className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-[10px] font-bold hover:bg-gray-300 transition-colors">취소</button>
                          </div>
                        ) : (
                          <button 
                              onClick={() => setExecuteConfirmId(item.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black w-full justify-center transition-all shadow-sm active:scale-95
                              ${item.action_quantity > 0 
                                  ? 'bg-red-500 text-white hover:bg-red-600' 
                                  : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                          >
                              <PlayCircle size={12} />
                              {item.action_quantity > 0 ? '매수' : '매도'} {Math.abs(item.action_quantity)}주
                          </button>
                        )
                      ) : <span className="text-gray-300 text-xs">-</span>}
                    </td>
                    <td className="p-4 text-center">
                      {deleteConfirmId === item.id ? (
                        <div className="flex gap-1 justify-center animate-in zoom-in"><button onClick={() => deleteAsset(item.id)} className="bg-red-500 text-white p-1.5 rounded-lg"><Check size={12}/></button><button onClick={() => setDeleteConfirmId(null)} className="bg-gray-200 p-1.5 rounded-lg text-gray-500"><X size={12}/></button></div>
                      ) : (
                        <button onClick={() => setDeleteConfirmId(item.id)} className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr><td colSpan={11} className="p-2 text-center bg-gray-50/30"><button onClick={addAsset} className="text-sm text-gray-400 hover:text-blue-600 font-bold flex items-center justify-center w-full py-3 transition-colors tracking-widest">+ 종목 추가 (ADD ASSET)</button></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}