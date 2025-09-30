import os
import dconfig
import vnd_log
from services.mongo_service import MongoDBConnectionManager


def on_startup(app):
    vnd_log.dlog_i("Successfully initialized all services")


def on_shutdown(app):
    db = MongoDBConnectionManager()
    db.close()


temp_dir = os.path.join(dconfig.config_object.DATA_DIR, "temp")
os.makedirs(temp_dir, exist_ok=True)
