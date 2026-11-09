from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    CITIZEN = "citizen"
    ADMIN = "admin"
    REVIEWER = "reviewer"
    AGENT_SERVICE = "agent_service"


class ApplicationStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    PENDING_DOCUMENTS = "pending_documents"


class GuardrailSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class GuardrailAction(str, enum.Enum):
    ALLOW = "allow"
    SANITIZE = "sanitize"
    REDACT = "redact"
    BLOCK = "block"
    RETRY = "retry"
    REQUEST_CLARIFICATION = "request_clarification"
    REQUIRE_APPROVAL = "require_approval"
    ESCALATE = "escalate"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    role = Column(String, default=UserRole.CITIZEN)
    is_active = Column(Boolean, default=True)
    is_guest = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    profile = relationship("UserProfile", back_populates="user", uselist=False)
    applications = relationship("Application", back_populates="user")
    documents = relationship("Document", back_populates="user")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    state = Column(String, nullable=True)
    district = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    occupation = Column(String, nullable=True)
    education = Column(String, nullable=True)
    employment_status = Column(String, nullable=True)
    annual_income = Column(Float, nullable=True)
    category = Column(String, nullable=True)  # SC/ST/OBC/General
    preferred_language = Column(String, default="en")
    gender = Column(String, nullable=True)
    is_student = Column(Boolean, default=False)
    is_farmer = Column(Boolean, default=False)
    has_disability = Column(Boolean, default=False)
    is_bpl = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="profile")


class GovernmentScheme(Base):
    __tablename__ = "government_schemes"

    id = Column(String, primary_key=True, default=generate_uuid)
    scheme_name = Column(String, nullable=False, index=True)
    department = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    benefits = Column(Text, nullable=True)
    eligibility_criteria = Column(JSON, default=list)
    required_documents = Column(JSON, default=list)
    application_deadline = Column(String, nullable=True)
    official_url = Column(String, nullable=True)
    verification_status = Column(String, default="unverified")
    last_verified = Column(DateTime, nullable=True)
    is_central = Column(Boolean, default=True)
    state = Column(String, nullable=True)  # null for central schemes
    category = Column(String, nullable=True)  # scholarship, health, agriculture etc
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    scheme_id = Column(String, ForeignKey("government_schemes.id"), nullable=True)
    scheme_name = Column(String, nullable=False)
    status = Column(String, default=ApplicationStatus.DRAFT)
    eligibility_status = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    official_reference = Column(String, nullable=True)
    is_official_update = Column(Boolean, default=False)
    extra_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="applications")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    application_id = Column(String, ForeignKey("applications.id"), nullable=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)
    storage_path = Column(String, nullable=True)
    extracted_data = Column(JSON, default=dict)
    is_verified = Column(Boolean, default=False)
    document_type = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="documents")


class AgentExecution(Base):
    __tablename__ = "agent_executions"

    id = Column(String, primary_key=True, default=generate_uuid)
    workflow_id = Column(String, nullable=False, index=True)
    trace_id = Column(String, nullable=True)
    agent_id = Column(String, nullable=False)
    agent_name = Column(String, nullable=False)
    model = Column(String, nullable=True)
    task_type = Column(String, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    duration_ms = Column(Float, nullable=True)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    tool_calls = Column(JSON, default=list)
    tool_results = Column(JSON, default=list)
    guardrail_interventions = Column(JSON, default=list)
    approval_required = Column(Boolean, default=False)
    approval_status = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, running, completed, failed
    error_message = Column(Text, nullable=True)
    estimated_cost = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)


class GuardrailEvent(Base):
    __tablename__ = "guardrail_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    event_id = Column(String, unique=True, default=lambda: f"guard_{generate_uuid()[:8]}")
    workflow_id = Column(String, nullable=True)
    agent = Column(String, nullable=True)
    guardrail_type = Column(String, nullable=False)
    severity = Column(String, default=GuardrailSeverity.LOW)
    action = Column(String, nullable=False)
    reason = Column(Text, nullable=True)
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow)


class EvaluationDataset(Base):
    __tablename__ = "evaluation_datasets"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    test_cases = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)


class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = Column(String, primary_key=True, default=generate_uuid)
    dataset_id = Column(String, ForeignKey("evaluation_datasets.id"), nullable=True)
    agent_name = Column(String, nullable=False)
    model = Column(String, nullable=True)
    workflow_id = Column(String, nullable=True)
    accuracy = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    f1_score = Column(Float, nullable=True)
    exact_match = Column(Float, nullable=True)
    semantic_similarity = Column(Float, nullable=True)
    task_completion_rate = Column(Float, nullable=True)
    tool_accuracy = Column(Float, nullable=True)
    faithfulness = Column(Float, nullable=True)
    answer_relevancy = Column(Float, nullable=True)
    groundedness = Column(Float, nullable=True)
    hallucination_rate = Column(Float, nullable=True)
    total_tests = Column(Integer, default=0)
    passed_tests = Column(Integer, default=0)
    failed_tests = Column(Integer, default=0)
    raw_results = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(String, primary_key=True, default=generate_uuid)
    workflow_id = Column(String, nullable=True)
    agent_name = Column(String, nullable=False)
    action_type = Column(String, nullable=False)
    proposed_action = Column(Text, nullable=False)
    reason = Column(Text, nullable=True)
    data_involved = Column(JSON, default=dict)
    expected_consequences = Column(Text, nullable=True)
    status = Column(String, default="pending")  # pending, approved, rejected, expired
    requested_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_notes = Column(Text, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    event_type = Column(String, nullable=False)
    actor_id = Column(String, nullable=True)
    actor_role = Column(String, nullable=True)
    resource_type = Column(String, nullable=True)
    resource_id = Column(String, nullable=True)
    action = Column(String, nullable=False)
    details = Column(JSON, default=dict)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
