import Link from "next/link";

export interface CityMemberRow {
  user_id: string;
  full_name: string;
  branch: string | null;
  batch_year: number | null;
  company_name: string;
  bio?: string;
}

export default function MemberCard({
  member,
  showCity,
}: {
  member: CityMemberRow;
  showCity?: string;
}) {
  const initials = member.full_name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-start gap-3 glass-card p-4 transition-colors hover:border-amber/40">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber/15 font-mono text-sm font-bold text-amber">
        {initials || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-paper">{member.full_name}</p>
        <p className="truncate text-xs text-slate">
          {member.company_name}
          {member.branch ? ` · ${member.branch}` : ""}
          {member.batch_year ? ` · ${member.batch_year}` : ""}
          {showCity ? ` · ${showCity}` : ""}
        </p>
        {member.bio && (
          <p className="mt-1 line-clamp-2 text-xs text-slate/80">{member.bio}</p>
        )}
      </div>
      <Link
        href={`/messages/${member.user_id}`}
        className="shrink-0 rounded border border-inkline px-2.5 py-1 text-[11px] text-amber hover:border-amber"
      >
        Message
      </Link>
    </div>
  );
}
