import { AppSidebar, MobileHeader } from "@/components/app-nav";
import { requireMember } from "@/lib/auth";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const { profile } = await requireMember();
  return (
    <div className="flex min-h-screen">
      <AppSidebar profile={profile} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader profile={profile} />
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
