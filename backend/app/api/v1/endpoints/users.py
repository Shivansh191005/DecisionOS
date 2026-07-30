"""
User profile REST API endpoints (/api/v1/users/*).
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter()


@router.patch(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update current user profile",
)
async def update_me(
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    """
    Update profile details (name, avatar) for the authenticated user.
    """
    update_data = payload.model_dump(exclude_unset=True)
    if update_data:
        user_repo = UserRepository(db)
        updated = await user_repo.update(current_user.id, update_data)
        await db.commit()
        if updated:
            current_user = updated
    return UserResponse.model_validate(current_user)
