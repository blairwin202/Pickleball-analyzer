import requests
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
    try:
        # Try streaming download via signed URL
        result = get_client().storage.from_("videos").create_signed_url(storage_path, 300)
        print(f"[download] signed url result keys: {result.keys() if hasattr(result, 'keys') else type(result)}", flush=True)
        # Handle different response formats
        url = result.get("signedURL") or result.get("signedUrl") or result.get("signed_url")
        if url:
            print(f"[download] streaming from signed URL", flush=True)
            with requests.get(url, stream=True) as r:
                r.raise_for_status()
                with open(dest_path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)
        else:
            print(f"[download] falling back to direct download", flush=True)
            data = get_client().storage.from_("videos").download(storage_path)
            with open(dest_path, "wb") as f:
                f.write(data)
        print(f"[download] video saved to {dest_path}", flush=True)
    except Exception as e:
        print(f"[download] ERROR: {e}", flush=True)
        raise

def delete_video(storage_path: str):
    get_client().storage.from_("videos").remove([storage_path])
