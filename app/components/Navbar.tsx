"use client";

import Link from "next/link";
import { useUser } from "@auth0/nextjs-auth0/client";

export default function Navbar() {
  const { user } = useUser();

  return (
    <nav className="sticky top-0 left-0 right-0 z-50 flex-none flex items-center justify-between px-6 h-16 bg-white/70 dark:bg-black/70 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-all">
      <div className="flex items-center gap-2">
        <Link href="/home" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
          FinanceTracker
        </Link>
      </div>

      <div className="flex items-center gap-6">
        <Link 
          href="/dashboard" 
          className="text-sm font-medium px-4 py-2 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all shadow-sm"
        >
          Dashboard
        </Link>
        
        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{user.name}</span>
              <a href="/auth/logout" className="text-[10px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
                Çıkış Yap
              </a>
            </div>
            {user.picture && (
              <img 
                src={user.picture} 
                alt={user.name || "User"} 
                className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 shadow-inner"
              />
            )}
          </div>
        ) : (
          <a href="/auth/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
            Giriş Yap
          </a>
        )}
      </div>
    </nav>
  );
}
