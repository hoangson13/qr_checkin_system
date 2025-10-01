import os

import pandas as pd

import traceback
from typing import Annotated

from io import BytesIO

import qrcode
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from starlette.responses import JSONResponse

import dconfig
import vnd_log
from dao import user_dao
from dao.user_dao import UserObj
from services.qr_service import gen_qr
from utils.authen import auth_secret_key

router = APIRouter(
    prefix="/api/users",
    tags=["users"],
    dependencies=[Depends(auth_secret_key)]
)


@router.get("/")
def get_users(page_number: int = 0, page_size: int = 10, sort_type: str = "desc", search: str = None):
    try:
        users, total, checkin_total = user_dao.get_users(page_number, page_size, sort_type, search)

        return JSONResponse({
            "message": "Get user successfully",
            "data": [i.to_dict() for i in users],
            "total": total,
            "checkin_total": checkin_total
        }, status_code=200)
    except Exception as e:
        vnd_log.dlog_e(f'Something wrong: {str(e)}')
        traceback.print_exc()
        raise HTTPException(detail={"error": 1, "message": str(e)}, status_code=500)


@router.get("/{user_id}")
def get_user(user_id: str):
    try:
        user = user_dao.find_by_id(user_id)
        if user is None:
            raise ValueError("User not found")

        return JSONResponse({
            "message": "Get user successfully",
            "data": user_dao.document_class(**user).to_dict(),
        }, status_code=200)
    except Exception as e:
        vnd_log.dlog_e(f'Something wrong: {str(e)}')
        traceback.print_exc()
        raise HTTPException(detail={"error": 1, "message": str(e)}, status_code=500)


@router.post("/")
def insert_user(data: user_dao.document_class):
    try:
        user_id = user_dao.insert_user(data)
        gen_qr(user_id)

        return JSONResponse({
            "message": "Insert user successfully",
            "data": {"user_id": user_id}
        }, status_code=200)
    except Exception as e:
        vnd_log.dlog_e(f'Something wrong: {str(e)}')
        traceback.print_exc()
        raise HTTPException(detail={"error": 1, "message": str(e)}, status_code=500)


@router.put("/{user_id}")
def update_user(user_id: str, updated_fields: dict):
    try:
        user_dao.update_user(user_id, updated_fields)
        return JSONResponse({
            "message": "Update user successfully",
            "data": {"user_id": user_id}
        }, status_code=200)
    except Exception as e:
        vnd_log.dlog_e(f'Something wrong: {str(e)}')
        traceback.print_exc()
        raise HTTPException(detail={"error": 1, "message": str(e)}, status_code=500)


@router.delete("/{user_id}")
def delete_user(user_id: str):
    try:
        user_dao.delete_by_id(user_id)
        return JSONResponse({
            "message": "Delete user successfully",
            "data": {"user_id": user_id}
        }, status_code=200)
    except Exception as e:
        vnd_log.dlog_e(f'Something wrong: {str(e)}')
        traceback.print_exc()
        raise HTTPException(detail={"error": 1, "message": str(e)}, status_code=500)


@router.post("/import")
def import_users(file: Annotated[UploadFile, File()]):
    try:
        if not file.filename.endswith('.xlsx'):
            raise ValueError("Only CSV files are supported")

        content = file.file.read()

        df = pd.read_excel(BytesIO(content))

        required_columns = {'user_id', 'name', 'title', 'department', 'seat_number'}
        if not required_columns.issubset(df.columns):
            raise ValueError(f"Missing required columns: {required_columns - set(df.columns)}")

        user_ids = []
        for _, row in df.iterrows():
            user = UserObj(
                user_id=row['user_id'],
                name=row['name'],
                title=row.get('title'),
                department=row.get('department'),
                seat_number=int(row['seat_number']) if not pd.isna(row['seat_number']) else None,
                is_checked_in=bool(row.get('is_checked_in', False))
            )
            user_id = user_dao.insert_one(user.to_dict())
            gen_qr(user_id)
            user_ids.append(user_id)
        return JSONResponse({
            "message": "Import users successfully",
            "data": user_ids,
            "total": len(user_ids)
        }, status_code=200)
    except Exception as e:
        vnd_log.dlog_e(f'Something wrong: {str(e)}')
        traceback.print_exc()
        raise HTTPException(detail={"error": 1, "message": str(e)}, status_code=500)
    finally:
        file.file.close()
