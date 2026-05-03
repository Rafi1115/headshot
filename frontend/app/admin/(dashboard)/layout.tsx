"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { LayoutGrid, Menu, Settings, User, Briefcase, CreditCard, LogOut, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, signOut } from "@/lib/api/auth";
import type { AuthUser } from "@/lib/api/auth";


function SidebarNav() { // This component is used in both the mobile sheet and the desktop sidebar, so it needs to be self-contained.
    const pathname = usePathname();

    const navItems = [
        { label: "Dashboard", href: "/admin", icon: LayoutGrid },
        { label: "Jobs", href: "/admin/jobs", icon: Briefcase },
        { label: "Payments", href: "/admin/payments", icon: CreditCard },
        // { label: "Users", href: "/admin/users", icon: User },
        { label: "Settings", href: "/admin/settings", icon: Settings },
    ];

    return (
        <nav className="flex flex-col items-center gap-2 px-3 py-6">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex h-14 w-full max-w-56.25 items-center gap-2 rounded-[20px] px-4 text-[20px] font-medium leading-7 transition-colors",
                            isActive ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted"
                        )}>
                        <Icon className="size-6" />
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}



// Admin Dashboard Layout
export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const avatarImage = "/user_avater.png";
    const logoImage = "/logo_hitster.png";
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);

    // Check session on mount — redirect to signin if not authenticated
    useEffect(() => {
        getSession().then((sessionUser) => {
            if (!sessionUser) {
                router.replace("/admin/signin");
            } else {
                setUser(sessionUser);
            }
        });
    }, [router]);

    async function handleLogout() {
        await signOut();
        router.replace("/admin/signin");
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 flex h-20 items-center border-b border-border bg-background shadow-[0px_0px_4px_0px_rgba(0,0,0,0.25)]">
                <div className="flex items-center justify-between w-full px-6">
                    <div className="flex items-center gap-3">
                        {/* Mobile menu button */}
                        <div className="md:hidden">
                            <Sheet>
                                <SheetTrigger
                                    render={
                                        <button
                                            className="inline-flex items-center justify-center rounded-md border p-2 hover:bg-muted"
                                            aria-label="Open menu"
                                        >
                                            <Menu className="h-5 w-5" />
                                        </button>
                                    }
                                ></SheetTrigger>
                                <SheetContent side="left" className="w-[calc(100vw-1rem)] max-w-72 p-0">
                                    <div className="border-b px-4 py-5 flex items-center gap-2.5">
                                        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#3b82f6]">
                                            <Sparkles className="h-5 w-5 text-white" />
                                        </div>
                                        <span className="text-base font-semibold tracking-tight text-foreground">
                                            HeadshotAI
                                        </span>
                                    </div>
                                    <SidebarNav />
                                </SheetContent>
                            </Sheet>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#3b82f6]">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-base font-semibold tracking-tight text-foreground">
                                HeadshotAI
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Avatar className="size-12">
                            <AvatarImage src={avatarImage} alt={user?.name ?? "Admin"} />
                            <AvatarFallback>{user?.name?.charAt(0).toUpperCase() ?? "A"}</AvatarFallback>
                        </Avatar>
                        <span className="text-[20px] font-semibold leading-normal text-foreground">
                            {user?.name ?? "Admin"}
                        </span>

                        {/* Logout button */}
                        <button
                            onClick={handleLogout}
                            title="Sign out"
                            className="ml-2 flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <LogOut className="size-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Body */}
            <div className="flex pt-20">
                {/* Desktop Sidebar */}
                <aside className="fixed left-0 top-20 hidden h-[calc(100vh-80px)] w-63.25 border-r border-border bg-background md:block">
                    <SidebarNav />
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-6 lg:p-10 md:ml-63.25">{children}</main>
            </div>
        </div>
    );
}
