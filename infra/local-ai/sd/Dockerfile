FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime
RUN pip install --no-cache-dir diffusers transformers accelerate fastapi uvicorn pillow
COPY server.py /app/server.py
WORKDIR /app
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "7860"]
