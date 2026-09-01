"""RBI bank holidays 2026 as Python data (so every bundler ships it).

RBI holiday matrix under the Negotiable Instruments Act, 1881 (via indiabonds.com/kuchbhi/rbi-holiday-list-2026, captured 2 Sep 2026)

RBI publishes a city-wise matrix, not one national list. 'nationwide' entries are closures observed by RBI offices across India; 'state' entries vary by state and are opt-in via SettlementCalendar(include_state_holidays=True). Weekends are handled by policy, not listed here.
"""

from __future__ import annotations

HOLIDAYS_2026: tuple[tuple[str, str, str], ...] = (
    ("2026-01-15", "Makara Sankranti / Pongal / Uttarayana Punyakala", "state"),
    ("2026-01-26", "Republic Day", "nationwide"),
    ("2026-02-19", "Chhatrapati Shivaji Maharaj Jayanti", "state"),
    ("2026-03-03", "Holi (second day)", "nationwide"),
    ("2026-03-19", "Gudhi Padwa / Ugadi / Telugu New Year / 1st Navratra", "state"),
    ("2026-03-21", "Ramzan-Id (Id-ul-Fitr)", "nationwide"),
    ("2026-03-26", "Shree Ram Navami", "nationwide"),
    ("2026-03-31", "Mahavir Jayanti", "nationwide"),
    ("2026-04-01", "Bank year-end account closure", "nationwide"),
    ("2026-04-03", "Good Friday", "nationwide"),
    ("2026-04-14", "Dr. Ambedkar Jayanti / Baisakhi / Tamil New Year / Bohag Bihu", "state"),
    ("2026-05-01", "Maharashtra Day / May Day", "state"),
    ("2026-05-28", "Bakri Id", "nationwide"),
    ("2026-06-26", "Muharram", "nationwide"),
    ("2026-08-15", "Independence Day", "nationwide"),
    ("2026-08-26", "Id-e-Milad", "nationwide"),
    ("2026-09-14", "Ganesh Chaturthi", "state"),
    ("2026-10-02", "Mahatma Gandhi Jayanti", "nationwide"),
    ("2026-10-20", "Dussehra", "nationwide"),
    ("2026-11-10", "Diwali", "nationwide"),
    ("2026-11-24", "Guru Nanak Jayanti", "nationwide"),
    ("2026-12-25", "Christmas", "nationwide"),
)
