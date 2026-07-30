"""
Machine learning telemetry and latency tracking recorder for DecisionOS.
"""
import logging
import time
from contextlib import contextmanager
from typing import Any, Dict, Generator

logger = logging.getLogger("decisionos.ml.telemetry")


class MLTelemetryRecorder:
    """Records execution time, row processing rate, and confidence score metrics."""

    def __init__(self):
        self._metrics_log: list[Dict[str, Any]] = []

    @contextmanager
    def measure_latency(self, model_name: str, row_count: int) -> Generator[None, None, None]:
        """Context manager measuring model execution duration and throughput."""
        start_time = time.perf_counter()
        error_occurred = False
        try:
            yield
        except Exception as exc:
            error_occurred = True
            logger.error(f"ML execution error in {model_name}: {exc}")
            raise
        finally:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            throughput = (row_count / (duration_ms / 1000.0)) if duration_ms > 0 else 0
            metric_entry = {
                "model_name": model_name,
                "row_count": row_count,
                "duration_ms": round(duration_ms, 2),
                "rows_per_second": round(throughput, 2),
                "error": error_occurred,
                "timestamp": time.time(),
            }
            self._metrics_log.append(metric_entry)
            logger.info(
                f"[ML Telemetry] {model_name} processed {row_count} rows in "
                f"{duration_ms:.2f}ms ({throughput:.1f} rows/sec)"
            )

    def get_recent_metrics(self, limit: int = 20) -> list[Dict[str, Any]]:
        """Return the most recent telemetry entries."""
        return self._metrics_log[-limit:]


_recorder_instance = MLTelemetryRecorder()


def get_ml_recorder() -> MLTelemetryRecorder:
    """Return singleton MLTelemetryRecorder instance."""
    return _recorder_instance
