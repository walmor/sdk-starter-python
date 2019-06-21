FROM python:3.6.8-alpine

COPY . .

RUN pip install -r requirements.txt

CMD python3 app.py

