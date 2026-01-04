from fastapi.testclient import TestClient

def test_create_and_list_accounts(client: TestClient):
    # Given: API client

    # When: Creating a new account
    response = client.post(
        "/accounts",
        json={"name": "E2E Portfolio", "cash": 50000}
    )

    # Then: Account is created successfully
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "E2E Portfolio"
    assert data["cash"] == 50000.0
    acc_id = data["id"]

    # When: Listing accounts
    list_res = client.get("/accounts")

    # Then: Account is present in list
    assert list_res.status_code == 200
    accounts = list_res.json()
    assert len(accounts) >= 1
    my_acc = next(a for a in accounts if a["id"] == acc_id)
    assert my_acc["name"] == "E2E Portfolio"

def test_update_account(client: TestClient):
    # Given: Existing account
    res = client.post("/accounts", json={"name": "To Update", "cash": 100})
    acc_id = res.json()["id"]

    # When: Updating name and cash
    update_res = client.patch(f"/accounts/{acc_id}", json={"name": "Updated Name", "cash": 200})

    # Then: Response reflects changes
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["name"] == "Updated Name"
    assert data["cash"] == 200.0

    # When: Verifying via Get
    list_res = client.get("/accounts")
    accounts = list_res.json()
    my_acc = next(a for a in accounts if a["id"] == acc_id)
    # Then: Changes are persisted
    assert my_acc["name"] == "Updated Name"

def test_delete_account(client: TestClient):
    # Given: Existing account
    res = client.post("/accounts", json={"name": "To Delete", "cash": 100})
    acc_id = res.json()["id"]

    # When: Deleting account
    del_res = client.delete(f"/accounts/{acc_id}")

    # Then: Success response
    assert del_res.status_code == 200

    # When: Listing accounts
    list_res = client.get("/accounts")
    accounts = list_res.json()
    # Then: Account is no longer found
    assert not any(a["id"] == acc_id for a in accounts)

def test_account_not_found(client: TestClient):
    # Given: Non-existent ID

    # When: Deleting invalid ID
    res = client.delete("/accounts/99999")
    # Then: 404 Not Found
    assert res.status_code == 404

    # When: Patching invalid ID
    res = client.patch("/accounts/99999", json={"name": "Ghost"})
    # Then: 404 Not Found
    assert res.status_code == 404
