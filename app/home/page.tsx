"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ChartComponent from "../components/ChartComponent";
import { getJwtToken } from "../actions";

type Instrument = {
  id: string;
  symbol: string;
  name: string;
  price: string;
  changePercent: string;
  isPositive: boolean;
  category: string;
  description: string;
  group: string;
};

const FALLBACK_INSTRUMENTS: Instrument[] = [
  { id: "1", symbol: "THYAO", name: "Türk Hava Yolları", price: "312.50", changePercent: "+1.38%", isPositive: true, category: "Hisse", description: "Türkiye'nin ulusal havayolu şirketi. Dünya genelinde 340+ destinasyona uçuş sağlar.", group: "Hisseler" },
  { id: "2", symbol: "GARAN", name: "Garanti BBVA", price: "134.90", changePercent: "-0.81%", isPositive: false, category: "Bankacılık", description: "Türkiye'nin öncü özel bankalarından biri. BBVA iştiraki.", group: "Hisseler" },
  { id: "3", symbol: "EREGL", name: "Erdemir", price: "48.12", changePercent: "+0.45%", isPositive: true, category: "Hisse", description: "Türkiye'nin en büyük demir ve çelik üreticisi.", group: "Hisseler" },
  { id: "4", symbol: "AKBNK", name: "Akbank", price: "45.60", changePercent: "+2.15%", isPositive: true, category: "Bankacılık", description: "Türkiye'nin en değerli özel bankalarından biri.", group: "Hisseler" },
  { id: "5", symbol: "ASELS", name: "Aselsan", price: "89.45", changePercent: "+2.64%", isPositive: true, category: "Savunma", description: "Türkiye'nin önde gelen savunma elektronik şirketi.", group: "Hisseler" },
  { id: "6", symbol: "BIMAS", name: "BİM Birleşik Mağazalar", price: "365.25", changePercent: "-0.40%", isPositive: false, category: "Perakende", description: "Türkiye'nin en büyük perakende market zinciri.", group: "Hisseler" },
  { id: "7", symbol: "KCHOL", name: "Koç Holding", price: "192.40", changePercent: "+1.10%", isPositive: true, category: "Hisse", description: "Türkiye'nin en büyük sanayi ve hizmet grubunun çatı şirketi.", group: "Hisseler" },
  { id: "8", symbol: "SASA", name: "SASA Polyester", price: "45.20", changePercent: "-1.31%", isPositive: false, category: "Hisse", description: "Türkiye'nin önde gelen polyester üreticisi.", group: "Hisseler" },
  { id: "9", symbol: "BTC", name: "Bitcoin", price: "68,432", changePercent: "+3.12%", isPositive: true, category: "Kripto", description: "Piyasa değeri bakımından dünyanın en büyük kripto para birimi.", group: "Coinler" },
  { id: "10", symbol: "ETH", name: "Ethereum", price: "3,845", changePercent: "-0.85%", isPositive: false, category: "Kripto", description: "En popüler akıllı sözleşme platformu ve ikinci büyük kripto para.", group: "Coinler" },
  { id: "11", symbol: "USDTRY", name: "Dolar / TL", price: "32.45", changePercent: "+0.12%", isPositive: true, category: "Döviz", description: "Amerikan Doları / Türk Lirası paritesi.", group: "Döviz" },
  { id: "12", symbol: "XAUUSD", name: "Ons Altın", price: "2,358", changePercent: "+0.54%", isPositive: true, category: "Emtia", description: "Ons cinsinden altın spot piyasa fiyatı (USD).", group: "Emtia" },
];

const RANGES = [
  { label: "1 Gün", value: "1d" },
  { label: "5 Gün", value: "5d" },
  { label: "1 Ay", value: "1mo" },
  { label: "6 Ay", value: "6mo" },
  { label: "1 Yıl", value: "1y" },
];

