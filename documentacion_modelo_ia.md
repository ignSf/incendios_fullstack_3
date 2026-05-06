# 🔥 Documentación Técnica: Modelo de Clasificación de Gravedad de Incendios

## Municipalidad Valle del Sol — Sistema de IA v2.0

**Fecha de entrenamiento:** Abril 2026  
**Autor:** Ignacio Salazar  
**Infraestructura:** Google Colab (GPU T4) + Google Drive  
**Deployment:** Hugging Face Spaces (Gradio)

---

## 1. Objetivo del Modelo

Clasificar automáticamente la **gravedad de un incendio** en 5 niveles, a partir de:

- **Imágenes** del incendio (fotos de ciudadanos o cámaras) → modelo CNN
- **Datos satelitales** de NASA FIRMS (puntos calientes detectados desde el espacio) → modelo XGBoost

### Niveles de Gravedad

| Nivel | Nombre | Descripción | Acción Esperada |
|-------|--------|-------------|-----------------|
| 🟢 1 | **Conato** | Fuego muy pequeño, inicio de incendio | Monitorear, posible autoextinción |
| 🟡 2 | **Menor** | Fuego localizado, área reducida | Enviar unidad básica de bomberos |
| 🟠 3 | **Moderado** | Fuego considerable con humo visible | Enviar múltiples unidades |
| 🔴 4 | **Mayor** | Fuego grande, peligro significativo | Evacuación parcial, todos los recursos |
| ⚫ 5 | **Catastrófico** | Fuego masivo, descontrolado | Emergencia total, evacuación completa |

---

## 2. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    SISTEMA DUAL                          │
│                                                         │
│   📸 Imagen del incendio                                │
│      │                                                  │
│      ▼                                                  │
│   ┌──────────────────┐                                  │
│   │  CNN              │                                  │
│   │  EfficientNet-B0  │──→ Nivel de gravedad (1-5)      │
│   │  + Custom Head    │    + Confianza (%)               │
│   └──────────────────┘                                  │
│                                                         │
│   🛰️ Datos satelitales (NASA FIRMS)                     │
│      │                                                  │
│      ▼                                                  │
│   ┌──────────────────┐                                  │
│   │  XGBoost          │──→ Nivel de gravedad (1-5)      │
│   │  300 estimators   │    + Confianza (%)               │
│   └──────────────────┘                                  │
│                                                         │
│   Resultado final = Fusión ponderada de ambos modelos   │
└─────────────────────────────────────────────────────────┘
```

### ¿Cuándo se usa cada modelo?

| Escenario | Modelo utilizado |
|-----------|-----------------|
| Ciudadano reporta con foto (incendio urbano/doméstico) | Solo CNN |
| Ciudadano reporta con foto + hay datos FIRMS de esa zona | CNN + XGBoost (ensemble) |
| Detección automática sin reporte humano | Solo XGBoost |

---

## 3. Datasets Utilizados

### 3.1 Datos de Imágenes (para CNN)

Se utilizaron **5 datasets** de Kaggle combinados, cubriendo incendios **forestales y urbanos/domésticos**:

| Dataset | Fuente (Kaggle) | Tipo | Imágenes |
|---------|----------------|------|----------|
| FIRE Dataset | `phylake1337/fire-dataset` | Forestal | ~755 |
| Wildfire Detection | `brsdincer/wildfire-detection-image-data` | Forestal | ~1,832 |
| Forest Fire Images | `mohnishsaiprasad/forest-fire-images` | Forestal | ~5,000+ |
| House Fire Dataset | `atulyakumar98/test-dataset` | Urbano/doméstico | ~500+ |
| CCTV Fire Detection | `rituparna9/fire-detection-from-cctv` | Urbano (CCTV) | ~400+ |

### 3.2 Datos Satelitales (para XGBoost)

- **Fuente:** NASA FIRMS (Fire Information for Resource Management System)
- **Sensor:** VIIRS SNPP (satélite Suomi NPP)
- **Zona geográfica:** Chile Central (-34.0 a -33.0 lat, -71.5 a -70.0 lon)
- **Variables:** brightness, bright_ti4, frp, scan, track, confidence, daynight
- **Registros:** 500 puntos calientes

---

## 4. Pipeline de Datos — Paso a Paso

### Paso 1: Preparación del Entorno

```python
# Google Colab con GPU T4 (gratuita)
# Almacenamiento en Google Drive (15 GB gratuitos)
BASE = '/content/drive/MyDrive/fire_severity_project'
```

**Estructura de carpetas creada:**
```
fire_severity_project/
├── datasets/
│   ├── raw/                    # Datos sin procesar
│   ├── cleaned/
│   │   ├── train/
│   │   │   ├── 1_conato/
│   │   │   ├── 2_menor/
│   │   │   ├── 3_moderado/
│   │   │   ├── 4_mayor/
│   │   │   └── 5_catastrofico/
│   │   └── val/
│   │       └── (misma estructura)
│   └── tabular/
│       └── firms_etiquetado.csv
├── models/
│   ├── best_cnn_v2.pth
│   └── fire_severity_xgboost_v2.joblib
└── reports/
    ├── revision_visual_v2.png
    ├── training_v2.png
    ├── cm_cnn_v2.png
    └── cm_xgb_v2.png
