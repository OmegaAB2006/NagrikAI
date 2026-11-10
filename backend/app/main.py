from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog

from app.config import settings
from app.database import init_db
from app.routers import auth, chat, applications, admin, evaluation

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="ISO"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer()
    ]
)
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("nagrikAI_starting", version=settings.APP_VERSION)
    await init_db()
    await seed_admin_user()
    logger.info("nagrikAI_started")
    yield
    # Shutdown
    logger.info("nagrikAI_stopping")


async def seed_admin_user():
    """Create default admin user if not exists"""
    from app.database import async_session_factory
    from app.models.db_models import User, UserProfile
    from app.services.auth_service import get_password_hash
    from sqlalchemy import select
    import uuid

    async with async_session_factory() as db:
        result = await db.execute(select(User).where(User.email == "admin@nagrikai.gov.in"))
        if not result.scalar_one_or_none():
            admin = User(
                id=str(uuid.uuid4()),
                email="admin@nagrikai.gov.in",
                full_name="NagrikAI Administrator",
                hashed_password=get_password_hash("Admin@NagrikAI2024"),
                role="admin"
            )
            db.add(admin)
            profile = UserProfile(id=str(uuid.uuid4()), user_id=admin.id)
            db.add(profile)
            await db.commit()
            logger.info("admin_user_created", email="admin@nagrikai.gov.in")


app = FastAPI(
    title="NagrikAI API",
    description="Intelligent Multi-Agent Government Services Platform",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(applications.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(evaluation.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": "NagrikAI",
        "version": settings.APP_VERSION,
        "description": "Intelligent Multi-Agent Government Services Platform",
        "status": "operational",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "version": settings.APP_VERSION}
