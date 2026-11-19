"""FastAPI endpoint for predictions from a trained classifier."""

from functools import lru_cache
from pathlib import Path

import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


MODEL_PATH = Path(__file__).parent / "model.joblib"

app = FastAPI(title="Machine Learning Classification Service")


class PredictionRequest(BaseModel):
    """Text submitted for classification."""

    text: str


class PredictionResponse(BaseModel):
    """Predicted category."""

    category: str


@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.is_file():
        raise HTTPException(status_code=503, detail="Trained model is not available.")
    return joblib.load(MODEL_PATH)


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest) -> PredictionResponse:
    """Return a predicted category for the supplied text."""
    model = load_model()
    category = model.predict([request.text])[0]
    return PredictionResponse(category=str(category))
