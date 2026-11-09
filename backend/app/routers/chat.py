from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.database import get_db
from app.models.db_models import User, UserProfile, AgentExecution, GuardrailEvent
from app.models.schemas import ChatMessage, ChatResponse
from app.agents.agents import orchestrator
from app.guardrails.guardrails import InputGuardrails, OutputGuardrails
from app.observability.tracer import tracer
from app.services.dependencies import get_optional_user
from app.services.watsonx_service import gemini_service as watsonx_service

router = APIRouter(prefix="/chat", tags=["chat"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/heic"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    question: str = Form(default="Analyse this image and provide relevant government service guidance."),
    language: str = Form(default="en"),
    current_user: User = Depends(get_optional_user),
):
    """
    Upload an image (government document, form, notice, ID card, etc.)
    and get AI-powered analysis with government service guidance.
    """
    # Validate file type
    mime = file.content_type or "application/octet-stream"
    if mime not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {mime}. Allowed: JPEG, PNG, GIF, WebP, HEIC."
        )

    # Read and validate size
    image_bytes = await file.read()
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Image exceeds 10 MB limit.")

    # Run through AI vision model
    result = await watsonx_service.analyze_image(
        image_bytes=image_bytes,
        mime_type=mime,
        question=question,
        language=language,
    )

    if not result["success"]:
        raise HTTPException(status_code=503, detail=f"Image analysis failed: {result.get('error','Unknown error')}")

    return {
        "analysis": result["text"],
        "model": result.get("model", ""),
        "tokens_used": result.get("input_tokens", 0) + result.get("output_tokens", 0),
        "filename": file.filename,
        "question": question,
    }


@router.post("", response_model=ChatResponse)
async def chat(
    message_data: ChatMessage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_optional_user)
):
    # Start workflow tracking
    workflow_id = tracer.start_workflow(
        user_id=current_user.id if current_user else None,
        request_type="chat"
    )

    # INPUT GUARDRAILS
    tracer.add_stage(workflow_id, "Input Validation", "running")
    passed, guard_results = InputGuardrails.validate_all(
        message_data.message,
        context="chat",
        extra_data={"message": message_data.message},
        workflow_id=workflow_id,
        agent="input_guard"
    )

    guardrail_events = [r.to_dict() for r in guard_results]

    if not passed:
        blocked = [r for r in guard_results if not r.passed][0]
        tracer.add_stage(workflow_id, "Input Blocked by Guardrails", "blocked")
        tracer.complete_workflow(workflow_id, "blocked")

        # Save guardrail events
        for gr in guard_results:
            if not gr.passed:
                ge = GuardrailEvent(
                    id=str(uuid.uuid4()),
                    event_id=gr.event_id,
                    workflow_id=workflow_id,
                    agent="input_guard",
                    guardrail_type="input_validation",
                    severity=gr.severity,
                    action=gr.action,
                    reason=gr.reason
                )
                db.add(ge)
        await db.commit()

        return ChatResponse(
            workflow_id=workflow_id,
            response=f"I'm sorry, I couldn't process your request. {blocked.reason}. Please rephrase and try again.",
            guardrail_events=guardrail_events
        )

    tracer.add_stage(workflow_id, "Input Validation Passed", "completed")

    # Get user profile
    user_profile = {}
    if current_user:
        profile_result = await db.execute(
            select(UserProfile).where(UserProfile.user_id == current_user.id)
        )
        profile = profile_result.scalar_one_or_none()
        if profile:
            user_profile = {
                "state": profile.state, "district": profile.district,
                "age": profile.age, "occupation": profile.occupation,
                "education": profile.education, "annual_income": profile.annual_income,
                "employment_status": profile.employment_status, "category": profile.category,
                "is_student": profile.is_student, "is_farmer": profile.is_farmer,
                "has_disability": profile.has_disability, "is_bpl": profile.is_bpl,
                "preferred_language": profile.preferred_language
            }

    # Add any context from request
    if message_data.context:
        user_profile.update(message_data.context)

    # Build history list for Granite context
    history = [{"role": h.role, "content": h.content} for h in (message_data.history or [])]

    # RUN ORCHESTRATOR
    tracer.add_stage(workflow_id, "Orchestrator Processing", "running")
    result = await orchestrator.process_request(
        message=message_data.message,
        user_profile=user_profile,
        workflow_id=workflow_id,
        language=message_data.language or user_profile.get("preferred_language", "en"),
        history=history
    )

    # OUTPUT GUARDRAILS
    tracer.add_stage(workflow_id, "Output Validation", "running")
    output_passed, output_guards = OutputGuardrails.validate_all(
        result["response"],
        workflow_id=workflow_id,
        agent="output_guard"
    )
    guardrail_events.extend([r.to_dict() for r in output_guards])

    if not output_passed:
        result["response"] = "I found some relevant information but cannot fully verify it. Please consult official government sources at india.gov.in or myscheme.gov.in for accurate details."

    # Save agent execution record
    exec_record = AgentExecution(
        id=str(uuid.uuid4()),
        workflow_id=workflow_id,
        agent_id="orchestrator",
        agent_name="Orchestrator Agent",
        model="ibm/granite-4-h-small",
        task_type="chat",
        status="completed",
        input_tokens=100,  # Approximate
        output_tokens=200
    )
    db.add(exec_record)

    # Save guardrail events that triggered
    for gr in guard_results + output_guards:
        if gr.action != "ALLOW":
            ge = GuardrailEvent(
                id=str(uuid.uuid4()),
                event_id=gr.event_id,
                workflow_id=workflow_id,
                agent="chat_flow",
                guardrail_type="chat_validation",
                severity=gr.severity,
                action=gr.action,
                reason=gr.reason
            )
            db.add(ge)

    await db.commit()

    # Get trace for response
    trace = tracer.get_trace(workflow_id)
    agent_trace = trace.get("stages", []) if trace else []

    # Format next steps
    next_steps = []
    if result["schemes"]:
        next_steps.append(f"View {len(result['schemes'])} relevant schemes found")
    if result["eligibility_results"]:
        next_steps.append("Check your eligibility assessment")
    next_steps.append("Visit official portal: myscheme.gov.in")

    return ChatResponse(
        workflow_id=workflow_id,
        response=result["response"],
        schemes=result["schemes"][:5],
        eligibility_results=result["eligibility_results"],
        documents_required=result.get("documents_required", []),
        next_steps=next_steps,
        agent_trace=agent_trace,
        guardrail_events=guardrail_events,
        requires_approval=result.get("requires_approval", False)
    )
