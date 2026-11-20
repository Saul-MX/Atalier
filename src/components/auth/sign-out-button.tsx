"use client";

import { Loader2Icon, LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function SignOutButton({
  variant = "outline",
}: {
  variant?: "outline" | "ghost";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const signOut = async () => {
    setPending(true);
    const { error } = await authClient.signOut();
    if (error) {
      setPending(false);
      toast.error("No se pudo cerrar la sesión. Inténtalo de nuevo.");
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <Button variant={variant} onClick={signOut} disabled={pending}>
      {pending ? (
        <Loader2Icon className="animate-spin" aria-hidden="true" />
      ) : (
        <LogOutIcon aria-hidden="true" />
      )}
      Cerrar sesión
    </Button>
  );
}
