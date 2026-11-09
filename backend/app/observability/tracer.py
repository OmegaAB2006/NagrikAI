import uuid
import time
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
import structlog

logger = structlog.get_logger()


class WorkflowTracer:
    """Centralized workflow tracing and observability"""

    def __init__(self):
        self._traces: Dict[str, Dict] = {}

    def start_workflow(self, user_id: Optional[str] = None, request_type: str = "chat") -> str:
        workflow_id = str(uuid.uuid4())
        self._traces[workflow_id] = {
            "workflow_id": workflow_id,
            "user_id": user_id,
            "request_type": request_type,
            "started_at": datetime.utcnow().isoformat(),
            "completed_at": None,
            "status": "running",
            "stages": [],
            "total_tokens": 0,
            "total_cost": 0.0,
            "agents_used": [],
            "guardrail_events": [],
            "tool_calls": [],
            "errors": []
        }
        logger.info("workflow_started", workflow_id=workflow_id, request_type=request_type)
        return workflow_id

    def add_stage(self, workflow_id: str, stage_name: str, status: str = "started", details: Optional[Dict] = None):
        if workflow_id not in self._traces:
            return
        stage = {
            "stage": stage_name,
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details or {}
        }
        self._traces[workflow_id]["stages"].append(stage)
        logger.info("workflow_stage", workflow_id=workflow_id, stage=stage_name, status=status)

    def add_agent_execution(self, workflow_id: str, agent_name: str, execution_data: Dict):
        if workflow_id not in self._traces:
            return
        if agent_name not in self._traces[workflow_id]["agents_used"]:
            self._traces[workflow_id]["agents_used"].append(agent_name)
        tokens = execution_data.get("tokens", 0)
        cost = execution_data.get("cost", 0.0)
        self._traces[workflow_id]["total_tokens"] += tokens
        self._traces[workflow_id]["total_cost"] += cost

    def add_guardrail_event(self, workflow_id: str, event: Dict):
        if workflow_id not in self._traces:
            return
        self._traces[workflow_id]["guardrail_events"].append(event)

    def add_tool_call(self, workflow_id: str, tool_name: str, success: bool, details: Optional[Dict] = None):
        if workflow_id not in self._traces:
            return
        self._traces[workflow_id]["tool_calls"].append({
            "tool": tool_name,
            "success": success,
            "timestamp": datetime.utcnow().isoformat(),
            "details": details or {}
        })

    def complete_workflow(self, workflow_id: str, status: str = "completed"):
        if workflow_id not in self._traces:
            return
        self._traces[workflow_id]["completed_at"] = datetime.utcnow().isoformat()
        self._traces[workflow_id]["status"] = status
        logger.info("workflow_completed", workflow_id=workflow_id, status=status)

    def get_trace(self, workflow_id: str) -> Optional[Dict]:
        return self._traces.get(workflow_id)

    def get_recent_traces(self, limit: int = 50) -> List[Dict]:
        traces = list(self._traces.values())
        traces.sort(key=lambda x: x["started_at"], reverse=True)
        return traces[:limit]

    def get_stats(self) -> Dict[str, Any]:
        all_traces = list(self._traces.values())
        if not all_traces:
            return {
                "total_requests": 0,
                "successful_requests": 0,
                "task_completion_rate": 0.0,
                "avg_latency_ms": 0.0,
                "total_tokens": 0,
                "total_cost": 0.0,
                "active_agents": 0
            }

        total = len(all_traces)
        successful = sum(1 for t in all_traces if t["status"] == "completed")
        total_tokens = sum(t["total_tokens"] for t in all_traces)
        total_cost = sum(t["total_cost"] for t in all_traces)

        latencies = []
        for t in all_traces:
            if t["completed_at"] and t["started_at"]:
                try:
                    start = datetime.fromisoformat(t["started_at"])
                    end = datetime.fromisoformat(t["completed_at"])
                    latencies.append((end - start).total_seconds() * 1000)
                except:
                    pass

        avg_latency = sum(latencies) / len(latencies) if latencies else 0.0

        # Count unique agents across all traces
        all_agents = set()
        for t in all_traces:
            all_agents.update(t["agents_used"])

        # Guardrail interventions
        total_guardrail = sum(len(t["guardrail_events"]) for t in all_traces)
        guardrail_rate = total_guardrail / total if total > 0 else 0.0

        return {
            "total_requests": total,
            "successful_requests": successful,
            "task_completion_rate": successful / total if total > 0 else 0.0,
            "avg_latency_ms": avg_latency,
            "total_tokens": total_tokens,
            "total_cost": total_cost,
            "active_agents": len(all_agents),
            "guardrail_intervention_rate": guardrail_rate,
            "total_guardrail_events": total_guardrail
        }


tracer = WorkflowTracer()
