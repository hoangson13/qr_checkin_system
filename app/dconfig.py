import os


class Config(object):
    pass


class ProductionConfig(Config):
    DEBUG = False
    HOST_NAME = os.getenv('HOST_NAME')
    PORT_NUMBER = os.getenv('PORT_NUMBER')

    ADMIN_SECRET_KEY = os.getenv('ADMIN_SECRET_KEY')
    USER_SECRET_KEY = os.getenv('USER_SECRET_KEY')

    # Folder config
    DATA_DIR = os.getenv('DATA_DIR')
    LOG_DIR = os.getenv('LOG_DIR')

    # DATABASE CONFIG
    DB_CONNECTION_STRING = os.getenv('DB_CONNECTION_STRING')
    DB_NAME = os.getenv('DB_NAME')


class DevelopmentConfig(Config):
    DEBUG = True
    if os.getenv('HOST_NAME'):
        HOST_NAME = os.getenv('HOST_NAME')
    else:
        HOST_NAME = '0.0.0.0'
    if os.getenv('PORT_NUMBER'):
        PORT_NUMBER = os.getenv('PORT_NUMBER')
    else:
        PORT_NUMBER = '5000'

    ADMIN_SECRET_KEY = os.getenv('ADMIN_SECRET_KEY')
    USER_SECRET_KEY = os.getenv('USER_SECRET_KEY')

    # Folder config
    if os.getenv('DATA_DIR'):
        DATA_DIR = os.getenv('DATA_DIR')
    else:
        DATA_DIR = '../data'
    if os.getenv('LOG_DIR'):
        LOG_DIR = os.getenv('LOG_DIR')
    else:
        LOG_DIR = '../log'

    # DATABASE CONFIG
    # sudo docker run --name mongodb -d -p 27017:27017 mongodb/mongodb-community-server:latest
    DB_CONNECTION_STRING = os.getenv('DB_CONNECTION_STRING')
    DB_NAME = os.getenv('DB_NAME')


cur_dir = os.path.dirname(os.path.abspath(__file__))

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
}

VERSION = "1.0.0"

config_object = config[os.getenv('DEPLOY_ENV') or 'development']
