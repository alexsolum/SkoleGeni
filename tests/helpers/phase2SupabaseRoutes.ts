import type { Page, Route } from "@playwright/test";

import {
  PHASE2_AUTH_STORAGE_KEY,
  PHASE2_PROJECT_ID,
  blockedDraftRow,
  phase2Session,
  savedConstraintRow,
  savedPupilRows
} from "../fixtures/phase2WorkflowData";

type ProjectRow = {
  id: string;
  title: string;
  updated_at: string | null;
};

type ConstraintRow = typeof savedConstraintRow;
type PupilRow = (typeof savedPupilRows)[number];
type ChemistryRow = {
  from_pupil_id: string;
  to_pupil_id: string;
  relationship: "positive" | "negative";
  project_id: string;
};

type DraftSnapshot = {
  pupils: Array<{
    id: string;
    name: string;
    gender: "Male" | "Female" | "Other";
    originSchool: string;
    needs: string;
    zone: string;
  }> | null;
  chemistry: {
    positive: Array<[string, string]>;
    negative: Array<[string, string]>;
  } | null;
};

type Store = {
  projects: ProjectRow[];
  constraints: ConstraintRow[];
  pupils: PupilRow[];
  chemistry: ChemistryRow[];
  draftSnapshots: Record<string, DraftSnapshot>;
  failNextRosterSave: boolean;
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  });
}

function draftKeys(projectId: string) {
  return {
    pupilDraftKey: `skolegeni:pupil-draft:${projectId}`,
    chemistryDraftKey: `skolegeni:chemistry-draft:${projectId}`
  };
}

function setNullDraft(projectId: string, store: Store) {
  store.draftSnapshots[projectId] = {
    pupils: null,
    chemistry: null
  };
}

function syncDraftSnapshot(projectId: string, store: Store, pupils: Store["draftSnapshots"][string]["pupils"]) {
  const current = store.draftSnapshots[projectId] ?? { pupils: null, chemistry: null };
  store.draftSnapshots[projectId] = {
    ...current,
    pupils
  };
}

