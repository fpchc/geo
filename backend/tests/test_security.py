"""密码哈希与 JWT 令牌单元测试（无需 DB/Redis）。"""

from __future__ import annotations

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


async def test_password_hash_roundtrip() -> None:
    hashed = await hash_password("s3cret-pw")
    assert hashed != "s3cret-pw"
    assert await verify_password("s3cret-pw", hashed) is True
    assert await verify_password("wrong", hashed) is False


async def test_verify_rejects_malformed_hash() -> None:
    assert await verify_password("x", "not-a-bcrypt-hash") is False


def test_access_token_carries_jti_and_type() -> None:
    token, jti = create_access_token(42)
    payload = decode_token(token, expected_type="access")
    assert payload["sub"] == "42"
    assert payload["jti"] == jti
    assert payload["type"] == "access"


def test_refresh_token_type_mismatch_rejected() -> None:
    refresh, _ = create_refresh_token(1)
    payload = decode_token(refresh, expected_type="refresh")
    assert payload["type"] == "refresh"

    import pytest

    from app.core.exceptions import TokenInvalidException

    # 用 access 校验器解 refresh token 应失败
    with pytest.raises(TokenInvalidException):
        decode_token(refresh, expected_type="access")
