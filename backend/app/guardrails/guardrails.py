import re
import json
import uuid
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from app.observability.tracer import tracer

# Known PII patterns
PII_PATTERNS = {
    "aadhaar": r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',
    "pan": r'\b[A-Z]{5}\d{4}[A-Z]\b',
    "phone": r'\b[6-9]\d{9}\b',
    "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    "bank_account": r'\b\d{9,18}\b',
}

# Prompt injection patterns
INJECTION_PATTERNS = [
    r'ignore\s+(?:your\s+|all\s+|my\s+)?(?:previous|all|above|prior)\s+instructions',
    r'forget\s+(?:your\s+|all\s+|my\s+)?(?:previous|all|above|prior)\s+instructions',
    r'disregard\s+(?:your\s+|all\s+|prior\s+)?instructions',
    r'override\s+(?:your\s+|all\s+)?(?:instructions|rules|guidelines)',
    r'you\s+are\s+now\s+a?\s*(different|new|evil|unrestricted)',
    r'do\s+anything\s+now',
    r'jailbreak',
    r'DAN\s+mode',
    r'pretend\s+you\s+are\s+not\s+an\s+ai',
    r'reveal\s+(?:your\s+|all\s+)?(?:system\s+prompt|api\s+key|password|secret|user\s+data)',
    r'<\s*script',
    r'DROP\s+TABLE',
    r'SELECT\s+\*\s+FROM',
    r'UNION\s+SELECT',
    r'system\s*:\s*you\s+are',
    r'assistant\s*:\s*i\s+will\s+ignore',
    r'act\s+as\s+if\s+you\s+have\s+no\s+restrictions',
    r'new\s+instructions?\s*:',
]

# Harmful content patterns
HARMFUL_PATTERNS = [
    r'\b(bomb|explosive|weapon|kill|murder|suicide)\b',
    r'\b(hack|exploit|malware|phishing)\b',
]


class GuardrailResult:
    def __init__(self, passed: bool, action: str, reason: str = "", severity: str = "low",
                 sanitized_content: Optional[str] = None, details: Optional[Dict] = None):
        self.passed = passed
        self.action = action
        self.reason = reason
        self.severity = severity
        self.sanitized_content = sanitized_content
        self.details = details or {}
        self.event_id = f"guard_{uuid.uuid4().hex[:8]}"
        self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict:
        return {
            "event_id": self.event_id,
            "timestamp": self.timestamp,
            "passed": self.passed,
            "action": self.action,
            "reason": self.reason,
            "severity": self.severity,
            "details": self.details
        }


