import traceback

from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import JSONResponse

import vnd_log
from dao import user_dao
from utils.authen import auth_user_secret_key

router = APIRouter(
    prefix="/api/checkin",
    tags=["users"],
    dependencies=[Depends(auth_user_secret_key)]
)


@router.get("/{user_id}")
def checkin(user_id: str):
    try:
        user_dao.checkin(user_id)
        user = user_dao.find_by_id(user_id)
        return JSONResponse({
            "message": "Check-in successfully",
            "data": user.to_dict(),
        }, status_code=200)
    except Exception as e:
        vnd_log.dlog_e(f'Something wrong: {str(e)}')
        traceback.print_exc()
        raise HTTPException(detail={"error": 1, "message": str(e)}, status_code=500)
