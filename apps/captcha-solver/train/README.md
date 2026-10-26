# Captcha model training (offline, Python)

Training runs offline — it never touches the booking critical path.

## Setup

```bash
pip install -r requirements.txt
```

## Train

```bash
python3 train.py --data ../../captcha-data/samples.jsonl --out ../../models/captcha.onnx
```

## Targets

- **Accuracy** > 95% on a held-out split
- **Inference** < 50 ms via onnxruntime-node in the worker process
- **Export** ONNX only — no Python at runtime

## Architecture

Small CNN: 4 conv layers (3×3, stride 1) + 2 dense layers, character-head
output for the fixed captcha length. Trained with PyTorch, exported with
`torch.onnx.export`.
