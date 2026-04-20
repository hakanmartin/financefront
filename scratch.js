import YahooFinance from 'yahoo-finance2';
(async () => {
    try {
        const symbol = 'THYAO.IS';
        const dateStr = '2023-01-10T00:00:00Z';
        const dateObj = new Date(dateStr);
        const period1 = new Date(dateObj.getTime() - 2 * 24 * 60 * 60 * 1000);
        const period2 = new Date(dateObj.getTime() + 2 * 24 * 60 * 60 * 1000);
        
        const result = await YahooFinance.historical(symbol, {
            period1: period1,
            period2: period2,
            interval: '1d'
        });
        console.log("Result:", result);
    } catch(e) { console.error(e) }
})();
