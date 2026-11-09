from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
import uuid

from app.database import get_db
from app.models.db_models import User, UserProfile, AuditLog
from app.models.schemas import UserCreate, UserLogin, TokenResponse, UserResponse, UserProfileUpdate
from app.services.auth_service import verify_password, get_password_hash, create_access_token
from app.services.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check existing user
    existing = await db.execute(select(User).where(User.email == user_data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password) if user_data.password else None,
        is_guest=user_data.is_guest,
        role="citizen"
    )
    db.add(user)

    # Create empty profile
    profile = UserProfile(id=str(uuid.uuid4()), user_id=user.id)
    db.add(profile)
    await db.commit()

    token = create_access_token(
        {"sub": user.id, "email": user.email, "role": user.role},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id, email=user.email, full_name=user.full_name,
            role=user.role, is_active=user.is_active, is_guest=user.is_guest,
            created_at=user.created_at
        )
    )


@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_data.email))
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is inactive")

    token = create_access_token(
        {"sub": user.id, "email": user.email, "role": user.role},
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id, email=user.email, full_name=user.full_name,
            role=user.role, is_active=user.is_active, is_guest=user.is_guest,
            created_at=user.created_at
        )
    )


@router.post("/guest", response_model=TokenResponse)
async def guest_login(db: AsyncSession = Depends(get_db)):
    """Create a guest user session"""
    user = User(
        id=str(uuid.uuid4()),
        email=f"guest_{uuid.uuid4().hex[:8]}@nagrikAI.guest",
        is_guest=True,
        role="citizen"
    )
    db.add(user)
    profile = UserProfile(id=str(uuid.uuid4()), user_id=user.id)
    db.add(profile)
    await db.commit()

    token = create_access_token(
        {"sub": user.id, "email": user.email, "role": user.role},
        timedelta(hours=24)
    )

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id, email=user.email, full_name="Guest User",
            role=user.role, is_active=user.is_active, is_guest=user.is_guest,
            created_at=user.created_at
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id, email=current_user.email,
        full_name=current_user.full_name, role=current_user.role,
        is_active=current_user.is_active, is_guest=current_user.is_guest,
        created_at=current_user.created_at
    )


@router.put("/profile", response_model=dict)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()

    if not profile:
        profile = UserProfile(id=str(uuid.uuid4()), user_id=current_user.id)
        db.add(profile)

    for field, value in profile_data.model_dump(exclude_none=True).items():
        setattr(profile, field, value)

    await db.commit()
    return {"message": "Profile updated successfully"}


@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()

    if not profile:
        return {}

    return {
        "state": profile.state, "district": profile.district, "age": profile.age,
        "occupation": profile.occupation, "education": profile.education,
        "employment_status": profile.employment_status, "annual_income": profile.annual_income,
        "category": profile.category, "preferred_language": profile.preferred_language,
        "gender": profile.gender, "is_student": profile.is_student,
        "is_farmer": profile.is_farmer, "has_disability": profile.has_disability,
        "is_bpl": profile.is_bpl
    }
