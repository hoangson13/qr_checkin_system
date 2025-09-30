class HealthCheckException(Exception):
    def __init__(self, module):
        self.module = module


class AuthenException(Exception):
    def __init__(self, mess="Access Denied"):
        self.err_code = 2
        self.mess = mess
