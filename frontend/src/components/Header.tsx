import React from 'react';
import { TrendingUp, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '../lib/auth';

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
      <header className="mb-6 flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="text-blue-600" /> Snowball Allocator
          </h1>
          <p className="text-sm text-gray-500 mt-1">계좌별 자산 배분 & 리밸런싱 매니저</p>
        </div>
        <div className="flex items-center gap-4">
            {isAuthenticated ? (
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                        <User size={14} />
                        <span>{user?.email}</span>
                    </div>
                    <button 
                        onClick={logout}
                        className="flex items-center gap-1 text-sm font-bold text-red-500 hover:text-red-600 transition-colors"
                    >
                        <LogOut size={16} />
                        로그아웃
                    </button>
                </div>
            ) : (
                <Link href="/auth" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    <User size={18} />
                    <span>로그인 / 회원가입</span>
                </Link>
            )}
        </div>
      </header>
  );
}
