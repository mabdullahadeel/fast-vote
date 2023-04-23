from uuid import uuid4 as uuid
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from fastapi import (
    FastAPI, WebSocket, WebSocketDisconnect,
    status, Depends, Request, Response
)
from auth import get_session_cookie_value
from models import (
    Poll,
    create_db_and_tables,
    PollCreateBody,
    engine,
    Option,
    Vote,
)
from sqlmodel import Session, select
from ws import ws_manager

app = FastAPI()


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_session_id(request: Request, call_next):
    session_id = has_session_id = request.cookies.get("fast-vote-session")
    if session_id is None:
        session_id = str(uuid())
    request.cookies.setdefault("fast-vote-session", session_id)
    response: Response = await call_next(request)
    if has_session_id is None:
        response.headers["Set-Cookie"] = \
            f"fast-vote-session={session_id} ; Path=/ ; HttpOnly"
    return response


@app.websocket("/ws/poll/{poll_id}")
async def websocket_endpoint(websocket: WebSocket, poll_id: str):
    with Session(engine) as session:
        statement = select(Poll).where(Poll.id == poll_id)
        poll = session.exec(statement).first()
        if poll is None:
            await websocket.close()
            return
    await websocket.accept()
    await ws_manager.connect(poll_id, websocket)
    try:
        while True:
            await asyncio.sleep(0.5)
            await websocket.receive_json()
    except WebSocketDisconnect:
        await ws_manager.disconnect(poll_id, websocket)


@app.get("/assign-session", status_code=status.HTTP_200_OK)
async def assign_session(
    _: str = Depends(get_session_cookie_value)
):
    return {"status": "ok"}


@app.post("/create-poll/", status_code=status.HTTP_201_CREATED)
async def create_poll(
    data: PollCreateBody,
    sid: str = Depends(get_session_cookie_value),
):
    with Session(engine) as session:
        options = [Option(option_text=text) for text in data.options]
        poll = Poll(
            poll_text=data.poll, user_id=sid, options=options
        )
        session.add(poll)
        session.commit()
        session.refresh(poll)
        session.close()
        return poll.id


@app.get("/get-user-polls/", status_code=status.HTTP_200_OK)
async def get_polls(
    sid: str = Depends(get_session_cookie_value)
):
    with Session(engine) as session:
        statement = select(Poll)\
            .where(Poll.user_id == sid)
        result = session.exec(statement)
        polls = result.all()
        res = []
        for poll in polls:
            res.append(
                {
                    **poll.dict(),
                    "options": [
                        {
                            **option.dict(exclude={"votes", "poll_id"}),
                            "votes": len(option.votes),
                        }
                        for option in poll.options
                    ],
                }
            )
        session.close()
        return res


@app.get("/get-poll/{poll_id}", status_code=status.HTTP_200_OK)
async def get_poll(
    poll_id: str,
    sid: str = Depends(get_session_cookie_value)
):
    with Session(engine) as session:
        statement = select(Poll).where(Poll.id == poll_id)
        result = session.exec(statement)
        poll = result.first()
        if not poll:
            return Response(status_code=404)
        vote_statement = select(Vote).where(Vote.user_id == sid)\
            .select_from(Vote)\
            .where(Vote.option_id == Option.id)\
            .where(Option.poll_id == poll_id)
        vote = session.exec(vote_statement).first()
        res = {
            **poll.dict(),
            "options": [
                {
                    **option.dict(exclude={"votes", "poll_id"}),
                    "votes": len(option.votes),
                }
                for option in poll.options
            ],
            "has_voted": vote is not None,
            "vote": vote.option_id if vote else "",
        }
        session.close()
        return res


@app.post("/vote/", status_code=status.HTTP_201_CREATED)
async def vote(
    option_id: str,
    sid: str = Depends(get_session_cookie_value)
):
    with Session(engine) as session:
        statement = select(Vote)\
            .where(
                Vote.user_id == sid,
                Vote.option_id == option_id,
                Vote.user_id == sid
            )
        vote = session.exec(statement).first()
        if vote:
            return Response(status_code=400)
        vote = Vote(option_id=option_id, user_id=sid)
        session.add(vote)
        session.commit()
        updated_options_statement = select(Option)\
            .where(Option.poll_id == vote.option.poll_id)
        updated_options = session.exec(updated_options_statement).all()
        res = [
            {
                **option.dict(exclude={"votes", "poll_id"}),
                "votes": len(option.votes),
            }
            for option in updated_options
        ]
        session.close()
        await ws_manager.send_message(
            vote.option.poll_id, {"type": "voted", "payload": res}
        )
        return True


@app.delete("/poll/{poll_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delte_poll(
    sid: str = Depends(get_session_cookie_value),
    poll_id: str = None,
):
    with Session(engine) as session:
        statement = select(Poll)\
            .where(Poll.id == poll_id, Poll.user_id == sid)
        poll = session.exec(statement).first()
        if not poll:
            return Response(status_code=404)
        session.delete(poll)
        session.commit()
        session.close()
        return True
