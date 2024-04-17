FROM python:3.11.6-slim
WORKDIR /broker
COPY . .

RUN pip install --no-cache-dir -r requirements.txt
CMD ["python", "broker.py"]