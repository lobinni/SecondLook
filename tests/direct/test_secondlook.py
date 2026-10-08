"""
SecondLookCourt — Direct Mode tests.

These exercise every rule of the court that does not need the non-deterministic
panel (validators live on the network, not in a test runner). Ruling behavior
itself is covered by the live end-to-end script and by the deletion test notes
in docs/TESTING.md.

Run:
    pip install -r requirements-test.txt
    GLTEST_CONFIG=studs pytest tests/direct -v        # hosted Studionet
    pytest tests/direct -v                            # local default network
"""
import pytest
from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded
from gltest.exceptions import DeploymentError

MICROS = 1_000_000
AMOUNT = 25 * MICROS                      # 25.00
RECIPIENT = "0x" + "11" * 20              # stands in for the agent
STRANGER_CLAIM = "The cited page does not support this mandate at all."
MANDATE = (
    "Release payment to the research agent: its report confirms that Mount Everest "
    "is the highest mountain above sea level, as stated on the cited page."
)
EVIDENCE = "https://en.wikipedia.org/api/rest_v1/page/summary/Mount_Everest"
TRACE = "read summary → matched 'highest' → shipped report"


@pytest.fixture(scope="module")
def court_factory():
    return get_contract_factory("SecondLookCourt")


@pytest.fixture()
def court(court_factory):
    return court_factory.deploy(args=[60])


def seed(court, amount=1_000 * MICROS):
    result = court.seed(args=[amount]).transact()
    assert tx_execution_succeeded(result)


def open_spend(court, amount=AMOUNT, recipient=RECIPIENT, mandate=MANDATE):
    result = court.open_spend(
        args=[recipient, amount, mandate, EVIDENCE, TRACE]
    ).transact()
    assert tx_execution_succeeded(result)
    return result


# ------------------------------------------------------------------- faucet
def test_seed_mints_once_per_address(court):
    seed(court, 500 * MICROS)
    with pytest.raises(Exception):
        court.seed(args=[1]).transact()  # second claim must revert


def test_seed_rejects_amount_above_cap(court):
    with pytest.raises(Exception):
        court.seed(args=[1_000_000_001]).transact()


# --------------------------------------------------------------- open spend
def test_open_spend_locks_amount_plus_bond(court):
    seed(court)
    open_spend(court)
    # 1000 - 25 - 2.5 (10% bond) = 972.5
    assert court.get_balance().call() == 972_500_000


def test_open_spend_requires_min_amount(court):
    seed(court)
    with pytest.raises(Exception):
        court.open_spend(args=[RECIPIENT, 500_000, MANDATE, EVIDENCE, TRACE]).transact()


def test_open_spend_rejects_short_mandate(court):
    seed(court)
    with pytest.raises(Exception):
        court.open_spend(args=[RECIPIENT, AMOUNT, "too short", EVIDENCE, TRACE]).transact()


def test_open_spend_rejects_non_https_evidence(court):
    seed(court)
    with pytest.raises(Exception):
        court.open_spend(
            args=[RECIPIENT, AMOUNT, MANDATE, "http://insecure.example/page", TRACE]
        ).transact()


def test_open_spend_rejects_self_payment(court):
    seed(court)
    me = "0x" + "22" * 20
    with pytest.raises(Exception):
        court.open_spend(args=[me, AMOUNT, MANDATE, EVIDENCE, TRACE]).transact()


def test_open_spend_without_funds_reverts(court):
    with pytest.raises(Exception):
        court.open_spend(args=[RECIPIENT, AMOUNT, MANDATE, EVIDENCE, TRACE]).transact()


# ------------------------------------------------------------------ windows
def test_finalize_during_window_reverts(court):
    seed(court)
    open_spend(court)
    with pytest.raises(Exception):
        court.finalize(args=[1]).transact()


def test_challenge_after_settlement_reverts(court):
    """A spend that is not open cannot be challenged (checked pre-window too)."""
    seed(court)
    open_spend(court)
    # challenge attempt from the payer (a party) is refused regardless of timing
    with pytest.raises(Exception):
        court.challenge(args=[1, STRANGER_CLAIM, "", 0]).transact()


def test_parties_cannot_challenge(court):
    """The payer is a party: the contract must refuse its counter-bond."""
    seed(court)
    open_spend(court)
    with pytest.raises(Exception):
        court.challenge(args=[1, STRANGER_CLAIM, "", 0]).transact()


def test_unknown_ids_revert(court):
    with pytest.raises(Exception):
        court.finalize(args=[99]).transact()
    with pytest.raises(Exception):
        court.get_spend(args=[99]).call()


# ------------------------------------------------------------- introspection
def test_public_write_surface_has_no_owner_knobs(court_factory):
    """
    The court's public write surface is exactly the eight documented actions —
    no owner, admin, operator, pause, override or withdraw method may exist.
    """
    allowed = {
        "seed",
        "open_spend",
        "challenge",
        "rule",
        "rule_appeal",
        "appeal",
        "accept_ruling",
        "finalize",
    }
    schema = court_factory.get_contract_schema()
    methods = {m["name"] for m in schema["methods"] if not m["readonly"]}
    assert methods == allowed, f"unexpected public writes: {methods - allowed}"
