from pathlib import Path

import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report

SERVICE_DIR = Path(__file__).resolve().parent
data = pd.read_csv(SERVICE_DIR / "data" / "tickets.csv")

X_train, X_test, y_train, y_test = train_test_split(
    data["message"],
    data["category"],
    test_size=0.2,
    stratify=data["category"],
    random_state=42,
)

model = Pipeline([
    ("vectorizer", TfidfVectorizer(ngram_range=(1, 2))),
    ("classifier", LogisticRegression(max_iter=1000)),
])

model.fit(X_train, y_train)
predictions = model.predict(X_test)
print(classification_report(y_test, predictions))
model_path = SERVICE_DIR / "model.joblib"
joblib.dump(model, model_path)
print(f"Modelo guardado en {model_path}")
