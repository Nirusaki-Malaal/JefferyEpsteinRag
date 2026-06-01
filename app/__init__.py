from dotenv import load_dotenv
import os , logging 
from logging.handlers import RotatingFileHandler
from fastapi import FastAPI

if (os.path.exists('.env')):
    load_dotenv('.env')


class Config:
    PORT = int(os.environ.get("PORT")) or 3000
    LOG_FILE_NAME = str(os.environ.get("LOG_FILE_NAME")) or "logs.txt"
    API_KEY = os.environ.get("API_KEY")

## CREATING A LOGGER

# file_descriptor = open(Config.LOG_FILE_NAME, "w+")
# file_descriptor.close()
# del file_descriptor


# logging.basicConfig(
#     level=logging.INFO,
#     format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
#     datefmt="%d-%b-%y %H:%M:%S",
#     handlers=[
#         RotatingFileHandler(
#             Config.LOG_FILE_NAME,
#             maxBytes=2097152000,
#             backupCount=10
#         ),
#         logging.StreamHandler()
#     ]
# )

# LOGS = logging.getLogger(__name__)

bot = FastAPI()