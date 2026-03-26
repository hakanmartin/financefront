
export default function Home() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
            <main className="flex flex-col items-center gap-8 text-center px-6">

                <h1 className="text-3xl sm:text-6xl font-bold tracking-tight text-zinc-150">
                    FinanceTracker
                </h1>

                <div className="flex flex-col w-full sm:w-auto sm:flex-row gap-4 mt-2">
                    <a href="/auth/login?returnTo=/dashboard&screen_hint=signup" className="flex h-12 items-center justify-center rounded-full bg-zinc-100 px-8 font-medium text-zinc-950 transition-colors hover:bg-zinc-500">Kayıt Ol</a>
                </div>
            </main>
        </div>
    );
}