import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from fastapi.requests import Request
from uuid import uuid4 as uuid
from models import (
        Question,
        create_db_and_tables,
        QuestionCreateBody,
        engine,
        Option,
        Vote
    )
from sqlmodel import Session, select
from ws import ws_manager

app = FastAPI()


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.websocket("/ws/{question_id}")
async def websocket_endpoint(
        websocket: WebSocket,
        question_id: str
        ):
    await ws_manager.connect(question_id, websocket)
    try:
        while True:
            await asyncio.sleep(0.5)
            await websocket.receive_json()
    except WebSocketDisconnect:
        ws_manager.disconnect(question_id, websocket)


@app.get("/")
async def index():
    return {"message": "Hello World"}


@app.get("/assign-session")
async def assign_session(request: Request):
    if "fast-vote-session" in request.cookies:
        return Response(status_code=200)
    else:
        return Response(
            status_code=201,
            headers={"Set-Cookie": f"fast-vote-session={uuid()}"}
        )


@app.post("/remove-session/")
def remove_session(response: Response):
    response.delete_cookie("fast-vote-session")
    return Response(status_code=200)


@app.post("/create-question/")
async def create_question(data: QuestionCreateBody):
    with Session(engine) as session:
        options = [
                Option(option_text=text)
                for text in data.options
            ]
        question = Question(
            question_text=data.question,
            user_id='123',
            options=options
        )
        session.add(question)
        session.commit()
        session.close()
        return Response(status_code=201)


@app.get("/get-user-questions/")
async def get_questions():
    with Session(engine) as session:
        user_id = '123'
        statement = select(Question)\
            .where(Question.user_id == user_id)
        result = session.exec(statement)
        questions = result.all()
        res = []
        for question in questions:
            res.append({
                **question.dict(),
                "options": [{
                    **option.dict(exclude={"votes", "question_id"}),
                    "votes": len(option.votes)
                } for option in question.options]
            })
        session.close()
        return res


@app.get("/get-question/{question_id}")
async def get_question(question_id: str):
    with Session(engine) as session:
        statement = select(Question)\
            .where(Question.id == question_id)
        result = session.exec(statement)
        question = result.first()
        if not question:
            return Response(status_code=404)
        res = {
            **question.dict(),
            "options": [{
                **option.dict(exclude={"votes", "question_id"}),
                "votes": len(option.votes)
            } for option in question.options]
        }
        session.close()
        return res


@app.post('/vote/')
async def vote(option_id: str):
    with Session(engine) as session:
        statement = select(Vote)\
            .where(Option.id == option_id, Vote.user_id == '123')
        vote = session.exec(statement).first()
        if vote:
            return Response(status_code=400)
        vote = Vote(
            option_id=option_id,
            user_id='123'
        )
        session.add(vote)
        session.commit()
        session.close()
        return Response(status_code=200)
