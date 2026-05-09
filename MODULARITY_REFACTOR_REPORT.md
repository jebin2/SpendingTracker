# SpendingTracker Modularity and Coupling Report

Date: 2026-05-09

## Executive Summary

The codebase already has some useful separation: Google Sheets access lives under `src/lib/sheets`, AI adapters live under `src/lib/ai`, offline persistence lives under `src/lib/offline`, and reusable UI exists under `src/components`. However, the application is not yet consistently modular. The largest issues are feature-heavy page files, business workflows embedded directly in route handlers, API route types imported by client UI, repeated utility logic, and a broad global Zustand store.

The highest-impact refactor is to move toward feature modules with thin Next route/page adapters. Route handlers should validate/authenticate and delegate to services. Pages should compose hooks and components. Shared contracts should live outside `src/app/api`. Formatting, date range, API client, cache, and session helpers should be centralized.

## Current Structure Observed

Primary folders:

```text
src/app                Next App Router pages and route handlers
src/components         Shared and feature-ish UI components
src/hooks              Client hooks
src/lib/ai             AI provider/use-case helpers
src/lib/sheets         Google Sheets/Drive persistence helpers
src/lib/offline        IndexedDB queue and sync helpers
src/store              Global Zustand store
src/types              Domain types
```

Large files by line count:

| File | Lines | Concern |
| --- | ---: | --- |
| `src/app/(app)/transactions/page.tsx` | 574 | God component: data loading, polling, filtering, suggestions, duplicate handling, modal UI |
| `src/app/(app)/capture/page.tsx` | 383 | Paste flow, camera flow, upload flow, confirmation form, UI states |
| `src/app/onboarding/page.tsx` | 347 | Multi-step workflow and UI in one file |
| `src/app/(app)/transactions/[id]/page.tsx` | 319 | Detail view, edit workflow, delete/retry logic, receipt UI |
| `src/app/(app)/add/page.tsx` | 244 | Manual transaction form state, validation, persistence, custom numpad UI |
| `src/app/api/items/normalize/route.ts` | 173 | Long-running normalization workflow inside route handler |
| `src/app/api/analyze/route.ts` | 153 | Cache/date/background-job logic inside route handler |

## Key Findings

### 1. `transactions/page.tsx` Is a God Component

`src/app/(app)/transactions/page.tsx` owns too many responsibilities:

- Suggestion loading and normalization trigger: lines 51-77
- Suggestion accept/reject mutation: lines 79-97
- Receipt processing trigger: lines 99-110 and retry path at lines 440-448
- Polling and interval lifecycle: lines 121-148
- Date/search/category filtering and sorting: lines 150-183
- Duplicate detection and duplicate mutation workflows: lines 193-239
- Search/filter UI: lines 258-318
- Duplicate list and duplicate states: lines 327-385
- Transaction grouped list rendering: lines 397-461
- AI suggestions modal: lines 464-520
- Duplicate group modal: lines 522-567

This violates SRP because one component is responsible for domain workflows, view-model derivation, network calls, interval orchestration, and rendering multiple independent UI surfaces.

Recommended split:

```text
src/features/transactions/
  components/
    TransactionFilters.tsx
    TransactionGroups.tsx
    EmptyTransactionsState.tsx
    InFlightReceiptBanner.tsx
    SuggestionsSheet.tsx
    DuplicateGroupsList.tsx
    DuplicateGroupSheet.tsx
  hooks/
    useTransactionFilters.ts
    useTransactionSuggestions.ts
    useReceiptProcessingPoller.ts
    useDuplicateResolution.ts
  utils/
    groupTransactions.ts
    filterTransactions.ts
    formatTransactionDate.ts
```

Target page shape:

```tsx
export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsScreen />
    </Suspense>
  );
}
```

`TransactionsScreen` should compose hooks and components only. Network mutations should move to feature API clients/hooks.

### 2. Client UI Is Coupled to API Route Modules

Two client modules import types directly from route handler files:

- `src/app/(app)/transactions/page.tsx:7` imports `PendingSuggestion` from `@/app/api/items/suggestions/route`
- `src/app/(app)/compare/page.tsx:4` imports `ItemPriceComparison` from `@/app/api/compare/items/route`

This couples client bundles to server route modules. Even if imported as `type`, it creates a poor dependency direction: UI should depend on shared contracts, not endpoint implementation files.

Recommended fix:

```text
src/features/suggestions/contracts.ts
src/features/compare/contracts.ts
```

or, if keeping generic types:

```text
src/types/suggestions.ts
src/types/compare.ts
```

Route handlers and client components should import from those shared contract files.

