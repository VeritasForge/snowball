"use client";

import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, Search, Plus, Trash2, Wallet, 
  Edit2, Check, X, AlertCircle, Loader2, PlayCircle, 
  Activity 
} from 'lucide-react';
import { Asset } from '../types';
import { Header } from '../components/Header';
import { NumberFormatInput } from '../components/NumberFormatInput';
import { usePortfolioData } from '../lib/hooks/usePortfolioData';

const CATEGORIES = [
    { label: '주식', value: '주식', color: 'bg-danger', icon: Activity },
    { label: '채권', value: '채권', color: 'bg-primary', icon: Activity },
    { label: '원자재', value: '원자재', color: 'bg-warning', icon: Activity },
    { label: '현금', value: '현금', color: 'bg-success', icon: Wallet },
    { label: '기타', value: '기타', color: 'bg-muted', icon: Activity }
];

const Toast = ({ message, type, onClose }: { message: string, type: 'info' | 'error', onClose: () => void }) => {
  if (!message) return null;
  const bgClass = type === 'error' ? 'bg-danger' : 'bg-primary';
  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 ${bgClass} text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50 animate-bounce-in`}>
      {type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-0.5"><X size={14}/></button>
    </div>
  );
};

const CategorySelector = ({ current, onSelect }: { current: string, onSelect: (val: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);

    const currentCat = CATEGORIES.find(c => c.value === current) || CATEGORIES[0];

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`w-8 h-8 rounded-full ${currentCat.color} flex items-center justify-center text-white shadow-sm hover:scale-110 transition-transform`}
                title={`카테고리: ${currentCat.label}`}
            >
                <span className="text-[10px] font-bold">{currentCat.label[0]}</span>
            </button>
            {isOpen && (
                <div className="absolute top-10 left-0 z-50 bg-card border border-border rounded-xl shadow-2xl w-36 py-2">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.value}
                            onClick={() => { onSelect(cat.value); setIsOpen(false); }}
                            className="flex items-center gap-3 px-3 py-2 hover:bg-secondary text-sm text-left w-full transition-colors"
                        >
                            <span className={`w-6 h-6 rounded-full ${cat.color} flex items-center justify-center text-white`}>
                            </span>
                            <span className={current === cat.value ? "font-bold text-foreground" : "text-muted"}>
                                {cat.label}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};


export default function Home() {
  const { accounts, fetchAccounts, isGuest, isLoading, addAsset, updateAsset, deleteAsset, updateCash, fetchAssetInfo, createAccount: apiCreateAccount, updateAccountName: apiUpdateAccountName, deleteAccount: apiDeleteAccount, updateAllPrices } = usePortfolioData();
  
  const [activeAccountId, setActiveAccountId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
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
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
      fetchAccounts().then(() => setIsLoaded(true));
  }, [fetchAccounts]);

  useEffect(() => {
      if (accounts.length > 0) {
          // 현재 선택된 계좌가 없거나, 선택된 계좌가 목록에 없으면 첫 번째 계좌 선택
          const currentExists = accounts.some(acc => acc.id === activeAccountId);
          if (activeAccountId === null || !currentExists) {
              setActiveAccountId(accounts[0].id);
          }
      }
  }, [accounts, activeAccountId]);

  // 실시간 시세 자동갱신 (10초마다)
  useEffect(() => {
      if (isGuest || !isAutoRefreshEnabled) return;

      const updatePrices = async () => {
          setIsLoadingPrices(true);
          await updateAllPrices();
          setIsLoadingPrices(false);
      };

      // 초기 로드 시 한 번 실행
      updatePrices();

      // 10초마다 갱신
      const interval = setInterval(updatePrices, 10000);

      return () => clearInterval(interval);
  }, [isGuest, updateAllPrices, isAutoRefreshEnabled]);

  const activeAccount = accounts.find(acc => acc.id === activeAccountId) || accounts[0];
  
  const showToast = (message: string, type: 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), 3000);
  };

  const handleCreateAccount = async () => {
      if (!newAccountName.trim() || isSubmitting) return;
      
      if (isGuest) {
          showToast("게스트 모드에서는 계좌를 추가할 수 없습니다. 로그인해주세요.", 'error');
          return;
      }

      setIsSubmitting(true);
      const res = await apiCreateAccount(newAccountName);
      if (res.success && res.id) {
          setNewAccountName('');
          setIsAddingAccount(false);
          setActiveAccountId(res.id); // 신규 계좌로 즉시 전환
          showToast(`'${newAccountName}' 계좌가 생성되었습니다.`);
      } else {
          showToast(res.message || "계좌 생성 실패", 'error');
      }
      setIsSubmitting(false);
  };

  const executeTrade = async (asset: Asset) => {
      if (isGuest) {
          showToast("게스트 모드에서는 매매 실행이 지원되지 않습니다.", 'info');
          setExecuteConfirmId(null);
          return;
      }

      if (!asset.action_quantity || asset.action_quantity === 0) {
          showToast("매매할 수량이 없습니다.", 'info');
          setExecuteConfirmId(null);
          return;
      }

      try {
          const res = await fetch("http://localhost:8000/api/v1/assets/execute", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                  asset_id: asset.id,
                  action_quantity: asset.action_quantity,
                  price: asset.current_price
              })
          });

          if (res.ok) {
              const action = asset.action_quantity > 0 ? '매수' : '매도';
              showToast(`${asset.name} ${Math.abs(asset.action_quantity)}주 ${action} 체결 완료!`);
              await fetchAccounts(); // 데이터 새로고침
          } else {
              const err = await res.json();
              showToast(err.detail || "체결 실패", 'error');
          }
      } catch (e) {
          showToast("체결 중 오류가 발생했습니다.", 'error');
      } finally {
          setExecuteConfirmId(null);
      }
  };

  const fetchAssetInfoFromCode = async (id: number, code: string) => {
      setLoadingRowId(id);
      try {
        const res = await fetchAssetInfo(id, code);
        if (res.success) {
            showToast(`${res.name} 정보 업데이트 완료!`);
        } else {
            showToast(res.message || "오류가 발생했습니다.", 'error');
        }
      } catch (e) {
        showToast("알 수 없는 오류가 발생했습니다.", 'error');
      } finally {
        setLoadingRowId(null);
      }
  };

  const formatNumber = (num: number) => Math.round(num).toLocaleString('ko-KR');

  if (isLoading) return (
      <div className="min-h-screen flex flex-col items-center justify-center text-muted gap-2">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p>포트폴리오 불러오는 중...</p>
      </div>
  );

  if (!activeAccount) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 font-sans text-foreground relative">
              <Header />
              <div className="bg-card p-10 rounded-3xl shadow-xl text-center max-w-md w-full border border-border">
                  <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Wallet size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">환영합니다!</h2>
                  <p className="text-muted mb-8 leading-relaxed">
                      {isGuest ? "게스트 모드로 시작합니다." : "아직 관리 중인 포트폴리오가 없습니다."}
                  </p>
                  <div className="flex flex-col gap-3">
                    <input 
                        type="text" 
                        value={newAccountName} 
                        onChange={(e) => setNewAccountName(e.target.value)} 
                        placeholder="포트폴리오 이름 (예: 퇴직연금)" 
                        className="w-full bg-secondary border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:bg-card transition-all text-center font-medium text-foreground"
                        onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleCreateAccount()}
                        autoFocus
                    />
                    <button 
                        onClick={handleCreateAccount} 
                        disabled={!newAccountName.trim()}
                        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20"
                    >
                        시작하기
                    </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-full mx-auto p-4 bg-background min-h-screen font-sans text-foreground relative">
      {toast.message && <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />}
      
      <Header />

      {/* Account Tabs (Hidden for Guest if single account) */}
      {!isGuest && (
      <div className="mb-6 flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
        {accounts.map(acc => (
          <button key={acc.id} onClick={() => setActiveAccountId(acc.id!)} className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 border transition-all ${activeAccountId === acc.id ? 'bg-secondary text-foreground shadow-md border-border' : 'bg-card text-muted hover:bg-secondary border-border'}`}>
            <Wallet size={14} /> {acc.name}
          </button>
        ))}
        {isAddingAccount ? (
          <div className="flex items-center gap-2 bg-card border border-primary rounded-full px-3 py-1 shadow-sm">
            <input type="text" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="계좌명" className="w-24 text-sm outline-none bg-transparent text-foreground" autoFocus onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleCreateAccount(); 
                if (e.key === 'Escape') setIsAddingAccount(false); 
            }} />
            <button onClick={handleCreateAccount} className="text-primary"><Check size={16} /></button>
            <button onClick={() => setIsAddingAccount(false)} className="text-muted hover:text-foreground"><X size={16} /></button>
          </div>
        ) : (
          <button onClick={() => setIsAddingAccount(true)} className="px-3 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 hover:bg-primary/20 transition-colors"><Plus size={14} /> 계좌 추가</button>
        )}
      </div>
      )}

      <div className="space-y-6">
        {/* Account Header */}
        <div className="flex justify-between items-end border-b border-border pb-2">
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      apiUpdateAccountName(activeAccount.id!, tempName);
                      setIsEditingName(false);
                    }
                    if (e.key === 'Escape') {
                      setIsEditingName(false);
                    }
                  }}
                  className="text-xl font-bold border-b-2 border-primary outline-none bg-transparent text-foreground"
                  autoFocus
                />
                <button onClick={() => { apiUpdateAccountName(activeAccount.id!, tempName); setIsEditingName(false); }} className="p-1 text-success"><Check size={20}/></button>
                <button onClick={() => setIsEditingName(false)} className="p-1 text-muted hover:text-foreground"><X size={20}/></button>
              </div>
            ) : (
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                {activeAccount.name} 현황 <button onClick={() => { setTempName(activeAccount.name); setIsEditingName(true); }} className="text-muted hover:text-foreground"><Edit2 size={16}/></button>
              </h2>
            )}
          </div>
          {!isGuest && (
            <button
              onClick={async () => {
                if (!confirm(`'${activeAccount.name}' 계좌를 삭제하시겠습니까?\n계좌에 포함된 모든 종목도 함께 삭제됩니다.`)) return;
                const res = await apiDeleteAccount(activeAccount.id);
                if (res.success) {
                  showToast(`'${activeAccount.name}' 계좌가 삭제되었습니다.`);
                } else {
                  showToast(res.message || '계좌 삭제 실패', 'error');
                }
              }}
              className="text-xs text-danger hover:text-red-600 underline flex items-center gap-1"
            >
              <Trash2 size={12} /> 계좌 삭제
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card p-5 rounded-xl shadow-sm border-l-4 border-primary">
            <h3 className="text-muted text-sm font-medium">총 자산 (주식+현금)</h3>
            <p className="text-2xl font-bold mt-1 text-foreground">{formatNumber(activeAccount.total_asset_value)}원</p>
          </div>
          <div className={`bg-card p-5 rounded-xl shadow-sm border-l-4 ${activeAccount.total_pl_amount >= 0 ? 'border-danger' : 'border-primary'}`}>
            <h3 className="text-muted text-sm font-medium">총 평가 손익</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold ${activeAccount.total_pl_amount >= 0 ? 'text-danger' : 'text-primary'}`}>
                {activeAccount.total_pl_amount > 0 ? '+' : ''}{formatNumber(activeAccount.total_pl_amount)}원
              </span>
              <span className={`text-sm font-medium ${activeAccount.total_pl_rate >= 0 ? 'text-danger' : 'text-primary'}`}>
                ({activeAccount.total_pl_rate > 0 ? '+' : ''}{activeAccount.total_pl_rate.toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="bg-card p-5 rounded-xl shadow-sm border-l-4 border-success">
            <h3 className="text-muted text-sm font-medium">투자 자산 (평가금)</h3>
            <p className="text-2xl font-bold mt-1 text-foreground">{formatNumber(activeAccount.total_invested_value)}원</p>
          </div>
          <div className="bg-card p-5 rounded-xl shadow-sm border-l-4 border-warning">
            <h3 className="text-muted text-sm font-medium">보유 현금 (예수금)</h3>
            <div className="flex items-center gap-2 mt-1">
              <NumberFormatInput 
                value={activeAccount.cash || 0} 
                onChange={(val) => updateCash(activeAccount.id, val)}
                className="text-2xl font-bold border-b-2 border-warning/50 focus:border-warning outline-none w-full bg-transparent text-foreground"
              />
              <span className="text-muted">원</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
          <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/50">
            <div className="text-xs text-muted leading-relaxed">
              * 평단가와 수량을 입력하면 손익이 자동 계산됩니다. <br/>
              * &apos;매수/매도&apos; 버튼 클릭 시 계좌 예수금과 평단가가 실제 반영됩니다.
            </div>
            <button 
              onClick={() => !isGuest && setIsAutoRefreshEnabled(!isAutoRefreshEnabled)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${isLoadingPrices ? 'bg-primary/10 text-primary border-primary/20' : isAutoRefreshEnabled ? 'bg-card text-primary border-primary/20 hover:bg-primary/5 shadow-sm' : 'bg-secondary text-muted border-border'}`}
            >
              {isLoadingPrices ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />} 실시간 시세 {isGuest ? '(로그인 필요)' : isAutoRefreshEnabled ? '(자동갱신 중)' : '(일시 정지)'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/50 text-muted font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-4 w-12 text-center">분류</th>
                  <th className="p-4 min-w-[150px]">종목명/코드</th>
                  <th className="p-4 text-center">
                    <div>목표비중</div>
                    {(() => {
                      const total = activeAccount.assets.reduce((sum, a) => sum + (a.target_weight || 0), 0);
                      const remaining = 100 - total;
                      const isOver = remaining < 0;
                      const isExact = Math.abs(remaining) < 0.01;
                      return (
                        <div className={`text-[10px] font-normal mt-1 ${isExact ? 'text-success' : isOver ? 'text-danger' : 'text-warning'}`}>
                          {isExact ? '✓ 100%' : isOver ? `초과 ${Math.abs(remaining).toFixed(1)}%` : `잔여 ${remaining.toFixed(1)}%`}
                        </div>
                      );
                    })()}
                  </th>
                  <th className="p-4 text-right text-muted">평단가(원)</th>
                  <th className="p-4 text-right">현재가(원)</th>
                  <th className="p-4 text-right">수량</th>
                  <th className="p-4 text-right">손익(%)</th>
                  <th className="p-4 text-right">평가금액</th>
                  <th className="p-4 text-right bg-primary/10 text-primary">목표금액</th>
                  <th className="p-4 text-center bg-primary/10">리밸런싱 매매</th>
                  <th className="p-4 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeAccount.assets.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/30 transition-colors group">
                    <td className="p-4 text-center align-middle">
                      <CategorySelector 
                        current={item.category} 
                        onSelect={(val) => updateAsset(item.id!, 'category', val)} 
                      />
                    </td>
                    <td className="p-4">
                      <input 
                        type="text" 
                        value={item.name} 
                        onChange={(e) => updateAsset(item.id!, 'name', e.target.value)} 
                        className="w-full font-bold text-foreground border-b border-transparent focus:border-primary outline-none bg-transparent"
                        placeholder="종목명" 
                      />
                      <div className="flex items-center gap-1 mt-1">
                        <input 
                            type="text" 
                            value={item.code || ''} 
                            onChange={(e) => updateAsset(item.id!, 'code', e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && item.id && fetchAssetInfoFromCode(item.id, item.code || '')}
                            className="w-20 text-[10px] text-muted border-b border-transparent focus:border-primary outline-none bg-transparent font-mono"
                            placeholder="CODE" 
                        />
                        <button 
                            onClick={() => item.id && fetchAssetInfoFromCode(item.id, item.code || '')}
                            disabled={loadingRowId === item.id || !item.id}
                            className="text-muted hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                             {loadingRowId === item.id ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center bg-secondary border border-border rounded-md px-2 py-1 shadow-sm w-20 mx-auto">
                        <input
                          type="number"
                          step="0.1"
                          value={isNaN(item.target_weight) ? '' : item.target_weight}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const newVal = parseFloat(e.target.value) || 0;
                            const otherTotal = activeAccount.assets
                              .filter(a => a.id !== item.id)
                              .reduce((sum, a) => sum + (a.target_weight || 0), 0);
                            const newTotal = otherTotal + newVal;

                            if (newTotal > 100) {
                              showToast(`목표비중 합계가 100%를 초과합니다 (${newTotal.toFixed(1)}%)`, 'error');
                            }
                            updateAsset(item.id!, 'targetRatio', e.target.value);
                          }}
                          className="w-full text-center outline-none font-bold text-foreground bg-transparent"
                        />
                        <span className="text-muted text-[10px]">%</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <NumberFormatInput 
                        value={item.avg_price || 0} 
                        onChange={(val) => updateAsset(item.id!, 'avgPrice', val)} 
                        className="w-24 text-right border-b border-border focus:border-primary outline-none text-muted text-xs bg-transparent"
                        placeholder="0" 
                      />
                    </td>
                    <td className="p-4 text-right">
                      <NumberFormatInput 
                        value={item.current_price || 0} 
                        onChange={(val) => updateAsset(item.id!, 'price', val)} 
                        className="w-24 text-right border-b border-border focus:border-primary outline-none font-bold text-foreground bg-transparent"
                        placeholder="0" 
                      />
                    </td>
                    <td className="p-4 text-right">
                      <NumberFormatInput 
                        value={item.quantity || 0} 
                        onChange={(val) => updateAsset(item.id!, 'qty', val)} 
                        className="w-16 text-right border-b border-border focus:border-primary outline-none font-medium text-foreground bg-transparent"
                        placeholder="0" 
                      />
                    </td>
                    <td className="p-4 text-right">
                      <div className={`text-xs font-bold ${item.pl_amount >= 0 ? 'text-danger' : 'text-primary'}`}>
                        {item.pl_amount > 0 ? '+' : ''}{formatNumber(item.pl_amount)}
                      </div>
                      <div className={`text-[10px] font-medium ${item.pl_rate >= 0 ? 'text-danger' : 'text-primary'}`}>
                        ({item.pl_rate.toFixed(2)}%)
                      </div>
                    </td>
                    <td className="p-4 text-right font-bold text-foreground">
                      {formatNumber(item.current_value)}
                      <div className="text-[10px] text-muted font-normal">{item.current_weight.toFixed(1)}%</div>
                    </td>
                    <td className="p-4 text-right bg-primary/10 font-bold text-primary">
                      {formatNumber(item.target_value)}
                    </td>
                    <td className="p-4 text-center bg-primary/10">
                      {item.action_quantity !== 0 ? (
                        executeConfirmId === item.id ? (
                          <div className="flex items-center justify-center gap-1 animate-in slide-in-from-right-2">
                              <button onClick={() => executeTrade(item)} className="bg-success text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-success/80 shadow-sm transition-colors">체결</button>
                              <button onClick={() => setExecuteConfirmId(null)} className="bg-secondary text-muted px-2 py-1 rounded text-[10px] font-bold hover:bg-muted/20 transition-colors">취소</button>
                          </div>
                        ) : (
                          <button 
                              onClick={() => setExecuteConfirmId(item.id!)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black w-full justify-center transition-all shadow-sm active:scale-95
                              ${item.action_quantity > 0 
                                  ? 'bg-danger text-white hover:bg-danger/80'
                                  : 'bg-primary text-white hover:bg-primary/80'}`}
                          >
                              <PlayCircle size={12} />
                              {item.action_quantity > 0 ? '매수' : '매도'} {Math.abs(item.action_quantity)}주
                          </button>
                        )
                      ) : <span className="text-muted text-xs">-</span>}
                    </td>
                    <td className="p-4 text-center">
                      {deleteConfirmId === item.id ? (
                        <div className="flex gap-1 justify-center animate-in zoom-in"><button onClick={() => deleteAsset(item.id!)} className="bg-danger text-white p-1.5 rounded-lg"><Check size={12}/></button><button onClick={() => setDeleteConfirmId(null)} className="bg-secondary p-1.5 rounded-lg text-muted"><X size={12}/></button></div>
                      ) : (
                        <button onClick={() => setDeleteConfirmId(item.id!)} className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr><td colSpan={11} className="p-2 text-center bg-secondary/20"><button onClick={() => addAsset(activeAccount.id!, {})} className="text-sm text-muted hover:text-primary font-bold flex items-center justify-center w-full py-3 transition-colors tracking-widest">+ 종목 추가 (ADD ASSET)</button></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}