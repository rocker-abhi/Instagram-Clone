import os
import shutil
import tempfile
import subprocess
import asyncio
import logging
from app.core.storage import StorageFactory
from app.storage.buckets import POST_MEDIA_BUCKET

logger = logging.getLogger(__name__)


class HLSService:
    """
    Service responsible for background video transcoding into HLS format (.m3u8 & .ts segments)
    and uploading the results back to MinIO storage.
    """

    def __init__(self):
        self.storage = StorageFactory.get_storage()

    async def generate_hls_stream(self, raw_object_key: str) -> str | None:
        """
        Downloads the raw video file from MinIO, transcodes it to HLS format using FFmpeg,
        uploads the generated .m3u8 playlist and .ts segments back to MinIO, and returns the master playlist object key.
        """
        # Determine target HLS folder prefix: posts/{user_id}/{post_id}/hls/
        key_parts = raw_object_key.split("/")
        if len(key_parts) < 3:
            logger.warning("Invalid raw_object_key structure for HLS: %s", raw_object_key)
            return None

        folder_prefix = "/".join(key_parts[:-1]) + "/hls"
        master_playlist_key = f"{folder_prefix}/index.m3u8"

        def _transcode_sync():
            with tempfile.TemporaryDirectory() as temp_dir:
                local_input_path = os.path.join(temp_dir, "input.mp4")
                local_playlist_path = os.path.join(temp_dir, "index.m3u8")

                # Step 1: Download raw video from MinIO to temp file
                try:
                    self.storage._client.fget_object(
                        bucket_name=POST_MEDIA_BUCKET,
                        object_name=raw_object_key,
                        file_path=local_input_path,
                    )
                except Exception as err:
                    logger.error("Failed to download raw video from MinIO for HLS transcoding: %s", err)
                    return None

                # Step 2: Run FFmpeg to slice video into 4-second HLS segments
                ffmpeg_cmd = [
                    "ffmpeg",
                    "-y",
                    "-i", local_input_path,
                    "-codec:v", "libx264",
                    "-codec:a", "aac",
                    "-hls_time", "4",
                    "-hls_playlist_type", "vod",
                    "-hls_segment_filename", os.path.join(temp_dir, "segment_%03d.ts"),
                    local_playlist_path,
                ]

                try:
                    result = subprocess.run(
                        ffmpeg_cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        check=True,
                        text=True
                    )
                    logger.info("FFmpeg HLS transcoding succeeded for %s", raw_object_key)
                except FileNotFoundError:
                    logger.warning("FFmpeg command not found on host system. Skipping HLS transcoding.")
                    return None
                except subprocess.CalledProcessError as err:
                    logger.error("FFmpeg HLS transcoding failed for %s: %s", raw_object_key, err.stderr)
                    return None

                # Step 3: Upload all HLS outputs (index.m3u8 and segment_*.ts) to MinIO
                for file_name in os.listdir(temp_dir):
                    if file_name == "input.mp4":
                        continue
                    
                    file_path = os.path.join(temp_dir, file_name)
                    object_key = f"{folder_prefix}/{file_name}"
                    content_type = "application/x-mpegURL" if file_name.endswith(".m3u8") else "video/MP2T"

                    try:
                        self.storage._client.fput_object(
                            bucket_name=POST_MEDIA_BUCKET,
                            object_name=object_key,
                            file_path=file_path,
                            content_type=content_type,
                        )
                    except Exception as upload_err:
                        logger.error("Failed uploading HLS segment %s to MinIO: %s", object_key, upload_err)

                logger.info("Successfully uploaded HLS stream to MinIO prefix: %s", folder_prefix)
                return master_playlist_key

        return await asyncio.to_thread(_transcode_sync)


hls_service = HLSService()
