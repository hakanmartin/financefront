"use client";

import Link from "next/link";
import { useUser } from "@auth0/nextjs-auth0/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { user } = useUser();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDashboard = pathname === '/dashboard';
  const currency = searchParams.get('currency') || 'TRY';

  const toggleCurrency = () => {
    const newCurrency = currency === 'TRY' ? 'USD' : 'TRY';
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('currency', newCurrency);
    router.push(`${pathname}?${newParams.toString()}`);
  };

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

        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-sm"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4 text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        )}

        {isDashboard && (
          <button
            onClick={toggleCurrency}
            className="flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-2 rounded-full border-2 border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-zinc-900 transition-all shadow-sm"
          >
            {currency === 'TRY' ? (
              <span className="flex items-center"><span className="text-lg leading-none mr-1">₺</span> TL</span>
            ) : (
              <span className="flex items-center"><span className="text-lg leading-none mr-1">$</span> USD</span>
            )}
          </button>
        )}

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
