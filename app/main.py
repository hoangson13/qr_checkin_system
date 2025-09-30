import os
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from starlette.staticfiles import StaticFiles

import dconfig
import vnd_log
from dconfig import config_object
from routes import ui_route
from services.init_services import on_startup, on_shutdown


@asynccontextmanager
async def lifespan(app: FastAPI):
    on_startup(app)
    yield
    on_shutdown(app)


app = FastAPI(lifespan=lifespan)

# UI routes
app.include_router(ui_route.router)

static_dir = os.path.join(dconfig.cur_dir, "web", "static")
app.mount("/ui/static", StaticFiles(directory=static_dir), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host=config_object.HOST_NAME, port=int(config_object.PORT_NUMBER), proxy_headers=False)
    vnd_log.dlog_i(f"Server started at {config_object.HOST_NAME}:{config_object.PORT_NUMBER}")