```

### Paso 2: Descarga de Datasets

Los 5 datasets se descargaron directamente de Kaggle a Google Colab usando la API de Kaggle, sin necesidad de almacenamiento local.

```python
!kaggle datasets download -d phylake1337/fire-dataset -p /content/ds/fire_dataset --unzip
!kaggle datasets download -d brsdincer/wildfire-detection-image-data -p /content/ds/wildfire --unzip
# ... (3 datasets más)
```

### Paso 3: Limpieza de Imágenes

Se procesaron todas las imágenes con los siguientes filtros:

| Filtro | Criterio | Propósito |
|--------|----------|-----------|
| Corruptas | No se pueden abrir/cargar | Eliminar archivos dañados |
| Pequeñas | Ancho o alto < 100px | No tienen suficiente detalle |
| Duplicadas | Hash MD5 de thumbnail 32x32 | Evitar sesgo por repetición |
| Formato | Conversión a RGB .jpg | Uniformidad del dataset |

**Resultado:** ~5,831 imágenes limpias

### Paso 4: Etiquetado Inteligente (CLIP + HSV + Textura)

Este es el paso más crítico. Se implementó un sistema de **triple validación** para etiquetar cada imagen con su nivel de gravedad.

#### 4.1 CLIP de OpenAI (peso: 50%)

CLIP (Contrastive Language-Image Pre-Training) es un modelo de IA pre-entrenado que puede "entender" el contenido de una imagen comparándola con descripciones textuales.

**Modelo:** `openai/clip-vit-base-patch32`

**Prompts por nivel (en inglés, ya que CLIP fue entrenado en inglés):**

| Nivel | Prompts de ejemplo |
|-------|-------------------|
| 0 (No fuego) | "a peaceful landscape with no fire", "a sunset with orange sky" |
| 1 (Conato) | "a very small fire just starting", "a small kitchen fire" |
| 2 (Menor) | "a car fire or vehicle on fire", "a contained fire with smoke" |
| 3 (Moderado) | "a medium fire with significant flames and smoke" |
| 4 (Mayor) | "a large fire engulfing an entire building" |
| 5 (Catastrófico) | "a catastrophic wildfire destroying everything" |

**Proceso:**
1. Se pre-computaron embeddings de texto para cada nivel (5 prompts × 6 niveles = 30 descripciones)
2. Para cada imagen, se computó su embedding visual
3. Se calculó la similitud coseno entre el embedding de la imagen y cada nivel
4. El nivel con mayor similitud fue el predicho por CLIP

```python
# Computar embeddings internos (evitando problemas de API)
out = clip_model.text_model(input_ids=..., attention_mask=...)
pooled = out.pooler_output      # (batch, 768)
emb = clip_model.text_projection(pooled)  # (batch, 512)
```

#### 4.2 Análisis HSV (peso: 35%)

Se convirtieron las imágenes al espacio de color **HSV** (Hue, Saturation, Value), que es superior a RGB para detectar fuego porque separa el **tono** del color de su **brillo**.

**Rangos de detección de fuego en HSV:**

| Elemento | Hue (°) | Saturation | Value |
|----------|---------|------------|-------|
| 🔴 Llamas rojas | 0-15 o 345-360 | > 0.4 | > 0.4 |
| 🟠 Llamas naranjas | 15-40 | > 0.5 | > 0.5 |
| 🟡 Llamas amarillas | 40-65 | > 0.3 | > 0.6 |
| ⚪ Centro del fuego | cualquiera | < 0.2 | > 0.85 |
| 🟤 Brasas | 0-20 o 340-360 | > 0.5 | 0.15-0.5 |
| 🌫️ Humo | cualquiera | < 0.15 | 0.25-0.75 |

**Clasificación por porcentaje de píxeles de fuego:**

| % de fuego | Nivel asignado |
|-----------|---------------|
| < 1% | 0 (No fuego) |
| 1-5% | 1 (Conato) |
| 5-15% | 2 (Menor) |
| 15-30% | 3 (Moderado) |
| 30-50% | 4 (Mayor) |
| > 50% | 5 (Catastrófico) |

#### 4.3 Análisis de Textura (peso: 15%)

Las llamas reales tienen una **textura caótica** (alta varianza local), mientras que objetos rojos estáticos (autos, atardeceres) tienen texturas suaves.

Se calculó:
- **Varianza local** con kernel 5×5 (filtro uniforme)
- **Gradientes** con filtros de Sobel (detección de bordes)
- **Índice de caos** = desviación estándar de la varianza local

**Criterio:** `caos > 500 AND varianza_media > 200` → textura de fuego real

#### 4.4 Fusión de los 3 Métodos

```python
score_final = clip_nivel × 0.50 + hsv_nivel × 0.35 + tex_bonus × 0.15 × max(clip, hsv)

