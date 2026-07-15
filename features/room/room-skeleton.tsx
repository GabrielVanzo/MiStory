import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the real room layout while we connect, so the page settles into
 * place instead of popping in from a bare spinner.
 */
export function RoomSkeleton() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true" aria-label="Carregando a sala">
      {/* Header */}
      <header className="border-border/60 surface-glass sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="size-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden gap-1 sm:flex">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="size-6 rounded-full" />
            </div>
            <Skeleton className="h-7 w-16 rounded-lg" />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[1fr_320px]">
        {/* Enigma + feed */}
        <div className="flex min-h-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-48" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>

          <Card className="min-h-72 flex-1">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[70, 85, 55].map((width, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="size-6 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4" style={{ width: `${width}%` }} />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="size-10 rounded-lg" />
          </div>
        </div>

        {/* Sidebar */}
        <aside>
          <Card className="h-full">
            <CardContent className="space-y-3 p-3">
              <Skeleton className="h-8 w-full rounded-lg" />
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-1">
                  <Skeleton className="size-6 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
