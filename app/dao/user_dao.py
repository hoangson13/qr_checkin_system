from dataclasses import dataclass
from datetime import datetime

import pymongo
from bson import ObjectId

from dao.base_dao import BaseDAO, BaseObj


@dataclass
class UserObj(BaseObj):
    _id: str = None
    user_id: str = None
    name: str = None
    title: str = None
    department: str = None
    seat_number: int = None
    is_checked_in: bool = False
    check_in_time: datetime = None
    created_at: datetime = None
    updated_at: datetime = None


class UserDAO(BaseDAO):
    """DAO for user-related operations"""

    document_class = UserObj

    # Document fields
    def __init__(self, connection_manager=None):
        super().__init__("users", connection_manager)

        # Create indexes for user collection
        self.create_index([("user_id", pymongo.ASCENDING), ("name", pymongo.ASCENDING)], unique=True)

    def get_users(self, page_number=0, page_size=10, sort_type="desc", search=None):
        """Get users"""
        q = {}
        if search:
            q["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"department": {"$regex": search, "$options": "i"}}
            ]

        total = self.count(q)
        checkin_total = self.count({"is_checked_in": True})

        data = self.find_many(
            q,
            skip=page_number * page_size, limit=page_size,
            sort=[("updated_at", sort_type)]
        )
        return [UserObj(**i) for i in data], total, checkin_total

    def insert_user(self, created_fields: dict):
        """Insert user"""
        return self.insert_one(created_fields)

    def update_user(self, user_id: str, updated_fields: dict):
        """Update user by user_id"""
        return self.update_many({"_id": ObjectId(user_id)}, {"$set": updated_fields})