### 3. Route Handlers Contain Business Workflows

Several route handlers are not thin adapters. They contain domain orchestration, caching policy, date range policy, background job execution, and persistence details.

Examples:

- `src/app/api/analyze/route.ts`
  - Date-range calculation: lines 14-36
  - Background analysis job: lines 38-72
  - Cache state machine: lines 81-104 and 117-140
- `src/app/api/compare/route.ts`
  - Cache key/date helpers: lines 14-24
  - Background comparison job: lines 26-57
  - Cache state machine: lines 70-80 and 96-110
- `src/app/api/items/normalize/route.ts`
  - Full item normalization workflow: lines 17-154
  - Rate-limit check in the route: lines 162-169
- `src/app/api/items/suggestions/route.ts`
  - Builds pending suggestion view models: lines 28-50
  - Applies suggestion side effects to transactions: lines 66-97

Recommended structure:

```text
src/server/
  http/
    requireSession.ts
    responses.ts
  services/
    analysisService.ts
    comparisonService.ts
    itemNormalizationService.ts
    suggestionService.ts
    duplicateDetectionService.ts
    receiptProcessingService.ts
  repositories/
    transactionRepository.ts
    suggestionRepository.ts
    analysisCacheRepository.ts
```

Route handlers should become:

```ts
export async function POST(req: NextRequest) {
  const session = await requireSheetSession();
  const body = await req.json();
  return NextResponse.json(await analysisService.requestAnalysis(session, body));
}
```

This reduces coupling to Next and makes workflows testable without HTTP.

### 4. Duplicate Date and Money Utilities

Formatting and date-range logic is duplicated:

- `formatINR` exists in `src/components/TransactionRow.tsx:12`, `src/components/analysis/InsightsTab.tsx:10`, `src/app/(app)/add/page.tsx:11`, and `src/app/(app)/compare/page.tsx:6`.
- Period/date range helpers exist in `src/app/api/analyze/route.ts:14`, `src/app/api/compare/route.ts:18`, and `src/app/(app)/dashboard/page.tsx:13`.
- `new Date().toISOString().split("T")[0]` is repeated across routes, AI prompts, dashboard, add page, transaction page, settings export, and receipt parsing.

Recommended fix:

```text
src/lib/format/currency.ts
src/lib/date/iso.ts
src/lib/date/periods.ts
```

Example API:

```ts
formatINR(amount: number, options?: { symbol?: boolean }): string
todayISO(): string
getPeriodRange(period: "week" | "month" | "year", now?: Date): { from: string; to: string; label?: string }
```

### 5. Google Sheets Mapping Is Brittle and Centralized Around Column Indexes

`src/lib/sheets/transactions.ts` manually maps transaction fields to column indexes and letters:

- Append row values: lines 19-30
- Read row by index: lines 47-70
- Update map: lines 102-109

This is a coupling hotspot. The schema is encoded in multiple shapes: write order, read indexes, update letters, and comments/design docs. Adding or moving a column is risky because several blocks must be changed in sync.

Recommended fix:

```text
src/lib/sheets/transactionSchema.ts
```

It should own:

- Column names
- Column indexes
- Column letters/ranges
- `transactionToRow(tx)`
- `rowToTransaction(row)`
- `transactionUpdateToCells(updates, rowNumber)`

Then `transactions.ts` becomes a repository that calls schema helpers rather than knowing column positions.

### 6. Global Store Is Too Broad

`src/store/index.ts` mixes unrelated state:

- Transactions
- Categories
- Profile
- Network status
- Pending offline count
- Syncing flag

See `src/store/index.ts:4-20`.

This makes unrelated features depend on one global state shape. It also encourages cross-feature state mutation from anywhere.

Recommended options:

1. Split stores by concern:

```text
src/store/transactionsStore.ts
src/store/profileStore.ts
src/store/networkStore.ts
src/store/syncStore.ts
```

2. Or keep one physical Zustand store but expose feature-specific selectors/actions from separate files:

```text
src/features/transactions/store.ts
src/features/offline/store.ts
src/features/profile/store.ts
```

Either way, reduce direct imports from `@/store` in feature components.

### 7. Offline Persistence Responsibilities Leak Into UI

`src/app/(app)/add/page.tsx` creates the transaction, calls `safeFetch`, writes to IndexedDB, updates Zustand, and navigates in one function:

- Transaction construction: lines 52-66
- Offline-aware API call: lines 73-78
- Local persistence and store mutation: lines 82-84
- Navigation: line 86

This tightly couples the page to persistence internals. A manual-add page should call a use case such as `createManualTransaction(input)` and receive a result.

Recommended split:

