"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, AreaSeries } from "lightweight-charts";
import { getJwtToken } from "../actions";

interface ChartComponentProps {
    symbol: string;
    range: string;
}

export default function ChartComponent({ symbol, range }: ChartComponentProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);

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

        const lineSeries = chart.addSeries(AreaSeries, {
            lineColor: "#3b82f6", // blue-500
            topColor: "rgba(59, 130, 246, 0.15)", // blue tint
            bottomColor: "rgba(59, 130, 246, 0.0)",
            lineWidth: 2,
        });

        chartRef.current = chart;
        seriesRef.current = lineSeries;

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
        const fetchData = async () => {
            try {
                const token = await getJwtToken();
                // Node.js Express API rotasına istek atıyoruz
                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030';
                const response = await fetch(`${API_URL}/api/chart?symbol=${symbol}&range=${range}`, {
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
                });
                const result = await response.json();

                if (result.success && result.data && Array.isArray(result.data)) {
                    const formattedData = result.data
                        .filter((item: any) => item.close !== null && item.close !== undefined)
                        .map((item: any) => {
                            const timeObj = item.date ? new Date(item.date) : new Date();
                            return {
                                time: Math.floor(timeObj.getTime() / 1000),
                                value: parseFloat(item.close.toFixed(2)),
                            };
                        })
                        .sort((a: any, b: any) => a.time - b.time);

                    // Tekrarlanan zaman damgalarını filtreleme
                    const uniqueData = formattedData.filter((v: any, i: number, a: any[]) =>
                        a.findIndex(t => t.time === v.time) === i
                    );

                    if (seriesRef.current && uniqueData.length > 0) {
                        seriesRef.current.setData(uniqueData);
                        chartRef.current?.timeScale().fitContent();
                    }
                }
            } catch (error) {
                console.error("Grafik verisi çekilirken hata oluştu:", error);
            }
        };

        fetchData();
    }, [symbol, range]); // Sembol veya zaman aralığı değiştiğinde yenile

    return <div ref={chartContainerRef} className="w-full h-full" />;
}