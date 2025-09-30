from pymongo.errors import ConnectionFailure
from pymongo.mongo_client import MongoClient
import vnd_log
from dconfig import config_object
from utils.exceptions import HealthCheckException


class MongoDBConnectionManager:
    """Singleton class to manage MongoDB connections"""
    _instance = None
    _client = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(MongoDBConnectionManager, cls).__new__(cls)
            cls._instance._initialize(*args, **kwargs)
        return cls._instance

    def _initialize(self, *args, **kwargs):
        """Initialize MongoDB connection with connection pooling"""
        uri = config_object.DB_CONNECTION_STRING
        db_name = config_object.DB_NAME
        try:
            # Configure connection pooling
            conn_params = {
                'maxPoolSize': kwargs.get('max_pool_size', 100),
                'minPoolSize': kwargs.get('min_pool_size', 10),
                'maxIdleTimeMS': kwargs.get('max_idle_time_ms', 30000),
                'waitQueueTimeoutMS': kwargs.get('wait_queue_timeout_ms', 10000),
                'retryWrites': True
            }

            self._client = MongoClient(uri, **conn_params)
            self._db = self._client[db_name]

            # Test connection
            self._client.admin.command('ping')
            vnd_log.dlog_i(f"Connected to MongoDB at {uri}, database: {db_name}")
        except ConnectionFailure:
            vnd_log.dlog_e(f"Failed to connect to MongoDB at {uri}")
            raise

    @property
    def db(self):
        """Get database instance"""
        return self._db

    def close(self):
        """Close the MongoDB connection"""
        if self._client:
            self._client.close()
            vnd_log.dlog_i("MongoDB connection closed")

    def health_check(self):
        """Check if MongoDB connection is healthy"""
        if not self._client:
            raise HealthCheckException("MongoDB")
        self._client.admin.command('ping')
