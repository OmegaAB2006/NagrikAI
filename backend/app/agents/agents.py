import json
import time
from typing import Dict, Any, Optional, List
from datetime import datetime
from app.services.watsonx_service import gemini_service as watsonx_service
gemini_service = watsonx_service  # alias kept for internal agent calls
from app.observability.tracer import tracer


class BaseAgent:
    """Base class for all NagrikAI agents"""

    def __init__(self, agent_id: str, agent_name: str):
        self.agent_id = agent_id
        self.agent_name = agent_name
        self.iterations = 0
        self.total_tokens = 0
        self.total_cost = 0.0

    async def _run_with_tracking(self, workflow_id: str, prompt: str, system_instruction: str,
                                   task_type: str, use_json: bool = False) -> Dict[str, Any]:
        start_time = time.time()
        tracer.add_stage(workflow_id, f"{self.agent_name} started", "running")

        if use_json:
            result = await gemini_service.generate_json(prompt, system_instruction)
        else:
            result = await gemini_service.generate(prompt, system_instruction)

        duration_ms = (time.time() - start_time) * 1000
        self.total_tokens += result.get("input_tokens", 0) + result.get("output_tokens", 0)
        self.total_cost += result.get("estimated_cost", 0.0)

        tracer.add_agent_execution(workflow_id, self.agent_name, {
            "tokens": result.get("input_tokens", 0) + result.get("output_tokens", 0),
            "cost": result.get("estimated_cost", 0.0)
        })
        tracer.add_stage(workflow_id, f"{self.agent_name} completed", "completed",
                         {"duration_ms": duration_ms, "tokens": self.total_tokens})

        return result


class SchemeDiscoveryAgent(BaseAgent):
    """Agent 1: Discovers relevant government schemes"""

    SYSTEM_INSTRUCTION = """You are the NagrikAI Scheme Discovery Agent. Your role is to identify relevant 
    Indian government schemes based on citizen profiles and queries.

    IMPORTANT RULES:
    1. Only mention real, existing Indian government schemes
    2. Always include the official source URL when available
    3. Mark verification_status as "verified" only for well-known official schemes
    4. For unknown or uncertain schemes, mark as "unverified"
    5. Never fabricate scheme names, benefits, or eligibility criteria
    6. Focus on schemes from myscheme.gov.in, scholarships.gov.in, and official ministry websites
    7. Always provide structured JSON output as specified
    """

    async def discover_schemes(self, query: str, user_profile: Dict, workflow_id: str) -> Dict[str, Any]:
        prompt = f"""
        A citizen has the following profile:
        {json.dumps(user_profile, indent=2)}

        Their query is: "{query}"

        Search your knowledge for REAL Indian government schemes that match this profile.
        Focus on schemes available on myscheme.gov.in, scholarships.gov.in, and official ministry websites.

        Return a JSON array of matching schemes with this structure:
        {{
            "schemes": [
                {{
                    "scheme_name": "Official scheme name",
                    "department": "Ministry/Department name",
                    "description": "Brief description",
                    "benefits": "What citizens get",
                    "eligibility_criteria": ["criteria 1", "criteria 2"],
                    "required_documents": ["document 1", "document 2"],
                    "application_deadline": "deadline or null if ongoing",
                    "official_url": "https://official-url.gov.in",
                    "verification_status": "verified or unverified",
                    "last_verified": "current date",
                    "category": "scholarship/health/agriculture/etc",
                    "is_central": true or false,
                    "state": "state name or null for central schemes"
                }}
            ],
            "search_summary": "Brief summary of what was found",
            "sources_checked": ["source1", "source2"]
        }}

        Return ONLY real schemes. If no schemes are found, return empty array.
        """

        result = await self._run_with_tracking(workflow_id, prompt, self.SYSTEM_INSTRUCTION,
                                                "scheme_discovery", use_json=True)
        return result


