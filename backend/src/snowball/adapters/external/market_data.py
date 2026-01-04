import requests
from bs4 import BeautifulSoup
import FinanceDataReader as fdr
from typing import Optional
from ...domain.ports import MarketDataProvider

class RealMarketDataProvider(MarketDataProvider):
    def scrape_naver_finance(self, code: str) -> Optional[dict]:
        """
        Scrape Name and Price from Naver Finance for KRX stocks.
        """
        try:
            url = f"https://finance.naver.com/item/main.naver?code={code}"
            headers = {"User-Agent": "Mozilla/5.0"}
            res = requests.get(url, headers=headers)
            if res.status_code != 200:
                return None
                
            soup = BeautifulSoup(res.text, "lxml")
            
            # 1. Get Name
            name_tag = soup.select_one(".wrap_company h2 a")
            name = name_tag.text.strip() if name_tag else None
            
            # 2. Get Price
            price_tag = soup.select_one(".no_today .blind")
            price_str = price_tag.text.replace(",", "").strip() if price_tag else "0"
            price = float(price_str)
            
            if name and price > 0:
                return {"name": name, "price": price}
            return None
        except Exception as e:
            print(f"Naver scraping failed: {e}")
            return None

    def fetch_price(self, code: str) -> Optional[float]:
        if not code:
            return None
        try:
            df = fdr.DataReader(code)
            if df is None or df.empty:
                return None
            latest_close = df.iloc[-1]['Close']
            return float(latest_close)
        except Exception as e:
            print(f"Failed to fetch price for {code}: {e}")
            return None

    def fetch_asset_info(self, code: str) -> Optional[dict]:
        # Strategy 1: If numeric, try Naver Finance (KRX)
        if code.isdigit():
            data = self.scrape_naver_finance(code)
            if data: 
                return data
            
        # Strategy 2: Use FinanceDataReader (US/KRX Fallback)
        try:
            df = fdr.DataReader(code)
            if df is not None and not df.empty:
                latest_close = float(df.iloc[-1]['Close'])
                name = code.upper() # FDR doesn't return name easily
                return {"name": name, "price": latest_close}
        except:
            pass
            
        return None
