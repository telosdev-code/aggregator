import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// Simple admin guard — in production, check against an allowlist of admin user IDs
const ADMIN_USER_IDS = (process.env.ADMIN_CLERK_USER_IDS ?? "").split(",").filter(Boolean);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  if (ADMIN_USER_IDS.length > 0 && !ADMIN_USER_IDS.includes(userId)) {
    redirect("/dashboard");
  }
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 px-6 py-3">
        <span className="font-mono text-sm text-gray-400">🛠 Admin</span>
      </div>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