class InputGuardrails:
    """Validates all inputs before processing by agents"""

    @staticmethod
    def check_prompt_injection(text: str) -> GuardrailResult:
        text_lower = text.lower()
        for pattern in INJECTION_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return GuardrailResult(
                    passed=False,
                    action="BLOCK",
                    reason="Potential prompt injection detected",
                    severity="critical",
                    details={"matched_pattern": pattern}
                )
        return GuardrailResult(passed=True, action="ALLOW", reason="No injection detected")

    @staticmethod
    def check_malicious_content(text: str) -> GuardrailResult:
        for pattern in HARMFUL_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                # Check context - government service context may legitimately mention some terms
                if len(text) > 100:  # Longer context less likely to be malicious
                    return GuardrailResult(
                        passed=True,
                        action="ALLOW",
                        reason="Potentially sensitive term in government service context",
                        severity="low"
                    )
                return GuardrailResult(
                    passed=False,
                    action="BLOCK",
                    reason="Potentially harmful content detected",
                    severity="high"
                )
        return GuardrailResult(passed=True, action="ALLOW", reason="No harmful content detected")

    @staticmethod
    def detect_pii(text: str, context: str = "general") -> GuardrailResult:
        found_pii = {}
        for pii_type, pattern in PII_PATTERNS.items():
            matches = re.findall(pattern, text)
            if matches:
                found_pii[pii_type] = len(matches)

        if not found_pii:
            return GuardrailResult(passed=True, action="ALLOW", reason="No PII detected")

        # In government service context, some PII is expected
        if context in ["document_upload", "application", "profile"]:
            return GuardrailResult(
                passed=True,
                action="ALLOW",
                reason="PII detected in authorized context",
                severity="low",
                details={"pii_types": list(found_pii.keys())}
            )

        # For chat context, PII might be incidental but collect with consent
        return GuardrailResult(
            passed=True,
            action="SANITIZE",
            reason="PII detected - will be handled with minimal collection",
            severity="medium",
            details={"pii_types": list(found_pii.keys())}
        )

    @staticmethod
    def validate_input_format(data: Dict[str, Any]) -> GuardrailResult:
        errors = []

        if "age" in data and data["age"] is not None:
            try:
                age = int(data["age"])
                if age < 0 or age > 120:
                    errors.append("Age must be between 0 and 120")
            except (ValueError, TypeError):
                errors.append("Age must be a number")

        if "annual_income" in data and data["annual_income"] is not None:
            try:
                income = float(data["annual_income"])
                if income < 0:
                    errors.append("Income cannot be negative")
            except (ValueError, TypeError):
                errors.append("Income must be a number")

        if "message" in data:
            if len(data["message"]) > 5000:
                errors.append("Message too long (max 5000 characters)")
            if len(data["message"].strip()) == 0:
                errors.append("Message cannot be empty")

        if errors:
            return GuardrailResult(
                passed=False,
                action="BLOCK",
                reason=f"Input validation failed: {'; '.join(errors)}",
                severity="medium",
                details={"errors": errors}
            )
        return GuardrailResult(passed=True, action="ALLOW", reason="Input validation passed")

    @classmethod
    def validate_all(cls, text: str, context: str = "chat", extra_data: Optional[Dict] = None,
                     workflow_id: Optional[str] = None, agent: str = "input_guard") -> Tuple[bool, List[GuardrailResult]]:
        results = []

        injection_result = cls.check_prompt_injection(text)
        results.append(injection_result)
        if not injection_result.passed:
            _log_guardrail_event(injection_result, "input_validation", agent, workflow_id)
            return False, results

        harmful_result = cls.check_malicious_content(text)
        results.append(harmful_result)
        if not harmful_result.passed:
            _log_guardrail_event(harmful_result, "content_filter", agent, workflow_id)
            return False, results

        pii_result = cls.detect_pii(text, context)
        results.append(pii_result)

        if extra_data:
            format_result = cls.validate_input_format(extra_data)
            results.append(format_result)
            if not format_result.passed:
                _log_guardrail_event(format_result, "input_validation", agent, workflow_id)
                return False, results

        return True, results


class OutputGuardrails:
    """Validates AI-generated responses before delivery"""

    @staticmethod
    def check_sensitive_info_leakage(text: str) -> GuardrailResult:
        """Check if response leaks API keys, credentials, or other secrets"""
        secret_patterns = [
            r'api[_-]?key\s*[=:]\s*["\']?[A-Za-z0-9_\-\.]{20,}',
            r'password\s*[=:]\s*["\']?\S+',
            r'secret\s*[=:]\s*["\']?[A-Za-z0-9_\-\.]{10,}',
            r'bearer\s+[A-Za-z0-9\-\._~\+\/]+=*',
        ]
        for pattern in secret_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return GuardrailResult(
                    passed=False,
                    action="REDACT",
                    reason="Potential credential/secret leakage detected",
                    severity="critical"
                )
        return GuardrailResult(passed=True, action="ALLOW", reason="No secret leakage detected")

    @staticmethod
    def validate_scheme_response(response_data: Dict) -> GuardrailResult:
        """Validate government scheme response structure"""
        required_fields = ["scheme_name", "verification_status"]
        missing = [f for f in required_fields if f not in response_data]

        if missing:
            return GuardrailResult(
                passed=False,
                action="RETRY",
                reason=f"Response missing required fields: {missing}",
                severity="medium",
                details={"missing_fields": missing}
            )

        # Check verification status is honest
        if response_data.get("verification_status") not in ["verified", "unverified", "partial"]:
            response_data["verification_status"] = "unverified"

        return GuardrailResult(passed=True, action="ALLOW", reason="Scheme response structure valid")

    @staticmethod
    def check_hallucination_risk(text: str) -> GuardrailResult:
        """Check for high-confidence claims that might be hallucinated"""
        high_confidence_phrases = [
            r'guaranteed\s+scholarship',
            r'definitely\s+eligible',
            r'100%\s+approved',
            r'you\s+will\s+receive\s+₹',
            r'confirmed\s+government\s+scheme',
        ]
        for pattern in high_confidence_phrases:
            if re.search(pattern, text, re.IGNORECASE):
                return GuardrailResult(
                    passed=False,
                    action="SANITIZE",
                    reason="Potentially overconfident claim detected",
                    severity="high",
                    details={"pattern": pattern}
                )
        return GuardrailResult(passed=True, action="ALLOW", reason="No hallucination risk detected")

    @classmethod
    def validate_all(cls, text: str, response_data: Optional[Dict] = None,
                     workflow_id: Optional[str] = None, agent: str = "output_guard") -> Tuple[bool, List[GuardrailResult]]:
        results = []

        secret_result = cls.check_sensitive_info_leakage(text)
        results.append(secret_result)
        if not secret_result.passed:
            _log_guardrail_event(secret_result, "output_validation", agent, workflow_id)
            return False, results

        hallucination_result = cls.check_hallucination_risk(text)
        results.append(hallucination_result)

        if response_data:
            schema_result = cls.validate_scheme_response(response_data)
            results.append(schema_result)

        return True, results