# Reglas de seguridad:
# Si CLIP dice "no fuego" con >70% confianza Y HSV < 3% fuego → nivel = 0
# Si CLIP ≥ 4 Y HSV ≥ 3 → forzar nivel ≥ 4
```

**Control de calidad:** Imágenes con acuerdo CLIP-HSV < 40% fueron **descartadas** del dataset.

### Paso 5: Balanceo de Clases

El etiquetado produjo clases desbalanceadas (muchas imágenes "Mayor", pocas "Catastrófico"). Se aplicó **Data Augmentation** para equilibrar:

| Transformación | Probabilidad | Propósito |
|---------------|-------------|-----------|
| Flip horizontal | 50% | Invariancia a orientación |
| Flip vertical | 30% | Invariancia a orientación |
| Rotación ±20° | 50% | Invariancia a ángulo |
| Brillo ×0.7-1.4 | 50% | Robustez a iluminación |
| Contraste ×0.8-1.3 | 50% | Robustez a calidad de cámara |

**Dataset final:**

| Split | Conato | Menor | Moderado | Mayor | Catastrófico | Total |
|-------|--------|-------|----------|-------|-------------|-------|
| **Train** | 1,992 | 1,992 | 1,992 | 1,992 | 1,992 | **9,960** |
| **Validation** | 137 | 36 | 112 | 346 | 18 | **649** |

---

## 5. Entrenamiento del Modelo CNN

### 5.1 Arquitectura

**Backbone:** EfficientNet-B0 (pre-entrenado en ImageNet)

```
EfficientNet-B0 (congelado parcialmente)
    │
    ▼
Custom Classifier Head:
    ├── Dropout (0.4)
    ├── Linear (1280 → 512) + ReLU + BatchNorm
    ├── Dropout (0.3)
    ├── Linear (512 → 256) + ReLU + BatchNorm
    ├── Dropout (0.2)
    └── Linear (256 → 5)  ← 5 clases de salida
