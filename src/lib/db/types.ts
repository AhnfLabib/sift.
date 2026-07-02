export interface Profile {
  id: string;
  phone: string | null;
  timezone: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  is_preset: boolean;
  created_at: string;
}

export interface MerchantKeyword {
  id: string;
  user_id: string;
  keyword: string;
  category_id: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount_cents: number;
  merchant: string;
  category_id: string | null;
  date: string;
  source: "web" | "chat" | "sms";
  raw_input: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  limit_cents: number;
  month: string;
}

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount_cents: number;
  due_day: number;
  category_id: string | null;
  recurrence: "monthly";
  active: boolean;
  created_at: string;
}

export interface ReminderLog {
  id: string;
  bill_id: string;
  due_date: string;
  lead_days: number;
  channel: "email" | "whatsapp" | "sms";
  sent_at: string;
  status: string;
}
