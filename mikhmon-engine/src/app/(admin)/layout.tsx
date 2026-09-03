import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Toaster } from "@/components/ui/sonner";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-background">
      <AdminSidebar />
      <main className="flex-1 p-3.5 sm:p-5 md:p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
