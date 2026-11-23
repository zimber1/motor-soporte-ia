"""Train and evaluate the lightweight support-ticket classifier."""

import re
import unicodedata
from pathlib import Path

import joblib
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)

SERVICE_DIR = Path(__file__).resolve().parent
DATA_PATH = SERVICE_DIR / "data" / "tickets.csv"
MODEL_PATH = SERVICE_DIR / "model.joblib"
CATEGORIES = ["ACCESS", "BUG", "FEATURE", "SECURITY"]
EXPECTED_ROWS = 200
EXPECTED_PER_CATEGORY = 50
SPLIT_COUNTS = {"train": 40, "test": 10}


def validate_dataset(data: pd.DataFrame) -> None:
    """Validate the dataset contract before splitting or training."""
    required_columns = {"message", "category", "source", "split"}
    missing_columns = required_columns.difference(data.columns)
    if missing_columns:
        raise ValueError(f"Faltan columnas obligatorias: {sorted(missing_columns)}")
    if len(data) != EXPECTED_ROWS:
        raise ValueError(f"El dataset debe contener {EXPECTED_ROWS} registros; se encontraron {len(data)}.")
    if data[list(required_columns)].isna().any().any():
        raise ValueError("El dataset contiene valores vacíos o nulos.")

    data["message"] = data["message"].astype(str).str.strip()
    normalized = data["message"].map(normalize_message)
    if normalized.eq("").any():
        raise ValueError("El dataset contiene mensajes sin texto.")
    duplicates = int(normalized.duplicated().sum())
    if duplicates:
        raise ValueError(f"El dataset contiene {duplicates} mensajes duplicados.")

    found_categories = set(data["category"].astype(str))
    if found_categories != set(CATEGORIES):
        raise ValueError(f"Categorías inválidas. Esperadas: {CATEGORIES}; encontradas: {sorted(found_categories)}.")
    counts = data["category"].value_counts().to_dict()
    expected_counts = {category: EXPECTED_PER_CATEGORY for category in CATEGORIES}
    if counts != expected_counts:
        raise ValueError(f"Distribución incorrecta. Esperada: {expected_counts}; encontrada: {counts}.")
    if not data["source"].eq("synthetic").all():
        raise ValueError("Todos los registros deben tener source=synthetic.")
    expected_split = {
        (split, category): count
        for split, count in SPLIT_COUNTS.items()
        for category in CATEGORIES
    }
    if data.groupby(["split", "category"]).size().to_dict() != expected_split:
        raise ValueError("Se requieren 40 registros train y 10 test por categoría.")


def normalize_message(message: str) -> str:
    """Ignore case, accents and punctuation for duplicate detection."""
    decomposed = unicodedata.normalize("NFKD", message.casefold())
    unaccented = "".join(char for char in decomposed if not unicodedata.combining(char))
    return " ".join(re.findall(r"[^\W_]+", unaccented))


def main() -> None:
    data = pd.read_csv(DATA_PATH, encoding="utf-8")
    validate_dataset(data)
    print(f"Dataset validado: {len(data)} registros.")
    print("Distribución por categoría:")
    print(data["category"].value_counts().reindex(CATEGORIES).to_string())

    training = data.loc[data["split"].eq("train")]
    testing = data.loc[data["split"].eq("test")]
    print(f"TRAIN: {len(training)} registros | TEST: {len(testing)} registros")

    model = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2))),
        ("classifier", LogisticRegression(max_iter=1000)),
    ])
    model.fit(training["message"], training["category"])
    y_test = testing["category"]
    predictions = model.predict(testing["message"])

    # Report regression probes separately from the reserved test metrics.
    smoke_tests = [
        ("La aplicación se cierra inesperadamente cuando intento registrar una venta", "BUG"),
        ("No puedo iniciar sesión porque mi contraseña aparece como incorrecta", "ACCESS"),
        ("Quiero que el sistema permita programar reportes automáticamente cada semana", "FEATURE"),
        ("Un usuario puede consultar archivos privados de otra organización", "SECURITY"),
    ]
    smoke_predictions = model.predict([message for message, _ in smoke_tests])
    smoke_failures = []
    print("\nPruebas rápidas de regresión:")
    for (message, expected), predicted in zip(smoke_tests, smoke_predictions):
        status = "OK" if predicted == expected else "REVISAR"
        print(f"[{status}] esperado={expected} | obtenido={predicted} | {message}")
        if predicted != expected:
            smoke_failures.append((message, expected, str(predicted)))
    if smoke_failures:
        print(f"ADVERTENCIA: {len(smoke_failures)} de {len(smoke_tests)} pruebas no coincidieron.")

    accuracy = accuracy_score(y_test, predictions)
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_test, predictions, labels=CATEGORIES, average="macro", zero_division=0
    )
    print("\nMétricas sobre TEST (promedio macro):")
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1-score:  {f1:.4f}")
    print("\nReporte de clasificación:")
    print(classification_report(y_test, predictions, labels=CATEGORIES, zero_division=0))
    print("Matriz de confusión (filas=real, columnas=predicción):")
    print(CATEGORIES)
    print(confusion_matrix(y_test, predictions, labels=CATEGORIES))

    joblib.dump(model, MODEL_PATH, compress=3)
    loaded_model = joblib.load(MODEL_PATH)
    sample_prediction = loaded_model.predict([training["message"].iloc[0]])[0]
    if sample_prediction not in CATEGORIES:
        raise RuntimeError("La verificación del modelo guardado devolvió una categoría inválida.")
    print(f"\nModelo guardado y verificado: {MODEL_PATH}")
    print(f"Tamaño del modelo: {MODEL_PATH.stat().st_size:,} bytes")
    print(f"Predicción de comprobación: {sample_prediction}")


if __name__ == "__main__":
    main()
