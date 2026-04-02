"""Tests for currency formatting utilities."""

import pytest
from decimal import Decimal

from snowball.utils.formatting import format_currency


def test_format_currency_basic():
    """Test basic currency formatting with KRW."""
    # Given
    amount = Decimal("1000")

    # When
    result = format_currency(amount)

    # Then
    assert result == "1,000원"


def test_format_currency_with_commas():
    """Test thousand separator formatting."""
    # Given
    amount = Decimal("1000000")

    # When
    result = format_currency(amount)

    # Then
    assert result == "1,000,000원"


def test_format_currency_rounding():
    """Test decimal rounding to integer (원 단위)."""
    # Given
    amount_up = Decimal("15000.50")
    amount_down = Decimal("15000.49")

    # When
    result_up = format_currency(amount_up)
    result_down = format_currency(amount_down)

    # Then
    assert result_up == "15,001원"  # 반올림 올림
    assert result_down == "15,000원"  # 반올림 내림


def test_format_currency_usd():
    """Test USD currency formatting."""
    # Given
    amount = Decimal("1000")

    # When
    result = format_currency(amount, "USD")

    # Then
    assert result == "$1,000"


def test_format_currency_negative():
    """Test negative amount formatting."""
    # Given
    amount = Decimal("-5000")

    # When
    result = format_currency(amount)

    # Then
    assert result == "-5,000원"


def test_format_currency_zero():
    """Test zero amount formatting."""
    # Given
    amount = Decimal("0")

    # When
    result = format_currency(amount)

    # Then
    assert result == "0원"


def test_format_currency_large_number():
    """Test very large number (>100M) formatting."""
    # Given
    amount = Decimal("123456789")

    # When
    result = format_currency(amount)

    # Then
    assert result == "123,456,789원"


def test_format_currency_decimal_input():
    """Test that Decimal input is properly handled."""
    # Given
    amount = Decimal("9999.99")

    # When
    result = format_currency(amount)

    # Then
    assert result == "10,000원"  # 반올림


def test_format_currency_negative_usd():
    """Test negative USD amount has sign before dollar symbol."""
    # Given
    amount = Decimal("-5000")

    # When
    result = format_currency(amount, "USD")

    # Then
    assert result == "-$5,000"


def test_format_currency_usd_lowercase():
    """Test lowercase currency code is accepted."""
    # Given
    amount = Decimal("1000")

    # When
    result = format_currency(amount, "usd")

    # Then
    assert result == "$1,000"


def test_format_currency_unsupported_currency_raises():
    """Test unsupported currency code raises ValueError."""
    # Given
    amount = Decimal("1000")

    # When / Then
    with pytest.raises(ValueError, match="Unsupported currency: EUR"):
        format_currency(amount, "EUR")
