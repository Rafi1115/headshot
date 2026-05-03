"use client";

import { useEffect, useState } from "react";
import { AddUserDialogContent } from "@/components/dashboard/add-user-dialog-content";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ChevronDown, Plus, Search, Loader2 } from "lucide-react";
import { User } from "@/types/user";
import { fetchUsers, deleteUser as apiDeleteUser } from "@/lib/api/users";

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        async function loadData() {
            try {
                const data = await fetchUsers();
                setUsers(data);
            } catch (error) {
                console.error("Failed to load users", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const handleDelete = async (userId: string | number) => {
        try {
            await apiDeleteUser(userId);
            setUsers((prev) => prev.filter((u) => u.id !== userId));
        } catch (error) {
            console.error("Failed to delete user", error);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <Dialog>
            <section className="w-full h-full">
                <div className="dashboard-page-header">
                    <h1 className="dashboard-page-title">Users</h1>
                    <p className="dashboard-page-subtitle">Manage your useddrs and system configuration.</p>
                </div>

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div className="relative w-full lg:w-116">
                        <Input type="search" placeholder="Search" />
                        <Search className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                    </div>

                    <DialogTrigger asChild>
                        <Button className="h-11.5 rounded-[5px] bg-black px-3 text-[16px] font-medium text-white hover:bg-black/95">
                            <Plus className="size-6" />
                            Add New User
                        </Button>
                    </DialogTrigger>
                </div>

                <div className="space-y-3 md:hidden mb-6">
                    {users.map((user) => (
                        <article key={`mobile-${user.id}`} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">User #{user.id}</p>
                                <h3 className="text-base font-semibold text-foreground">{user.name}</h3>
                                <p className="break-all text-sm text-muted-foreground">{user.email}</p>
                            </div>
                            <div className="mt-3">
                                <DropdownMenu>
                                    <DropdownMenuTrigger className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
                                        Action
                                        <ChevronDown className="size-4" />
                                    </DropdownMenuTrigger>

                                    <DropdownMenuContent align="start" className="w-40">
                                        <DropdownMenuItem>Edit user</DropdownMenuItem>
                                        <DropdownMenuItem>Disable</DropdownMenuItem>
                                        <DropdownMenuItem variant="destructive" onClick={() => handleDelete(user.id)}>Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="hidden w-full overflow-x-auto md:block mb-6">
                    <div className="min-w-180">
                        <table className="w-full table-fixed border-collapse">
                            <thead>
                                <tr className="h-11.5 bg-primary">
                                    <th className="w-30 border border-border px-2 text-left text-base leading-normal font-medium text-primary-foreground lg:text-[20px]">
                                        Name
                                    </th>
                                    <th className="w-30 border border-border px-2 text-left text-base leading-normal font-medium text-primary-foreground lg:text-[20px]">
                                        Email
                                    </th>
                                    <th className="w-15 border border-border px-2 text-left text-base leading-normal font-medium text-primary-foreground lg:text-[20px]">
                                        Role
                                    </th>
                                    <th className="w-15 border border-border px-2 text-left text-base leading-normal font-medium text-primary-foreground lg:text-[20px]">
                                        Status
                                    </th>
                                    <th className="w-10 border border-border px-2 text-left text-base leading-normal font-medium text-primary-foreground lg:text-[20px]">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="h-13">
                                        <td className="border border-border px-2 text-sm leading-6 font-normal text-muted-foreground lg:text-[16px]">
                                            {user.name}
                                        </td>
                                        <td className="border border-border px-2 text-sm leading-6 font-normal text-muted-foreground lg:text-[16px]">
                                            {user.email}
                                        </td>
                                        <td className="border border-border px-2 text-sm leading-6 font-normal text-muted-foreground lg:text-[16px]">
                                            {user.role}
                                        </td>
                                        <td className="border border-border px-2 text-sm leading-6 font-normal text-muted-foreground lg:text-[16px]">
                                            {user.status}
                                        </td>
                                        <td className="border border-border px-2">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className="inline-flex h-9 items-center justify-center gap-1 rounded-[5px] bg-primary px-2 text-sm leading-[1.2] font-normal text-primary-foreground lg:text-[16px]">
                                                    Action
                                                    <ChevronDown className="size-4" />
                                                </DropdownMenuTrigger>

                                                <DropdownMenuContent align="start" className="w-40">
                                                    <DropdownMenuItem>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem>Disable</DropdownMenuItem>
                                                    <DropdownMenuItem variant="destructive" onClick={() => handleDelete(user.id)}>Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex flex-col gap-4 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <p className="px-2 text-sm leading-6 font-medium">Showing 1-{users.length} out of {users.length}</p>

                    <div className="flex items-center gap-2.5 px-2 py-1 text-sm leading-6 font-medium lg:text-[16px]">
                        <button type="button" className="cursor-pointer px-1 py-0.5">
                            Previous
                        </button>
                        <button type="button" className="h-6 w-6 bg-primary px-1 py-0.5 text-primary-foreground">
                            1
                        </button>
                        <button type="button" className="cursor-pointer px-1 py-0.5">
                            Next
                        </button>
                    </div>
                </div>

                <AddUserDialogContent />
            </section>
        </Dialog>
    );
}
