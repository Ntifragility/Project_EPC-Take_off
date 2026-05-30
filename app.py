import os
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
TABLE_NAME = os.getenv("MAIN_TABLE", "main_PAT_table")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("WARNING: SUPABASE_URL or SUPABASE_KEY environment variables are missing.")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if (SUPABASE_URL and SUPABASE_KEY) else None

app = FastAPI(title="EPC Takeoff Backend Router")

# Configure CORS so local index.html can communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local development. Restrict in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/takeoff")
async def get_takeoff_items():
    """Retrieve all takeoff items from Supabase."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    try:
        response = supabase.table(TABLE_NAME).select("*").order("created_at").execute()
        return response.data
    except Exception as e:
        print(f"Database read error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve data: {str(e)}")

@app.post("/api/takeoff")
async def save_takeoff_items(items: List[Dict[str, Any]]):
    """
    Upserts the takeoff items (updates existing, inserts new) without clearing the database.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    try:
        if items:
            # Perform upsert based on primary key 'id'
            response = supabase.table(TABLE_NAME).upsert(items).execute()
            print(f"Successfully upserted {len(items)} items to Supabase.")
            return {"status": "success", "count": len(items)}
        
        return {"status": "success", "count": 0}
        
    except Exception as e:
        print(f"Database write/sync error: {e}")
        raise HTTPException(status_code=500, detail=f"Database sync failed: {str(e)}")

@app.delete("/api/takeoff/{item_id}")
async def delete_takeoff_item(item_id: str):
    """
    Delete a specific takeoff item from Supabase by its UUID.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    try:
        response = supabase.table(TABLE_NAME).delete().eq("id", item_id).execute()
        print(f"Successfully deleted item {item_id} from Supabase.")
        return {"status": "success", "deleted_id": item_id}
    except Exception as e:
        print(f"Database delete error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete item: {str(e)}")
