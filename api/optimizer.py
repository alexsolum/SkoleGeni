from __future__ import annotations

import json
import math
import os
from typing import Dict, List, Literal, Optional, Tuple
from urllib import error as urllib_error
from urllib import parse as urllib_parse
from urllib import request as urllib_request

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

from ortools.sat.python import cp_model

app = FastAPI()


class Constraints(BaseModel):
    minClassSize: int = Field(..., ge=1)
    maxClassSize: int = Field(..., ge=1)
    genderPriority: Literal["strict", "flexible", "ignore"]
    originPriority: Literal["strict", "flexible", "best_effort", "ignore"]
    locationPriority: Literal["strict", "flexible", "ignore", "not_considered"]
    needsPriority: Literal["strict", "flexible"]


class Pupil(BaseModel):
    id: str
    name: str
    gender: Literal["Male", "Female", "Other"]
    originSchool: str
    needs: str
    zone: str


class Chemistry(BaseModel):
    # Directed edges: negative treated as undirected blocks in the solver.
    positive: List[Tuple[str, str]] = []
    negative: List[Tuple[str, str]] = []


class OptimizeRequest(BaseModel):
    projectId: str
    constraints: Constraints
    pupils: List[Pupil]
    chemistry: Chemistry = Chemistry()


class OptimizeProjectRequest(BaseModel):
    projectId: str


class Violation(BaseModel):
    category: str
    message: str
    suggestion: str


class DiagnosticResponse(BaseModel):
    violations: List[Violation]


class OptimizedClass(BaseModel):
    classIndex: int
    pupilIds: List[str]


class Score(BaseModel):
    overall: float
    genderBalance: float
    originMix: float
    needsBalance: float
    locationBalance: float
    chemistry: float


class OptimizeResponse(BaseModel):
    classes: List[OptimizedClass]
    score: Score
    debug: Dict[str, object] = {}


def _diagnostic_detail(violations: List[Violation]) -> Dict[str, object]:
    return DiagnosticResponse(violations=violations).model_dump()


def _raise_diagnostic_error(violations: List[Violation]) -> None:
    raise HTTPException(status_code=400, detail=_diagnostic_detail(violations))


def _dedupe_violations(violations: List[Violation]) -> List[Violation]:
    seen: set[Tuple[str, str, str]] = set()
    unique: List[Violation] = []
    for violation in violations:
        key = (violation.category, violation.message, violation.suggestion)
        if key in seen:
            continue
        seen.add(key)
        unique.append(violation)
    return unique


def _class_size_bound_violations(n: int, min_size: int, max_size: int) -> List[Violation]:
    violations: List[Violation] = []
    if n < min_size:
        violations.append(
            Violation(
                category="Min Class Size",
                message=(
                    f"Minimum class size of {min_size} requires at least {min_size} pupils per class, "
                    f"but only {n} pupils are available."
                ),
                suggestion="Decrease Min Class Size or add more pupils before rerunning the optimizer.",
            )
        )
    if max_size < min_size:
        violations.append(
            Violation(
                category="Class Size Bounds",
                message=(
                    f"Maximum class size of {max_size} is smaller than minimum class size of {min_size}."
                ),
                suggestion="Raise Max Class Size or lower Min Class Size so the bounds do not conflict.",
            )
        )
    if not violations:
        violations.append(
            Violation(
                category="Class Size Bounds",
                message="Current minimum and maximum class sizes do not allow any valid class count.",
                suggestion="Lower the minimum class size or raise the maximum class size before rerunning the optimizer.",
            )
        )
    return violations


def _supabase_url() -> str:
    return (
        os.getenv("SUPABASE_URL")
        or os.getenv("VITE_SUPABASE_URL")
        or ""
    ).rstrip("/")


def _supabase_anon_key() -> str:
    return (
        os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("VITE_SUPABASE_ANON_KEY")
        or ""
    )


