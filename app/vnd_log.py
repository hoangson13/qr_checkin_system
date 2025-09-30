import logging
import os
import sys
from logging.handlers import TimedRotatingFileHandler

from dconfig import config_object


def _make_log_dir(path):
    try:
        os.umask(0)
        os.makedirs(path, mode=0o777, exist_ok=True)
    except Exception as e:
        pass


def _setup_log():
    log_dir = config_object.LOG_DIR
    _make_log_dir(log_dir)
    logger = logging.getLogger('notiiime')
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')
    path = '{}/info.log'.format(log_dir)
    file_handler = TimedRotatingFileHandler(path,
                                            when='midnight', backupCount=30)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    handler_console = logging.StreamHandler(stream=sys.stdout)
    handler_console.setFormatter(formatter)
    logger.addHandler(handler_console)
    logger.propagate = False
    if config_object.DEBUG:
        logger.setLevel(logging.DEBUG)
    else:
        logger.setLevel(logging.INFO)
    return logger


_logger = _setup_log()


def dlog_e(error):
    _logger.error(error, exc_info=True)


def dlog_d(mess):
    _logger.debug(mess)


def dlog_i(info):
    _logger.info(info)
