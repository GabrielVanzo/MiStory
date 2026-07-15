import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { initials } from "@/utils/format";

/**
 * A player's avatar, tinted with their assigned colour.
 *
 * Single source for what used to be three copies of `initials()` plus an
 * inline style object, so every list shows a player the same way.
 */
export function PlayerAvatar({
  name,
  color,
  size = "sm",
  className,
}: {
  name: string;
  color: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  return (
    <Avatar size={size} className={cn("shrink-0", className)}>
      <AvatarFallback style={color ? { backgroundColor: `${color}22`, color } : undefined}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