export async function installPhase2SupabaseRoutes(page: Page) {
  const store: Store = {
    projects: [],
    constraints: [],
    pupils: [],
    chemistry: [],
    draftSnapshots: {
      [PHASE2_PROJECT_ID]: {
        pupils: [blockedDraftRow],
        chemistry: { positive: [], negative: [] }
      }
    },
    failNextRosterSave: false
  };

  await page.addInitScript(
    ({ authStorageKey, session, projectId }) => {
      window.localStorage.setItem(authStorageKey, JSON.stringify(session));
      const pupilDraftKey = `skolegeni:pupil-draft:${projectId}`;
      const chemistryDraftKey = `skolegeni:chemistry-draft:${projectId}`;
      if (!window.sessionStorage.getItem(pupilDraftKey)) {
        window.sessionStorage.setItem(pupilDraftKey, JSON.stringify([]));
      }
      if (!window.sessionStorage.getItem(chemistryDraftKey)) {
        window.sessionStorage.setItem(
          chemistryDraftKey,
          JSON.stringify({ positive: [], negative: [] })
        );
      }
    },
    {
      authStorageKey: PHASE2_AUTH_STORAGE_KEY,
      session: phase2Session,
      projectId: PHASE2_PROJECT_ID
    }
  );

  await page.route("**/auth/v1/user", async (route) => {
    await json(route, phase2Session.user);
  });

  await page.route("**/auth/v1/token?grant_type=refresh_token", async (route) => {
    await json(route, phase2Session);
  });

  await page.route("**/rest/v1/projects*", async (route) => {
    const request = route.request();

    if (request.method() === "POST") {
      const body = JSON.parse(request.postData() ?? "{}") as { title?: string };
      const project = {
        id: PHASE2_PROJECT_ID,
        title: body.title ?? "New Roster",
        updated_at: "2026-03-20T09:00:00.000Z"
      };
      store.projects = [project];
      return json(route, project, 201);
    }

    return json(route, store.projects);
  });

  await page.route("**/rest/v1/project_constraints*", async (route) => {
    const request = route.request();

    if (request.method() === "POST") {
      const body = JSON.parse(request.postData() ?? "{}") as ConstraintRow;
      store.constraints = [body];
      return json(route, [body], 201);
    }

    const row = store.constraints.find((entry) => entry.project_id === PHASE2_PROJECT_ID) ?? null;
    return json(route, row);
  });

  await page.route("**/rest/v1/pupils*", async (route) => {
    await json(route, store.pupils.filter((row) => row.project_id === PHASE2_PROJECT_ID));
  });

  await page.route("**/rest/v1/chemistry_links*", async (route) => {
    await json(route, store.chemistry.filter((row) => row.project_id === PHASE2_PROJECT_ID));
  });

  await page.route("**/rest/v1/optimization_runs*", async (route) => {
    await json(route, [{ id: "run-1" }], 201);
  });

  await page.route("**/rest/v1/rpc/replace_project_roster_state", async (route) => {
    if (store.failNextRosterSave) {
      store.failNextRosterSave = false;
      return json(route, { message: "simulated save failure" }, 500);
    }

    const body = JSON.parse(route.request().postData() ?? "{}") as {
      project_id_input: string;
      pupils_input: Array<{
        id: string;
        name: string;
        gender: "Male" | "Female" | "Other";
        origin_school: string;
        needs: string;
        zone: string;
      }>;
      chemistry_input: {
        positive: Array<{ from_pupil_id: string; to_pupil_id: string }>;
        negative: Array<{ from_pupil_id: string; to_pupil_id: string }>;
      };
    };

    store.pupils = body.pupils_input.map((row) => ({
      ...row,
      project_id: body.project_id_input
    }));
    store.chemistry = body.chemistry_input.positive
      .map((row) => ({
        ...row,
        relationship: "positive" as const,
        project_id: body.project_id_input
      }))
      .concat(
        body.chemistry_input.negative.map((row) => ({
          ...row,
          relationship: "negative" as const,
          project_id: body.project_id_input
        }))
      );
    setNullDraft(body.project_id_input, store);
    return json(route, null);
  });

  return {
    projectId: PHASE2_PROJECT_ID,
    authStorageKey: PHASE2_AUTH_STORAGE_KEY,
    seedSavedWorkflow() {
      store.projects = [
        {
          id: PHASE2_PROJECT_ID,
          title: "New Roster",
          updated_at: "2026-03-20T09:00:00.000Z"
        }
      ];
      store.constraints = [savedConstraintRow];
      store.pupils = [...savedPupilRows];
      store.chemistry = [];
      setNullDraft(PHASE2_PROJECT_ID, store);
    },
    setFailNextRosterSave() {
      store.failNextRosterSave = true;
    },
    async syncDraftFromBrowser() {
      const { pupilDraftKey, chemistryDraftKey } = draftKeys(PHASE2_PROJECT_ID);
      const snapshot = await page.evaluate(({ nextPupilDraftKey, nextChemistryDraftKey }) => ({
        pupils: JSON.parse(window.sessionStorage.getItem(nextPupilDraftKey) ?? "null"),
        chemistry: JSON.parse(window.sessionStorage.getItem(nextChemistryDraftKey) ?? "null")
      }), {
        nextPupilDraftKey: pupilDraftKey,
        nextChemistryDraftKey: chemistryDraftKey
      });
      syncDraftSnapshot(PHASE2_PROJECT_ID, store, snapshot.pupils);
      store.draftSnapshots[PHASE2_PROJECT_ID] = {
        pupils: snapshot.pupils,
        chemistry: snapshot.chemistry
      };
    },
    getDraftSnapshot() {
      return store.draftSnapshots[PHASE2_PROJECT_ID];
    }
  };
}