```text
src/features/transactions/services/createTransactionClient.ts
src/features/transactions/hooks/useCreateTransaction.ts
src/features/transactions/forms/ManualTransactionForm.tsx
src/features/transactions/forms/useManualTransactionForm.ts
```

The hook can compose `safeFetch`, IndexedDB, and Zustand while keeping the page and form focused on UI.

### 8. Capture Page Mixes Multiple Independent Features

`src/app/(app)/capture/page.tsx` contains:

- SMS confirmation form: lines 9-106
- SMS parsing workflow: lines 133-149
- Receipt upload workflow: lines 153-182
- Camera lifecycle/canvas capture: lines 186-210
- Fullscreen camera UI and upload/result UI later in the same file

Recommended split:

```text
src/features/capture/
  components/
    CaptureTabs.tsx
    PasteCapturePanel.tsx
    CameraCapturePanel.tsx
    CameraOverlay.tsx
    UploadStatus.tsx
    ParsedTransactionConfirmForm.tsx
  hooks/
    useSmsParser.ts
    useReceiptUpload.ts
    useCameraCapture.ts
```

This keeps camera/browser API code isolated from transaction confirmation and upload orchestration.

### 9. UI Styling Is Repeated Inline

The code repeatedly uses inline Material-style tokens and classes (`rounded-2xl`, `var(--color-surface-container)`, repeated spinner markup, repeated modal shell markup).

Examples:

- Transaction page search/filter/modals: `src/app/(app)/transactions/page.tsx:247-318`, `464-567`
- Add page inputs/buttons: `src/app/(app)/add/page.tsx:117-240`
- Analysis tab cards/buttons: `src/components/analysis/InsightsTab.tsx:92-160`

Recommended components:

```text
src/components/ui/Button.tsx
src/components/ui/IconButton.tsx
src/components/ui/TextField.tsx
src/components/ui/SelectField.tsx
src/components/ui/BottomSheet.tsx
src/components/ui/Spinner.tsx
src/components/ui/EmptyState.tsx
src/components/ui/SegmentedControl.tsx
src/components/ui/Chip.tsx
```

Keep these thin and token-based. Do not create a huge design-system file; each primitive should have one responsibility.

### 10. Background Jobs Are Fire-and-Forget Inside Request Handlers

The app fires async work without awaiting in multiple places:

- `src/app/api/analyze/route.ts:142-150`
- `src/app/api/compare/route.ts:112`
- `src/app/api/items/normalize/route.ts:171`
- Client-side receipt processing triggers in `src/app/(app)/capture/page.tsx:169-174` and `src/app/(app)/transactions/page.tsx:99-110`

This may be acceptable for a prototype, but it couples background execution to the lifecycle of serverless route handlers and client page visits. It also duplicates status transitions.

Recommended minimum refactor:

```text
src/server/jobs/
  analysisJob.ts
  comparisonJob.ts
  normalizationJob.ts
  receiptProcessingJob.ts
```

Each job should expose:

```ts
start(...)
getStatus(...)
markGenerating(...)
markDone(...)
markFailed(...)
```

If this app remains serverless, keep the current transport but move the workflow/state machine out of the route files.

## Proposed Target Architecture

Recommended direction:

```text
src/
  app/
    (app)/
      transactions/page.tsx
      capture/page.tsx
      add/page.tsx
    api/
      transactions/route.ts
      analyze/route.ts
      ...
  features/
    transactions/
      components/
      hooks/
      services/
      contracts.ts
      utils/
    capture/
      components/
      hooks/
      services/
    analysis/
      components/
      hooks/
      services/
      contracts.ts
    suggestions/
      services/
      contracts.ts
    settings/
      components/
      hooks/
  server/
    http/
    services/
    jobs/
    repositories/
  lib/
    ai/
    sheets/
    offline/
    date/
    format/
  components/
    ui/
    layout/
  types/
    domain-only shared types
```

Dependency direction:

```text
app pages/routes
  -> features
    -> server services / client services
      -> repositories
        -> lib/sheets, lib/ai, lib/offline
  -> components/ui
  -> types/contracts
```

Rules:

- `src/app/**` should not be imported by anything.
- Route handlers should not contain domain algorithms.
- Client components should not import API route modules.
- Sheets/Drive code should not know UI concerns.
- AI code should not know HTTP concerns.
- Feature components should use feature hooks/services, not raw `fetch` everywhere.

## Incremental Refactor Plan

### Phase 1: Low-Risk Shared Utilities

1. Move `formatINR` to `src/lib/format/currency.ts`.
2. Move date helpers to `src/lib/date/iso.ts` and `src/lib/date/periods.ts`.
3. Move API response contracts out of route files:
   - `PendingSuggestion`
   - `ItemPriceComparison`
