from typing import Dict, Any, Set
from fastapi import WebSocket

TMessagePayload = Any
TActiveConnections = Dict[str, Set[WebSocket]]


class WSManager:
    def __init__(self):
        self.active_connections: TActiveConnections = {}

    async def connect(self, poll_id: str, ws: WebSocket):
        self.active_connections.setdefault(poll_id, set()).add(ws)

    async def disconnect(self, poll_id: str, ws: WebSocket):
        self.active_connections[poll_id].remove(ws)

    async def send_message(self, poll_id: str, message: TMessagePayload):
        for ws in self.active_connections.get(poll_id, []):
            await ws.send_json(message)


ws_manager = WSManager()
