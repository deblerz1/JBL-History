from datetime import datetime
import unittest

from jbl_history.refresh import season_for_date, validate_receipt


class RefreshTests(unittest.TestCase):
    def test_season_rollover(self):
        for month, expected in [(1, 2026), (2, 2026), (3, 2027), (9, 2027)]:
            self.assertEqual(season_for_date(datetime(2027, month, 1)), expected)

    def test_wrong_destination_or_empty_import_fails(self):
        for result in [
            {"league_id": 1, "season": 2026, "teams": 10},
            {"league_id": 1550163, "season": 2025, "teams": 10},
            {"league_id": 1550163, "season": 2026, "teams": 0},
        ]:
            with self.assertRaises(ValueError):
                validate_receipt(result, 2026)
        validate_receipt({"league_id": 1550163, "season": 2026, "teams": 10}, 2026)
