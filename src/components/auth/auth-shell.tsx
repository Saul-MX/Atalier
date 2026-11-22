import { Container } from "@/components/shared/container";
import { Skeleton } from "@/components/ui/skeleton";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Container className="flex justify-center py-12 sm:py-20">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="pl-[0.3em] text-xl font-normal display-caps">
            {title}
          </h1>
          <p className="text-[0.8125rem] text-muted-foreground">
            {description}
          </p>
        </header>
        {children}
      </div>
    </Container>
  );
}

export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Cargando">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="mx-auto h-4 w-24" />
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" aria-hidden="true" />o
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}
