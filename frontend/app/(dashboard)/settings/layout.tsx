import { SuperAdminGate } from "@/components/super-admin-gate";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminGate>{children}</SuperAdminGate>;
}
