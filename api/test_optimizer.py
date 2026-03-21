from optimizer import _optimize_request, OptimizeRequest, Constraints, Pupil, Chemistry


def test_infeasibility_diagnosis_returns_min_class_size_violation() -> None:
    from fastapi import HTTPException
    import pytest

    req = OptimizeRequest(
        projectId="project-1",
        constraints=Constraints(
            minClassSize=4,
            maxClassSize=10,
            genderPriority="ignore",
            originPriority="ignore",
            locationPriority="ignore",
            needsPriority="flexible",
        ),
        pupils=[
            Pupil(id="p1", name="Ada", gender="Female", originSchool="North", needs="None", zone="A"),
            Pupil(id="p2", name="Ben", gender="Male", originSchool="North", needs="None", zone="A"),
            Pupil(id="p3", name="Cam", gender="Male", originSchool="South", needs="None", zone="B"),
        ],
        chemistry=Chemistry(),
    )

    with pytest.raises(HTTPException) as exc_info:
        _optimize_request(req)

    assert exc_info.value.status_code == 400
    detail = exc_info.value.detail
    assert detail["violations"] == [
        {
            "category": "Min Class Size",
            "message": "Minimum class size of 4 requires at least 4 pupils per class, but only 3 pupils are available.",
            "suggestion": "Decrease Min Class Size or add more pupils before rerunning the optimizer.",
        }
    ]