class ToolExecutionGuardrails:
    """Controls which tools agents can use"""

    AGENT_TOOL_PERMISSIONS = {
        "scheme_discovery": ["search_government_schemes", "retrieve_scheme_details", "get_official_source"],
        "eligibility": ["check_eligibility_rules", "get_eligibility_criteria"],
        "document": ["process_document", "extract_document_info", "generate_checklist"],
        "application": ["prepare_application", "validate_application_fields", "get_portal_instructions"],
        "verification": ["verify_source_url", "cross_check_scheme", "validate_deadline"],
        "tracking": ["get_application_status", "send_reminder", "update_tracking"],
        "orchestrator": ["delegate_to_agent", "combine_results", "request_clarification", "request_approval"],
    }

    HIGH_RISK_ACTIONS = [
        "submit_application",
        "send_email",
        "delete_user_data",
        "share_personal_data",
        "modify_document",
        "financial_transaction"
    ]

    @classmethod
    def check_tool_permission(cls, agent_name: str, tool_name: str,
                              workflow_id: Optional[str] = None) -> GuardrailResult:
        allowed_tools = cls.AGENT_TOOL_PERMISSIONS.get(agent_name, [])

        if tool_name in cls.HIGH_RISK_ACTIONS:
            result = GuardrailResult(
                passed=False,
                action="REQUIRE_APPROVAL",
                reason=f"High-risk action requires human approval: {tool_name}",
                severity="high",
                details={"agent": agent_name, "tool": tool_name}
            )
            _log_guardrail_event(result, "tool_execution", agent_name, workflow_id)
            return result

        if tool_name not in allowed_tools:
            result = GuardrailResult(
                passed=False,
                action="BLOCK",
                reason=f"Agent '{agent_name}' not authorized to use tool '{tool_name}'",
                severity="high",
                details={"agent": agent_name, "tool": tool_name, "allowed_tools": allowed_tools}
            )
            _log_guardrail_event(result, "tool_execution", agent_name, workflow_id)
            return result

        return GuardrailResult(
            passed=True,
            action="ALLOW",
            reason=f"Tool '{tool_name}' authorized for agent '{agent_name}'"
        )


class OperationalGuardrails:
    """Controls resource usage and execution limits"""

    MAX_ITERATIONS = 10
    MAX_WORKFLOW_TIME_SECONDS = 120
    MAX_TOKENS_PER_REQUEST = 8192
    MAX_RETRIES = 3

    @staticmethod
    def check_iteration_limit(current_iterations: int) -> GuardrailResult:
        if current_iterations >= OperationalGuardrails.MAX_ITERATIONS:
            return GuardrailResult(
                passed=False,
                action="BLOCK",
                reason=f"Maximum agent iterations ({OperationalGuardrails.MAX_ITERATIONS}) reached",
                severity="high"
            )
        return GuardrailResult(passed=True, action="ALLOW", reason="Within iteration limits")

    @staticmethod
    def check_token_limit(token_count: int) -> GuardrailResult:
        if token_count > OperationalGuardrails.MAX_TOKENS_PER_REQUEST:
            return GuardrailResult(
                passed=False,
                action="BLOCK",
                reason=f"Token limit exceeded: {token_count} > {OperationalGuardrails.MAX_TOKENS_PER_REQUEST}",
                severity="medium"
            )
        return GuardrailResult(passed=True, action="ALLOW", reason="Within token limits")


def _log_guardrail_event(result: GuardrailResult, guardrail_type: str, agent: str,
                          workflow_id: Optional[str] = None):
    """Log guardrail events to the tracer"""
    event = {
        "event_id": result.event_id,
        "timestamp": result.timestamp,
        "agent": agent,
        "guardrail_type": guardrail_type,
        "severity": result.severity,
        "action": result.action,
        "reason": result.reason,
        "workflow_id": workflow_id
    }
    if workflow_id:
        tracer.add_guardrail_event(workflow_id, event)


# Global instances
input_guardrails = InputGuardrails()
output_guardrails = OutputGuardrails()
tool_guardrails = ToolExecutionGuardrails()
operational_guardrails = OperationalGuardrails()