4. Replace client imports from `@/app/api/**/route` with shared contract imports.

Expected result: less duplication and corrected dependency direction without changing behavior.

### Phase 2: Thin Route Handlers

1. Create `src/server/http/requireSession.ts`.
2. Create service files for:
   - `analysisService`
   - `comparisonService`
   - `itemNormalizationService`
   - `suggestionService`
   - `duplicateDetectionService`
   - `receiptProcessingService`
3. Move route-local helper functions into services.
4. Keep route handlers as authentication/body parsing/response wrappers.

Expected result: route handlers become small and workflows become testable.

### Phase 3: Break Up Transaction UI

1. Extract pure transaction filtering/grouping utilities.
2. Extract `useTransactionSuggestions`.
3. Extract `useReceiptProcessingPoller`.
4. Extract `useDuplicateResolution`.
5. Extract `SuggestionsSheet` and `DuplicateGroupSheet`.
6. Replace the large `TransactionsContent` body with composed components.

Expected result: `transactions/page.tsx` drops from 574 lines to roughly 40-80 lines.

### Phase 4: Capture and Add Feature Modules

1. Extract `ParsedTransactionConfirmForm`.
2. Extract `useSmsParser`, `useReceiptUpload`, `useCameraCapture`.
3. Extract manual transaction form state and validation from `add/page.tsx`.
4. Create a `useCreateTransaction` hook that owns offline-aware creation.

Expected result: page files become screen composition only.

### Phase 5: Repository and Schema Hardening

1. Add `src/lib/sheets/transactionSchema.ts`.
2. Replace raw column indexes/letters in `transactions.ts`.
3. Add unit tests for row serialization/deserialization.
4. Add tests for update cell generation.

Expected result: sheet schema changes become localized and safer.

## Suggested File Ownership Boundaries

### Domain Types

Keep stable app-wide domain types in `src/types`.

Examples:

- `Transaction`
- `Category`
- `UserProfile`
- `AnalysisResult`

Move endpoint-specific DTOs to feature contract files.

### Client Services

Create typed client wrappers for API calls:

```text
src/features/transactions/services/transactionsApi.ts
src/features/suggestions/services/suggestionsApi.ts
src/features/analysis/services/analysisApi.ts
src/features/capture/services/captureApi.ts
```

This avoids raw `fetch("/api/...")` spread throughout UI components and gives one place for response typing/error normalization.

### Server Services

Server services should be framework-light. They can accept session primitives and plain request DTOs:

```ts
type SheetSession = {
  accessToken: string;
  sheetId: string;
  userEmail?: string;
};
```

Avoid passing `NextRequest`, `NextResponse`, or UI state into services.

## Testing Recommendations

Add tests where refactors move logic out of UI/routes:

1. `filterTransactions`
   - search by merchant/item/category/notes
   - date presets
   - duplicates-only mode
   - in-flight sorting

2. `groupTransactions`
   - groups by date and sorts newest first

3. `transactionSchema`
   - row-to-domain conversion
   - domain-to-row conversion
   - partial update-to-cell mapping

4. `suggestionService`
   - normalize suggestion applies to all matching item names
   - notes suggestion applies to only one transaction
   - sentinels do not appear in pending suggestions

5. `analysis/comparison cache service`
   - returns generating/failed/not_started/done states
   - reads from Drive when sheet cell is empty
   - respects 24-hour freshness unless forced

## Priority Findings

High priority:

- Break up `src/app/(app)/transactions/page.tsx`.
- Move API route types out of route files.
- Move analysis/compare/normalization/suggestion workflows out of route handlers.
- Centralize date and currency utilities.

Medium priority:

- Split capture and add pages into feature components/hooks.
- Add typed API client wrappers.
- Split or isolate Zustand store concerns.
- Extract common UI primitives.

Lower priority but important:

- Harden Google Sheets schema mapping.
- Add focused tests after logic extraction.
- Introduce a server job layer for background workflows.

## Definition of Done for the Refactor

Use these criteria to evaluate completion:

- No client component imports from `src/app/api/**`.
- No page file exceeds about 150 lines unless it is mostly static JSX.
- No route handler contains business workflows longer than request parsing plus one service call.
- Shared utilities are not duplicated across pages/components.
- Google Sheets column knowledge is centralized in one schema module per sheet.
- Feature code can be read by feature: transactions, capture, analysis, settings.
- UI components can be tested/rendered without real Google/AI/offline dependencies.
- Domain services can be tested without `NextRequest` or `NextResponse`.
