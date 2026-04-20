"use client";

import { useState, useEffect } from "react";
import ChartComponent from "../components/ChartComponent";
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from "next/navigation";
import { syncUserAction } from "@/app/actions";
import { getJwtToken } from "../actions";
import Navbar from "../components/Navbar";

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
    const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);

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
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.142:3030';
            const response = await fetch(`${API_URL}/api/portfolio?email=${user.email}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
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
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.142:3030';
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
                    quantity: Number(amountInput),
                    purchase_date: purchaseDate
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
        <div className="flex h-screen w-full flex-col bg-zinc-100 dark:bg-black font-sans max-md:h-auto max-md:overflow-visible overflow-hidden">
            <Navbar />

            <div className="flex flex-1 gap-6 px-6 pb-6 pt-6 max-md:flex-col max-md:p-4 overflow-hidden">
                {/* SOL MENÜ (Varlık Ekleme Formu) */}
                <aside className="w-64 h-full bg-white shadow-sm dark:bg-zinc-900 dark:border dark:border-zinc-800 p-5 flex flex-col gap-6 max-md:w-full max-md:h-auto max-md:p-4">
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
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Tarih Seç</label>
                        <input
                            type="date"
                            value={purchaseDate}
                            onChange={(e) => setPurchaseDate(e.target.value)}
                            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100"
                        />
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
                    <div className="mt-4 flex flex-col gap-2 overflow-y-auto max-md:max-h-60">
                        {portfolio.map((item) => (
                            <div key={item.asset_symbol} className="text-xs text-zinc-600 dark:text-zinc-400 flex justify-between">
                                <span>{item.asset_symbol}</span>
                                <span>{item.quantity} {item.asset_type === 'commodity' ? 'gram' : item.asset_type === 'cash' ? 'TL' : 'adet'}</span>
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="flex flex-1 flex-col gap-6 max-md:w-full overflow-y-auto pr-2 custom-scrollbar">
                    {/* ÜST 4'LÜ KARTLAR */}
                    <div className="grid h-[25%] grid-cols-4 gap-4 max-md:h-auto max-md:grid-cols-2">
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
                                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Maden (Altın)</span>
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
                    <div className="flex flex-none gap-6 max-md:flex-col h-[75%] min-h-[600px] max-md:h-auto">
                        {/* Orta Büyük Alan */}
                        <div className="flex-1 bg-white p-6 shadow-sm dark:bg-zinc-900 dark:border dark:border-zinc-800 flex flex-col max-md:p-4">
                            <div className="mb-4">
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                                    {activeChartSymbol === 'PORTFOLIO' ? 'Toplam Portföy Performansı' : activeChartSymbol === 'NORMALIZE' ? 'Karşılaştırmalı Performans (Normalize)' : `Varlık Performansı (${activeChartSymbol})`}
                                </h2>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Son {activeChartRange === '1mo' ? '1 aylık' : activeChartRange === '6mo' ? '6 aylık' : '1 yıllık'} görünüm
                                </p>
                            </div>

                            {/* Grafik kapsayıcısı - height tam oturması için flex-1 */}
                            <div className="flex-1 w-full relative max-md:min-h-[300px]">
                                <ChartComponent symbol={activeChartSymbol} range={activeChartRange} email={user?.email || ''} />
                            </div>
                        </div>

                        {/* SAĞ İNCE Kolon */}
                        <div className="w-48 sm:w-64 bg-white shadow-sm dark:bg-zinc-900 dark:border dark:border-zinc-800 p-5 flex flex-col gap-6 max-md:w-full max-md:p-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Öğe Seç</label>
                                <select
                                    value={tempChartSymbol}
                                    onChange={(e) => setTempChartSymbol(e.target.value)}
                                    disabled={isLoadingAssets}
                                    className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100"
                                >
                                    <option value="">Seçiniz...</option>
                                    <option value="PORTFOLIO">Toplam Varlıklar</option>
                                    <option value="NORMALIZE">Karşılaştırmalı (Normalize)</option>
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

                    {/* YENİ EKLENEN KISIM: BİREYSEL VARLIK DETAYLARI VE KÂR/ZARAR TABLOSU */}
                    <div className="bg-white shadow-sm dark:bg-zinc-900 dark:border dark:border-zinc-800 p-6 flex flex-col flex-shrink-0 mb-4 max-md:p-4">
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                            Bireysel Varlık Performansı
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                                <thead className="text-zinc-500 dark:text-zinc-500 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="pb-3 font-medium">Varlık</th>
                                        <th className="pb-3 font-medium text-right">Miktar</th>
                                        <th className="pb-3 font-medium text-right">Alış Maliyeti</th>
                                        <th className="pb-3 font-medium text-right">Güncel Fiyat</th>
                                        <th className="pb-3 font-medium text-right">Toplam Değer</th>
                                        <th className="pb-3 font-medium text-right">Kâr / Zarar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {portfolio.filter(p => p.asset_type !== 'cash').length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-zinc-500">
                                                Henüz analiz edilecek bir hisse veya emtia bulunmuyor.
                                            </td>
                                        </tr>
                                    ) : (
                                        portfolio.filter(p => p.asset_type !== 'cash').map((item) => {
                                            const currentPrice = getPrice(item.asset_symbol);
                                            // Eğer veri tabanında eski kayıt varsa ve priceAtAdd yoksa güncel fiyatı baz al ki hata vermesin
                                            const costPrice = item.priceAtAdd || currentPrice;
                                            const totalValue = currentPrice * item.quantity;
                                            const totalCost = costPrice * item.quantity;

                                            const profitLoss = totalValue - totalCost;
                                            // Sıfıra bölünme hatasını engellemek için kontrol
                                            const profitLossPercent = costPrice > 0 ? ((currentPrice - costPrice) / costPrice) * 100 : 0;
                                            const isProfit = profitLoss >= 0;

                                            return (
                                                <tr key={item.id} className="border-t border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                                                    <td className="py-4">
                                                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{item.asset_symbol}</div>
                                                        <div className="text-xs text-zinc-500">{item.name || item.asset_type}</div>
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        {item.quantity} <span className="text-xs">{item.asset_type === 'commodity' ? 'gr' : 'adet'}</span>
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        {costPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                    </td>
                                                    <td className="py-4 text-right font-medium text-zinc-900 dark:text-zinc-200">
                                                        {currentPrice.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                    </td>
                                                    <td className="py-4 text-right font-bold text-zinc-900 dark:text-white">
                                                        {totalValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <div className={`inline-flex flex-col items-end ${isProfit ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                                            <span className="font-bold flex items-center gap-1">
                                                                {isProfit ? (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                                                                ) : (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline><polyline points="16 17 22 17 22 11"></polyline></svg>
                                                                )}
                                                                {isProfit ? '+' : ''}{profitLoss.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                            </span>
                                                            <span className="text-xs opacity-90 bg-current/10 px-1.5 py-0.5 rounded mt-1">
                                                                {isProfit ? '+' : ''}{profitLossPercent.toFixed(2)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}