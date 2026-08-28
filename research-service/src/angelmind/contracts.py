"""Core state contracts: Scope → Asset → Observation → Hypothesis → Task → Evidence → Finding → Run."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from hashlib import sha256
from typing import Mapping
from uuid import uuid4


def utc_now() -> datetime:
    return datetime.now(UTC)


class GovernanceTier(StrEnum):
    TIER_1 = "tier1"
    TIER_2 = "tier2"
    TIER_3 = "tier3"


class FindingStatus(StrEnum):
    DISCOVERED = "discovered"
    TRIAGED = "triaged"
    CANDIDATE = "candidate"
    REPRODUCING = "reproducing"
    VALIDATED = "validated"
    REPORTED = "reported"
    SUBMITTED = "submitted"
    INVALID = "invalid"
    DUPLICATE = "duplicate"
    INCONCLUSIVE = "inconclusive"


@dataclass(frozen=True, slots=True)
class Scope:
    workspace_id: str
    allowlist: tuple[str, ...]
    exclusions: tuple[str, ...]
    safe_harbor_reference: str
    code_of_conduct_reference: str


@dataclass(frozen=True, slots=True)
class Asset:
    workspace_id: str
    hostname: str
    asset_id: str = field(default_factory=lambda: f"ast_{uuid4().hex}")


@dataclass(frozen=True, slots=True)
class Observation:
    workspace_id: str
    asset_id: str
    summary: str
    hostname: str = ""
    observation_id: str = field(default_factory=lambda: f"obs_{uuid4().hex}")
    recorded_at: datetime = field(default_factory=utc_now)


@dataclass(frozen=True, slots=True)
class Hypothesis:
    workspace_id: str
    observation_ids: tuple[str, ...]
    statement: str
    hypothesis_id: str = field(default_factory=lambda: f"hyp_{uuid4().hex}")


@dataclass(frozen=True, slots=True)
class Task:
    workspace_id: str
    hypothesis_id: str
    title: str
    tier: GovernanceTier
    dry_run: bool = True
    task_id: str = field(default_factory=lambda: f"tsk_{uuid4().hex}")


@dataclass(frozen=True, slots=True)
class Evidence:
    workspace_id: str
    finding_id: str
    storage_reference: str
    content_digest: str
    recorded_at: datetime = field(default_factory=utc_now)

    @classmethod
    def from_summary(cls, workspace_id: str, finding_id: str, storage_reference: str, summary: str) -> "Evidence":
        return cls(
            workspace_id=workspace_id,
            finding_id=finding_id,
            storage_reference=storage_reference,
            content_digest=sha256(summary.encode("utf-8")).hexdigest(),
        )


@dataclass(frozen=True, slots=True)
class Finding:
    workspace_id: str
    title: str
    fingerprint: str
    status: FindingStatus = FindingStatus.DISCOVERED
    confidence: int = 0
    finding_id: str = field(default_factory=lambda: f"fnd_{uuid4().hex}")

    def advance(self, target: FindingStatus, human_review_approved: bool = False) -> "Finding":
        if target is FindingStatus.SUBMITTED and not human_review_approved:
            raise PermissionError("A finding cannot be submitted before human review approval.")
        return Finding(
            workspace_id=self.workspace_id,
            title=self.title,
            fingerprint=self.fingerprint,
            status=target,
            confidence=self.confidence,
            finding_id=self.finding_id,
        )


@dataclass(frozen=True, slots=True)
class Run:
    workspace_id: str
    mode: str
    task_ids: tuple[str, ...]
    metadata: Mapping[str, str]
    run_id: str = field(default_factory=lambda: f"run_{uuid4().hex}")
    started_at: datetime = field(default_factory=utc_now)
