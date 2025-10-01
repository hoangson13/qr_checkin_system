from fastapi import Header, HTTPException

import vnd_log
from dconfig import config_object


def auth_secret_key(x_auth_secret_key: str = Header()):
    if x_auth_secret_key is None or x_auth_secret_key != config_object.ADMIN_SECRET_KEY:
        vnd_log.dlog_e("Access Denied")
        raise HTTPException(status_code=403, detail={"error": 2, "message": "Access Denied"})
