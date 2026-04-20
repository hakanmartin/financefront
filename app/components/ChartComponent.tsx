"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, AreaSeries, LineSeries, Time, IChartApi, ISeriesApi } from "lightweight-charts";
import { getJwtToken } from "../actions";

interface ChartComponentProps {
    symbol?: string;
    range?: string;
    isDummy?: boolean;
    email?: string;
}

const COLORS = [
    "#3b82f6", // blue-500
    "#10b981", // emerald-500
    "#f43f5e", // rose-500
    "#8b5cf6", // violet-500
    "#f59e0b", // amber-500
    "#0ea5e9", // sky-500
    "#d946ef", // fuchsia-500
    "#14b8a6", // teal-500
];

export default function ChartComponent({ symbol, range, isDummy = false, email }: ChartComponentProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRefs = useRef<ISeriesApi<"Area" | "Line">[]>([]);
    
    // For Custom Legend
    const [legendColors, setLegendColors] = useState<{ symbol: string; color: string; lastValue: number }[]>([]);

    // 1. Grafiğin iskeletini oluşturma (Sadece bir kere çalışır)
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const isDarkTheme = document.documentElement.classList.contains("dark") ||
            window.matchMedia("(prefers-color-scheme: dark)").matches;

        const textColor = isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "#52525b";
        const gridColor = isDarkTheme ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: textColor,
                attributionLogo: false,
            },
            grid: {
                vertLines: { color: gridColor },
                horzLines: { color: gridColor },
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            rightPriceScale: { borderVisible: false },
            timeScale: { borderVisible: false, timeVisible: true },
            handleScroll: false,
            handleScale: false,
        });

        chartRef.current = chart;

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, []);

    // 2. Veriyi çekip grafiğe aktarma (symbol veya range değiştiğinde çalışır)
    useEffect(() => {
        if (!chartRef.current || isDummy || !symbol || !range) return;

        // Eski serileri temizle
        seriesRefs.current.forEach(s => {
            if (s && chartRef.current) {
                try {
                    chartRef.current.removeSeries(s);
                } catch (e) {
                    console.warn("Seri silinirken uyari:", e);
                }
            }
        });
        seriesRefs.current = [];
        setLegendColors([]);

        let isCancelled = false;
        const chart = chartRef.current;

        const fetchData = async () => {
            try {
                const token = await getJwtToken();
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.142:3030';
                
                let endpoint = '';
                if (symbol === 'NORMALIZE') {
                    endpoint = `${API_URL}/api/chart/portfolio/normalize?email=${email}&range=${range}`;
                    
                    chart.applyOptions({
                        rightPriceScale: {
                            mode: 0,
                        },
                        localization: {
                            priceFormatter: (p: number) => p.toFixed(2) + '%',
                        }
                    });

                } else if (symbol === 'PORTFOLIO') {
                    endpoint = `${API_URL}/api/chart/portfolio?email=${email}&range=${range}`;
                    chart.applyOptions({ rightPriceScale: { mode: 0 }, localization: { priceFormatter: (p: number) => p.toFixed(2) } });
                } else {
                    endpoint = `${API_URL}/api/chart?symbol=${symbol}&range=${range}`;
                    chart.applyOptions({ rightPriceScale: { mode: 0 }, localization: { priceFormatter: (p: number) => p.toFixed(2) } });
                }

                const response = await fetch(endpoint, {
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
                });
                
                if (isCancelled) return;
                
                const result = await response.json();

                if (!result.success || !result.data) return;

                if (symbol === 'NORMALIZE') {
                    // Normalize Array Format: [{symbol: 'X', quotes: [{date, close}]}]
                    const colorsLegend: { symbol: string; color: string; lastValue: number }[] = [];
                    
                    (result.data as any[]).forEach((item, index) => {
                        const colorStr = COLORS[index % COLORS.length];
                        const lineSeries = chart.addSeries(LineSeries, {
                            color: colorStr,
                            lineWidth: 2,
                            priceFormat: {
                                type: 'custom',
                                formatter: (price: number) => price.toFixed(2) + '%',
                            }
                        });
                        seriesRefs.current.push(lineSeries);

                        const formattedData = formatQuotes(item.quotes);
                        
                        if (formattedData.length > 0) {
                            lineSeries.setData(formattedData);
                            colorsLegend.push({
                                symbol: item.symbol,
                                color: colorStr,
                                lastValue: formattedData[formattedData.length - 1].value
                            });
                        }
                    });

                    setLegendColors(colorsLegend);
                    chart.timeScale().fitContent();

                } else {
                    // Single Area Format
                    const areaSeries = chart.addSeries(AreaSeries, {
                        lineColor: "#3b82f6", // blue-500
                        topColor: "rgba(59, 130, 246, 0.15)", // blue tint
                        bottomColor: "rgba(59, 130, 246, 0.0)",
                        lineWidth: 2,
                    });
                    seriesRefs.current.push(areaSeries);

                    const formattedData = formatQuotes(result.data);
                    if (formattedData.length > 0) {
                        areaSeries.setData(formattedData);
                        chart.timeScale().fitContent();
                    }
                }

            } catch (error) {
                console.error("Grafik verisi çekilirken hata oluştu:", error);
            }
        };

        const formatQuotes = (quotesArray: any[]) => {
            const formatted = quotesArray
                .filter((item: any) => item.close !== null && item.close !== undefined)
                .map((item: any) => {
                    const timeObj = item.date ? new Date(item.date) : new Date();
                    // Zaman damgasında saati yoksayıp standartlaştırmalıyız ki x ekseninde üst üste sinsin
                    // time Obj'i utc'ye göre 00:00:00 alırsak hafif kayma olmaz
                    timeObj.setUTCHours(0, 0, 0, 0);

                    return {
                        time: Math.floor(timeObj.getTime() / 1000) as Time,
                        value: parseFloat(item.close.toFixed(2)),
                    };
                })
                .sort((a: any, b: any) => (a.time as number) - (b.time as number));

            return formatted.filter((v: any, i: number, a: any[]) =>
                a.findIndex(t => t.time === v.time) === i
            );
        };

        fetchData();
        
        return () => {
            isCancelled = true;
        };
    }, [symbol, range, isDummy]); // Sembol veya zaman aralığı değiştiğinde yenile

    return (
        <div className="w-full h-full relative" style={{ minHeight: '300px' }}>
            {symbol === 'NORMALIZE' && legendColors.length > 0 && (
                <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-2 pr-2" style={{ maxWidth: '80%' }}>
                    {legendColors.map((l) => (
                        <div key={l.symbol} className="flex items-center gap-1.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-2 py-1 rounded shadow-sm border border-zinc-200 dark:border-zinc-800 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }}></span>
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{l.symbol}</span>
                            <span className={`font-mono ${l.lastValue >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {l.lastValue > 0 ? '+' : ''}{l.lastValue.toFixed(2)}%
                            </span>
                        </div>
                    ))}
                </div>
            )}
            <div ref={chartContainerRef} className="w-full h-full absolute inset-0 pt-8" />
        </div>
    );
}