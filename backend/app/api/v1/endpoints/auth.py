"""
Authentication REST API endpoints (/api/v1/auth/*).
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    GoogleAuthRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new enterprise user account",
)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Register a new user account with email and password.
    Automatically creates a default Organization and default Main Workspace.
    Returns short-lived JWT Access Token and secure Refresh Token.
    """
    auth_service = AuthService(db)
    user, access_token, refresh_token = await auth_service.register_user(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        organization_name=payload.organization_name,
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=900,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User sign-in with email and password",
)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate user credentials and issue new access and refresh token pair.
    """
    auth_service = AuthService(db)
    user, access_token, refresh_token = await auth_service.login(
        email=payload.email,
        password=payload.password,
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=900,
    )


@router.post(
    "/google",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate with Google OAuth SSO",
)
async def google_auth(
    payload: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Sign in or automatically register an account using a Google OAuth identity token.
    """
    auth_service = AuthService(db)
    user, access_token, refresh_token = await auth_service.authenticate_google(
        google_id=payload.google_id,
        email=payload.email,
        full_name=payload.full_name,
        avatar_url=payload.avatar_url,
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=900,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Rotate JWT refresh token",
)
async def refresh_tokens(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Rotate an existing refresh token and issue a new access token.
    The used refresh token is revoked immediately.
    """
    auth_service = AuthService(db)
    access_token, new_refresh_token = await auth_service.refresh_tokens(
        raw_refresh_token=payload.refresh_token
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=900,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Sign out and revoke refresh token",
)
async def logout(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """
    Revoke a refresh token to prevent further token rotations.
    """
    auth_service = AuthService(db)
    await auth_service.logout(raw_refresh_token=payload.refresh_token)


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
)
async def get_me(
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    """
    Retrieve current authenticated user profile and account status.
    """
    return UserResponse.model_validate(current_user)
