from app import _build_renda_bruta_duplicate_lookup, _renda_bruta_duplicate_key


def test_renda_bruta_duplicate_key_normalizes_currency_formats():
    assert _renda_bruta_duplicate_key("2.400,00") == 240000
    assert _renda_bruta_duplicate_key(2400.0) == 240000
    assert _renda_bruta_duplicate_key("0") is None
    assert _renda_bruta_duplicate_key(None) is None


def test_build_renda_bruta_duplicate_lookup_marks_equal_incomes():
    lookup = _build_renda_bruta_duplicate_lookup(
        [
            ("p1", 2400.0, "Joao Brito"),
            ("p2", 2350.0, "Maria das Neves"),
            ("p3", 2400.0, "Carlos Manuel"),
            ("p4", 2000.0, "Nataha Bianca"),
            ("p5", 2350.0, "Pedro Carlos"),
        ]
    )

    assert set(lookup) == {"p1", "p2", "p3", "p5"}
    assert lookup["p1"]["clientes"] == ["Joao Brito", "Carlos Manuel"]
    assert "R$ 2.400,00" in lookup["p1"]["tooltip"]
    assert lookup["p2"]["clientes"] == ["Maria Neves", "Pedro Carlos"]
    assert "R$ 2.350,00" in lookup["p2"]["tooltip"]
