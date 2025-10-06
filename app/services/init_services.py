import os
import dconfig
import vnd_log
from services.mongo_service import MongoDBConnectionManager
from services.ws_manager import WSConnectionManager


def on_startup(app):
    vnd_log.dlog_i("Successfully initialized all services")


def on_shutdown(app):
    db = MongoDBConnectionManager()
    db.close()


ws_manager = WSConnectionManager()

os.makedirs(dconfig.config_object.DATA_DIR, exist_ok=True)
temp_dir = os.path.join(dconfig.config_object.DATA_DIR, "temp")
os.makedirs(temp_dir, exist_ok=True)
