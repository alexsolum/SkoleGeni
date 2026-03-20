from optimizer import OptimizeRequest, _optimize_request


FIXTURES = {
    "perfectly_balanced": {
        "projectId": "fixture-perfectly-balanced",
        "constraints": {
            "minClassSize": 4,
            "maxClassSize": 4,
            "genderPriority": "flexible",
            "originPriority": "best_effort",
            "locationPriority": "flexible",
            "needsPriority": "flexible",
        },
        "pupils": [
            {"id": "p1", "name": "Ada", "gender": "Female", "originSchool": "North", "needs": "None", "zone": "A"},
            {"id": "p2", "name": "Bo", "gender": "Male", "originSchool": "North", "needs": "Support", "zone": "A"},
            {"id": "p3", "name": "Cia", "gender": "Female", "originSchool": "South", "needs": "None", "zone": "B"},
            {"id": "p4", "name": "Dan", "gender": "Male", "originSchool": "South", "needs": "Support", "zone": "B"},
            {"id": "p5", "name": "Eli", "gender": "Female", "originSchool": "North", "needs": "None", "zone": "A"},
            {"id": "p6", "name": "Fay", "gender": "Male", "originSchool": "North", "needs": "Support", "zone": "A"},
            {"id": "p7", "name": "Gia", "gender": "Female", "originSchool": "South", "needs": "None", "zone": "B"},
            {"id": "p8", "name": "Hal", "gender": "Male", "originSchool": "South", "needs": "Support", "zone": "B"},
        ],
        "chemistry": {"positive": [], "negative": []},
    },
    "chemistry_conflict": {
        "projectId": "fixture-chemistry-conflict",
        "constraints": {
            "minClassSize": 3,
            "maxClassSize": 3,
            "genderPriority": "flexible",
            "originPriority": "best_effort",
            "locationPriority": "flexible",
            "needsPriority": "flexible",
        },
        "pupils": [
            {"id": "p1", "name": "Ada", "gender": "Female", "originSchool": "North", "needs": "None", "zone": "A"},
            {"id": "p2", "name": "Bo", "gender": "Male", "originSchool": "North", "needs": "Support", "zone": "A"},
            {"id": "p3", "name": "Cia", "gender": "Female", "originSchool": "North", "needs": "None", "zone": "A"},
            {"id": "p4", "name": "Dan", "gender": "Male", "originSchool": "South", "needs": "Support", "zone": "B"},
            {"id": "p5", "name": "Eli", "gender": "Male", "originSchool": "South", "needs": "None", "zone": "B"},
            {"id": "p6", "name": "Fay", "gender": "Female", "originSchool": "South", "needs": "Support", "zone": "B"},
        ],
        "chemistry": {"positive": [["p1", "p2"], ["p1", "p3"], ["p4", "p5"]], "negative": []},
    },
    "boundary_sizes": {
        "projectId": "fixture-boundary-sizes",
        "constraints": {
            "minClassSize": 2,
            "maxClassSize": 3,
            "genderPriority": "flexible",
            "originPriority": "best_effort",
            "locationPriority": "flexible",
            "needsPriority": "flexible",
        },
        "pupils": [
            {"id": "p1", "name": "Ada", "gender": "Female", "originSchool": "North", "needs": "None", "zone": "A"},
            {"id": "p2", "name": "Bo", "gender": "Male", "originSchool": "North", "needs": "Support", "zone": "A"},
            {"id": "p3", "name": "Cia", "gender": "Female", "originSchool": "South", "needs": "None", "zone": "B"},
            {"id": "p4", "name": "Dan", "gender": "Male", "originSchool": "South", "needs": "Support", "zone": "B"},
            {"id": "p5", "name": "Eli", "gender": "Female", "originSchool": "North", "needs": "None", "zone": "A"},
        ],
        "chemistry": {"positive": [], "negative": []},
    },
}


def solve_fixture(name: str):
    payload = FIXTURES[name]
    request = OptimizeRequest.model_validate(payload)
    return _optimize_request(request)


def test_perfectly_balanced_fixture_preserves_full_satisfaction() -> None:
    response = solve_fixture("perfectly_balanced")

    assert len(response.classes) == 2
    assert all(len(classroom.pupilIds) == 4 for classroom in response.classes)
    assert response.score.overall == 1.0
    assert response.score.genderBalance == 1.0
    assert response.score.originMix == 1.0
    assert response.score.needsBalance == 1.0
    assert response.score.locationBalance == 1.0
    assert response.score.chemistry == 1.0
    assert response.debug["sacrificed_priorities"] == []


def test_chemistry_conflict_fixture_reports_tradeoffs_without_regressing_links() -> None:
    response = solve_fixture("chemistry_conflict")
    assignments = {classroom.classIndex: set(classroom.pupilIds) for classroom in response.classes}

    assert len(response.classes) == 2
    assert any({"p1", "p2"}.issubset(pupil_ids) or {"p1", "p3"}.issubset(pupil_ids) for pupil_ids in assignments.values())
    assert response.score.chemistry >= 2 / 3
    assert response.debug["sacrificed_priorities"]
    assert "chemistry" in response.debug["worst_class_highlights"]


def test_boundary_sizes_fixture_keeps_assignments_within_allowed_limits() -> None:
    response = solve_fixture("boundary_sizes")
    class_sizes = sorted(len(classroom.pupilIds) for classroom in response.classes)

    assert len(response.classes) == 2
    assert class_sizes == [2, 3]
    assert sum(class_sizes) == len(FIXTURES["boundary_sizes"]["pupils"])
    assert all(0.0 <= value <= 1.0 for value in response.score.model_dump().values())
