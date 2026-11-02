# My Money — Personal Expense & Money Manager

A modern, responsive, high-performance web application designed for personal money and expense management. Built with **React 18**, **TypeScript**, **Tailwind CSS**, **Lucide Icons**, **Recharts**, and **Supabase**.

---

## 🚀 Key Features

### 1. Main Dashboard (Home)
- **8 Dynamic Summary Cards**:
  - Total Money Received (Income)
  - Total Home Expenses
  - Total Room Expenses
  - Total Other Expenses
  - Money Given to Others (Udhar Diya)
  - Money Received from Others (Udhar Liya)
  - Current Available Balance (`Total Income - Total Expenses`)
  - Total Transactions Count
- **Recent Transactions Feed**: Shows title, amount, category, subcategory, IST date, time, and type with quick Edit and Delete actions.
- **Quick Action Buttons**: 1-click shortcuts to record Home Money, Room Expenses, Other Expenses, or People Udhar.

### 2. Home Section
- **Add Money Received From Home**: Amount (Req), Purpose/Reason (Req), Automatic IST Date & Time, Optional Notes.
- **Record Home Expenses**: Amount (Req), What the money was requested/spent for (Req), Date, Time, Notes.
- **Home Balance Cards**: Total Money Received From Home, Total Money Spent, Remaining Home Balance (`Received - Spent`).
- **View History**: Full history with search, date filters, sorting, and single-item delete with confirmation.

### 3. Room Section
- Tracks 4 dedicated categories:
  - **A. Gas Expenses**: Gas amount, Date, Time, Who paid (Optional), Notes.
  - **B. Grocery Expenses**: Item name (Req), Amount (Req), Quantity (Optional), Date, Time, Notes.
    - Quick presets for Rice (₹250), Oil (₹150), Vegetables (₹100).
    - Every item is saved as its own discrete transaction.
  - **C. Room Rent**: Rent amount, Month, Payment date, Time, Paid to (Optional), Notes.
  - **D. Electricity Bill**: Bill amount, Billing month, Payment date, Time, Notes.
- **Room Summary**: Total Gas, Total Groceries, Total Rent, Total Electricity, and **Grand Total Room Expenses**.

### 4. Other Expenses Section
- For shopping, travelling, mobile recharges, food delivery, and personal lifestyle expenses.
- Fields: Amount (Req), Where was the money spent? (Req), Why was it spent? (Req), Date (Auto), Time (Auto), Notes.
- Filter, search, and sort options.

### 5. People & Transactions (Udhar Given / Received)
- **A. Money Given (Udhar Diya)**: Person Name, Amount, Purpose/Reason, Date, Time, Notes.
- **B. Money Received (Udhar Liya / Wapas Mila)**: Person Name, Amount, Purpose/Reason, Date, Time, Notes.
- **People Directory & Balance Ledger**:
  - Shows each contact with their individual total given, total received, and net balance.
  - Automatic calculation: `Outstanding Balance = Total Given - Total Received`.
  - Color-coded badges: "They Owe" (Amber/Green), "You Owe" (Rose), or "Settled" (Gray).
  - Drill-down into any person's full transaction ledger with a 1-click **Quick Settle** button.

### 6. Automatic Date & Time System (IST)
- Captures current Date (`YYYY-MM-DD`) and Time (`HH:mm:ss`) in **Indian Standard Time (IST - UTC+5:30)**.
- Manual editing supported anytime.
- Preserves original `created_at` timestamp when editing records.
- Stored fields: `created_at`, `updated_at`, `transaction_date`, `transaction_time`.

### 7. Complete Transaction Management
- Every record has a unique ID (UUID).
- Safe single-transaction delete: deletion only removes the target ID.
- Confirmation popup before deletion with full record summary.
- Search by keyword across titles, descriptions, notes, and person names.
- Multi-criteria filters: Date range, Category, Subcategory, Transaction Type, Min/Max Amount.
- Sorting: Newest to Oldest, Oldest to Newest, Highest Amount, Lowest Amount.
- Duplicate submission prevention on all buttons.

### 8. Reports & Analytics
- Visual interactive charts powered by **Recharts**:
  - Cashflow Trend (Income vs Expenses) across Daily, Monthly, or Yearly views.
  - Category-wise Expense distribution donut chart.
- Key Financial Metrics: Total Income, Total Expenses, Remaining Balance, and Savings Rate %.
- **CSV Export**: Download filtered or full financial ledgers as spreadsheet files.

### 9. UI / UX Design
- Clean, financial dashboard with responsive Sidebar (desktop) and Bottom Navigation (mobile).
- **Dark Mode & Light Mode** toggle with persistent local storage.
- Standard Indian currency formatting: **INR (₹)** with Indian grouping (e.g. ₹1,25,000).
- Toast notifications for every operation.

### 10. Database & Supabase Integration
- Backend powered by **Supabase PostgreSQL** with Row Level Security (RLS).
- Zero-friction **Offline / Local Storage Fallback**: works instantly in any browser without entering credentials first.
- In-app **Settings & Cloud Sync** panel to enter Supabase URL and Anon Key, with instant connection test.
- 1-click **Copy SQL Schema** button in Settings with pre-configured table, triggers, and RLS policies.

---

## 🛠️ Getting Started

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Run Development Server
\`\`\`bash
npm run dev
\`\`\`
Visit `http://localhost:5173` in your browser.

### 3. Build for Production
\`\`\`bash
npm run build
\`\`\`

---

## 🗄️ Supabase Setup (Optional)
If you wish to connect your remote Supabase project:
1. Open your Supabase project dashboard at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** and paste the SQL script provided in the **Settings** section of the app.
3. In the app's **Settings** tab, enter your **Supabase URL** and **Anon Key**, then click **Save & Test Connection**.
