"""
Custom domain exceptions and HTTP error handlers for DecisionOS API.
"""
from typing import Any, Optional
from fastapi import HTTPException, status


class DecisionOSException(Exception):
    """Base domain exception for DecisionOS."""

    def __init__(self, message: str, error_code: str = "DECISION_OS_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(message)


class NotFoundException(HTTPException):
    """Raised when a requested resource does not exist."""

    def __init__(self, detail: str = "Resource not found", headers: Optional[dict] = None):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND, detail=detail, headers=headers
        )


class UnauthorizedException(HTTPException):
    """Raised when authentication fails or is missing."""

    def __init__(
        self,
        detail: str = "Could not validate credentials",
        headers: Optional[dict] = None,
    ):
        if headers is None:
            headers = {"WWW-Authenticate": "Bearer"}
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=detail, headers=headers
        )


class ForbiddenException(HTTPException):
    """Raised when user lacks RBAC permission for an action."""

    def __init__(
        self,
        detail: str = "You do not have permission to perform this action",
        headers: Optional[dict] = None,
    ):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN, detail=detail, headers=headers
        )


class BadRequestException(HTTPException):
    """Raised for invalid input or business rule violations."""

    def __init__(self, detail: str = "Invalid request parameters", headers: Optional[dict] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST, detail=detail, headers=headers
        )


class ConflictException(HTTPException):
    """Raised when an operation conflicts with existing data (e.g. email exists)."""

    def __init__(self, detail: str = "Resource already exists", headers: Optional[dict] = None):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT, detail=detail, headers=headers
        )
