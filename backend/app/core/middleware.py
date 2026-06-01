import logging
import time
import uuid
import traceback
from typing import Any, Dict

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger(__name__)

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    Global error handling and logging middleware.
    Intercepts every request to log details and standardizes error responses.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()
        request_id = str(uuid.uuid4())
        
        # Inject request ID into state for use in other parts of the app if needed
        request.state.request_id = request_id

        try:
            response = await call_next(request)
            
            process_time = time.perf_counter() - start_time
            
            # Log successful or client-side error requests (1xx, 2xx, 3xx, 4xx)
            log_level = logging.INFO if response.status_code < 400 else logging.WARNING
            
            logger.log(
                log_level,
                f"[{request_id}] {request.method} {request.url.path} - "
                f"Status: {response.status_code} - "
                f"Time: {process_time:.4f}s"
            )
            
            # Add request ID to response headers for debugging
            response.headers["X-Request-ID"] = request_id
            return response

        except HTTPException as e:
            # Handle known FastAPI/Starlette HTTP exceptions
            process_time = time.perf_counter() - start_time
            logger.warning(
                f"[{request_id}] {request.method} {request.url.path} - "
                f"HTTPException: {e.status_code} - {e.detail} - "
                f"Time: {process_time:.4f}s"
            )
            return self._create_error_response(e.status_code, e.detail, request_id)

        except Exception as e:
            # Handle unexpected server errors (500)
            process_time = time.perf_counter() - start_time
            
            # Use logger.exception to automatically capture the traceback
            logger.error(
                f"[{request_id}] Unexpected error on {request.method} {request.url.path}: {str(e)}",
                exc_info=True
            )
            
            error_content = {
                "message": "An unexpected error occurred. Please contact support.",
                "error_code": "INTERNAL_SERVER_ERROR",
                "error_id": request_id,
                "path": request.url.path
            }
            
            return self._create_error_response(500, error_content, request_id)

    def _create_error_response(self, status_code: int, detail: Any, request_id: str) -> JSONResponse:
        """Create standardized, industry-standard error response."""
        
        # Standardize the detail structure
        if isinstance(detail, str):
            error_payload = {
                "message": detail,
                "error_code": "API_ERROR"
            }
        elif isinstance(detail, dict):
            error_payload = detail
        else:
            error_payload = {
                "message": str(detail),
                "error_code": "API_ERROR"
            }

        return JSONResponse(
            status_code=status_code,
            content={
                "error": error_payload,
                "request_id": request_id,
                "timestamp": time.time(),
                "success": False
            },
            headers={"X-Request-ID": request_id}
        )
