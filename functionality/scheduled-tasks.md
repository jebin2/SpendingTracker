# Scheduled Tasks

Runs several background jobs automatically every day at noon, keeping your transactions clean and up to date without any manual effort.

---

## How to use it

Scheduled tasks run on their own — you do not need to do anything to enable them. Simply open the app at least once so the system can register your account for the daily schedule.

To view the status of each job or trigger one manually, go to **Settings**, then **Scheduled Tasks**.

---

## What runs automatically every day at 12:00 PM

1. **Email Import** — fetches new bank and payment emails from Gmail and adds any transactions found

2. **Duplicate Detection** — scans all transactions for entries that look like the same payment recorded twice

3. **Merge Retry** — retries any duplicate merges that failed the day before

4. **Analysis Retry** — retries any spending analyses or price comparisons that could not complete

---

## Running jobs manually

On the Scheduled Tasks page, each job has its own **Run** button. You can also tap **Run All Jobs Now** to run everything at once.

When a job is running, its row shows a spinner and the Run button is disabled until it finishes.

---

## Status indicators

A green dot next to the schedule means everything is set up and the daily jobs will run. An orange dot means the app has not been opened yet and the system cannot fire the jobs until you sign in once.

Each row also shows when that job last ran, displayed as a relative time (e.g. "3 hours ago").
