"""
최대 비교차 하위 문자열 - 테스트 코드

pytest research/test_algorithm_max_substrings.py -v
"""

import pytest
from algorithm_max_substrings import solution


class TestGivenExamples:
    """문제에서 주어진 예시"""

    def test_sashalikesana(self):
        # [sas]h[alikesana] 또는 sa[shalikes][ana] 등 → 2
        assert solution("sashalikesana") == 2

    def test_zzaaabbccall(self):
        # [zz][aaa][bb][cc]a[ll] → 5
        assert solution("zzaaabbccall") == 5

    def test_thing(self):
        # 동일한 문자로 시작/끝나는 길이 2 이상 하위 문자열 없음 → 0
        assert solution("thing") == 0


class TestEdgeCases:
    """경계값 테스트"""

    def test_single_char(self):
        assert solution("a") == 0

    def test_two_same_chars(self):
        # [aa] → 1
        assert solution("aa") == 1

    def test_two_different_chars(self):
        assert solution("ab") == 0

    def test_all_unique(self):
        assert solution("abcdefghijklmnopqrstuvwxyz") == 0

    def test_all_same_four(self):
        # [aa][aa] → 2
        assert solution("aaaa") == 2

    def test_all_same_six(self):
        # [aa][aa][aa] → 3
        assert solution("aaaaaa") == 3

    def test_all_same_odd(self):
        # [aa][aa]a → 2  (마지막 a는 쌍 없음)
        assert solution("aaaaa") == 2


class TestGreedyOptimality:
    """탐욕법 최적성 검증"""

    def test_adjacent_pairs(self):
        # [aa][bb][cc] → 3
        assert solution("aabbcc") == 3

    def test_nested_intervals(self):
        # "abba": [bb]=1 또는 [abba]=1, 최대 1
        assert solution("abba") == 1

    def test_prefer_smaller_intervals(self):
        # "abacaba": a=[0,2,4,6], b=[1,5], c=[3]
        # [a(0,2)] then [a(4,6)] = 2
        assert solution("abacaba") == 2

    def test_interleaved_chars(self):
        # "ababab": a=[0,2,4], b=[1,3,5]
        # [a(0,2)] then [b(3,5)] = 2
        assert solution("ababab") == 2

    def test_inner_interval_wins(self):
        # "xaax": [aa](1,2) 선택 → 1
        # [xaax](0,3) 선택 → 1
        # 최대는 1
        assert solution("xaax") == 1

    def test_inner_then_outer_not_possible(self):
        # "xaaxbbx": [aa](1,2) + [bb](4,5) = 2
        # [xaax](0,3) + [bb](4,5) = 2
        assert solution("xaaxbbx") == 2


class TestAlgorithmCorrectness:
    """알고리즘 정확성 심화 테스트"""

    def test_one_char_repeating_many_times(self):
        # "a" * 100 → 50쌍
        assert solution("a" * 100) == 50

    def test_alternating_two_chars(self):
        # "abababab": a=[0,2,4,6], b=[1,3,5,7]
        # [a(0,2)] + [b(3,5)] = 2
        # 또는 [a(0,2)] + [a(4,6)] = 2? → 둘 다 2
        assert solution("abababab") == 2

    def test_long_gap_between_same_char(self):
        # "acccccca": a는 0과 7에만 있음
        # a:[0,7] 하나 or 내부 [cc][cc][cc] 등
        # 내부: c=[1,2,3,4,5,6] → [cc][cc][cc] = 3
        # [acccccca] = 1
        # 탐욕법: j=2 c(1,2) pick. j=4 c(3,4) pick. j=6 c(5,6) pick. → 3
        assert solution("acccccca") == 3

    def test_greedy_skips_then_picks(self):
        # "aab": j=1 a(0,1) pick(last_end=1). j=2 b 없음 → 1
        assert solution("aab") == 1

    def test_last_seen_update_enables_later_pick(self):
        # "aaba": j=1 a(0,1) pick(last_end=1). j=3 a(1,3) → 1>1? No, skip.
        # last_seen[a]=3 at j=3 but we already updated at j=1 to 1, j=3 updates to 3.
        # 하지만 j=3에서 skip했으므로 count=1
        assert solution("aaba") == 1

    def test_multiple_chars_complex(self):
        # "abcabc": a=[0,3], b=[1,4], c=[2,5]
        # j=3: a(0,3). 0>-1 pick. last_end=3. count=1
        # j=4: b(1,4). 1>3? No skip.
        # j=5: c(2,5). 2>3? No skip.
        # count=1
        assert solution("abcabc") == 1

    def test_back_to_back_different_chars(self):
        # "aabb": [aa][bb] → 2
        assert solution("aabb") == 2

    def test_single_repetition_each(self):
        # "abba": [bb]=1
        assert solution("abba") == 1


class TestPerformance:
    """성능 테스트 - N=200,000"""

    def test_large_input_all_same(self):
        n = 200_000
        result = solution("a" * n)
        assert result == n // 2

    def test_large_input_alternating(self):
        n = 200_000
        s = "ab" * (n // 2)
        result = solution(s)
        # 매 2칸마다 선택 가능한 구간이 절반씩 줄어듦
        assert result > 0

    def test_large_input_all_unique_pattern(self):
        import string
        # 26개 문자 반복
        n = 200_000
        s = (string.ascii_lowercase * (n // 26 + 1))[:n]
        result = solution(s)
        assert result > 0