class EligibilityAgent(BaseAgent):
    """Agent 2: Verifies eligibility against official criteria"""

    SYSTEM_INSTRUCTION = """You are the NagrikAI Eligibility Verification Agent. 
    You analyze official eligibility requirements and compare them against user profiles.

    IMPORTANT RULES:
    1. Only use official eligibility criteria from government sources
    2. NEVER declare someone as officially approved - only assess preliminary eligibility
    3. Clearly distinguish between "Potentially Eligible" and "Definitely Eligible"
    4. Ask for missing information rather than assuming
    5. Be fair and apply criteria consistently to all citizens
    6. Return one of: potentially_eligible, not_eligible, additional_info_required, unable_to_determine
    """

    async def check_eligibility(self, scheme: Dict, user_profile: Dict, workflow_id: str) -> Dict[str, Any]:
        prompt = f"""
        Analyze the eligibility of this citizen for the specified scheme:

        CITIZEN PROFILE:
        {json.dumps(user_profile, indent=2)}

        SCHEME:
        Name: {scheme.get('scheme_name', 'Unknown')}
        Eligibility Criteria: {json.dumps(scheme.get('eligibility_criteria', []))}

        Return JSON:
        {{
            "scheme_name": "{scheme.get('scheme_name', '')}",
            "status": "potentially_eligible|not_eligible|additional_info_required|unable_to_determine",
            "explanation": "Clear explanation of why",
            "matching_criteria": ["criteria they meet"],
            "failing_criteria": ["criteria they don't meet"],
            "missing_info": ["what additional info is needed"],
            "confidence": 0.0 to 1.0,
            "disclaimer": "This is a preliminary assessment only. Official eligibility is determined by the relevant authority."
        }}
        """

        result = await self._run_with_tracking(workflow_id, prompt, self.SYSTEM_INSTRUCTION,
                                                "eligibility_check", use_json=True)
        return result


class DocumentAgent(BaseAgent):
    """Agent 3: Document assistance and checklist generation"""

    SYSTEM_INSTRUCTION = """You are the NagrikAI Document Assistance Agent.
    You help citizens prepare their documents for government scheme applications.

    IMPORTANT RULES:
    1. Generate accurate document checklists based on official requirements
    2. Provide format requirements (size, type, etc.) when known
    3. Explain why each document is needed
    4. Never request unnecessary personal information
    5. Guide users to obtain documents from official sources
    """

    async def generate_checklist(self, scheme: Dict, user_profile: Dict, workflow_id: str) -> Dict[str, Any]:
        prompt = f"""
        Generate a document checklist for this scheme application:

        SCHEME: {scheme.get('scheme_name', 'Unknown')}
        REQUIRED DOCUMENTS FROM SCHEME: {json.dumps(scheme.get('required_documents', []))}
        USER PROFILE: {json.dumps(user_profile, indent=2)}

        Return JSON:
        {{
            "scheme_name": "{scheme.get('scheme_name', '')}",
            "checklist": [
                {{
                    "document": "Document name",
                    "required": true/false,
                    "format": "PDF/JPG/etc",
                    "max_size_mb": 5,
                    "description": "Why needed and how to get it",
                    "official_source": "Where to get this document"
                }}
            ],
            "additional_notes": "Any special instructions",
            "estimated_preparation_time": "X days"
        }}
        """

        result = await self._run_with_tracking(workflow_id, prompt, self.SYSTEM_INSTRUCTION,
                                                "document_checklist", use_json=True)
        return result


class ApplicationAgent(BaseAgent):
    """Agent 4: Application assistance and guidance"""

    SYSTEM_INSTRUCTION = """You are the NagrikAI Application Assistance Agent.
    You guide citizens through government application procedures.

    IMPORTANT RULES:
    1. Always direct users to official government portals
    2. NEVER submit applications without explicit user approval
    3. Validate all application fields before guidance
    4. Provide step-by-step instructions
    5. If official portal cannot be integrated, provide manual instructions
    6. Always request user confirmation before any external actions
    """

    async def get_application_guidance(self, scheme: Dict, user_profile: Dict, workflow_id: str) -> Dict[str, Any]:
        prompt = f"""
        Provide application guidance for:

        SCHEME: {scheme.get('scheme_name', 'Unknown')}
        OFFICIAL URL: {scheme.get('official_url', 'Not available')}
        USER PROFILE: {json.dumps(user_profile, indent=2)}

        Return JSON:
        {{
            "scheme_name": "{scheme.get('scheme_name', '')}",
            "application_method": "online/offline/both",
            "official_portal": "{scheme.get('official_url', 'Not available')}",
            "steps": [
                {{
                    "step_number": 1,
                    "instruction": "Step description",
                    "url": "URL if applicable",
                    "notes": "Important notes"
                }}
            ],
            "helpline": "Official helpline number if known",
            "offline_address": "Office address if offline application needed",
            "estimated_processing_time": "X days",
            "requires_user_approval": true,
            "approval_message": "Please confirm before proceeding to the official portal"
        }}
        """

        result = await self._run_with_tracking(workflow_id, prompt, self.SYSTEM_INSTRUCTION,
                                                "application_guidance", use_json=True)
        return result


