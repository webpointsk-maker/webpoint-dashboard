export type ClientStatus = "lead" | "onboarding" | "active" | "paused" | "ended";
export type PaymentStatus = "pending" | "paid" | "overdue";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "admin" | "member";
};

export type Package = {
  id: string;
  name: string;
  monthly_price: number;
  description: string | null;
  posts_per_month: number | null;
  platforms: string[];
  is_active: boolean;
};

export type Client = {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  ico: string | null;
  website: string | null;
  status: ClientStatus;
  package_id: string | null;
  custom_price: number | null;
  start_date: string | null;
  billing_day: number;
  platforms: string[];
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  client_id: string;
  period: string;
  amount: number;
  due_date: string;
  status: PaymentStatus;
  paid_at: string | null;
  note: string | null;
};

export type Task = {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  due_time: string | null;
  assignee_id: string | null;
  google_event_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskWithClient = Task & { client: { id: string; name: string } | null };
