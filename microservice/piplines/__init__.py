"""
MediKiosk AI Microservice.

Two-pipeline system:
  Pipeline 1 — Conversational Intake (stateful per session, in-memory)
  Pipeline 2 — Summary Generation (stateless, JSON-in / JSON-out)
"""
