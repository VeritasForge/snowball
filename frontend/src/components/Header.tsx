import React from 'react';
import { TrendingUp, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '../lib/auth';

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
      <header className="mb-6 flex justify-between items-center bg-card p-4 rounded-lg shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="text-primary" /> Snowball Allocator
          </h1>
          <p className="text-sm text-muted mt-1">Portfolio Asset Allocation & Rebalancing Manager</p>
        </div>
        <div className="flex items-center gap-4">
            {isAuthenticated ? (
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full text-sm font-medium text-foreground">
                        <User size={14} />
                        <span>{user?.email}</span>
                    </div>
                    <button 
                        onClick={logout}
                        className="flex items-center gap-1 text-sm font-bold text-danger hover:text-red-600 transition-colors"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            ) : (
                <Link href="/auth" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
                    <User size={18} />
                    <span>Login / Sign Up</span>
                </Link>
            )}
        </div>
      </header>
  );
}
