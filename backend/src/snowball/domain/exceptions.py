class DomainException(Exception):
    pass

class EntityNotFoundException(DomainException):
    pass

class InsufficientFundsException(DomainException):
    pass

class InvalidActionException(DomainException):
    pass
