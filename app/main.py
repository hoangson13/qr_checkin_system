import os
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from starlette.staticfiles import StaticFiles

import dconfig
import vnd_log
from dconfig import config_object
from routes import ui_route, user_route
from services.init_services import on_startup, on_shutdown


@asynccontextmanager
async def lifespan(app: FastAPI):
    on_startup(app)
    yield
    on_shutdown(app)


app = FastAPI(lifespan=lifespan)

app.include_router(ui_route.router)
app.include_router(user_route.router)

static_dir = os.path.join(dconfig.cur_dir, "web", "static")
app.mount("/ui/static", StaticFiles(directory=static_dir), name="static")

static_dir = os.path.join(dconfig.config_object.DATA_DIR, "qr")
app.mount("/qr", StaticFiles(directory=static_dir), name="qr")

if __name__ == "__main__":
    uvicorn.run(app, host=config_object.HOST_NAME, port=int(config_object.PORT_NUMBER), proxy_headers=False)
    vnd_log.dlog_i(f"Server started at {config_object.HOST_NAME}:{config_object.PORT_NUMBER}")
