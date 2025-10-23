# Customer Table Filters

- **Search Query**
  - Field: `query`
  - Matches name, email, phone, contact title

- **Date Range**
  - Field: `datePreset`
  - Options: `all`, `today`, `last7`, `last30`, `thisWeek`, `thisMonth`, `thisYear`, `monthPick`, `weekPick`, `custom`
  - When `custom`: `dateStart` (YYYY-MM-DD) and `dateEnd` (YYYY-MM-DD)
  - When `monthPick`: `monthValue` (YYYY-MM)
  - When `weekPick`: `weekValue` (YYYY-Www)

- **Call Status**
  - Field: `callStatusFilter`
  - Options: `all`, `scheduled`, `called`, `not-reached`, `busy`, `voicemail`

- **Follow-up Status**
  - Field: `followUpFilter`
  - Options: `all`, `pending`, `in-progress`, `completed`, `closed`

- **Customer Status**
  - Field: `filterStatus`
  - Options: `all`, `active`, `new`

- **Sort**
  - Field: `sortBy`
  - Options: `lastInteraction`, `name`
  - Field: `sortDir`
  - Options: `asc`, `desc`

- **Export (not a filter, uses current filters)**
  - Action: Export current filtered rows to CSV

Notes:
- Filters are implemented in both `agent` and `supervisor` customer tables.
- Column visibility toggles and pagination (rows per page) are view controls, not data filters.
