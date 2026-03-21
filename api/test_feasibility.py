"""Optimizer feasibility edge-case tests for QUAL-01."""

from fastapi.testclient import TestClient

from optimizer import app


client = TestClient(app)


def build_pupils(count: int):
    origin_schools = ["North", "South", "West"]
    needs_values = ["None", "Support"]
    zones = ["A", "B"]

    return [
        {
            "id": f"p{index + 1}",
            "name": f"Pupil {index + 1}",
            "gender": "Female" if index % 2 == 0 else "Male",
            "originSchool": origin_schools[index % len(origin_schools)],
            "needs": needs_values[index % len(needs_values)],
            "zone": zones[index % len(zones)],
        }
        for index in range(count)
    ]


def build_request(pupil_count: int, min_class_size: int, max_class_size: int):
    return {
        "projectId": "project-feasibility",
        "constraints": {
            "minClassSize": min_class_size,
            "maxClassSize": max_class_size,
            "genderPriority": "ignore",
            "originPriority": "ignore",
            "locationPriority": "ignore",
            "needsPriority": "flexible",
        },
        "pupils": build_pupils(pupil_count),
        "chemistry": {"positive": [], "negative": []},
    }


def test_min_exceeds_max_class_size():
    response = client.post("/", json=build_request(20, min_class_size=30, max_class_size=10))

    assert response.status_code == 400
    assert response.json()["detail"]["violations"] == [
        {
            "category": "Min Class Size",
            "message": "Minimum class size of 30 requires at least 30 pupils per class, but only 20 pupils are available.",
            "suggestion": "Decrease Min Class Size or add more pupils before rerunning the optimizer.",
        },
        {
            "category": "Class Size Bounds",
            "message": "Maximum class size of 10 is smaller than minimum class size of 30.",
            "suggestion": "Raise Max Class Size or lower Min Class Size so the bounds do not conflict.",
        },
    ]


def test_zero_pupils():
    response = client.post("/", json=build_request(0, min_class_size=1, max_class_size=5))

    assert response.status_code == 200
    assert response.json() == {
        "classes": [],
        "score": {
            "overall": 0.0,
            "genderBalance": 0.0,
            "originMix": 0.0,
            "needsBalance": 0.0,
            "locationBalance": 0.0,
            "chemistry": 0.0,
        },
        "debug": {},
    }


def test_single_class_feasible():
    response = client.post("/", json=build_request(5, min_class_size=3, max_class_size=10))

    assert response.status_code == 200
    body = response.json()
    assert len(body["classes"]) == 1
    assert body["classes"][0]["classIndex"] == 0
    assert body["classes"][0]["pupilIds"] == [f"p{index}" for index in range(1, 6)]


def test_pupils_fewer_than_min_class_size():
    response = client.post("/", json=build_request(2, min_class_size=5, max_class_size=10))

    assert response.status_code == 400
    assert response.json()["detail"]["violations"] == [
        {
            "category": "Min Class Size",
            "message": "Minimum class size of 5 requires at least 5 pupils per class, but only 2 pupils are available.",
            "suggestion": "Decrease Min Class Size or add more pupils before rerunning the optimizer.",
        }
    ]


def test_exact_fit():
    response = client.post("/", json=build_request(6, min_class_size=3, max_class_size=3))

    assert response.status_code == 200
    class_sizes = sorted(len(group["pupilIds"]) for group in response.json()["classes"])
    assert class_sizes == [3, 3]
