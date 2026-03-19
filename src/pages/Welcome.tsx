import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";

type ProjectRow = {
  id: string;
  title: string;
  updated_at: string | null;
};

export default function Welcome() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!mounted) return;
      setSignedIn(Boolean(session));
      setSessionChecked(true);

      if (!session) {
        setProjects([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select("id,title,updated_at")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (!mounted) return;
      if (error) {
        toast.error("Failed to load projects.");
        setProjects([]);
        setLoading(false);
        return;
      }
      setProjects((data ?? []) as ProjectRow[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      setSessionChecked(true);
      if (!session) {
        setProjects([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const recentProjects = useMemo(() => projects.slice(0, 10), [projects]);

  async function sendMagicLink() {
    const nextEmail = email.trim();
    if (!nextEmail) {
      toast.error("Enter your work email first.");
      return;
    }

    setSendingLink(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: nextEmail,
      options: {
        emailRedirectTo:
          (import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined) ?? window.location.origin
      }
    });
    setSendingLink(false);

    if (error) {
      toast.error("Failed to send sign-in link.");
      return;
    }

    toast.success("Check your email for the sign-in link.");
  }

  async function createNewRoster() {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Sign in before creating a roster.");
      return;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({ title: "New Roster" })
      .select("id,title")
      .single();

    if (error || !data) {
      toast.error("Failed to create roster.");
      return;
    }

    navigate(`/configure/${data.id}`);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out.");
      return;
    }
    toast.success("Signed out.");
  }

  if (!sessionChecked) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-[980px] pt-10">
          <div className="h-10 bg-muted/20 rounded-[4px] animate-pulse w-[380px]" />
          <div className="mt-4 h-10 bg-muted/20 rounded-[4px] animate-pulse w-[620px]" />
        </div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-[640px] pt-16">
          <div className="border border-muted/50 bg-surface rounded-[4px] p-8">
            <h1 className="font-heading font-bold text-[40px] leading-tight text-primary">
              Academic Clarity
            </h1>
            <p className="text-muted text-sm mt-3">
              Sign in with your staff email to access roster projects. Anonymous project access is disabled.
            </p>

            <div className="mt-6 space-y-3">
              <label className="block text-xs text-muted font-mono">Staff email</label>
              <input
                className="w-full border border-muted/50 rounded-[4px] px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@school.no"
              />
              <button
                className="h-12 px-5 rounded-[4px] border border-primary bg-primary text-surface font-heading font-bold text-sm hover:bg-[#0b1224] disabled:opacity-60"
                onClick={sendMagicLink}
                disabled={sendingLink}
              >
                {sendingLink ? "Sending..." : "Send Sign-In Link"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-[980px] pt-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-[40px] leading-tight text-primary">
              Academic Clarity
            </h1>
            <p className="text-muted text-sm mt-1">
              Algorithmic class generation & balancing
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="text-accent text-sm hover:underline font-heading"
              onClick={signOut}
            >
              Sign Out
            </button>
            <button
              className="h-12 px-5 rounded-[4px] border border-primary bg-primary text-surface font-heading font-bold text-sm hover:bg-[#0b1224]"
              onClick={createNewRoster}
            >
              Create New Roster
            </button>
          </div>
        </div>

        <div className="mt-8 bg-surface border border-muted/50 rounded-[4px] p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-sm text-primary">Recent Projects</h2>
            <button
              className="text-accent text-sm hover:underline font-heading"
              onClick={() => toast("“View All” is MVP—use the first 10 items.")}
            >
              View All
            </button>
          </div>

          <div className="mt-3">
            {loading ? (
              <div className="space-y-2">
                <div className="h-10 bg-muted/20 rounded-[4px] animate-pulse" />
                <div className="h-10 bg-muted/20 rounded-[4px] animate-pulse" />
                <div className="h-10 bg-muted/20 rounded-[4px] animate-pulse" />
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="text-muted text-sm p-6">
                No previous projects found.
              </div>
            ) : (
              <div className="space-y-2">
                {recentProjects.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left border border-muted/50 hover:bg-background/50 rounded-[4px] p-3 transition-colors"
                    onClick={() => navigate(`/configure/${p.id}`)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-heading font-bold text-primary text-sm">{p.title}</div>
                      <div className="text-muted text-xs font-mono">
                        {p.updated_at ? new Date(p.updated_at).toLocaleString() : ""}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

