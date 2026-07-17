import { Brand } from "@/components/layout/brand";

function SiteFooter() {
  return (
    <footer className="border-border/60 border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-8 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Brand />
          <p className="text-muted-foreground text-sm">
            Jogo de enigmas multiplayer em tempo real.
          </p>
        </div>
        <div className="text-muted-foreground flex flex-col items-center gap-3 text-sm sm:items-end">
          <nav className="flex items-center gap-4">
            <span className="hover:text-foreground cursor-default transition-colors">Sobre</span>
            <span className="hover:text-foreground cursor-default transition-colors">
              Privacidade
            </span>
            <span className="hover:text-foreground cursor-default transition-colors">Termos</span>
          </nav>
          <p>© 2026 MiStory · MVP</p>
        </div>
      </div>
    </footer>
  );
}

export { SiteFooter };
