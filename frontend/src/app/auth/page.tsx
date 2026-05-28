"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '../../lib/auth';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const endpoint = isLogin ? '/auth/login' : '/auth/register';
    
    try {
      const res = await fetch(`http://localhost:8000/api/v1${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || '인증에 실패했습니다.');
      }

      if (isLogin) {
        // 1. 토큰 및 사용자 정보 저장 (access + refresh)
        login({ id: 'temp-id', email: email }, data.access_token, data.refresh_token);

        // 2. 데이터 동기화 트리거 (LocalStorage -> Server)
        const localPortfolio = localStorage.getItem('portfolio-storage');
        if (localPortfolio) {
          const parsed = JSON.parse(localPortfolio);
          await fetch(`http://localhost:8000/api/v1/users/sync`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.access_token}`
            },
            body: JSON.stringify({ 
              accounts: [{
                name: '게스트 포트폴리오',
                cash: parsed.state.cash,
                assets: parsed.state.assets
              }]
            })
          });
        }

        router.push('/');
      } else {
        setIsLogin(true);
        setError('회원가입 성공! 이제 로그인해주세요.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Link href="/" className="mb-8 flex items-center gap-2 text-2xl font-bold text-foreground">
        <TrendingUp className="text-accent" /> Snowball Allocator
      </Link>

      <div className="bg-card p-8 rounded-lg shadow-sm w-full max-w-md border border-border">
        <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
          {isLogin ? '로그인' : '회원가입'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-danger/10 text-danger rounded-lg text-sm font-medium border border-danger/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-muted mb-1 ml-1">이메일</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-accent focus:bg-card transition-all text-foreground"
                placeholder="example@mail.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-muted mb-1 ml-1">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-accent focus:bg-card transition-all text-foreground"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-accent text-accent-foreground py-3 rounded-lg font-bold text-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                {isLogin ? '로그인' : '가입하기'} <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-muted hover:text-accent text-sm font-medium transition-colors"
          >
            {isLogin ? '아직 계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-border text-center">
          <Link href="/" className="text-muted hover:text-accent text-sm transition-colors">
            로그인 없이 게스트로 계속하기 →
          </Link>
        </div>
      </div>
    </div>
  );
}
