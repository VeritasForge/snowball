def infer_category(name: str, code: str) -> str:
    """
    Infer asset category based on name and code keywords.
    """
    name_upper = name.upper()
    
    # Keywords for Bonds (채권)
    bond_keywords = [
        "채권", "국고채", "단기채", "중기채", "회사채", "전단채", "국채", "미국채",
        "BOND", "TREASURY", "TIPS", "TLT", "IEF", "SHY", "BND", "AGG", "JNK", "HYG"
    ]
    if any(k in name_upper for k in bond_keywords):
        return "Bond"
        
    # Keywords for Commodities (원자재)
    raw_keywords = [
        "골드", "금선물", "은선물", "구리", "원유", "콩", "옥수수", "농산물",
        "GOLD", "SILVER", "OIL", "COMMODITY", "GLD", "IAU", "SLV", "DBC", "PDBC", "USO"
    ]
    if any(k in name_upper for k in raw_keywords):
        return "Commodity"
    
    # Keywords for Cash (현금) - e.g. Dollar ETF
    cash_keywords = ["달러선물", "USDOLLAR", "SHV", "BIL"]
    if any(k in name_upper for k in cash_keywords):
        return "Cash"

    # Default to Stock
    return "Stock"
