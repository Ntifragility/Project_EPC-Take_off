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
        response = supabase.table("takeoff_items").select("*").order("created_at").execute()
        return response.data
    except Exception as e:
        print(f"Database read error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve data: {str(e)}")

@app.post("/api/takeoff")
async def save_takeoff_items(items: List[Dict[str, Any]]):
    """
    Clears old items and batch inserts the fresh takeoff items list.
    Runs inside a try-except block to handle DB connection failure gracefully.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    
    try:
        # 1. Clear old records
        supabase.table("takeoff_items").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        
        # 2. Bulk insert new records if any
        if items:
            response = supabase.table("takeoff_items").insert(items).execute()
            print(f"Successfully synced {len(items)} items to Supabase.")
            return {"status": "success", "count": len(items)}
        
        return {"status": "success", "count": 0}
        
    except Exception as e:
        print(f"Database write/sync error: {e}")
        raise HTTPException(status_code=500, detail=f"Database sync failed: {str(e)}")
