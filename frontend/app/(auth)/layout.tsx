export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6 dark:from-indigo-950 dark:via-slate-950 dark:to-cyan-950">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
