from optimizer import Chemistry, Constraints, OptimizeRequest, Pupil, _optimize_request


def build_request() -> OptimizeRequest:
    return OptimizeRequest(
        projectId="project-explainability",
        constraints=Constraints(
            minClassSize=3,
            maxClassSize=3,
            genderPriority="flexible",
            originPriority="best_effort",
            locationPriority="flexible",
            needsPriority="flexible",
        ),
        pupils=[
            Pupil(id="p1", name="Ada", gender="Female", originSchool="North", needs="None", zone="A"),
            Pupil(id="p2", name="Bo", gender="Male", originSchool="North", needs="Support", zone="A"),
            Pupil(id="p3", name="Cia", gender="Female", originSchool="North", needs="None", zone="A"),
            Pupil(id="p4", name="Dan", gender="Male", originSchool="South", needs="Support", zone="B"),
            Pupil(id="p5", name="Eli", gender="Male", originSchool="South", needs="None", zone="B"),
            Pupil(id="p6", name="Fay", gender="Female", originSchool="South", needs="Support", zone="B"),
        ],
        chemistry=Chemistry(positive=[("p1", "p2"), ("p1", "p3"), ("p4", "p5")], negative=[]),
    )


def test_explainability_scores_are_normalized_and_positive() -> None:
    response = _optimize_request(build_request())

    assert 0.0 <= response.score.overall <= 1.0
    assert 0.0 <= response.score.genderBalance <= 1.0
    assert 0.0 <= response.score.originMix <= 1.0
    assert 0.0 <= response.score.needsBalance <= 1.0
    assert 0.0 <= response.score.locationBalance <= 1.0
    assert 0.0 <= response.score.chemistry <= 1.0


def test_explainability_debug_lists_sacrificed_priorities_and_outliers() -> None:
    response = _optimize_request(build_request())

    sacrificed = response.debug.get("sacrificed_priorities")
    highlights = response.debug.get("worst_class_highlights")

    assert isinstance(sacrificed, list)
    assert sacrificed
    assert all(item["key"] in {"genderBalance", "originMix", "needsBalance", "locationBalance", "chemistry"} for item in sacrificed)
    assert all(0 <= item["satisfactionPct"] <= 100 for item in sacrificed)
    assert isinstance(highlights, dict)
    assert set(highlights) >= {
        "genderBalance",
        "originMix",
        "needsBalance",
        "locationBalance",
        "chemistry",
    }
    assert all(isinstance(value, int) and value >= 0 for value in highlights.values())
