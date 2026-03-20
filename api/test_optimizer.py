from fastapi.testclient import TestClient

from optimizer import app


client = TestClient(app)


def test_infeasibility_diagnosis_returns_min_class_size_violation() -> None:
    response = client.post(
        "/",
        json={
            "projectId": "project-1",
            "constraints": {
                "minClassSize": 4,
                "maxClassSize": 10,
                "genderPriority": "ignore",
                "originPriority": "ignore",
                "locationPriority": "ignore",
                "needsPriority": "flexible",
            },
            "pupils": [
                {
                    "id": "p1",
                    "name": "Ada",
                    "gender": "Female",
                    "originSchool": "North",
                    "needs": "None",
                    "zone": "A",
                },
                {
                    "id": "p2",
                    "name": "Ben",
                    "gender": "Male",
                    "originSchool": "North",
                    "needs": "None",
                    "zone": "A",
                },
                {
                    "id": "p3",
                    "name": "Cam",
                    "gender": "Male",
                    "originSchool": "South",
                    "needs": "None",
                    "zone": "B",
                },
            ],
            "chemistry": {"positive": [], "negative": []},
        },
    )

    assert response.status_code == 400
    body = response.json()
    assert "detail" in body
    assert body["detail"]["violations"] == [
        {
            "category": "Min Class Size",
            "message": "Minimum class size of 4 requires at least 4 pupils per class, but only 3 pupils are available.",
            "suggestion": "Decrease Min Class Size or add more pupils before rerunning the optimizer.",
        }
    ]
