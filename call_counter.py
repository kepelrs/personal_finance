from functools import wraps

call_counter = 2000


def count_calls(func):
    ''' decrements counter every time function is called.
        once counter is 0, returns False'''
    @wraps(func)
    def decorated_func(*args, **kwargs):
        global call_counter
        call_counter -= 1
        print(call_counter)

        if call_counter <= 0:
            return False
        else:
            return func(*args, **kwargs)

    return decorated_func
