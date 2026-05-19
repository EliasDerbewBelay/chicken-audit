export interface User {
  id: string;
  full_name: string;
  email: string;
  role: "owner" | "employee";
  created_at: string;
}