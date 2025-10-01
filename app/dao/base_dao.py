from dataclasses import dataclass, asdict, fields
from datetime import datetime
from typing import List, Dict, Union, Optional
import json
import pymongo
from bson import ObjectId
from pymongo.collection import Collection
from pymongo.errors import PyMongoError

import vnd_log
from services.mongo_service import MongoDBConnectionManager


@dataclass
class BaseObj:
    def to_dict(self, pop_keys: List[str] = None) -> Dict:
        if pop_keys is None:
            pop_keys = []
        obj = asdict(self)
        for k, v in obj.items():
            if isinstance(v, datetime):
                obj[k] = v.isoformat()
        for key in pop_keys:
            obj.pop(key, None)
        return obj

    @classmethod
    def from_dict(cls, data: Dict):
        return cls(**data)

    def keys(self):
        return list(asdict(self).keys())

    @classmethod
    def get_fields(cls):
        return [f.name for f in fields(cls)]


class BaseDAO:
    """Base DAO class with common CRUD operations"""

    def __init__(self, collection_name: str, connection_manager: MongoDBConnectionManager = None):
        """
        Initialize the DAO with a collection

        Args:
            collection_name: Name of the MongoDB collection
            connection_manager: Optional connection manager instance, default get from singleton
        """
        if connection_manager is None:
            connection_manager = MongoDBConnectionManager()

        self.db = connection_manager.db
        self.collection: Collection = self.db[collection_name]
        self.collection_name = collection_name

    def _id_to_str(self, document: Dict) -> Dict:
        """Convert ObjectId to string for JSON serialization"""
        if document and '_id' in document and isinstance(document['_id'], ObjectId):
            document['_id'] = str(document['_id'])
        return document

    def datetime_to_str(self, document: Dict) -> Dict:
        """Convert datetime to string for JSON serialization"""
        fields_to_convert = ['created_at', 'updated_at']
        for field in fields_to_convert:
            if field in document and isinstance(document[field], datetime):
                document[field] = document[field].isoformat()
        return document

    def create_index(self, keys, **kwargs):
        """Create an index on the collection"""
        try:
            index_name = self.collection.create_index(keys, **kwargs)
            vnd_log.dlog_i(f"Created index {index_name} on {self.collection_name}")
            return index_name
        except PyMongoError as e:
            vnd_log.dlog_e(f"Failed to create index on {self.collection_name}: {str(e)}")
            raise

    def find_by_id(self, _id: Union[str, ObjectId]) -> Optional[Dict]:
        """
        Find a document by its ID

        Args:
            _id: Document ID (str or ObjectId)

        Returns:
            Document dict or None if not found
        """
        try:
            if isinstance(_id, str):
                _id = ObjectId(_id)

            result = self.collection.find_one({"_id": _id})
            return self._id_to_str(result) if result else None
        except PyMongoError as e:
            vnd_log.dlog_e(f"Error finding document by ID in {self.collection_name}: {str(e)}")
            raise

    def find_one(self, query: Dict, projection: Dict = None) -> Optional[Dict]:
        """
        Find a single document matching the query

        Args:
            query: Query filter
            projection: Optional fields to return

        Returns:
            Document dict or None if not found
        """
        try:
            result = self.collection.find_one(query, projection)
            return self._id_to_str(result) if result else None
        except PyMongoError as e:
            vnd_log.dlog_e(f"Error finding document in {self.collection_name}: {str(e)}")
            raise

    def find_many(self,
                  query: Dict = None,
                  projection: Dict = None,
                  sort: List = None,
                  skip: int = 0,
                  limit: int = 0) -> List[Dict]:
        """
        Find multiple documents with pagination

        Args:
            query: Query filter
            projection: Optional fields to return
            sort: Optional sorting [(field, direction)]
            skip: Number of documents to skip
            limit: Maximum documents to return (0 = no limit)

        Returns:
            List of document dicts
        """
        if query is None:
            query = {}

        try:
            cursor = self.collection.find(query, projection)

            if sort:
                new_sort = []
                for field, direction in sort:
                    if direction in [pymongo.DESCENDING, pymongo.ASCENDING]:
                        new_sort.append((field, direction))
                    elif direction == 'asc':
                        new_sort.append((field, pymongo.ASCENDING))
                    elif direction == 'desc':
                        new_sort.append((field, pymongo.DESCENDING))
                    else:
                        raise ValueError(f"Invalid sort direction: {direction}")
                cursor = cursor.sort(new_sort)

            if skip:
                cursor = cursor.skip(skip)

            if limit:
                cursor = cursor.limit(limit)

            return [self._id_to_str(doc) for doc in cursor]
        except PyMongoError as e:
            vnd_log.dlog_e(f"Error finding documents in {self.collection_name}: {str(e)}")
            raise

    def count(self, query: Dict = None) -> int:
        """Count documents matching the query"""
        if query is None:
            query = {}

        try:
            return self.collection.count_documents(query)
        except PyMongoError as e:
            vnd_log.dlog_e(f"Error counting documents in {self.collection_name}: {str(e)}")
            raise

    def insert_one(self, document: Dict) -> str:
        """
        Insert a single document

        Args:
            document: Document to insert

        Returns:
            ID of the inserted document
        """
        if '_id' in document:
            del document['_id']

        # Add creation timestamp if not present
        if 'created_at' not in document or document['created_at'] is None:
            document['created_at'] = datetime.now()

        document['updated_at'] = document['created_at']

        try:
            result = self.collection.insert_one(document)
            return str(result.inserted_id)
        except PyMongoError as e:
            vnd_log.dlog_e(f"Error inserting document into {self.collection_name}: {str(e)}")
            raise

    def insert_many(self, documents: List[Dict]) -> List[str]:
        """
        Insert multiple documents

        Args:
            documents: List of documents to insert

        Returns:
            List of inserted document IDs
        """
        now = datetime.now()

        # Add timestamps to all documents
        for doc in documents:
            if '_id' in doc:
                del doc['_id']
            if 'created_at' not in doc or doc['created_at'] is None:
                doc['created_at'] = now
            doc['updated_at'] = now

        try:
            result = self.collection.insert_many(documents)
            return [str(id) for id in result.inserted_ids]
        except PyMongoError as e:
            vnd_log.dlog_e(f"Error batch inserting documents into {self.collection_name}: {str(e)}")
            raise

    def update_by_id(self, _id: Union[str, ObjectId], update_data: Dict) -> bool:
        """
        Update a document by ID

        Args:
            _id: Document ID
            update_data: Data to update

        Returns:
            True if document was updated, False otherwise
        """
        if isinstance(_id, str):
            _id = ObjectId(_id)

        # Don't modify the original update data
        update = update_data.copy()

        # Add updated timestamp
        if '$set' in update:
            update['$set']['updated_at'] = datetime.now()
        else:
            update['$set'] = {'updated_at': datetime.now()}

        try:
            result = self.collection.update_one({"_id": _id}, update)
            return result.modified_count > 0
        except PyMongoError as e:
            vnd_log.dlog_e(f"Error updating document in {self.collection_name}: {str(e)}")
            raise

    def update_many(self, query: Dict, update_data: Dict) -> int:
        """
        Update multiple documents

        Args:
            query: Query to match documents
            update_data: Data to update

        Returns:
            Number of modified documents
        """
        # Don't modify the original update data
        update = update_data.copy()

        # Add updated timestamp
        if '$set' in update:
            update['$set']['updated_at'] = datetime.now()
        else:
            update['$set'] = {'updated_at': datetime.now()}

        try:
            result = self.collection.update_many(query, update)
            return result.modified_count
        except PyMongoError as e:
            vnd_log.dlog_e(f"Error updating documents in {self.collection_name}: {str(e)}")
            raise

    def delete_by_id(self, _id: Union[str, ObjectId]) -> bool:
        """
        Delete a document by ID

        Args:
            _id: Document ID

        Returns:
            True if document was deleted, False otherwise
        """
        if isinstance(_id, str):
            _id = ObjectId(_id)

        try:
            result = self.collection.delete_one({"_id": _id})
            return result.deleted_count > 0
        except PyMongoError as e:
            vnd_log.dlog_e(f"Error deleting document from {self.collection_name}: {str(e)}")
            raise

    def delete_many(self, query: Dict) -> int:
        """
        Delete multiple documents

        Args:
            query: Query to match documents

        Returns:
            Number of deleted documents
        """
        try:
            result = self.collection.delete_many(query)
            return result.deleted_count
        except PyMongoError as e:
            vnd_log.dlog_e(f"Error deleting documents from {self.collection_name}: {str(e)}")
            raise

    def aggregate(self, pipeline: List[Dict]) -> List[Dict]:
        """
        Run an aggregation pipeline

        Args:
            pipeline: MongoDB aggregation pipeline

        Returns:
            List of aggregation results
        """
        try:
            result = self.collection.aggregate(pipeline)
            return [self._id_to_str(doc) for doc in result]
        except PyMongoError as e:
            vnd_log.dlog_e(f"Error running aggregation on {self.collection_name}: {str(e)}")
            raise

    def export_to_json(self, file_path: str, query: Dict = None):
        try:
            docs = self.find_many(query=query)
            docs = [self.datetime_to_str(doc) for doc in docs]

            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(docs, f, ensure_ascii=False, indent=4)
        except PyMongoError as e:
            vnd_log.dlog_e(f"Error export documents from {self.collection_name}: {str(e)}")
            raise

    def import_from_json(self, docs):
        try:
            if isinstance(docs, dict):
                docs = [docs]

            for doc in docs:
                if "_id" in doc and isinstance(doc["_id"], str):
                    doc["_id"] = ObjectId(doc["_id"])
                if "created_at" in doc and isinstance(doc["created_at"], str):
                    doc["created_at"] = datetime.fromisoformat(doc["created_at"])
                if "updated_at" in doc and isinstance(doc["updated_at"], str):
                    doc["updated_at"] = datetime.fromisoformat(doc["updated_at"])
                self.delete_by_id(doc["_id"])

            self.insert_many(docs)
        except PyMongoError as e:
            vnd_log.dlog_e(f"Error import documents from {self.collection_name}: {str(e)}")
            raise
