export interface User {
  id: string;
  full_name: string;
  email: string;
  role: "owner" | "employee";
  created_at: string;
}

export interface DailyLog {
  id: string;
  logged_by: string;
  logged_by_name?: string;
  log_date: string;
  eggs_collected: number;
  feed_given_kg: number;
  deaths: number;
  notes?: string;
  created_at: string;
}

export interface Sale {
  id: string;
  recorded_by: string;
  recorded_by_name?: string;
  sale_date: string;
  type: "eggs" | "broiler";
  quantity: number;
  amount_etb: number;
  buyer?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  recorded_by: string;
  recorded_by_name?: string;
  expense_date: string;
  category:
    | "feed"
    | "medicine"
    | "vaccine"
    | "wage"
    | "utilities"
    | "equipment"
    | "other";
  amount_etb: number;
  supplier?: string;
  created_at: string;
}

export interface HealthEvent {
  id: string;
  recorded_by: string;
  recorded_by_name?: string;
  event_date: string;
  event_type: "death" | "vet_visit" | "vaccination" | "illness" | "recovery";
  details: string;
  created_at: string;
}

export interface DashboardSummary {
  eggs_today: number;
  eggs_yesterday: number;
  revenue_month: number;
  expenses_month: number;
  active_chickens: number;
  deaths_month: number;
  last_7_days_eggs: { date: string; count: number }[];
  recent_entries: RecentEntry[];
}

export interface RecentEntry {
  id: string;
  type: "sale" | "expense" | "log" | "health";
  description: string;
  amount?: number;
  recorded_by_name: string;
  date: string;
}