def _fetch_json(url: str, headers: Dict[str, str]) -> object:
    req = urllib_request.Request(url, headers=headers)
    try:
        with urllib_request.urlopen(req, timeout=10) as response:
            payload = response.read().decode("utf-8")
            return json.loads(payload) if payload else None
    except urllib_error.HTTPError as exc:
        detail = exc.read().decode("utf-8")
        raise HTTPException(status_code=exc.code, detail=detail or "Supabase request failed") from exc
    except urllib_error.URLError as exc:
        raise HTTPException(status_code=502, detail="Failed to reach Supabase") from exc


def _project_state_headers(auth_header: str) -> Dict[str, str]:
    anon_key = _supabase_anon_key()
    if not anon_key:
        raise HTTPException(
            status_code=500,
            detail="Missing SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY for optimizer project execution.",
        )
    return {
        "apikey": anon_key,
        "Authorization": auth_header,
        "Content-Type": "application/json",
    }


def _load_project_optimize_request(project_id: str, auth_header: str) -> OptimizeRequest:
    supabase_url = _supabase_url()
    if not supabase_url:
        raise HTTPException(
            status_code=500,
            detail="Missing SUPABASE_URL or VITE_SUPABASE_URL for optimizer project execution.",
        )

    headers = _project_state_headers(auth_header)
    quoted_project_id = urllib_parse.quote(project_id, safe="")

    user_payload = _fetch_json(f"{supabase_url}/auth/v1/user", headers)
    if not isinstance(user_payload, dict) or not user_payload.get("id"):
        raise HTTPException(status_code=401, detail="Invalid authenticated session.")

    constraints_rows = _fetch_json(
        f"{supabase_url}/rest/v1/project_constraints?project_id=eq.{quoted_project_id}&select=*",
        headers,
    )
    pupils_rows = _fetch_json(
        f"{supabase_url}/rest/v1/pupils?project_id=eq.{quoted_project_id}&select=id,name,gender,origin_school,needs,zone",
        headers,
    )
    chemistry_rows = _fetch_json(
        f"{supabase_url}/rest/v1/chemistry_links?project_id=eq.{quoted_project_id}&select=from_pupil_id,to_pupil_id,relationship",
        headers,
    )

    constraints_row = constraints_rows[0] if isinstance(constraints_rows, list) and constraints_rows else None
    if constraints_row is None:
        raise HTTPException(status_code=400, detail="Project constraints must be saved before optimization.")
    if not isinstance(pupils_rows, list) or len(pupils_rows) == 0:
        raise HTTPException(status_code=400, detail="Project has no saved pupils to optimize.")

    chemistry_positive: List[Tuple[str, str]] = []
    chemistry_negative: List[Tuple[str, str]] = []
    if isinstance(chemistry_rows, list):
        for row in chemistry_rows:
            if not isinstance(row, dict):
                continue
            pair = (str(row.get("from_pupil_id", "")), str(row.get("to_pupil_id", "")))
            if not pair[0] or not pair[1]:
                continue
            if row.get("relationship") == "positive":
                chemistry_positive.append(pair)
            elif row.get("relationship") == "negative":
                chemistry_negative.append(pair)

    pupils = [
        Pupil(
            id=str(row["id"]),
            name=str(row["name"]),
            gender=str(row["gender"]),
            originSchool=str(row["origin_school"]),
            needs=str(row["needs"]),
            zone=str(row["zone"]),
        )
        for row in pupils_rows
        if isinstance(row, dict)
    ]

    return OptimizeRequest(
        projectId=project_id,
        constraints=Constraints(
            minClassSize=int(constraints_row["min_class_size"]),
            maxClassSize=int(constraints_row["max_class_size"]),
            genderPriority=str(constraints_row["gender_priority"]),
            originPriority=str(constraints_row["origin_priority"]),
            locationPriority=str(constraints_row["location_priority"]),
            needsPriority=str(constraints_row["needs_priority"]),
        ),
        pupils=pupils,
        chemistry=Chemistry(
            positive=chemistry_positive,
            negative=chemistry_negative,
        ),
    )


def _key_undirected(a: str, b: str) -> str:
    return f"{a}|{b}" if a < b else f"{b}|{a}"


