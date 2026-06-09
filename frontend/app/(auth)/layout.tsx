import { AuthBackground } from "@/components/auth/auth-background";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#b6dff7] p-6">
      <AuthBackground />

      {/* Login card — centered horizontally & vertically */}
      <div className="relative z-10 w-full max-w-[420px]">{children}</div>
    </div>
  );
}
