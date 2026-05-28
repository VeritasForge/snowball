"""Domain enums.

AssetCategory: 자산 분류. magic string 사용 금지 — 항상 이 enum 참조.

Members are sourced from the actual values present in the codebase
prior to migration: 주식 / 채권 / 원자재 / 현금 / 기타. A2.1 audit
(USER-ACTION) may surface additional values from prod; if so, add
them here before the A3.10 CHECK constraint migration ships.
"""
from enum import StrEnum


class AssetCategory(StrEnum):
    STOCK         = "주식"
    FOREIGN_STOCK = "해외주식"  # observed in tests/integration/test_repositories.py
    BOND          = "채권"
    COMMODITY     = "원자재"
    CASH          = "현금"
    OTHER         = "기타"
