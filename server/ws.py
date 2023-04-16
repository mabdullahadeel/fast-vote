from typing import Dict, Any, Set
from fastapi import WebSocket

TMessagePayload = Any
TActiveConnections = Dict[str, Set[WebSocket]]


class WSManager:
    def __init__(self):
        self.active_connections: TActiveConnections = {}

    async def connect(self, question_id: str, ws: WebSocket):
        self.active_connections.setdefault(question_id, set()).add(ws)

    async def disconnect(self, question_id: str, ws: WebSocket):
        self.active_connections[question_id].remove(ws)

    async def send_message(self, question_id: str, message: TMessagePayload):
        for ws in self.active_connections.get(question_id, []):
            await ws.send_json(message)


ws_manager = WSManager()
