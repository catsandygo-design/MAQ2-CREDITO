from security_utils import decrypt_pii, encrypt_pii, generate_pii_encryption_key, hash_token, mask_email
from security_utils import _get_fernet


def test_hash_token_is_deterministic():
    assert hash_token("abc") == hash_token("abc")
    assert hash_token("abc") != hash_token("abcd")


def test_encrypt_and_decrypt_roundtrip(monkeypatch):
    monkeypatch.setenv("PII_ENCRYPTION_KEY", generate_pii_encryption_key())
    _get_fernet.cache_clear()

    encrypted = encrypt_pii("11999998888")

    assert encrypted is not None
    assert encrypted.startswith("enc::")
    assert decrypt_pii(encrypted) == "11999998888"


def test_mask_email():
    assert mask_email("cliente@empresa.com").endswith("@empresa.com")
