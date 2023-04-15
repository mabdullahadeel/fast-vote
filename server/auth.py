from fastapi import Request


async def get_session_cookie_value(request: Request) -> str:
    # this will be set by the middleware
    return request.cookies.get('fast-vote-session')