export default function HomePage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [activeRange, setActiveRange] = useState<string>("1d");
  const [selected, setSelected] = useState<Instrument | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Hisseler", "Coinler", "Döviz", "Emtia"]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  const fetchChanges = async (currentInstruments: Instrument[], range: string) => {
    try {
      const token = await getJwtToken();
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030';

      currentInstruments.forEach(async (inst) => {
        try {
          const res = await fetch(`${API_URL}/api/chart?symbol=${inst.symbol}&range=${range}`, {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
          });
          const result = await res.json();
          if (result.success && result.data && result.data.length >= 2) {
            const data = result.data.filter((item: any) => item.close !== null).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            if (data.length >= 2) {
              const first = data[0].close;
              const last = data[data.length - 1].close;
              if (first > 0) {
                const pct = ((last - first) / first) * 100;
                setInstruments(prev => prev.map(p =>
                  p.id === inst.id
                    ? { ...p, changePercent: (pct > 0 ? "+" : "") + pct.toFixed(2) + "%", isPositive: pct >= 0 }
                    : p
                ));
              }
            }
          }
        } catch (e) {
          // Ignore individual errors to not block others
        }
      });
    } catch (e) {
      console.error("Grafik bilgileri cekilirken hata:", e);
    }
  };

  const handleRangeChange = (range: string) => {
    setActiveRange(range);
    setInstruments(prev => prev.map(p => ({ ...p, changePercent: "..." })));
    fetchChanges(instruments, range);
  };

  useEffect(() => {
    if (!isLoading && !user) router.push("/");
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!user?.email) return;

    const fetchAssetsData = async () => {
      setIsLoadingData(true);
      try {
        const token = await getJwtToken();
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.142:3030';
        const response = await fetch(`${API_URL}/api/assets`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
        const result = await response.json();

        let baseInstruments = FALLBACK_INSTRUMENTS;

        if (result.success && result.data) {
          baseInstruments = result.data.map((asset: any) => {
            let groupName = "Diğer";
            if (asset.asset_type === 'stock') groupName = "Hisseler";
            else if (asset.asset_type === 'crypto') groupName = "Coinler";
            else if (asset.asset_type === 'finance' || asset.asset_type === 'cash') groupName = "Döviz";
            else if (asset.asset_type === 'commodity') groupName = "Emtia";

            const isUsd = asset.asset_type === 'crypto' || (asset.symbol.includes('USD') && asset.symbol !== 'USDTRY');

            return {
              id: asset.symbol,
              symbol: asset.symbol,
              name: asset.name,
              price: isUsd
                ? (asset.price_usd ? asset.price_usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : "$0.00")
                : (asset.price_try ? asset.price_try.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) : "0.00"),
              changePercent: "...",
              isPositive: true,
              category: groupName,
              description: `Detaylı açıklama bulunmamaktadır.`,
              group: groupName
            };
          });
        }

        setInstruments(baseInstruments);
        if (baseInstruments.length > 0) setSelected(baseInstruments[0]);

        // Initial fetch for the active range (1d)
        fetchChanges(baseInstruments, activeRange);

      } catch (error) {
        console.error("Varlıklar çekilirken hata oluştu, test verisi kullanılıyor:", error);
        setInstruments(FALLBACK_INSTRUMENTS);
        if (FALLBACK_INSTRUMENTS.length > 0) setSelected(FALLBACK_INSTRUMENTS[0]);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchAssetsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const groupedInstruments = instruments.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, Instrument[]>);

  if (isLoading || isLoadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen max-md:h-auto max-md:min-h-screen bg-zinc-50 dark:bg-black font-sans overflow-hidden max-md:overflow-visible">
      <Navbar />

      <div className="flex flex-1 min-h-0 max-md:flex-col">

        <main className="flex-1 min-w-0 p-6 max-md:p-4 flex flex-col h-full max-md:h-auto overflow-hidden max-md:overflow-visible">
          <div className="bg-white p-6 shadow-sm dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col flex-1">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                {selected ? `${selected.name} Performansı` : "Piyasa Performansı"}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {selected ? `${selected.symbol} için son ${RANGES.find(r => r.value === activeRange)?.label.toLowerCase()}lik görünüm` : "Genel piyasa görünümü (Örnek Veri)"}
              </p>
            </div>

            <div className="w-full relative h-[460px] max-md:h-[300px]">
              <ChartComponent
                symbol={selected?.symbol}
                range={activeRange}
                isDummy={!selected}
                email={user.email || ''}
              />
            </div>
          </div>
          <div className="flex-1 w-full flex items-center justify-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-md:mt-4 max-md:flex-none max-md:flex-wrap max-md:min-h-[80px] max-md:gap-2 max-md:shrink-0 max-md:p-4">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => handleRangeChange(r.value)}
                className={`text-sm font-bold transition-all px-6 py-2 rounded-2xl border ${activeRange === r.value
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:border-zinc-200 dark:hover:border-zinc-800"
                  } max-md:px-3 max-md:py-1.5 max-md:text-xs max-md:rounded-xl`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </main>

        <aside
          className="flex-none flex flex-col border-l border-zinc-200 dark:border-zinc-800 w-[350px] h-full max-md:w-full max-md:h-auto max-md:border-t max-md:border-l-0"
        >
          <div className="flex flex-col border-b border-zinc-200 dark:border-zinc-800 flex-1 min-h-0 max-md:flex-none max-md:h-[400px] max-md:shrink-0">
            <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Ürünler</p>
            </div>
            <ul className="flex-1 overflow-y-auto overflow-x-hidden border-t border-zinc-200 dark:border-zinc-800 m-0 p-0 list-none">
              {Object.entries(groupedInstruments).map(([groupName, items]) => {
                const isExpanded = expandedGroups.includes(groupName);
                return (
                  <div key={groupName} className="flex flex-col">
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{groupName}</span>
                      <span className={`text-zinc-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}>
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </button>
                    {isExpanded && items.map(item => (
                      <li key={item.id} className="border-b border-zinc-200 dark:border-zinc-800">
                        <button
                          onClick={() => setSelected(item)}
                          className={`w-full flex items-center justify-between px-4 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors
                            ${selected?.id === item.id ? "bg-zinc-100 dark:bg-zinc-800" : ""}`}
                        >
                          <div className="flex flex-col min-w-0 overflow-hidden items-start ml-2">
                            <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">{item.symbol}</span>
                            <span className="text-[11px] text-zinc-400 truncate">{item.name}</span>
                          </div>
                          <div className="flex flex-col items-end ml-3 shrink-0">
                            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{item.price}</span>
                            <span className={`text-[11px] font-medium ${item.isPositive ? "text-emerald-500" : "text-red-500"}`}>
                              {item.changePercent}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </div>
                );
              })}
            </ul>
          </div>

          <div className="flex flex-col flex-1 min-h-0 max-md:flex-none max-md:h-[300px] max-md:shrink-0 max-md:mb-8">
            <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Detay</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selected ? (
                <div className="p-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase mb-1">{selected.category}</p>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white mb-1">{selected.name}</p>
                  <p className="text-[11px] font-mono text-zinc-400 mb-3">{selected.symbol}</p>
                  <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">{selected.description}</p>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs text-zinc-400">Bir ürün seçin</p>
                </div>
              )}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
}
