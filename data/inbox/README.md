# Inbox

Drop new figures here as a JSON array of observations (same shape as `data/ledger/*.json`).
The next scheduled run validates them and publishes them. Invalid files stop the run and the previous dataset stays live.

Example — Ramayana Day 11 India net from Sacnilk:

```json
[
  {
    "id": "ramayana-inbox-day11-sacnilk",
    "film": "ramayana",
    "metric": "net",
    "territory": "IN",
    "period": { "type": "day", "date": "2026-11-15", "day": 11 },
    "amount": 80.25,
    "unit": "INR_CR",
    "source": "sacnilk",
    "url": "https://www.sacnilk.com/quicknews/ramayana_part_1_2026_Box_Office_Collection_Day_11",
    "retrievedAt": "2026-11-16T03:00:00Z",
    "status": "estimated"
  }
]
```

To correct a figure, edit the existing row (keep its `id`); the change is logged as a revision.
