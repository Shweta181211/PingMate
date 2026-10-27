import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const navItems = [
    { href: "/dashboard", icon: "🏠", label: "Dashboard" },
    { href: "/dashboard/opportunities", icon: "🎯", label: "Opportunities" },
    { href: "/dashboard/settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <div className="pm-dashboard min-h-screen flex">
      <header className="md:hidden fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#070a12]/90 px-5 py-4 backdrop-blur-xl">
        <Link href="/dashboard" className="font-semibold gradient-text">PingMate</Link>
        <div className="flex gap-3 text-xs text-slate-300">
          <Link href="/dashboard/opportunities">Opportunities</Link>
          <Link href="/dashboard/settings">Settings</Link>
        </div>
      </header>
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 fixed left-0 top-0 h-full glass-card border-r border-white/5 flex-col z-20">
        <div className="p-6 border-b border-white/5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🏓</span>
            <span className="font-bold text-xl gradient-text">PingMate</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name || "User"}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
                {session.user.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {session.user.email}
              </p>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="w-full text-left px-4 py-2 text-xs text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/5"
            >
              Sign out →
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-0 md:ml-64 px-4 pb-8 pt-24 md:p-8">{children}</main>
    </div>
  );
}
