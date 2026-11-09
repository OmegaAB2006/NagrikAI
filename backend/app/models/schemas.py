from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    CITIZEN = "citizen"
    ADMIN = "admin"
    REVIEWER = "reviewer"


class UserCreate(BaseModel):
    email: EmailStr
    password: Optional[str] = None
    full_name: Optional[str] = None
    is_guest: bool = False


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserProfileUpdate(BaseModel):
    state: Optional[str] = None
    district: Optional[str] = None
    age: Optional[int] = Field(None, ge=0, le=120)
    occupation: Optional[str] = None
    education: Optional[str] = None
    employment_status: Optional[str] = None
    annual_income: Optional[float] = Field(None, ge=0)
    category: Optional[str] = None
    preferred_language: Optional[str] = "en"
    gender: Optional[str] = None
    is_student: Optional[bool] = False
    is_farmer: Optional[bool] = False
    has_disability: Optional[bool] = False
    is_bpl: Optional[bool] = False


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    is_guest: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SchemeResponse(BaseModel):
    id: str
    scheme_name: str
    department: str
    description: Optional[str]
    benefits: Optional[str]
    eligibility_criteria: List[Any]
    required_documents: List[Any]
    application_deadline: Optional[str]
    official_url: Optional[str]
    verification_status: str
    last_verified: Optional[datetime]
    is_central: bool
    state: Optional[str]
    category: Optional[str]

    class Config:
        from_attributes = True


class HistoryMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatMessage(BaseModel):
    message: str
    language: Optional[str] = "en"
    context: Optional[Dict[str, Any]] = {}
    history: Optional[List[HistoryMessage]] = []


class ChatResponse(BaseModel):
    workflow_id: str
    response: str
    schemes: Optional[List[Dict]] = []
    eligibility_results: Optional[List[Dict]] = []
    documents_required: Optional[List[str]] = []
    next_steps: Optional[List[str]] = []
    agent_trace: Optional[List[Dict]] = []
    guardrail_events: Optional[List[Dict]] = []
    requires_approval: bool = False
    approval_request_id: Optional[str] = None


class EligibilityRequest(BaseModel):
    scheme_id: str
    user_profile: Optional[Dict[str, Any]] = {}


class EligibilityResponse(BaseModel):
    scheme_id: str
    scheme_name: str
    status: str  # potentially_eligible, not_eligible, additional_info_required, unable_to_determine
    explanation: str
    missing_info: List[str] = []
    confidence: Optional[float] = None


class ApplicationCreate(BaseModel):
    scheme_name: str
    scheme_id: Optional[str] = None
    notes: Optional[str] = None


class GuardrailEventSchema(BaseModel):
    event_id: str
    timestamp: str
    agent: Optional[str]
    guardrail_type: str
    severity: str
    action: str
    reason: Optional[str]
    workflow_id: Optional[str]


class AgentExecutionSchema(BaseModel):
    id: str
    workflow_id: str
    agent_name: str
    status: str
    duration_ms: Optional[float]
    input_tokens: int
    output_tokens: int
    estimated_cost: float
    started_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class DashboardOverview(BaseModel):
    total_requests: int
    successful_requests: int
    task_completion_rate: float
    avg_latency_ms: float
    avg_accuracy: float
    hallucination_rate: float
    guardrail_intervention_rate: float
    total_tokens: int
    estimated_cost: float
    active_agents: int
    failed_tool_executions: int
    human_approval_requests: int


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