def _derive_k_options(n: int, min_size: int, max_size: int) -> List[int]:
    k_low = math.ceil(n / max_size)
    k_high = math.floor(n / min_size)
    if k_low > k_high:
        return []
    return list(range(k_low, k_high + 1))


def _soft_abs_penalty(model: cp_model.CpModel, value_var: cp_model.IntVar, target: float) -> cp_model.IntVar:
    # CP-SAT uses integers, so we scale floats by 100 for stability.
    scaled_target = int(round(target * 100))
    scaled_value = model.NewIntVar(0, 10_000_000, "scaled_value")
    model.Add(scaled_value == value_var * 100)
    diff = model.NewIntVar(0, 10_000_000, "diff_abs")
    model.AddAbsEquality(diff, scaled_value - scaled_target)
    return diff


def _solve_for_k(
    req: OptimizeRequest,
    pupils: List[Pupil],
    idx_by_id: Dict[str, int],
    undirected_negative_blocks: set[str],
    k: int,
) -> Tuple[Optional[List[List[int]]], Optional[Dict[str, int]], Optional[int], Optional[List[Violation]]]:
    # Variables
    model = cp_model.CpModel()
    n = len(pupils)
    min_size = req.constraints.minClassSize
    max_size = req.constraints.maxClassSize

    assign = [[model.NewBoolVar(f"a_{i}_{c}") for c in range(k)] for i in range(n)]
    assumption_violations: Dict[int, Violation] = {}

    # Each pupil assigned to exactly one class
    for i in range(n):
        model.Add(sum(assign[i][c] for c in range(k)) == 1)

    # Class sizes
    for c in range(k):
        size = sum(assign[i][c] for i in range(n))
        min_size_lit = model.NewBoolVar(f"min_size_{c}")
        model.Add(size >= min_size).OnlyEnforceIf(min_size_lit)
        model.AddAssumption(min_size_lit)
        assumption_violations[min_size_lit.Index()] = Violation(
            category="Min Class Size",
            message=(
                f"Minimum class size of {min_size} cannot be satisfied across {k} classes with {n} pupils."
            ),
            suggestion="Decrease Min Class Size or reduce the number of classes before rerunning the optimizer.",
        )

        max_size_lit = model.NewBoolVar(f"max_size_{c}")
        model.Add(size <= max_size).OnlyEnforceIf(max_size_lit)
        model.AddAssumption(max_size_lit)
        assumption_violations[max_size_lit.Index()] = Violation(
            category="Max Class Size",
            message=(
                f"Maximum class size of {max_size} cannot be satisfied across {k} classes with {n} pupils."
            ),
            suggestion="Increase Max Class Size or allow more classes before rerunning the optimizer.",
        )

    # Precompute groups
    genders = ["Male", "Female", "Other"]
    origin_schools = sorted({p.originSchool for p in pupils})
    needs_values = sorted({p.needs for p in pupils})
    zones = sorted({p.zone for p in pupils})

    # Hard / soft constraint scaffolding
    genderPriority = req.constraints.genderPriority
    originPriority = req.constraints.originPriority
    locationPriority = req.constraints.locationPriority
    needsPriority = req.constraints.needsPriority

    # Objective components (integers)
    gender_pen = 0
    origin_pen = 0
    needs_pen = 0
    location_pen = 0
    chemistry_pen = 0

    # Gender
    if genderPriority != "ignore":
        total_by_gender = {g: sum(1 for p in pupils if p.gender == g) for g in genders}
        for g in genders:
            total = total_by_gender[g]
            base = total // k
            rem = total % k
            counts = []
            for c in range(k):
                cnt = model.NewIntVar(0, n, f"gender_{g}_count_{c}")
                model.Add(cnt == sum(assign[i][c] for i in range(n) if pupils[i].gender == g))
                counts.append(cnt)

                if genderPriority == "strict":
                    lower_lit = model.NewBoolVar(f"gender_{g}_strict_low_{c}")
                    model.Add(cnt >= base).OnlyEnforceIf(lower_lit)
                    model.AddAssumption(lower_lit)
                    assumption_violations[lower_lit.Index()] = Violation(
                        category="Gender Priority",
                        message=(
                            f"Strict gender balance for {g} pupils cannot be satisfied across {k} classes."
                        ),
                        suggestion="Change Gender Priority to flexible or adjust class-size bounds before rerunning.",
                    )

                    upper_lit = model.NewBoolVar(f"gender_{g}_strict_high_{c}")
                    model.Add(cnt <= base + 1).OnlyEnforceIf(upper_lit)
                    model.AddAssumption(upper_lit)
                    assumption_violations[upper_lit.Index()] = Violation(
                        category="Gender Priority",
                        message=(
                            f"Strict gender balance for {g} pupils cannot be satisfied across {k} classes."
                        ),
                        suggestion="Change Gender Priority to flexible or adjust class-size bounds before rerunning.",
                    )
                else:
                    avg = total / k if k else 0
                    # "Flexible allow 10% variance" -> hard tolerance for the MVP.
                    if genderPriority == "flexible":
                        low = int(math.floor((1 - 0.10) * avg))
                        high = int(math.ceil((1 + 0.10) * avg))
                        low = max(0, low)
                        model.Add(cnt >= low)
                        model.Add(cnt <= high)
                    # Soft objective: push toward proportional distribution
                    if genderPriority in ("flexible", "strict"):
                        # penalty is abs(cnt - avg)
                        diff = model.NewIntVar(0, n * 10_000, f"gender_{g}_diff_{c}")
                        model.AddAbsEquality(diff, cnt - int(round(avg)))
                        gender_pen += diff

    # Origin school mix
    if originPriority != "ignore":
        for origin in origin_schools:
            total = sum(1 for p in pupils if p.originSchool == origin)
            base = total // k
            for c in range(k):
                cnt = model.NewIntVar(0, n, f"origin_{origin}_count_{c}")
                model.Add(cnt == sum(assign[i][c] for i in range(n) if pupils[i].originSchool == origin))

                if originPriority == "strict":
                    lower_lit = model.NewBoolVar(f"origin_{origin}_strict_low_{c}")
                    model.Add(cnt >= base).OnlyEnforceIf(lower_lit)
                    model.AddAssumption(lower_lit)
                    assumption_violations[lower_lit.Index()] = Violation(
                        category="Origin Priority",
                        message=(
                            f"Strict origin-school balancing for {origin} cannot be satisfied across {k} classes."
                        ),
                        suggestion="Set Origin Priority to flexible or best effort before rerunning the optimizer.",
                    )

                    upper_lit = model.NewBoolVar(f"origin_{origin}_strict_high_{c}")
                    model.Add(cnt <= base + 1).OnlyEnforceIf(upper_lit)
                    model.AddAssumption(upper_lit)
                    assumption_violations[upper_lit.Index()] = Violation(
                        category="Origin Priority",
                        message=(
                            f"Strict origin-school balancing for {origin} cannot be satisfied across {k} classes."
                        ),
                        suggestion="Set Origin Priority to flexible or best effort before rerunning the optimizer.",
                    )
                elif originPriority == "flexible":
                    avg = total / k if k else 0
                    low = int(math.floor((1 - 0.10) * avg))
                    high = int(math.ceil((1 + 0.10) * avg))
                    low = max(0, low)
                    model.Add(cnt >= low)
                    model.Add(cnt <= high)
                    diff = model.NewIntVar(0, n * 10_000, f"origin_{origin}_diff_{c}")
                    model.AddAbsEquality(diff, cnt - int(round(avg)))
                    origin_pen += diff
                elif originPriority == "best_effort":
                    avg = total / k if k else 0
                    diff = model.NewIntVar(0, n * 10_000, f"origin_{origin}_diff_{c}")
                    model.AddAbsEquality(diff, cnt - int(round(avg)))
                    origin_pen += diff

    # Location / zone
    if locationPriority not in ("ignore", "not_considered"):
        for zone in zones:
            total = sum(1 for p in pupils if p.zone == zone)
            base = total // k
            for c in range(k):
                cnt = model.NewIntVar(0, n, f"zone_{zone}_count_{c}")
                model.Add(cnt == sum(assign[i][c] for i in range(n) if pupils[i].zone == zone))

                if locationPriority == "strict":
                    lower_lit = model.NewBoolVar(f"zone_{zone}_strict_low_{c}")
                    model.Add(cnt >= base).OnlyEnforceIf(lower_lit)
                    model.AddAssumption(lower_lit)
                    assumption_violations[lower_lit.Index()] = Violation(
                        category="Location Priority",
                        message=f"Strict zone balancing for {zone} cannot be satisfied across {k} classes.",
                        suggestion="Change Location Priority to flexible or widen the class-size limits before rerunning.",
                    )

                    upper_lit = model.NewBoolVar(f"zone_{zone}_strict_high_{c}")
                    model.Add(cnt <= base + 1).OnlyEnforceIf(upper_lit)
                    model.AddAssumption(upper_lit)
                    assumption_violations[upper_lit.Index()] = Violation(
                        category="Location Priority",
                        message=f"Strict zone balancing for {zone} cannot be satisfied across {k} classes.",
                        suggestion="Change Location Priority to flexible or widen the class-size limits before rerunning.",
                    )
                elif locationPriority == "flexible":
                    avg = total / k if k else 0
                    low = int(math.floor((1 - 0.10) * avg))
                    high = int(math.ceil((1 + 0.10) * avg))
                    low = max(0, low)
                    model.Add(cnt >= low)
                    model.Add(cnt <= high)
                    diff = model.NewIntVar(0, n * 10_000, f"zone_{zone}_diff_{c}")
                    model.AddAbsEquality(diff, cnt - int(round(avg)))
                    location_pen += diff

    # Needs distribution
    if needsPriority in ("strict", "flexible"):
        for need in needs_values:
            total = sum(1 for p in pupils if p.needs == need)
            base = total // k
            for c in range(k):
                cnt = model.NewIntVar(0, n, f"needs_{need}_count_{c}")
                model.Add(cnt == sum(assign[i][c] for i in range(n) if pupils[i].needs == need))

                avg = total / k if k else 0
                if needsPriority == "strict":
                    lower_lit = model.NewBoolVar(f"needs_{need}_strict_low_{c}")
                    model.Add(cnt >= base).OnlyEnforceIf(lower_lit)
                    model.AddAssumption(lower_lit)
                    assumption_violations[lower_lit.Index()] = Violation(
                        category="Needs Priority",
                        message=(
                            f"Strict needs balancing for {need} cannot be satisfied across {k} classes."
                        ),
                        suggestion="Change Needs Priority to flexible before rerunning the optimizer.",
                    )

                    upper_lit = model.NewBoolVar(f"needs_{need}_strict_high_{c}")
                    model.Add(cnt <= base + 1).OnlyEnforceIf(upper_lit)
                    model.AddAssumption(upper_lit)
                    assumption_violations[upper_lit.Index()] = Violation(
                        category="Needs Priority",
                        message=(
                            f"Strict needs balancing for {need} cannot be satisfied across {k} classes."
                        ),
                        suggestion="Change Needs Priority to flexible before rerunning the optimizer.",
                    )
                else:
                    low = int(math.floor((1 - 0.10) * avg))
                    high = int(math.ceil((1 + 0.10) * avg))
                    low = max(0, low)
                    model.Add(cnt >= low)
                    model.Add(cnt <= high)
                    diff = model.NewIntVar(0, n * 10_000, f"needs_{need}_diff_{c}")
                    model.AddAbsEquality(diff, cnt - int(round(avg)))
                    needs_pen += diff

    # Negative chemistry blocks: pupils in the same class are forbidden
    # The solver expects pairs as indices; create from undirected block keys.
    negative_pairs_idx: List[Tuple[int, int]] = []
    for key in undirected_negative_blocks:
        a, b = key.split("|", 1)
        if a in idx_by_id and b in idx_by_id and a != b:
            negative_pairs_idx.append((idx_by_id[a], idx_by_id[b]))

    for (i, j) in negative_pairs_idx:
        if i == j:
            continue
        for c in range(k):
            model.Add(assign[i][c] + assign[j][c] <= 1)

    # Positive chemistry: reward being in the same class (soft objective)
    positive_pairs = []
    for a, b in req.chemistry.positive:
        if a in idx_by_id and b in idx_by_id and a != b:
            positive_pairs.append((idx_by_id[a], idx_by_id[b]))

    # Deduplicate positive pairs (treat directed as undirected reward)
    pos_seen = set()
    unique_positive_pairs: List[Tuple[int, int]] = []
    for i, j in positive_pairs:
        key = (i, j) if i < j else (j, i)
        if key in pos_seen:
            continue
        pos_seen.add(key)
        unique_positive_pairs.append(key)

    chemistry_pen_vars = []
    for idx, (i, j) in enumerate(unique_positive_pairs):
        same = model.NewBoolVar(f"same_pos_{idx}")
        both_counts = []
        for c in range(k):
            both = model.NewBoolVar(f"both_pos_{idx}_{c}")
            model.Add(both <= assign[i][c])
            model.Add(both <= assign[j][c])
            model.Add(both >= assign[i][c] + assign[j][c] - 1)
            both_counts.append(both)
        # total_both is either 0 or 1 because each pupil is in exactly one class
        model.Add(sum(both_counts) == same)
        # penalty if separated
        penalty = model.NewIntVar(0, 1, f"chem_pen_{idx}")
        model.Add(penalty == 1 - same)
        chemistry_pen += penalty

    # Weighted objective
    # Notes: if a component isn't active (priority=ignore), it's 0.
    gender_w = 5
    origin_w = 3
    needs_w = 2
    location_w = 2
    chemistry_w = 10

    objective = (
        gender_w * gender_pen
        + origin_w * origin_pen
        + needs_w * needs_pen
        + location_w * location_pen
        + chemistry_w * chemistry_pen
    )

    model.Minimize(objective)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 8.0
    solver.parameters.num_search_workers = 1

    status = solver.Solve(model)
    if status == cp_model.INFEASIBLE:
        core = solver.SufficientAssumptionsForInfeasibility()
        violations = [assumption_violations[idx] for idx in core if idx in assumption_violations]
        return None, None, None, _dedupe_violations(violations)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None, None, None, None

    classes: List[List[int]] = [[] for _ in range(k)]
    for i in range(n):
        for c in range(k):
            if solver.Value(assign[i][c]) == 1:
                classes[c].append(i)
                break

    obj_value = int(solver.ObjectiveValue())
    debug = {"objective": obj_value}
    return classes, debug, obj_value, None


