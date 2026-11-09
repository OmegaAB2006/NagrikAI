from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
import uuid

from app.database import get_db
from app.models.db_models import Application, GovernmentScheme, User
from app.models.schemas import ApplicationCreate
from app.services.dependencies import get_current_user

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("")
async def create_application(
    data: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    app = Application(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        scheme_name=data.scheme_name,
        scheme_id=data.scheme_id,
        status="draft",
        notes=data.notes
    )
    db.add(app)
    await db.commit()
    return {"id": app.id, "scheme_name": app.scheme_name, "status": app.status}


@router.get("")
async def get_applications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Application).where(Application.user_id == current_user.id)
        .order_by(Application.created_at.desc())
    )
    apps = result.scalars().all()

    return {
        "applications": [
            {
                "id": a.id, "scheme_name": a.scheme_name, "status": a.status,
                "eligibility_status": a.eligibility_status, "notes": a.notes,
                "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None,
                "created_at": a.created_at.isoformat()
            }
            for a in apps
        ]
    }


@router.get("/{application_id}")
async def get_application(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.user_id == current_user.id  # Security: user can only see their own
        )
    )
    app = result.scalar_one_or_none()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    return {
        "id": app.id, "scheme_name": app.scheme_name, "status": app.status,
        "eligibility_status": app.eligibility_status, "notes": app.notes,
        "submitted_at": app.submitted_at.isoformat() if app.submitted_at else None,
        "is_official_update": app.is_official_update,
        "created_at": app.created_at.isoformat()
    }


@router.put("/{application_id}/status")
async def update_status(
    application_id: str,
    status: str,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    valid_statuses = ["draft", "submitted", "under_review", "approved", "rejected", "pending_documents"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    result = await db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.user_id == current_user.id
        )
    )
    app = result.scalar_one_or_none()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.status = status
    if notes:
        app.notes = notes
    app.is_official_update = False  # User-entered, not official

    await db.commit()
    return {"message": "Status updated", "status": status, "is_official_update": False}


@router.get("/schemes/search")
async def search_schemes(
    query: str = Query(..., min_length=1),
    state: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Search government schemes from database"""
    db_query = select(GovernmentScheme)

    result = await db.execute(db_query.limit(20))
    schemes = result.scalars().all()

    return {
        "schemes": [
            {
                "id": s.id, "scheme_name": s.scheme_name, "department": s.department,
                "description": s.description, "benefits": s.benefits,
                "eligibility_criteria": s.eligibility_criteria,
                "required_documents": s.required_documents,
                "official_url": s.official_url, "verification_status": s.verification_status,
                "category": s.category, "state": s.state, "is_central": s.is_central
            }
            for s in schemes
        ]
    }
