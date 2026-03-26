"use client";

import { useState, useEffect } from "react";
import ChartComponent from "../components/ChartComponent";
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from "next/navigation";
import { syncUserAction } from "@/app/actions";
import { getJwtToken } from "../actions";

// Portföye eklenecek öğenin tipi
type PortfolioItem = {
    id: string;
    asset_symbol: string;
    name: string;
    asset_type: string;
    quantity: number;
    priceAtAdd: number;
    totalValue: number;
};

// API'den gelecek varlıkların tipi
type ApiAsset = {
    symbol: string;
    name: string;
    asset_type: string;
    price_usd: number;
    price_try: number;
};

export default function Dashboard() {
    // Form Stateleri
    const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string>("");
    const [amountInput, setAmountInput] = useState<string>("");

    // Grafik Stateleri
    const [activeChartSymbol, setActiveChartSymbol] = useState<string>("THYAO.IS");
    const [activeChartRange, setActiveChartRange] = useState<string>("1mo");

    // Sağ Sidebar Form Stateleri (Listele butonuna basana kadar chart güncellenmeyecek)
    const [tempChartSymbol, setTempChartSymbol] = useState<string>("THYAO.IS");
    const [tempChartRange, setTempChartRange] = useState<string>("1mo");

    // Veri Stateleri
    const [availableAssets, setAvailableAssets] = useState<ApiAsset[]>([]);
    const [isLoadingAssets, setIsLoadingAssets] = useState<boolean>(true);
    const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
    const { user, isLoading: isUserLoading } = useUser();
    const router = useRouter();

    // 2. Kullanıcı giriş yapmamışsa, login sayfasına geri postala
    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/auth/login?returnTo=/dashboard');
        }
    }, [user, isUserLoading, router]);

    // 3. Sunucu üzerinden Backend'e yetkili senkronizasyon isteği atıyoruz (Lazy Sync)
    useEffect(() => {
        if (user && user.email) {
            syncUserAction(user.email).catch(error => {
                console.error("Backend senkronizasyonu tetiklenemedi:", error);
            });
        }
    }, [user]);

    // Yüklenirken veya kullanıcı yokken ekranın patlamaması için basit bekleme gösterimi
    if (isUserLoading || !user) {
        return <div className="flex h-screen w-full items-center justify-center bg-zinc-100 dark:bg-black dark:text-white">Yükleniyor...</div>;
    }

    // Portföyü DB'den çek
    const fetchPortfolio = async () => {
        if (!user?.email) return;
        try {
            const token = await getJwtToken();
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030';
            const response = await fetch(`${API_URL}/api/portfolio?email=${user.email}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`   // ← BURASI EKLENDİ
                }
            });
            const result = await response.json();
            if (result.success) {
                setPortfolio(result.data); // [{asset_symbol, name, asset_type, quantity}]
            }
        } catch (error) {
            console.error("Portföy çekilemedi:", error);
        }
    };

    useEffect(() => {
        if (user?.email) {
            fetchPortfolio();
        }
    }, [user]);

    // Sayfa yüklendiğinde API'den varlıkları çek
    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const token = await getJwtToken();
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030';
                const response = await fetch(`${API_URL}/api/assets`, {
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
                });
                const result = await response.json();
                if (result.success) {
                    setAvailableAssets(result.data);
                }
            } catch (error) {
                console.error("Varlıklar çekilirken hata oluştu:", error);
            } finally {
                setIsLoadingAssets(false);
            }
        };

        fetchAssets();
    }, []);

    useEffect(() => {
        if (user && user.email) {
            console.log("SYNC TRIGGER");
            syncUserAction(user.email);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            console.log("USER:", user);
        }
    }, [user]);

    // Ekle Butonu İşlevi
    const handleAddAsset = async () => {
        if (!selectedAssetSymbol || !amountInput || Number(amountInput) <= 0) return;

        try {
            const token = await getJwtToken();
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030';
            const response = await fetch(`${API_URL}/api/portfolio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    email: user.email,
                    asset_symbol: selectedAssetSymbol,
                    quantity: Number(amountInput)
                })
            });

            const result = await response.json();
            if (result.success) {
                await fetchPortfolio(); // DB'den güncel veri
                setAmountInput("");
                setSelectedAssetSymbol("");
            }
        } catch (error) {
            console.error("Portföy eklenirken hata:", error);
        }
    };

    // Varlık türüne göre silme işlemi
    const handleDeleteType = async (assetType: string) => {
        if (!user?.email) return;

        try {
            const token = await getJwtToken();
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030';
            const response = await fetch(`${API_URL}/api/portfolio/type?email=${user.email}&asset_type=${assetType}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
            });

            const result = await response.json();
            if (result.success) {
                await fetchPortfolio(); // API'den güncel veriyi çek ve UI'ı güncelle
            }
        } catch (error) {
            console.error("Varlıklar silinirken hata:", error);
        }
    };

    // Kartlar için hesaplamalar
    const getPrice = (symbol: string): number => {
        const asset = availableAssets.find(a => a.symbol === symbol);
        return asset?.price_try ?? 1; // price_try /api/prices'tan hâlâ geliyorsa
    };

    const totalPortfolioValue = portfolio.reduce((sum, item) =>
        sum + (getPrice(item.asset_symbol) * item.quantity), 0);

    const totalCash = portfolio
        .filter(i => i.asset_type === "cash")
        .reduce((sum, item) => sum + item.quantity, 0); // Nakit TL olduğu için quantity = TL

    const totalStocks = portfolio
        .filter(i => i.asset_type === "stock")
        .reduce((sum, item) => sum + (getPrice(item.asset_symbol) * item.quantity), 0);

    const totalCommodity = portfolio
        .filter(i => i.asset_type === "commodity")
        .reduce((sum, item) => sum + (getPrice(item.asset_symbol) * item.quantity), 0);
    // Not: Altın vs. commodity olarak geliyordu normalization servisinde.

    const handleListChart = () => {
        setActiveChartSymbol(tempChartSymbol);
        setActiveChartRange(tempChartRange);
    };

    return (
        <div className="flex h-screen w-full flex-col bg-zinc-100 p-15 gap-6 dark:bg-black font-sans">
            <header className="flex w-full justify-end px-2">
                <a href="/auth/logout" className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors">
                    Çıkış Yap
                </a>
            </header>

            <div className="flex flex-1 gap-6 min-h-0">
                {/* SOL MENÜ (Varlık Ekleme Formu) */}
                <aside className="w-64 h-full bg-white shadow-sm dark:bg-zinc-900 dark:border dark:border-zinc-800 p-5 flex flex-col gap-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Varlık Seç</label>
                        <select
                            value={selectedAssetSymbol}
                            onChange={(e) => setSelectedAssetSymbol(e.target.value)}
                            disabled={isLoadingAssets}
                            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100 disabled:opacity-50"
                        >
                            <option value="">
                                {isLoadingAssets ? "Yükleniyor..." : "Seçiniz..."}
                            </option>
                            {/* Manuel Nakit Seçeneği */}
                            {!isLoadingAssets && <option value="TRY">Nakit (TRY)</option>}

                            {/* API'den Gelen Varlıklar */}
                            {availableAssets.map((asset) => (
                                <option key={asset.symbol} value={asset.symbol}>
                                    {asset.name} ({asset.symbol})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            {selectedAssetSymbol === 'TRY' ? 'Tutar Gir (TL)' : availableAssets.find(a => a.symbol === selectedAssetSymbol)?.asset_type === 'commodity' ? 'Gram Gir' : 'Tutar / Adet Gir'}
                        </label>
                        <input
                            type="number"
                            value={amountInput}
                            onChange={(e) => setAmountInput(e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100"
                        />
                    </div>

                    <button
                        onClick={handleAddAsset}
                        disabled={!selectedAssetSymbol || !amountInput || Number(amountInput) <= 0}
                        className="mt-auto w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700 transition-colors"
                    >
                        Ekle
                    </button>
                    <div className="mt-4 flex flex-col gap-2 overflow-y-auto">
                        {portfolio.map((item) => (
                            <div key={item.asset_symbol} className="text-xs text-zinc-600 dark:text-zinc-400 flex justify-between">
                                <span>{item.asset_symbol}</span>
                                <span>{item.quantity} {item.asset_type === 'commodity' ? 'gram' : item.asset_type === 'cash' ? 'TL' : 'adet'}</span>
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="flex flex-1 flex-col gap-6">
                    {/* ÜST 4'LÜ KARTLAR */}
                    <div className="grid h-[25%] grid-cols-4 gap-4">
                        <div className="bg-white shadow-sm dark:bg-zinc-900 dark:border dark:border-zinc-800 p-5 flex flex-col justify-center">
                            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Toplam Varlık</span>
                            <span className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                                {totalPortfolioValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </span>
                        </div>

                        <div className="bg-white shadow-sm dark:bg-zinc-900 dark:border dark:border-zinc-800 p-5 flex flex-col justify-center group relative">
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Nakit (TRY)</span>
                                <button onClick={() => handleDeleteType('cash')} title="Nakit varlıklarını sil" className="text-zinc-400 hover:text-red-500 transition-all cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                </button>
                            </div>
                            <span className="text-xl font-bold text-zinc-900 dark:text-white mt-1">
                                {totalCash.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </span>
                        </div>

                        <div className="bg-white shadow-sm dark:bg-zinc-900 dark:border dark:border-zinc-800 p-5 flex flex-col justify-center group relative">
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Hisse Senedi</span>
                                <button onClick={() => handleDeleteType('stock')} title="Hisse senetlerini sil" className="text-zinc-400 hover:text-red-500 transition-all cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                </button>
                            </div>
                            <span className="text-xl font-bold text-zinc-900 dark:text-white mt-1">
                                {totalStocks.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </span>
                        </div>

                        <div className="bg-white shadow-sm dark:bg-zinc-900 dark:border dark:border-zinc-800 p-5 flex flex-col justify-center group relative">
                            {/* Kripto henüz bağlı olmadığı için Emtia/Altın olarak değiştirdik */}
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Meden (Altın)</span>
                                <button onClick={() => handleDeleteType('commodity')} title="Maden varlıklarını sil" className="text-zinc-400 hover:text-red-500 transition-all cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                </button>
                            </div>
                            <span className="text-xl font-bold text-zinc-900 dark:text-white mt-1">
                                {totalCommodity.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </span>
                        </div>
                    </div>

                    {/* ALT KISIM (Büyük Alan + Sağ İnce Kolon) */}
                    <div className="flex flex-1 gap-6">
                        {/* Orta Büyük Alan */}
                        <div className="flex-1 bg-white p-6 shadow-sm dark:bg-zinc-900 dark:border dark:border-zinc-800 flex flex-col">
                            <div className="mb-4">
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Varlık Performansı ({activeChartSymbol})</h2>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Son {activeChartRange === '1mo' ? '1 aylık' : activeChartRange === '6mo' ? '6 aylık' : '1 yıllık'} görünüm
                                </p>
                            </div>

                            {/* Grafik kapsayıcısı - height tam oturması için flex-1 */}
                            <div className="flex-1 w-full relative">
                                <ChartComponent symbol={activeChartSymbol} range={activeChartRange} />
                            </div>
                        </div>

                        {/* SAĞ İNCE Kolon */}
                        <div className="w-48 sm:w-64 bg-white shadow-sm dark:bg-zinc-900 dark:border dark:border-zinc-800 p-5 flex flex-col gap-6">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Öğe Seç</label>
                                <select
                                    value={tempChartSymbol}
                                    onChange={(e) => setTempChartSymbol(e.target.value)}
                                    disabled={isLoadingAssets}
                                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100"
                                >
                                    <option value="">Seçiniz...</option>
                                    {availableAssets.map((asset) => (
                                        <option key={asset.symbol} value={asset.symbol}>
                                            {asset.name} ({asset.symbol})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Süre Seç</label>
                                <div className="flex w-full rounded-md bg-zinc-100 p-1 dark:bg-zinc-800">
                                    <button
                                        onClick={() => setTempChartRange('1mo')}
                                        className={`flex-1 rounded py-1.5 text-xs font-medium transition-all ${tempChartRange === '1mo' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'}`}
                                    >
                                        Aylık
                                    </button>
                                    <button
                                        onClick={() => setTempChartRange('6mo')}
                                        className={`flex-1 rounded py-1.5 text-xs font-medium transition-all ${tempChartRange === '6mo' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'}`}
                                    >
                                        6 Aylık
                                    </button>
                                    <button
                                        onClick={() => setTempChartRange('1y')}
                                        className={`flex-1 rounded py-1.5 text-xs font-medium transition-all ${tempChartRange === '1y' ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'}`}
                                    >
                                        Yıllık
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleListChart}
                                disabled={!tempChartSymbol}
                                className="mt-auto w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700 transition-colors"
                            >
                                Listele
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}