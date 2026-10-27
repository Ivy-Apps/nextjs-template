import type { User } from "@/types/User";

export function UserSummary({ user }: { user: User }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-sm font-medium">
        {user.firstName} {user.lastName}
      </span>
      <span className="truncate text-xs text-muted-foreground">
        {user.username}
      </span>
    </div>
  );
}
