import clsx from "clsx";
import { NavLink, Outlet, useParams } from "react-router-dom";

function SidebarLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-2.5 rounded-[4px] px-3 py-2 text-sm transition-colors",
          isActive
            ? "border-l-2 border-accent bg-accent/10 font-medium text-accent"
            : "text-text hover:bg-background"
        )
      }
    >
      {label}
    </NavLink>
  );
}

export function AppShell() {
  const { projectId } = useParams();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-[#E2E8F0] bg-surface">
        <div className="border-b border-[#E2E8F0] px-4 py-5">
          <div className="font-heading text-base font-bold text-primary">SkoleGeni</div>
          <div className="mt-0.5 text-xs text-muted">Roster Optimizer</div>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-3">
          <SidebarLink to={`/configure/${projectId}`} label="Configuration" />
          <SidebarLink to={`/pupils/${projectId}`} label="Pupil Data" />
          <SidebarLink to={`/results/${projectId}`} label="Results" />
          <SidebarLink to={`/editor/${projectId}`} label="Class Editor" />
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