```

**¿Por qué EfficientNet-B0?**
- Excelente balance precisión/tamaño (~5.3M parámetros)
- Pre-entrenado en ImageNet → transfer learning
- Eficiente para GPU T4 gratuita de Colab
- Tamaño del modelo: ~20 MB

### 5.2 Hiperparámetros

| Parámetro | Valor | Justificación |
|-----------|-------|---------------|
| **Epochs** | 25 | Suficiente para convergencia con early stopping |
| **Batch size** | 32 | Máximo para GPU T4 con EfficientNet-B0 |
| **Learning rate** | 3×10⁻⁴ | Estándar para fine-tuning |
| **Optimizer** | AdamW | Adam con weight decay para regularización |
| **Weight decay** | 1×10⁻⁴ | Prevenir overfitting |
| **Scheduler** | CosineAnnealingWarmRestarts | T₀=5, T_mult=2 |
| **Input size** | 224×224 px | Estándar de EfficientNet |

### 5.3 Función de Pérdida

Se utilizó **CrossEntropyLoss con pesos** para penalizar más la subestimación de incendios graves:

```python
weights = [1.0, 1.2, 1.5, 2.5, 4.0]  # Conato → Catastrófico
```

**Justificación:** Es preferible **sobreestimar** la gravedad (falsa alarma) que **subestimar** (gente en peligro).

### 5.4 Data Augmentation en Entrenamiento

```python
train_transforms = Compose([
    Resize(256),
    RandomCrop(224),
    RandomHorizontalFlip(0.5),
    RandomRotation(15),
    ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.1),
    RandomGrayscale(0.05),
    Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])
```

### 5.5 Resultados del Entrenamiento CNN

| Métrica | Valor |
|---------|-------|
| **Mejor Val Accuracy** | **77.8%** |
| **Train Accuracy (final)** | ~97% |
| **Epochs hasta mejor** | ~15 |

**Matriz de Confusión CNN:**

```
                 Predicho
              Conato  Menor  Moder  Mayor  Catastr
    Conato  │  122  │   5   │   5   │   5   │   0   │
    Menor   │   10  │   8   │   6   │  12   │   0   │
Real Moder  │    9  │   2   │  52   │  48   │   1   │
    Mayor   │    9  │   3   │  14   │ 315   │   5   │
    Catastr │    0  │   0   │   1   │   9   │   8   │
```

**Análisis:**
- ✅ Conato (89%) y Mayor (91%) se clasifican bien
- 🟡 Moderado se confunde con Mayor (43% de errores van a Mayor)
- ❌ Menor tiene baja precisión (22%) — pocas muestras de validación (36)
- ❌ Catastrófico limitado por pocas muestras (solo 18 de validación)
- 📈 El modelo tiende a sobreestimar hacia Mayor — **aceptable por seguridad**

**Gráficas de entrenamiento:**
- Train Loss: Convergencia suave hacia ~0.05
- Val Loss: Se estabiliza alrededor de ~1.0 (ligero overfitting después de epoch 10)
- El gap Train-Val indica margen de mejora con más datos

---

## 6. Entrenamiento del Modelo XGBoost

### 6.1 Features Utilizadas

| Feature | Descripción | Unidad |
|---------|-------------|--------|
| brightness | Temperatura de brillo | Kelvin |
| bright_ti4 | Brillo banda térmica infrarroja | Kelvin |
| frp | Fire Radiative Power (potencia radiada) | MW |
| scan | Tamaño del pixel (dirección scan) | km |
| track | Tamaño del pixel (dirección track) | km |
| area_estimada | scan × track | km² |
| conf_num | Confianza numérica (low=30, nominal=60, high=90) | — |
| noche | 1 si es de noche, 0 si es de día | — |

### 6.2 Hiperparámetros

| Parámetro | Valor |
|-----------|-------|
| n_estimators | 300 |
| max_depth | 6 |
| learning_rate | 0.1 |
| subsample | 0.8 |
| colsample_bytree | 0.8 |
| eval_metric | mlogloss |

### 6.3 Resultados XGBoost

> ⚠️ **Nota:** El modelo XGBoost fue entrenado con datos **sintéticos** generados aleatoriamente, ya que no hubo incendios activos en la zona de Chile durante el período de descarga de datos reales de NASA FIRMS. Los resultados no son representativos del rendimiento real con datos satelitales verdaderos.

---

## 7. Deployment

### 7.1 Plataforma

**Hugging Face Spaces** (tier gratuito)

| Aspecto | Detalle |
|---------|---------|
| SDK | Gradio |
| Hardware | CPU basic (gratuito) |
| Framework | PyTorch (archivo .pth) |
| API | REST automática por Gradio |

### 7.2 Archivos en el Space

```
fire-severity-classifier/
├── app.py                              # Aplicación Gradio
├── requirements.txt                    # Dependencias
├── best_cnn_v2.pth                     # Modelo CNN (~20 MB)
├── fire_severity_xgboost_v2.joblib     # Modelo XGBoost (~2 MB)
└── README.md                           # Metadata del Space
```

### 7.3 API REST

El Space expone automáticamente una API REST:

**Clasificar imagen:**
```bash
curl -X POST \
  https://USUARIO-fire-severity-classifier.hf.space/api/predict \
  -F "image=@foto_incendio.jpg"
