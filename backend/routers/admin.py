from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _todo(feature: str):
    raise HTTPException(
        status.HTTP_501_NOT_IMPLEMENTED, f"admin/{feature} — implementado na Fase 5"
    )


@router.get("/status")
def integrations_status():
    """Estado de todas as integrações (autenticadas / com erro)."""
    _todo("status")


@router.get("/widgets")
def list_widgets():
    _todo("widgets")


@router.put("/widgets/{widget_id}")
def update_widget(widget_id: int):
    _todo("widgets")


@router.put("/layout")
def update_layout():
    _todo("layout")


@router.put("/appearance")
def update_appearance():
    _todo("appearance")


@router.post("/login")
def login():
    _todo("login")


@router.post("/logout")
def logout():
    _todo("logout")
