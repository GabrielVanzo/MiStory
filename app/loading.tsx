import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24">
      <Spinner size="lg" className="text-primary" />
      <p className="text-muted-foreground text-sm">Carregando...</p>
    </main>
  );
}
