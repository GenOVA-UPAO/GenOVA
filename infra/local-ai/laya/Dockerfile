# Laya (motor de decisión System One, compatible con Jev) en GPU. Ver docker-compose.local-ai.yml.
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime
RUN pip install --no-cache-dir "laya[serve]"
ENV LAYA_MODELS=multilingual LAYA_DEVICE=cuda
EXPOSE 8000
CMD ["laya-serve"]
