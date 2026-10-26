from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app import create_app

MODEL_PATH = Path(__file__).resolve().parents[1] / "artifacts/classifier.joblib"


@pytest.fixture(scope="module")
def client():
    app = create_app(str(MODEL_PATH))
    with TestClient(app) as test_client:
        yield test_client


def test_health_reports_production_model(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["ready"] is True
    assert data["model"]["experimental"] is False
    assert data["model"]["demo"] is False
    assert set(data["model"]["labels"]) == {"Certificate", "Invoice", "Receipt", "Report"}


def test_invoice_prediction(client):
    res = client.post("/predict", json={
        "text": """TAX INVOICE / BILLING STATEMENT
Invoice Number: 96051364
Invoice Date: 04/28/2024
Due Date: 05/28/2024
Seller / Supplier: Jackson Industrial Supplies Ltd
Bill To / Client: Williams Logistics Corp
Seller Tax ID: 914-85-0938
Buyer Tax ID: 963-87-9620
Payment Terms: Net 30 days
Itemized Billing:
- Marble Top Center Table | Qty: 4 | Unit Price: $2,400.00 | Total: $9,600.00
- Heavy Duty Industrial Casters | Qty: 10 | Unit Price: $45.00 | Total: $450.00
Subtotal: $10,050.00
Tax Amount: $804.00
Total Balance Due: $10,854.00
Please remit payment to bank account."""
    })
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "Invoice"
    assert data["confidence"] >= 0.45
    assert data["experimental"] is False


def test_receipt_prediction(client):
    res = client.post("/predict", json={
        "text": "RETAIL SALES RECEIPT. STORE NO: 4012. Cashier: Sarah. Date: 12/04/2024. Item: Coffee Beans $12.50, Milk $3.20. Subtotal: $15.70. Tax: $1.25. Total Paid: $16.95. Cash Tendered: $20.00. Change: $3.05. Thank you for your purchase!"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "Receipt"
    assert data["confidence"] >= 0.45


def test_certificate_prediction(client):
    res = client.post("/predict", json={
        "text": "CERTIFICATE OF COMPLETION. This is to certify that the candidate has successfully completed the curriculum in Cloud Computing and Software Architecture. In witness whereof, the official seal of the Institute and authorized signatures are hereunto affixed."
    })
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "Certificate"
    assert data["confidence"] >= 0.45


def test_report_prediction(client):
    res = client.post("/predict", json={
        "text": """UNITED STATES SECURITIES AND EXCHANGE COMMISSION
FORM 10-K ANNUAL REPORT PURSUANT TO SECTION 13 OR 15(d) OF THE SECURITIES EXCHANGE ACT.
For the fiscal year ended December 31, 2023.
PART I. Item 1. Business Overview and Operations.
Item 7. Management Discussion and Analysis of Financial Condition and Results of Operations.
Consolidated Financial Statements: Consolidated Statements of Operations, Consolidated Balance Sheets, and Consolidated Statements of Cash Flows.
Operating activities, investing activities, and capital expenditures.
Report of Independent Registered Public Accounting Firm to the Shareholders and Board of Directors."""
    })
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "Report"
    assert data["confidence"] >= 0.45


def test_out_of_vocabulary_abstention(client):
    res = client.post("/predict", json={"text": "xyzzyqwerty foobarius nonexisto"})
    assert res.status_code == 200
    data = res.json()
    assert data["category"] is None
    assert data["reason"] == "no_known_terms"
    assert data["confidence"] == 0.0


def test_invalid_requests_rejected(client):
    assert client.post("/predict", json={"text": "   "}).status_code == 422
    assert client.post("/predict", json={"text": "a" * 100001}).status_code == 422


def test_prediction_scores_are_actual_pipeline_probabilities(client):
    text = "Invoice supplier payment due tax total balance bank transfer"
    result = client.post('/predict', json={'text': text}).json()
    pipeline = client.app.state.bundle['pipeline']
    expected = dict(zip(map(str, pipeline.classes_), map(float, pipeline.predict_proba([text])[0])))
    assert result['scores'] == pytest.approx(expected)
    assert sum(result['scores'].values()) == pytest.approx(1.0)
    assert result['score_type'] == 'probability'
    assert result['estimator_class'] == 'LogisticRegression'
    assert result['confidence'] == pytest.approx(max(expected.values()), abs=0.0001)
    assert result['confidence_threshold'] == 0.45
