from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["ws"])


@router.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket):
    await websocket.accept()
    # Hello imediato para o cliente confirmar a ligação.
    await websocket.send_json({"type": "hello", "message": "ligado ao dashboard"})
    try:
        while True:
            # Por agora: echo. A Fase 4 substitui isto por push de dados em tempo real.
            data = await websocket.receive_text()
            await websocket.send_json({"type": "echo", "data": data})
    except WebSocketDisconnect:
        return
