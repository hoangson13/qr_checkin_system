import os

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi import Request

import dconfig

router = APIRouter(
    prefix="/ui",
    tags=["ui"],
)

template_dir = os.path.join(dconfig.cur_dir, "web", "templates")
templates = Jinja2Templates(directory=template_dir)


@router.get("", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(
        name="home.html", context={'request': request}
    )


@router.get("/users", response_class=HTMLResponse)
async def users(request: Request):
    return templates.TemplateResponse(
        name="user.html", context={'request': request}
    )


@router.get("/validate")
def validate(x_auth_secret_key: str = Header()):
    if x_auth_secret_key is None:
        raise HTTPException(status_code=403, detail={"error": 2, "message": "Access Denied"})

    if x_auth_secret_key == dconfig.config_object.ADMIN_SECRET_KEY:
        return {"role": "admin"}

    raise HTTPException(status_code=403, detail={"error": 2, "message": "Access Denied"})
