"""Train and evaluate the lightweight support-ticket classifier."""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
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


def validate_dataset(data: pd.DataFrame) -> None:
    """Validate the dataset contract before splitting or training."""
    required_columns = {"message", "category", "source"}
    missing_columns = required_columns.difference(data.columns)
    if missing_columns:
        raise ValueError(f"Faltan columnas obligatorias: {sorted(missing_columns)}")
    if len(data) != EXPECTED_ROWS:
        raise ValueError(f"El dataset debe contener {EXPECTED_ROWS} registros; se encontraron {len(data)}.")
    if data[list(required_columns)].isna().any().any():
        raise ValueError("El dataset contiene valores vacíos o nulos.")

    data["message"] = data["message"].astype(str).str.strip()
    if data["message"].eq("").any():
        raise ValueError("El dataset contiene mensajes vacíos.")
    if data["message"].duplicated().any():
        duplicates = int(data["message"].duplicated().sum())
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


def main() -> None:
    data = pd.read_csv(DATA_PATH, encoding="utf-8")
    validate_dataset(data)
    print(f"Dataset validado: {len(data)} registros.")
    print("Distribución por categoría:")
    print(data["category"].value_counts().reindex(CATEGORIES).to_string())

    X_train, X_test, y_train, y_test = train_test_split(
        data["message"],
        data["category"],
        test_size=0.2,
        stratify=data["category"],
        random_state=42,
    )

    expected_train = {category: 40 for category in CATEGORIES}
    expected_test = {category: 10 for category in CATEGORIES}
    if len(X_train) != 160 or len(X_test) != 40:
        raise ValueError(f"División incorrecta: TRAIN={len(X_train)}, TEST={len(X_test)}.")
    if y_train.value_counts().to_dict() != expected_train:
        raise ValueError("La distribución estratificada de TRAIN no es la esperada.")
    if y_test.value_counts().to_dict() != expected_test:
        raise ValueError("La distribución estratificada de TEST no es la esperada.")
    print(f"TRAIN: {len(X_train)} registros | TEST: {len(X_test)} registros")

    model = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2))),
        ("classifier", LogisticRegression(max_iter=1000)),
    ])
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    # Regression probes for representative messages outside the CSV rows.
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

    new_message = ["Encontré datos de otros clientes"]
    category = model.predict(new_message)[0]
    confidence = model.predict_proba(new_message).max()

    print("Categoría:", category)
    print("Score aproximado:", round(confidence, 3))

    joblib.dump(model, MODEL_PATH, compress=3)
    loaded_model = joblib.load(MODEL_PATH)
    sample_prediction = loaded_model.predict([X_test.iloc[0]])[0]
    if sample_prediction not in CATEGORIES:
        raise RuntimeError("La verificación del modelo guardado devolvió una categoría inválida.")
    print(f"\nModelo guardado y verificado: {MODEL_PATH}")
    print(f"Tamaño del modelo: {MODEL_PATH.stat().st_size:,} bytes")
    print(f"Predicción de comprobación: {sample_prediction}")


if __name__ == "__main__":
    main()
