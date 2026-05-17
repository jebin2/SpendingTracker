# Scheduled Tasks

Runs several background jobs automatically every day at 12:00 PM, keeping your transactions clean, deduplicated, and analysed without any manual effort.

---

## How to use it

Scheduled tasks run on their own — you do not need to do anything to enable them. Simply open the app at least once so the system can register your account for the daily schedule.

To view the status of each job or trigger one manually, go to **Settings → Scheduled Tasks**.

---

## What runs automatically every day at 12:00 PM IST

Jobs run one after the other in this order:

1. **Email Import** — fetches new bank and payment emails from Gmail and adds any transactions found

2. **Duplicate Detection** — scans all transactions for entries that look like the same payment recorded twice

3. **Merge Retry** — retries any duplicate merges that failed previously

4. **Spending Analysis** — generates fresh AI insights for the last 7 days, this month, and this year — all three in sequence

5. **Comparison Retry** — retries any merchant price comparisons that could not complete

---

## Running jobs manually

On the Scheduled Tasks page, each job has its own **Run** button:
- **Email Import** — fetches emails immediately
- **Duplicate Detection** — runs a fresh duplicate scan
- **Spending Analysis** — regenerates insights for all three periods

Tap **Run All Jobs Now** to run everything in the same order as the daily schedule.

When a job is running, its row shows a spinner and the Run button is disabled — this is true whether the job was triggered manually or by the daily schedule.

---

## Status indicators

A green dot means the app is registered and daily jobs will run. An orange dot means you need to open the app once to register.

Each row shows when that job last ran (e.g. "3 hours ago"). The Analysis row shows the most recent run time across all three periods.
