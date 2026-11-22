"use client";

import {
  LayoutDashboardIcon,
  LogOutIcon,
  PackageIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  HEADER_ACTION_CLASS,
  HEADER_ICON_CLASS,
  HEADER_LABEL_CLASS,
} from "@/components/shop/header-action";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient, useSession } from "@/lib/auth/client";
import { isAdminRole } from "@/lib/auth/roles";

export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <Skeleton
        className="size-9 lg:w-14"
        role="status"
        aria-label="Cargando cuenta"
      />
    );
  }

  if (!session) {
    return (
      <Button
        asChild
        variant="ghost"
        className={HEADER_ACTION_CLASS}
        aria-label="Cuenta: iniciar sesión"
      >
        <Link href="/ingresar">
          <UserIcon aria-hidden="true" className={HEADER_ICON_CLASS} />
          <span aria-hidden="true" className={HEADER_LABEL_CLASS}>
            Cuenta
          </span>
        </Link>
      </Button>
    );
  }

  const { user } = session;
  const isAdmin = isAdminRole(user.role);

  const signOut = async () => {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error("No se pudo cerrar la sesión. Inténtalo de nuevo.");
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={HEADER_ACTION_CLASS}
          aria-label={`Cuenta de ${user.name}`}
        >
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground uppercase lg:hidden"
          >
            {user.name.trim().charAt(0) || <UserIcon />}
          </span>
          <span aria-hidden="true" className={HEADER_LABEL_CLASS}>
            Cuenta
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-medium">{user.name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/cuenta">
            <PackageIcon aria-hidden="true" />
            Mi cuenta y pedidos
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <LayoutDashboardIcon aria-hidden="true" />
              Panel de administración
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOutIcon aria-hidden="true" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
