from http import HTTPStatus
from fastapi.testclient import TestClient

def test_should_create_account(client: TestClient):
    # Given: Valid account payload
    payload = {"name": "New E2E Acc", "cash": 1000.0}

    # When: Posting to /accounts
    response = client.post("/accounts", json=payload)

    # Then: Returns 200 and created account
    assert response.status_code == HTTPStatus.OK
    data = response.json()
    assert data["name"] == "New E2E Acc"
    assert data["id"] is not None

def test_should_list_accounts(client: TestClient):
    # Given: Existing account (created via API for isolation or fixture)
    client.post("/accounts", json={"name": "Listable", "cash": 0})

    # When: Getting /accounts
    response = client.get("/accounts")

    # Then: Returns list containing account
    assert response.status_code == HTTPStatus.OK
    accounts = response.json()
    assert len(accounts) >= 1

def test_should_update_account(client: TestClient):
    # Given: Existing account
    create_res = client.post("/accounts", json={"name": "Old Name", "cash": 10})
    acc_id = create_res.json()["id"]

    # When: Patching /accounts/{id}
    response = client.patch(f"/accounts/{acc_id}", json={"name": "New Name"})

    # Then: Returns updated account
    assert response.status_code == HTTPStatus.OK
    assert response.json()["name"] == "New Name"

def test_should_delete_account(client: TestClient):
    # Given: Existing account
    create_res = client.post("/accounts", json={"name": "To Delete", "cash": 0})
    acc_id = create_res.json()["id"]

    # When: Deleting /accounts/{id}
    response = client.delete(f"/accounts/{acc_id}")

    # Then: Returns 200 OK
    assert response.status_code == HTTPStatus.OK

    # And: Account is not found in list
    list_res = client.get("/accounts")
    assert not any(a["id"] == acc_id for a in list_res.json())

def test_should_return_404_when_deleting_non_existent_account(client: TestClient):
    # Given: Non-existent ID
    invalid_id = 99999

    # When: Deleting
    response = client.delete(f"/accounts/{invalid_id}")

    # Then: Returns 404
    assert response.status_code == HTTPStatus.NOT_FOUND