class VerificationAgent(BaseAgent):
    """Agent 5: Government information verification"""

    SYSTEM_INSTRUCTION = """You are the NagrikAI Government Information Verification Agent.
    You verify and validate information about government schemes.

    IMPORTANT RULES:
    1. Cross-check scheme information with authoritative sources
    2. Flag outdated or conflicting information
    3. Mark unsupported claims clearly
    4. Validate official URLs and deadlines
    5. Never treat unverified information as factual
    6. Always be transparent about what you can and cannot verify
    """

    async def verify_scheme(self, scheme: Dict, workflow_id: str) -> Dict[str, Any]:
        prompt = f"""
        Verify this government scheme information:

        SCHEME DATA:
        {json.dumps(scheme, indent=2)}

        Based on your knowledge of official Indian government sources, verify:
        1. Is this a real government scheme?
        2. Is the department/ministry correct?
        3. Are the eligibility criteria accurate?
        4. Is the official URL valid and government-owned?
        5. Are the benefits accurately described?

        Return JSON:
        {{
            "scheme_name": "{scheme.get('scheme_name', '')}",
            "is_real_scheme": true/false,
            "verification_status": "verified|unverified|partially_verified|outdated",
            "verified_fields": ["field1", "field2"],
            "unverified_fields": ["field1", "field2"],
            "concerns": ["Any concerns about the information"],
            "recommended_action": "What to do with this information",
            "official_source_checked": "Source URL checked",
            "last_verified": "current date"
        }}
        """

        result = await self._run_with_tracking(workflow_id, prompt, self.SYSTEM_INSTRUCTION,
                                                "scheme_verification", use_json=True)
        return result


class TrackingAgent(BaseAgent):
    """Agent 6: Application tracking"""

    SYSTEM_INSTRUCTION = """You are the NagrikAI Application Tracking Agent.
    You help citizens track their government scheme applications.

    IMPORTANT RULES:
    1. Clearly distinguish official status updates from user-entered information
    2. Only provide tracking that is authorized and available
    3. Send reminders for important deadlines
    4. Identify missing documentation
    5. Never fabricate application statuses
    """

    async def get_tracking_status(self, application: Dict, workflow_id: str) -> Dict[str, Any]:
        status = application.get("status", "draft")
        scheme_name = application.get("scheme_name", "Unknown")

        return {
            "application_id": application.get("id", ""),
            "scheme_name": scheme_name,
            "current_status": status,
            "status_source": "user_entered" if not application.get("is_official_update") else "official",
            "last_updated": datetime.utcnow().isoformat(),
            "next_actions": self._get_next_actions(status),
            "reminders": []
        }

    def _get_next_actions(self, status: str) -> List[str]:
        actions_map = {
            "draft": ["Complete your application", "Upload required documents", "Review eligibility criteria"],
            "submitted": ["Wait for acknowledgment", "Keep your reference number safe", "Check portal for updates"],
            "under_review": ["Wait for decision", "Respond to any queries from the department"],
            "approved": ["Follow disbursement instructions", "Complete any remaining formalities"],
            "rejected": ["Review rejection reason", "Consider appeal if eligible", "Check other schemes"],
            "pending_documents": ["Upload missing documents", "Contact department helpline if unclear"]
        }
        return actions_map.get(status, ["Contact relevant department for updates"])


