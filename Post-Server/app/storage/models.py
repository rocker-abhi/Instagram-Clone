from typing import BinaryIO


class UploadRequest:
    """
    Information required to upload a file to MinIO storage.
    """

    def __init__(
        self,
        bucket: str,
        object_key: str,
        file: BinaryIO,
        content_type: str,
        size: int,
    ):
        self.bucket = bucket
        self.object_key = object_key
        self.file = file
        self.content_type = content_type
        self.size = size


class DeleteRequest:
    """
    Information required to delete a file from MinIO storage.
    """

    def __init__(
        self,
        bucket: str,
        object_key: str,
    ):
        self.bucket = bucket
        self.object_key = object_key


class UploadResult:
    """
    Result metadata returned after a successful MinIO upload operation.
    """

    def __init__(
        self,
        bucket: str,
        object_key: str,
        etag: str,
    ):
        self.bucket = bucket
        self.object_key = object_key
        self.etag = etag
