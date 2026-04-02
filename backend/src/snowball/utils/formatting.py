"""Currency formatting utilities."""

from decimal import Decimal, ROUND_HALF_UP

_SUPPORTED_CURRENCIES = ("KRW", "USD")


def format_currency(amount: Decimal, currency: str = "KRW") -> str:
    """
    Format a decimal amount as currency with thousand separators.

    Rounds to integer (원 단위) and adds appropriate currency symbol.

    Args:
        amount: The amount to format (supports Decimal for precision)
        currency: Currency code ("KRW" or "USD", case-insensitive, default: "KRW")

    Returns:
        Formatted currency string with thousand separators and symbol

    Raises:
        ValueError: If currency code is not supported

    Examples:
        >>> format_currency(Decimal("1000000"))
        '1,000,000원'
        >>> format_currency(Decimal("15000.50"))
        '15,001원'
        >>> format_currency(Decimal("1000"), "USD")
        '$1,000'
        >>> format_currency(Decimal("-5000"), "USD")
        '-$5,000'
        >>> format_currency(Decimal("-5000"))
        '-5,000원'

    """
    currency = currency.upper()
    if currency not in _SUPPORTED_CURRENCIES:
        raise ValueError(f"Unsupported currency: {currency}")

    # Round to integer (원 단위)
    rounded = amount.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    amount_int = int(rounded)

    # Format absolute value with thousand separators, prepend sign
    sign = "-" if amount_int < 0 else ""
    abs_formatted = f"{abs(amount_int):,}"

    if currency == "USD":
        return f"{sign}${abs_formatted}"
    else:  # KRW
        return f"{sign}{abs_formatted}원"
