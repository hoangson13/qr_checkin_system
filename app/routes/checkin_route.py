import traceback

from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import JSONResponse

import vnd_log
from dao import user_dao
from dao.user_dao import UserObj
from services.init_services import ws_manager
from utils.authen import auth_user_secret_key

router = APIRouter(
    prefix="/api/checkin",
    tags=["users"],
    dependencies=[Depends(auth_user_secret_key)]
)


@router.post("/{user_id}")
async def checkin(user_id: str):
    try:
        if ":" in user_id:
            user_id = user_id.split(":")[-1].strip()
        user_dao.checkin(user_id)
        user = user_dao.find_by_id(user_id)
        user = UserObj(**user).to_dict()

        # Broadcast check-in notification to all connected clients
        await ws_manager.broadcast({
            "action": "new_checkin",
            "data": user
        })

        return JSONResponse({
            "message": "Check-in successfully",
            "data": user
        }, status_code=200)
    except Exception as e:
        vnd_log.dlog_e(f'Something wrong: {str(e)}')
        traceback.print_exc()
        raise HTTPException(detail={"error": 1, "message": str(e)}, status_code=500)
