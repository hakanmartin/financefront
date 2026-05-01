
export default function Home() {
    return (
        <div className="relative overflow-hidden flex min-h-screen items-center justify-center bg-gradient-to-br from-gradient-from via-gradient-via to-gradient-to font-sans">
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent z-[1]"></div>
            <main className="relative z-[2] flex flex-col items-center gap-10 text-center px-6">

                <h1 className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-500 dark:from-white dark:via-zinc-200 dark:to-zinc-500 drop-shadow-sm">
                    FinanceTracker
                </h1>

                <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-4 mt-2">
                    <a
                        href="/auth/login?returnTo=/home&screen_hint=signup"
                        className="flex h-14 items-center justify-center rounded-full bg-gradient-to-r from-zinc-900 to-zinc-800 px-12 text-lg font-medium text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:from-zinc-800 hover:to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 dark:text-zinc-950 dark:hover:from-white dark:hover:to-zinc-200"
                    >
                        Kayıt Ol
                    </a>
                </div>
            </main>
        </div>
    );
}