class OrchestratorAgent(BaseAgent):
    """Agent 7: Central orchestrator - coordinates all other agents"""

    SYSTEM_INSTRUCTION = """You are the NagrikAI Central Orchestrator Agent.
    You coordinate multiple specialized agents to help Indian citizens access government services.

    YOUR ROLE:
    1. Understand the citizen's complete objective
    2. Select and coordinate appropriate specialized agents
    3. Validate results before combining them
    4. Ensure information accuracy and consistency
    5. Protect citizen privacy and security
    6. Never bypass guardrails or security controls
    7. Always be helpful, transparent, and honest about limitations

    IMPORTANT:
    - You work with REAL Indian government schemes only
    - Always maintain compassion and respect for citizens
    - Multilingual support: respond in the user's preferred language
    - Never make official eligibility determinations - only preliminary assessments
    """

    def __init__(self):
        super().__init__("orchestrator", "Orchestrator Agent")
        self.scheme_agent = SchemeDiscoveryAgent("scheme_discovery", "Scheme Discovery Agent")
        self.eligibility_agent = EligibilityAgent("eligibility", "Eligibility Verification Agent")
        self.document_agent = DocumentAgent("document", "Document Assistance Agent")
        self.application_agent = ApplicationAgent("application", "Application Assistance Agent")
        self.verification_agent = VerificationAgent("verification", "Information Verification Agent")
        self.tracking_agent = TrackingAgent("tracking", "Application Tracking Agent")

    async def process_request(self, message: str, user_profile: Dict, workflow_id: str,
                               language: str = "en",
                               history: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """Main entry point for processing citizen requests"""

        # Step 1: Understand the intent
        intent = await self._classify_intent(message, workflow_id)

        result = {
            "workflow_id": workflow_id,
            "intent": intent,
            "schemes": [],
            "eligibility_results": [],
            "documents_required": [],
            "application_guidance": None,
            "tracking_status": None,
            "response": "",
            "agents_used": [],
            "requires_approval": False
        }

        # Step 2: Route to appropriate agents based on intent
        if intent in ["scheme_discovery", "scholarship", "benefits"]:
            tracer.add_stage(workflow_id, "Scheme Discovery", "running")
            scheme_result = await self.scheme_agent.discover_schemes(message, user_profile, workflow_id)
            result["agents_used"].append("Scheme Discovery Agent")

            if scheme_result.get("success") and scheme_result.get("parsed"):
                schemes_data = scheme_result["parsed"].get("schemes", [])

                # Step 3: Verify each scheme
                verified_schemes = []
                for scheme in schemes_data[:5]:  # Limit to 5 schemes
                    tracer.add_stage(workflow_id, f"Verifying: {scheme.get('scheme_name', '')}", "running")
                    verify_result = await self.verification_agent.verify_scheme(scheme, workflow_id)
                    result["agents_used"].append("Information Verification Agent")

                    if verify_result.get("success") and verify_result.get("parsed"):
                        verification = verify_result["parsed"]
                        # In demo mode the verification returns minimal data; preserve original status
                        new_status = verification.get("verification_status")
                        if new_status and new_status != "unverified":
                            scheme["verification_status"] = new_status
                        # Only override with unverified if the parsed result is a real verification
                        elif new_status == "unverified" and not verify_result.get("demo"):
                            scheme["verification_status"] = "unverified"
                        scheme["verification_concerns"] = verification.get("concerns", [])
                    verified_schemes.append(scheme)

                result["schemes"] = verified_schemes

                # Step 4: Check eligibility for each scheme
                if user_profile and verified_schemes:
                    tracer.add_stage(workflow_id, "Eligibility Check", "running")
                    for scheme in verified_schemes[:3]:  # Check top 3
                        elig_result = await self.eligibility_agent.check_eligibility(
                            scheme, user_profile, workflow_id
                        )
                        result["agents_used"].append("Eligibility Verification Agent")

                        if elig_result.get("success") and elig_result.get("parsed"):
                            result["eligibility_results"].append(elig_result["parsed"])

        elif intent == "document_help":
            # User needs document guidance for a specific scheme
            if user_profile.get("current_scheme"):
                doc_result = await self.document_agent.generate_checklist(
                    user_profile["current_scheme"], user_profile, workflow_id
                )
                result["agents_used"].append("Document Assistance Agent")
                if doc_result.get("success") and doc_result.get("parsed"):
                    result["documents_required"] = doc_result["parsed"].get("checklist", [])

        elif intent == "application_help":
            result["requires_approval"] = True
            result["agents_used"].append("Application Assistance Agent")

        elif intent == "tracking":
            result["agents_used"].append("Application Tracking Agent")

        # Step 5: Generate final response
        tracer.add_stage(workflow_id, "Generating Response", "running")
        final_response = await self._generate_final_response(
            message, result, user_profile, language, workflow_id, history=history or []
        )
        result["response"] = final_response

        tracer.complete_workflow(workflow_id, "completed")
        return result

    async def _classify_intent(self, message: str, workflow_id: str) -> str:
        """Classify user intent from message using keyword matching + LLM fallback"""
        msg_lower = message.lower()

        # ── Government procedure / service queries (NOT scheme discovery) ──
        # These should go to general_query so the rich demo handler responds
        gov_service_keywords = [
            "driving licence", "driving license", "driver licence", " dl ", "dl apply",
            "passport", "passportindia",
            "aadhaar", "aadhar", "uidai",
            "pan card", "pan number",
            "voter id", "voter card", "election card", "epic card",
            "ration card", "ration shop",
            "birth certificate", "death certificate", "marriage certificate",
            "caste certificate", "income certificate", "domicile certificate",
            "property registration", "land record",
            "gst registration", "income tax return", "itr filing",
            "vehicle registration", "rc book", "fitness certificate",
        ]
        if any(w in msg_lower for w in gov_service_keywords):
            return "general_query"

        # ── Scholarship / Education ──
        if any(w in msg_lower for w in ["scholar", "scholarship", "fee waiver", "stipend"]):
            return "scholarship"
        if any(w in msg_lower for w in ["student", "college", "university", "study abroad", "educational"]):
            return "scholarship"

        # ── Tracking ──
        if any(w in msg_lower for w in ["track", "application status", "my application", "check status"]):
            return "tracking"

        # ── Document help ──
        if any(w in msg_lower for w in ["document checklist", "upload documents", "what documents"]):
            return "document_help"

        # ── Application help ──
        if any(w in msg_lower for w in ["how to apply", "apply for", "application process", "submit application"]):
            return "application_help"

        # ── Eligibility ──
        if any(w in msg_lower for w in ["eligible", "eligibility", "qualify", "do i qualify", "am i eligible"]):
            return "eligibility"

        # ── Scheme discovery ──
        if any(w in msg_lower for w in ["farmer", "kisan", "crop", "agriculture", "farming"]):
            return "scheme_discovery"
        if any(w in msg_lower for w in ["ayushman", "pmjay", "jan arogya", "health card"]):
            return "scheme_discovery"
        if any(w in msg_lower for w in ["pm awas", "pradhan mantri awas", "housing scheme", "pmay"]):
            return "scheme_discovery"
        if any(w in msg_lower for w in ["scheme", "yojana", "benefit", "welfare", "subsidy", "pension"]):
            return "scheme_discovery"
        if any(w in msg_lower for w in ["health scheme", "hospital", "medical benefit", "treatment"]):
            return "scheme_discovery"
        if any(w in msg_lower for w in ["mudra", "startup india", "skill india", "mgnrega", "rozgar"]):
            return "scheme_discovery"

        # LLM classification as fallback
        prompt = f"""
        Classify this citizen query into exactly one category:
        Query: "{message}"

        Categories:
        - scheme_discovery: Looking for government schemes/benefits
        - scholarship: Looking for scholarships/educational benefits
        - eligibility: Asking about eligibility for a specific scheme
        - document_help: Needs help with documents
        - application_help: Wants to apply for a scheme
        - tracking: Wants to track application status
        - general_query: General information about government services
        - benefits: Looking for welfare/social benefits

        Return only the category name, nothing else.
        """
        result = await gemini_service.generate(prompt, temperature=0.0, max_tokens=50)
        text = result.get("text", "").strip().lower()

        valid_intents = ["scheme_discovery", "scholarship", "eligibility", "document_help",
                         "application_help", "tracking", "general_query", "benefits"]
        for intent in valid_intents:
            if intent in text:
                return intent
        return "general_query"

    async def _generate_final_response(self, original_message: str, result: Dict,
                                        user_profile: Dict, language: str, workflow_id: str,
                                        history: Optional[List[Dict]] = None) -> str:
        """Generate the final natural language response with conversation history."""
        lang_instruction = ""
        if language == "kn":
            lang_instruction = "Respond in Kannada language."
        elif language == "hi":
            lang_instruction = "Respond in Hindi language."
        else:
            lang_instruction = "Respond in English."

        schemes_summary = ""
        if result["schemes"]:
            schemes_summary = f"\nFound {len(result['schemes'])} relevant schemes:\n"
            for s in result["schemes"][:3]:
                schemes_summary += f"- {s.get('scheme_name', 'Unknown')}: {s.get('benefits', '')[:100]}\n"

        eligibility_summary = ""
        if result["eligibility_results"]:
            eligibility_summary = "\nEligibility Assessment:\n"
            for e in result["eligibility_results"]:
                eligibility_summary += f"- {e.get('scheme_name', 'Unknown')}: {e.get('status', 'unknown')}\n"

        # Build a rich citizen profile description for Granite
        profile_parts = []
        if user_profile.get("state"):
            profile_parts.append(f"State: {user_profile['state']}")
        if user_profile.get("district"):
            profile_parts.append(f"District: {user_profile['district']}")
        if user_profile.get("age"):
            profile_parts.append(f"Age: {user_profile['age']} years")
        if user_profile.get("occupation"):
            profile_parts.append(f"Occupation: {user_profile['occupation']}")
        if user_profile.get("education"):
            profile_parts.append(f"Education: {user_profile['education']}")
        if user_profile.get("annual_income"):
            profile_parts.append(f"Annual Household Income: ₹{user_profile['annual_income']}")
        if user_profile.get("category"):
            profile_parts.append(f"Category: {user_profile['category']}")
        if user_profile.get("employment_status"):
            profile_parts.append(f"Employment Status: {user_profile['employment_status']}")
        if user_profile.get("is_student"):
            profile_parts.append("Is a student")
        if user_profile.get("is_farmer"):
            profile_parts.append("Is a farmer")
        if user_profile.get("has_disability"):
            profile_parts.append("Has a disability")
        if user_profile.get("is_bpl"):
            profile_parts.append("Below Poverty Line (BPL)")

        # Uploaded documents
        docs = user_profile.get("uploaded_documents", [])

        profile_section = ""
        if profile_parts:
            profile_section = (
                "\n\nCITIZEN PROFILE (use this to personalise your answer):\n"
                + "\n".join(f"  - {p}" for p in profile_parts)
            )
        if docs:
            profile_section += (
                "\n\nDOCUMENTS AVAILABLE:\n"
                + "\n".join(f"  - {d}" for d in docs)
                + "\n  (These documents are available for application purposes)"
            )

        system_content = (
            f"You are the NagrikAI assistant helping Indian citizens access government services. "
            f"{lang_instruction} "
            f"Use simple, accessible language. Be warm and supportive."
            f"{profile_section}"
            f"\n\nWhen answering questions about eligibility or suitable schemes, "
            f"ALWAYS refer to the citizen profile above if available. "
            f"Match the profile details against scheme criteria explicitly. "
            f"Never claim to make official eligibility determinations — only provide preliminary assessments. "
            f"Always end with: 'This is a preliminary assessment only. Please verify with official government sources.' "
            f"Keep responses under 500 words."
        )

        # Build messages list with full history so Granite keeps context
        messages: List[Dict] = [{"role": "system", "content": system_content}]

        # Inject previous turns (keep last 10 to stay within token budget)
        for h in (history or [])[-10:]:
            role = h.get("role", "user")
            content = h.get("content", "")
            if role in ("user", "assistant") and content.strip():
                messages.append({"role": role, "content": content})

        # Current turn user message with any extra context
        user_content = original_message
        if schemes_summary or eligibility_summary:
            user_content += f"\n\n[Context from agents]{schemes_summary}{eligibility_summary}"
        messages.append({"role": "user", "content": user_content})

        from app.services.watsonx_service import _call_watsonx_chat, CHAT_MODEL
        import asyncio
        loop = asyncio.get_event_loop()
        final_result = await loop.run_in_executor(
            None,
            lambda: _call_watsonx_chat(messages, model=CHAT_MODEL, max_tokens=1024, temperature=0.3)
        )
        return final_result.get("text", "I apologize, I could not generate a response. Please try again.")


# Initialize the orchestrator
orchestrator = OrchestratorAgent()
