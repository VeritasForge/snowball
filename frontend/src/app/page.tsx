"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { Asset } from '../types';
import { Header } from '../components/Header';
import { Toast } from '../components/Toast';
import { AccountTabs } from '../components/AccountTabs';
import { AccountHeader } from '../components/AccountHeader';
import { AssetTable } from '../components/AssetTable';
import { SummarySection } from '../components/SummarySection';
import { DonutChart } from '../components/DonutChart';
import { usePortfolioData } from '../lib/hooks/usePortfolioData';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import { formatNumber } from '../lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export default function Home() {
  const {
    accounts, fetchAccounts, isGuest, isLoading,
    addAsset, updateAsset, deleteAsset, updateCash, fetchAssetInfo,
    createAccount: apiCreateAccount,
    updateAccountName: apiUpdateAccountName,
    deleteAccount: apiDeleteAccount,
    updateAllPrices,
  } = usePortfolioData();

  const [activeAccountId, setActiveAccountId] = useState<number | null>(null);
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

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  useEffect(() => {
    if (accounts.length > 0) {
      const currentExists = accounts.some(acc => acc.id === activeAccountId);
      if (activeAccountId === null || !currentExists) setActiveAccountId(accounts[0].id);
    }
  }, [accounts, activeAccountId]);

  useEffect(() => {
    if (isGuest || !isAutoRefreshEnabled) return;
    const run = async () => { setIsLoadingPrices(true); await updateAllPrices(); setIsLoadingPrices(false); };
    run();
    const id = setInterval(run, 10000);
    return () => clearInterval(id);
  }, [isGuest, updateAllPrices, isAutoRefreshEnabled]);

  const activeAccount = accounts.find(acc => acc.id === activeAccountId) ?? accounts[0];

  const showToast = (message: string, type: 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), 3000);
  };

  const handleCreateAccount = async () => {
    if (!newAccountName.trim() || isSubmitting) return;
    if (isGuest) { showToast('게스트 모드에서는 계좌를 추가할 수 없습니다. 로그인해주세요.', 'error'); return; }
    setIsSubmitting(true);
    const res = await apiCreateAccount(newAccountName);
    if (res.success && res.id) {
      setNewAccountName(''); setIsAddingAccount(false); setActiveAccountId(res.id);
      showToast(`'${newAccountName}' 계좌가 생성되었습니다.`);
    } else showToast(res.message ?? '계좌 생성 실패', 'error');
    setIsSubmitting(false);
  };

  const executeTrade = async (asset: Asset) => {
    if (isGuest) { showToast('게스트 모드에서는 매매 실행이 지원되지 않습니다.'); setExecuteConfirmId(null); return; }
    if (!asset.action_quantity) { showToast('매매할 수량이 없습니다.'); setExecuteConfirmId(null); return; }
    try {
      const res = await fetchWithAuth(`${API_URL}/assets/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_id: asset.id, action_quantity: asset.action_quantity, price: asset.current_price }),
      });
      if (res.ok) {
        showToast(`${asset.name} ${Math.abs(asset.action_quantity)}주 ${asset.action_quantity > 0 ? '매수' : '매도'} 체결 완료!`);
        await fetchAccounts();
      } else showToast((await res.json()).detail ?? '체결 실패', 'error');
    } catch { showToast('체결 중 오류가 발생했습니다.', 'error'); }
    finally { setExecuteConfirmId(null); }
  };

  const fetchAssetInfoFromCode = async (id: number, code: string) => {
    setLoadingRowId(id);
    const res = await fetchAssetInfo(id, code);
    if (res.success) showToast(`${res.name} 정보 업데이트 완료!`);
    else showToast(res.message ?? '오류가 발생했습니다.', 'error');
    setLoadingRowId(null);
  };

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-muted gap-2">
      <Loader2 className="animate-spin text-primary" size={32} />
      <p>포트폴리오 불러오는 중...</p>
    </div>
  );

  if (!activeAccount) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 font-sans text-foreground relative">
      <Header />
      <div className="bg-card p-10 rounded-3xl shadow-xl text-center max-w-md w-full border border-border">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Wallet size={40} />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">환영합니다!</h2>
        <p className="text-muted mb-8 leading-relaxed">
          {isGuest ? '게스트 모드로 시작합니다.' : '아직 관리 중인 포트폴리오가 없습니다.'}
        </p>
        <div className="flex flex-col gap-3">
          <input
            type="text" value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            placeholder="포트폴리오 이름 (예: 퇴직연금)"
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:bg-card transition-all text-center font-medium text-foreground"
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleCreateAccount()}
            autoFocus
          />
          <button onClick={handleCreateAccount} disabled={!newAccountName.trim()}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20">
            시작하기
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-full mx-auto p-4 bg-background min-h-screen font-sans text-foreground relative">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
      <Header />
      <AccountTabs
        accounts={accounts} activeAccountId={activeAccountId} isGuest={isGuest}
        isAddingAccount={isAddingAccount} newAccountName={newAccountName}
        isSubmitting={isSubmitting}
        onSelectAccount={setActiveAccountId} onStartAdding={() => setIsAddingAccount(true)}
        onCancelAdding={() => setIsAddingAccount(false)} onNameChange={setNewAccountName}
        onCreateAccount={handleCreateAccount}
      />
      <div className="space-y-6">
        <AccountHeader
          account={activeAccount} isGuest={isGuest}
          isEditingName={isEditingName} tempName={tempName}
          onStartEditing={() => { setTempName(activeAccount.name); setIsEditingName(true); }}
          onTempNameChange={setTempName}
          onConfirmEdit={() => { apiUpdateAccountName(activeAccount.id!, tempName); setIsEditingName(false); }}
          onCancelEdit={() => setIsEditingName(false)}
          onDeleteAccount={async () => {
            if (!confirm(`'${activeAccount.name}' 계좌를 삭제하시겠습니까?\n계좌에 포함된 모든 종목도 함께 삭제됩니다.`)) return;
            const res = await apiDeleteAccount(activeAccount.id);
            if (res.success) showToast(`'${activeAccount.name}' 계좌가 삭제되었습니다.`);
            else showToast(res.message ?? '계좌 삭제 실패', 'error');
          }}
        />
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            <SummarySection account={activeAccount} onUpdateCash={updateCash} formatNumber={formatNumber} />
            <AssetTable
              account={activeAccount} isGuest={isGuest}
              loadingRowId={loadingRowId} deleteConfirmId={deleteConfirmId}
              executeConfirmId={executeConfirmId} isLoadingPrices={isLoadingPrices}
              isAutoRefreshEnabled={isAutoRefreshEnabled}
              onUpdateAsset={updateAsset} onDeleteAsset={deleteAsset}
              onExecuteTrade={executeTrade} onFetchAssetInfo={fetchAssetInfoFromCode}
              onAddAsset={(id) => addAsset(id, {})}
              onSetDeleteConfirmId={setDeleteConfirmId}
              onSetExecuteConfirmId={setExecuteConfirmId}
              onToggleAutoRefresh={() => setIsAutoRefreshEnabled(!isAutoRefreshEnabled)}
              showToast={showToast}
            />
          </div>
          <div className="w-full xl:w-[550px] shrink-0">
            <div className="sticky top-6">
              <DonutChart assets={activeAccount.assets} cash={activeAccount.cash ?? 0} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
