"""
최대 비교차 하위 문자열 개수 찾기

각 하위 문자열이 동일한 문자로 시작하고 끝나며, 최소 2개 문자를 포함하는
교차하지 않는 하위 문자열의 최대 개수를 반환한다.

알고리즘: O(n) 단일 패스 그리디
- 각 문자의 가장 최근 이전 위치 추적
- 후보 구간 = [이전 위치, 현재 위치]
- 구간이 겹치지 않으면 탐욕적으로 선택
"""


def solution(S: str) -> int:
    last_seen: dict[str, int] = {}
    count = 0
    last_end = -1

    for j, c in enumerate(S):
        if c in last_seen:
            l = last_seen[c]
            if l > last_end:
                count += 1
                last_end = j
        last_seen[c] = j

    return count