def _optimize_request(req: OptimizeRequest) -> OptimizeResponse:
    if not req.pupils:
        return OptimizeResponse(classes=[], score=Score(overall=0, genderBalance=0, originMix=0, needsBalance=0, locationBalance=0, chemistry=0))

    pupils = req.pupils
    idx_by_id = {p.id: i for i, p in enumerate(pupils)}
    n = len(pupils)
    min_size = req.constraints.minClassSize
    max_size = req.constraints.maxClassSize

    k_options = _derive_k_options(n, min_size, max_size)
    if not k_options:
        _raise_diagnostic_error(_class_size_bound_violations(n, min_size, max_size))

    # Negative blocks: treat directed edges as undirected blocks
    undirected_negative_blocks: set[str] = set()
    for a, b in req.chemistry.negative:
        if a in idx_by_id and b in idx_by_id and a != b:
            undirected_negative_blocks.add(_key_undirected(a, b))

    best_solution = None
    best_debug = None
    best_obj = None
    best_k = None
    collected_violations: List[Violation] = []

    for k in k_options:
        solution, debug, obj, diagnostics = _solve_for_k(
            req=req,
            pupils=pupils,
            idx_by_id=idx_by_id,
            undirected_negative_blocks=undirected_negative_blocks,
            k=k,
        )
        if diagnostics:
            collected_violations.extend(diagnostics)
        if solution is None:
            continue
        if best_obj is None or (obj is not None and obj < best_obj):
            best_solution = solution
            best_debug = debug
            best_obj = obj
            best_k = k

    if best_solution is None or best_debug is None or best_k is None:
        if collected_violations:
            _raise_diagnostic_error(_dedupe_violations(collected_violations))
        _raise_diagnostic_error(
            [
                Violation(
                    category="Optimizer",
                    message="The optimizer could not find a feasible solution with the current hard constraints.",
                    suggestion="Relax one or more strict priorities or class-size limits and try again.",
                )
            ]
        )

    # Convert to pupil IDs for output
    classes_out: List[OptimizedClass] = []
    for class_index, class_idxs in enumerate(best_solution):
        pupil_ids = [pupils[i].id for i in class_idxs]
        classes_out.append(OptimizedClass(classIndex=class_index, pupilIds=pupil_ids))

    # Simple scoring based on assignment penalties; returns 0..1 floats.
    def score_from_pen(pen: float, scale: float) -> float:
        return float(1.0 / (1.0 + (pen / scale if scale > 0 else 0.0)))

    def group_penalty(get_group) -> float:
        group_values = sorted({get_group(p) for p in pupils})
        penalty = 0.0
        for gv in group_values:
            total = sum(1 for p in pupils if get_group(p) == gv)
            ideal = total / best_k
            for class_idxs in best_solution:
                cnt = sum(1 for i in class_idxs if get_group(pupils[i]) == gv)
                penalty += abs(cnt - ideal)
        return penalty

    # Chemistry score as fraction of positive pairs together
    pos_pairs = {
        (min(idx_by_id[a], idx_by_id[b]), max(idx_by_id[a], idx_by_id[b]))
        for a, b in req.chemistry.positive
        if a in idx_by_id and b in idx_by_id and a != b
    }
    if len(pos_pairs) == 0:
        chemistry_score = 1.0
    else:
        pos_total = len(pos_pairs)
        class_of: Dict[int, int] = {}
        for ci, class_idxs in enumerate(best_solution):
            for i in class_idxs:
                class_of[i] = ci
        pos_together = sum(1 for i, j in pos_pairs if class_of.get(i) == class_of.get(j))
        chemistry_score = float(pos_together / pos_total)

    gender_score = (
        1.0
        if req.constraints.genderPriority == "ignore"
        else score_from_pen(group_penalty(lambda p: p.gender), scale=max(1, n))
    )

    origin_score = (
        1.0
        if req.constraints.originPriority == "ignore"
        else score_from_pen(group_penalty(lambda p: p.originSchool), scale=max(1, n))
    )

    needs_score = score_from_pen(group_penalty(lambda p: p.needs), scale=max(1, n))

    location_score = (
        1.0
        if req.constraints.locationPriority in ("ignore", "not_considered")
        else score_from_pen(group_penalty(lambda p: p.zone), scale=max(1, n))
    )

    overall = (gender_score * 0.2 + origin_score * 0.25 + needs_score * 0.2 + location_score * 0.15 + chemistry_score * 0.2)

    return OptimizeResponse(
        classes=classes_out,
        score=Score(
            overall=overall,
            genderBalance=gender_score,
            originMix=origin_score,
            needsBalance=needs_score,
            locationBalance=location_score,
            chemistry=chemistry_score,
        ),
        debug={
            "chosenClassCount": best_k,
            "objective": int(best_obj) if best_obj is not None else None
        },
    )


@app.post("/")
def optimize(req: OptimizeRequest) -> OptimizeResponse:
    return _optimize_request(req)


@app.post("/project")
def optimize_project(req: OptimizeProjectRequest, request: Request) -> OptimizeResponse:
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")

    project_request = _load_project_optimize_request(req.projectId, auth_header)
    return _optimize_request(project_request)

