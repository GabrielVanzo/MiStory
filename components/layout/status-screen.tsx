import { cn } from "@/lib/utils";

function StatusScreen({
  eyebrow,
  title,
  description,
  media,
  mediaClassName,
  className,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  media?: React.ReactNode;
  mediaClassName?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <main
      className={cn(
        "flex flex-1 flex-col items-center justify-center px-6 py-24 text-center",
        className,
      )}
    >
      <div className="flex max-w-md flex-col items-center gap-5">
        {media ? (
          <div
            className={cn(
              "bg-muted text-muted-foreground ring-border flex size-16 items-center justify-center rounded-2xl ring-1 [&>svg]:size-7",
              mediaClassName,
            )}
          >
            {media}
          </div>
        ) : null}

        {eyebrow ? (
          <p className="text-muted-foreground font-mono text-sm tracking-[0.3em]">{eyebrow}</p>
        ) : null}

        <h1 className="text-3xl font-semibold tracking-tight text-balance">{title}</h1>

        {description ? <p className="text-muted-foreground text-balance">{description}</p> : null}

        {children ? <div className="mt-2 flex flex-col gap-3 sm:flex-row">{children}</div> : null}
      </div>
    </main>
  );
}

export { StatusScreen };
