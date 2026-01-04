from fastapi.testclient import TestClient

def test_create_and_list_accounts(client: TestClient):
    # Create
    response = client.post(
        "/accounts",
        json={"name": "E2E Portfolio", "cash": 50000}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "E2E Portfolio"
    assert data["cash"] == 50000.0
    acc_id = data["id"]

    # List
    list_res = client.get("/accounts")
    assert list_res.status_code == 200
    accounts = list_res.json()
    assert len(accounts) >= 1
    my_acc = next(a for a in accounts if a["id"] == acc_id)
    assert my_acc["name"] == "E2E Portfolio"

def test_update_account(client: TestClient):
    # Setup
    res = client.post("/accounts", json={"name": "To Update", "cash": 100})
    acc_id = res.json()["id"]

    # Update
    update_res = client.patch(f"/accounts/{acc_id}", json={"name": "Updated Name", "cash": 200})
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["name"] == "Updated Name"
    assert data["cash"] == 200.0

    # Verify Get
    list_res = client.get("/accounts")
    accounts = list_res.json()
    my_acc = next(a for a in accounts if a["id"] == acc_id)
    assert my_acc["name"] == "Updated Name"

def test_delete_account(client: TestClient):
    res = client.post("/accounts", json={"name": "To Delete", "cash": 100})
    acc_id = res.json()["id"]

    del_res = client.delete(f"/accounts/{acc_id}")
    assert del_res.status_code == 200

    # Verify Gone
    list_res = client.get("/accounts")
    accounts = list_res.json()
    assert not any(a["id"] == acc_id for a in accounts)

def test_account_not_found(client: TestClient):
    res = client.delete("/accounts/99999")
    assert res.status_code == 404

    res = client.patch("/accounts/99999", json={"name": "Ghost"})
    assert res.status_code == 404
