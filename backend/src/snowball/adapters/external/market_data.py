import os
import ssl
import certifi
import requests
import httpx
from bs4 import BeautifulSoup
import FinanceDataReader as fdr  # type: ignore
from typing import List, Optional
from ...domain.ports import MarketDataProvider

_NAVER_AC_URL = "https://ac.stock.naver.com/ac"
# target=stock is required; without it the API returns an empty items list.
_NAVER_AC_PARAMS = {"target": "stock"}
_NAVER_AC_HEADERS = {"User-Agent": "Mozilla/5.0"}
_NAVER_AC_TIMEOUT = int(os.environ.get("NAVER_AC_TIMEOUT", "3"))
_SEARCH_RESULT_LIMIT = int(os.environ.get("SEARCH_RESULT_LIMIT", "10"))
# Build the SSL context once from certifi's CA bundle. httpx 0.28 deprecates
# verify=<str path>, and the system CA path may be missing in some environments
# (FileNotFoundError → 500), so we pin verification to the bundled CA here.
_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())


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

        # 국내주식(숫자코드): Naver Finance에서 실시간 현재가 조회
        if code.isdigit():
            data = self.scrape_naver_finance(code)
            if data and data.get('price'):
                return data['price']

        # 해외주식: FinanceDataReader (종가)
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

    async def search_by_name(self, query: str) -> List[dict]:
        params = {**_NAVER_AC_PARAMS, "q": query}
        async with httpx.AsyncClient(timeout=_NAVER_AC_TIMEOUT, verify=_SSL_CONTEXT) as client:
            res = await client.get(_NAVER_AC_URL, params=params, headers=_NAVER_AC_HEADERS)
        res.raise_for_status()
        try:
            payload = res.json()
        except ValueError:
            # 200 OK with a non-JSON body (throttle/captcha HTML) → no results.
            return []
        items = payload.get("items", []) if isinstance(payload, dict) else []
        # Naver stock AC item: {"code", "name", "typeName" (코스피/코스닥), ...}.
        # Defensively skip malformed items so one bad entry can't 500 the whole search.
        results: List[dict] = []
        for item in items[:_SEARCH_RESULT_LIMIT]:
            if not isinstance(item, dict):
                continue
            code = item.get("code")
            name = item.get("name")
            if code and name:
                results.append({"name": name, "code": code, "market": item.get("typeName", "")})
        return results
