"""
🔥 API de Clasificación de Gravedad de Incendios
Municipalidad Valle del Sol

Este Space clasifica la gravedad de un incendio (1-5) a partir de:
- Una foto del incendio (CNN EfficientNet-B0)
- Datos satelitales opcionales (XGBoost)
"""

import gradio as gr
import numpy as np
import torch
import torch.nn as nn
import timm
import joblib
import json
import onnxruntime as ort
from PIL import Image
from torchvision import transforms

# ============================================================
# CARGAR MODELOS
# ============================================================

# Modelo CNN (ONNX)
print("🔥 Cargando modelo CNN...")
cnn_session = ort.InferenceSession("fire_severity_cnn_v2.onnx")
print("✅ CNN cargado")

# Modelo XGBoost
print("📊 Cargando modelo XGBoost...")
xgb_model = joblib.load("fire_severity_xgboost_v2.joblib")
print("✅ XGBoost cargado")

# Transform para imágenes
img_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# Nombres y colores
NIVELES = {
    0: {"nombre": "Conato", "emoji": "🟢", "color": "#22c55e",
        "descripcion": "Fuego muy pequeño, controlable fácilmente"},
    1: {"nombre": "Menor", "emoji": "🟡", "color": "#eab308",
        "descripcion": "Fuego localizado, requiere atención rápida"},
    2: {"nombre": "Moderado", "emoji": "🟠", "color": "#f97316",
        "descripcion": "Fuego considerable, requiere bomberos"},
    3: {"nombre": "Mayor", "emoji": "🔴", "color": "#ef4444",
        "descripcion": "Fuego grande, peligro significativo"},
    4: {"nombre": "Catastrófico", "emoji": "⚫", "color": "#1f2937",
        "descripcion": "Fuego masivo, emergencia total"},
}


def clasificar_imagen(imagen):
    """Clasifica la gravedad de un incendio a partir de una imagen."""
    if imagen is None:
        return "⚠️ Sube una imagen", "", ""

    # Preprocesar
    img = Image.fromarray(imagen).convert("RGB")
    tensor = img_transform(img).unsqueeze(0).numpy()

    # Inferencia con ONNX
    outputs = cnn_session.run(None, {"image": tensor.astype(np.float32)})
    logits = outputs[0][0]

    # Softmax para probabilidades
    exp_logits = np.exp(logits - np.max(logits))
    probs = exp_logits / exp_logits.sum()

    nivel_idx = int(np.argmax(probs))
    confianza = float(probs[nivel_idx]) * 100
    info = NIVELES[nivel_idx]

    # Resultado principal
    resultado = f"{info['emoji']} Nivel {nivel_idx + 1}: {info['nombre']}"
    detalle = f"Confianza: {confianza:.1f}%\n{info['descripcion']}"

    # Tabla de probabilidades
    tabla_probs = ""
    for i in range(5):
        n = NIVELES[i]
        barra = "█" * int(probs[i] * 30)
        tabla_probs += f"{n['emoji']} {n['nombre']}: {probs[i]*100:.1f}% {barra}\n"

    return resultado, detalle, tabla_probs


def clasificar_satelital(brightness, frp, confidence, scan, track):
    """Clasifica gravedad usando datos satelitales (NASA FIRMS)."""
    conf_map = {"low": 30, "nominal": 60, "high": 90}
    conf_num = conf_map.get(confidence, 60)

    features = np.array([[brightness, brightness, frp, scan, track,
                          scan * track, conf_num, 0]])

    # Ajustar al número de features que espera el modelo
    n_expected = xgb_model.n_features_in_
    if features.shape[1] > n_expected:
        features = features[:, :n_expected]
    elif features.shape[1] < n_expected:
        features = np.pad(features, ((0, 0), (0, n_expected - features.shape[1])))

    pred = xgb_model.predict(features)[0]
    probs = xgb_model.predict_proba(features)[0]

    info = NIVELES[int(pred)]
    resultado = f"{info['emoji']} Nivel {int(pred) + 1}: {info['nombre']}"
    detalle = f"Confianza: {float(probs[int(pred)])*100:.1f}%\n{info['descripcion']}"

    return resultado, detalle


# ============================================================
# INTERFAZ GRADIO
# ============================================================

with gr.Blocks(
    title="🔥 Clasificador de Gravedad de Incendios",
    theme=gr.themes.Soft(primary_hue="red", secondary_hue="orange"),
) as demo:

    gr.Markdown("""
    # 🔥 Clasificador de Gravedad de Incendios
    ### Municipalidad Valle del Sol

    Sube una foto de un incendio y la IA determinará su nivel de gravedad.
    """)

    with gr.Tab("📸 Clasificar por Imagen"):
        with gr.Row():
            with gr.Column():
                img_input = gr.Image(label="Sube una foto del incendio", type="numpy")
                btn_img = gr.Button("🔍 Clasificar", variant="primary", size="lg")

            with gr.Column():
                resultado_img = gr.Textbox(label="Resultado", lines=1)
                detalle_img = gr.Textbox(label="Detalle", lines=2)
                probs_img = gr.Textbox(label="Probabilidades por nivel", lines=6)

        btn_img.click(
            fn=clasificar_imagen,
            inputs=img_input,
            outputs=[resultado_img, detalle_img, probs_img]
        )

    with gr.Tab("🛰️ Clasificar por Datos Satelitales"):
        gr.Markdown("Ingresa los datos de NASA FIRMS para clasificar sin imagen.")
        with gr.Row():
            with gr.Column():
                brightness = gr.Slider(290, 500, value=350, label="Brightness (K)")
                frp = gr.Slider(0, 500, value=50, label="Fire Radiative Power (MW)")
                confidence = gr.Dropdown(
                    ["low", "nominal", "high"], value="nominal", label="Confidence"
                )
                scan = gr.Slider(0.3, 3.0, value=0.5, label="Scan (km)")
                track = gr.Slider(0.3, 3.0, value=0.5, label="Track (km)")
                btn_sat = gr.Button("🛰️ Clasificar", variant="primary")

            with gr.Column():
                resultado_sat = gr.Textbox(label="Resultado")
                detalle_sat = gr.Textbox(label="Detalle", lines=2)

        btn_sat.click(
            fn=clasificar_satelital,
            inputs=[brightness, frp, confidence, scan, track],
            outputs=[resultado_sat, detalle_sat]
        )

    gr.Markdown("""
    ---
    **Niveles de gravedad:**
    | Nivel | Nombre | Descripción |
    |-------|--------|-------------|
    | 🟢 1 | Conato | Fuego muy pequeño |
    | 🟡 2 | Menor | Fuego localizado |
    | 🟠 3 | Moderado | Fuego considerable |
    | 🔴 4 | Mayor | Fuego grande |
    | ⚫ 5 | Catastrófico | Fuego masivo |
    """)

# Lanzar con API habilitada
demo.launch()
