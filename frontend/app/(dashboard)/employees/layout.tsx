import { SuperAdminGate } from "@/components/super-admin-gate";

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminGate>{children}</SuperAdminGate>;
}