```

**Clasificar datos satelitales:**
```bash
curl -X POST \
  https://USUARIO-fire-severity-classifier.hf.space/api/predict_1 \
  -d '{"brightness": 400, "frp": 150, "confidence": "high", "scan": 1.0, "track": 0.8}'
```

---

## 8. Integración con el Sistema

### Flujo completo en la aplicación:

```
Ciudadano reporta incendio (foto + GPS)
    │
    ▼
Frontend (Vercel / Next.js)
    │
    ▼
AWS Lambda (orquestador)
    ├── Envía foto → Hugging Face API (CNN)
    ├── Consulta NASA FIRMS → Hugging Face API (XGBoost)
    ├── Combina resultados
    └── Guarda en Supabase (PostgreSQL)
    │
    ▼
Dashboard muestra:
    ├── Nivel de gravedad en el mapa
    ├── Alertas automáticas si nivel ≥ 3
    └── Notificación a bomberos si nivel ≥ 4
```

---

## 9. Costos

| Servicio | Costo |
|----------|-------|
| Google Colab (entrenamiento) | $0 |
| Google Drive (almacenamiento) | $0 |
| Kaggle (datasets) | $0 |
| CLIP (etiquetado) | $0 (open source) |
| Hugging Face Space (inferencia) | $0 |
| NASA FIRMS (datos satelitales) | $0 |
| **Total** | **$0.00** |

---

## 10. Limitaciones y Mejoras Futuras

### Limitaciones actuales:
1. **Overfitting:** Gap de ~20% entre train y val accuracy sugiere que el modelo memoriza patrones
2. **Clase "Menor" débil:** Solo 36 muestras de validación, precisión baja
3. **Clase "Catastrófico" limitada:** Solo 18 muestras de validación
4. **XGBoost con datos sintéticos:** No refleja rendimiento real con datos FIRMS verdaderos
5. **Latencia en CPU:** Inferencia en HF Spaces (CPU) toma ~2-3 segundos por imagen

### Mejoras propuestas:
1. **Más datos:** Recopilar más imágenes de incendios domésticos y catastrofes
2. **Fine-tuning con feedback:** Usar clasificaciones corregidas por bomberos locales para reentrenar
3. **EfficientNet-B2/B3:** Modelo más grande para mayor precisión (requiere más GPU)
4. **Datos FIRMS reales:** Esperar a la temporada de incendios para obtener datos satelitales reales
5. **Ensemble mejorado:** Implementar voting ponderado entre CNN y XGBoost

---

## 11. Reproducibilidad

Para reproducir el entrenamiento:

1. Abrir `Fire_Severity_Data_Pipeline.ipynb` en Google Colab
2. Activar GPU T4: Runtime → Change runtime type → T4 GPU
3. Ejecutar todas las celdas en orden (Paso 1 al 13)
4. Credenciales necesarias:
   - Kaggle API Key (cuenta gratuita en kaggle.com)
   - NASA FIRMS API Key (gratuita en firms.modaps.eosdis.nasa.gov)

**Tiempo total de ejecución:** ~2-3 horas (mayoría en entrenamiento CNN)

**Semilla aleatoria:** `random.seed(42)` para reproducibilidad

---

*Documentación generada para el proyecto Municipalidad Valle del Sol — Evaluación de Arquitectura de Microservicios*
