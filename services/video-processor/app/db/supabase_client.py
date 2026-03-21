from supabase import create_client, Client
from app.config import settings

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


def update_analysis(analysis_id: str, data: dict):
    get_client().table("analyses").update(data).eq("id", analysis_id).execute()


def insert_tip(tip: dict):
    get_client().table("tips").insert(tip).execute()


def download_video(storage_path: str, dest_path: str):
    data = get_client().storage.from_("videos").download(storage_path)
    with open(dest_path, "wb") as f:
        f.write(data)


def delete_video(storage_path: str):
    get_client().storage.from_("videos").remove([storage_path])
