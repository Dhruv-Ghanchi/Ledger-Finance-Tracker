from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    def connect(cls):
        logger.info("Connecting to MongoDB...")
        cls.client = AsyncIOMotorClient(settings.MONGO_URL)
        cls.db = cls.client[settings.DB_NAME]
        logger.info("Connected to MongoDB")

    @classmethod
    def close(cls):
        if cls.client:
            cls.client.close()
            logger.info("MongoDB connection closed")

db = Database()
