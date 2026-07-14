import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Brand } from "@/components/layout/brand";

function SiteHeader() {
  return (
    <header className="border-border/60 surface-glass sticky top-0 z-40 w-full border-b">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <Brand />

        <nav className="text-muted-foreground hidden items-center gap-1 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/#como-jogar">Como jogar</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/design">Design</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/entrar">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/criar">Criar sala</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export { SiteHeader };
