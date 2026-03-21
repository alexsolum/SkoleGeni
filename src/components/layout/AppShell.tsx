import clsx from "clsx";
import { NavLink, Outlet, useParams } from "react-router-dom";

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
};

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-current opacity-80">
      {children}
    </span>
  );
}

function SidebarLink({ to, label, icon }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-accent/10 font-semibold text-accent"
            : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#1E293B]"
        )
      }
    >
      <NavIcon>{icon}</NavIcon>
      <span>{label}</span>
    </NavLink>
  );
}

const ConfigIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="2.5" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41" />
  </svg>
);

const PupilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="5" r="2.5" />
    <path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" />
  </svg>
);

const ResultsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="10" width="3" height="4.5" rx="0.5" />
    <rect x="6.5" y="6.5" width="3" height="8" rx="0.5" />
    <rect x="11.5" y="2.5" width="3" height="12" rx="0.5" />
  </svg>
);

const EditorIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="1.5" width="6" height="5.5" rx="1" />
    <rect x="8.5" y="1.5" width="6" height="5.5" rx="1" />
    <rect x="1.5" y="9" width="6" height="5.5" rx="1" />
    <rect x="8.5" y="9" width="6" height="5.5" rx="1" />
  </svg>
);

export function AppShell() {
  const { projectId } = useParams();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-[#E2E8F0] bg-surface shadow-sm">
        {/* Brand header */}
        <div className="border-b border-[#E2E8F0] px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-surface">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 13L8 3l6 10H2z" />
              </svg>
            </div>
            <div>
              <div className="font-heading text-sm font-bold text-[#0F172A]">SkoleGeni</div>
              <div className="text-xs text-muted">Roster Optimizer</div>
            </div>
          </div>
        </div>

        {/* Nav section */}
        <nav className="flex-1 px-3 py-4">
          <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Project
          </div>
          <div className="space-y-0.5">
            <SidebarLink
              to={`/configure/${projectId}`}
              label="Configuration"
              icon={<ConfigIcon />}
            />
            <SidebarLink
              to={`/pupils/${projectId}`}
              label="Pupil Data"
              icon={<PupilIcon />}
            />
            <SidebarLink
              to={`/results/${projectId}`}
              label="Results"
              icon={<ResultsIcon />}
            />
            <SidebarLink
              to={`/editor/${projectId}`}
              label="Class Editor"
              icon={<EditorIcon />}
            />
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-[#E2E8F0] px-5 py-4">
          <div className="text-[11px] text-muted">v1.0 · School Roster Tool</div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
