FROM python:3.8

RUN pip install pipenv

COPY Pipfile Pipfile.lock ./

RUN pipenv install --system --deploy

COPY ./src /src

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--root-path", "/api"]
