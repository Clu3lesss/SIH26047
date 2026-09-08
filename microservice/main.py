"""
main.py — MediKiosk AI Microservice entry point.

Loads environment variables and mounts the FastAPI application.

Run with:
    uvicorn main:app --reload

Or directly:
    python main.py
"""

import dotenv

dotenv.load_dotenv()

from fastapi import FastAPI

from microservice.piplines.api.routes import router

app = FastAPI(
    title="MediKiosk AI Microservice",
    description=(
        "Two-pipeline AI system for clinical history intake.\n\n"
        "**Pipeline 1** (`/intake`) — Conversational patient interview.\n"
        "**Pipeline 2** (`/summary`) — Physician summary generation."
    ),
    version="0.1.0",
)

app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
