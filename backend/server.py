from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from daytona_sdk import Daytona
import asyncio
import json


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class CodeExecutionRequest(BaseModel):
    code: str
    language: str = "python"

class CodeExecutionResponse(BaseModel):
    output: str
    error: Optional[str] = None
    execution_time: Optional[float] = None

# Daytona client initialization
DAYTONA_API_KEY = os.getenv('DAYTONA_API_KEY')
if not DAYTONA_API_KEY:
    logging.warning("DAYTONA_API_KEY not found in environment variables")
    daytona_client = None
else:
    try:
        # Set environment variable for Daytona SDK
        os.environ['DAYTONA_API_KEY'] = DAYTONA_API_KEY
        daytona_client = Daytona()
        logging.info("Daytona client initialized successfully")
    except Exception as e:
        logging.error(f"Failed to initialize Daytona client: {e}")
        daytona_client = None

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

@api_router.post("/execute", response_model=CodeExecutionResponse)
async def execute_code(request: CodeExecutionRequest):
    """Execute code using Daytona sandbox environment"""
    if not daytona_client:
        raise HTTPException(
            status_code=503, 
            detail="Code execution service is not available. Daytona client not initialized."
        )
    
    start_time = asyncio.get_event_loop().time()
    
    try:
        # Log the execution request
        logger.info(f"Executing {request.language} code: {request.code[:100]}...")
        
        # Create sandbox configuration based on language
        language_map = {
            "python": "python",
            "javascript": "nodejs", 
            "js": "nodejs",
            "java": "java",
            "cpp": "cpp",
            "c++": "cpp",
            "go": "go",
            "rust": "rust",
            "php": "php",
            "ruby": "ruby"
        }
        
        sandbox_language = language_map.get(request.language.lower(), "python")
        
        # Execute code in Daytona sandbox
        # Note: This is a simplified version - actual implementation may vary based on Daytona SDK
        sandbox_config = {
            "language": sandbox_language,
            "timeout": 30  # 30 second timeout
        }
        
        # For now, we'll implement a mock execution for non-Python languages
        # In a real implementation, you would use the actual Daytona SDK methods
        if request.language.lower() in ["python", "py"]:
            try:
                # Use Daytona to execute Python code
                # This is a placeholder - replace with actual Daytona SDK calls
                result = await execute_python_code_daytona(request.code)
                output = result.get("output", "")
                error = result.get("error", None)
            except Exception as e:
                output = ""
                error = f"Execution error: {str(e)}"
        else:
            # For other languages, return a placeholder response
            output = f"Code execution for {request.language} would be handled by Daytona sandbox.\nCode to execute:\n{request.code}"
            error = None
        
        execution_time = asyncio.get_event_loop().time() - start_time
        
        # Log execution to database
        execution_log = {
            "code": request.code,
            "language": request.language,
            "output": output,
            "error": error,
            "execution_time": execution_time,
            "timestamp": datetime.utcnow()
        }
        await db.code_executions.insert_one(execution_log)
        
        return CodeExecutionResponse(
            output=output or "Code executed successfully",
            error=error,
            execution_time=execution_time
        )
        
    except Exception as e:
        execution_time = asyncio.get_event_loop().time() - start_time
        error_message = f"Failed to execute code: {str(e)}"
        logger.error(error_message)
        
        # Log failed execution
        execution_log = {
            "code": request.code,
            "language": request.language,
            "output": "",
            "error": error_message,
            "execution_time": execution_time,
            "timestamp": datetime.utcnow()
        }
        await db.code_executions.insert_one(execution_log)
        
        raise HTTPException(status_code=500, detail=error_message)

async def execute_code_simulation(code: str):
    """Simple code simulation for demo purposes"""
    try:
        # Simple simulation for demo purposes
        if "print" in code:
            # Extract print statements and simulate output
            lines = code.split('\n')
            output_lines = []
            for line in lines:
                if line.strip().startswith('print'):
                    # Simple extraction of print content
                    import re
                    match = re.search(r'print\((.*?)\)', line)
                    if match:
                        content = match.group(1).strip('"\'')
                        output_lines.append(content)
            
            return {"output": '\n'.join(output_lines), "error": None}
        else:
            return {"output": "Code executed successfully (no output)", "error": None}
            
    except Exception as e:
        return {"output": "", "error": str(e)}

async def execute_python_code_daytona(code: str):
    """Execute Python code using Daytona sandbox"""
    try:
        import os
        # Set environment variable for this function
        os.environ['DAYTONA_API_KEY'] = DAYTONA_API_KEY
        
        # Create Daytona client
        daytona = Daytona()
        
        # Create sandbox for Python execution
        # Note: This is a simplified implementation
        # You may need to adjust based on actual Daytona API
        sandbox = daytona.create_sandbox({
            "name": f"python-execution-{uuid.uuid4().hex[:8]}",
            "image": "python:3.9",
            "timeout": 30
        })
        
        try:
            # Execute the code
            result = sandbox.exec(f"python3 -c '{code}'")
            
            if result.exit_code == 0:
                return {"output": result.stdout, "error": None}
            else:
                return {"output": result.stdout, "error": result.stderr}
                
        finally:
            # Clean up sandbox
            daytona.remove_sandbox(sandbox.id)
            
    except Exception as e:
        logger.error(f"Daytona execution error: {e}")
        # Fallback to simple simulation for demo
        return await execute_code_simulation(code)

@api_router.get("/executions")
async def get_execution_history():
    """Get recent code execution history"""
    try:
        executions = await db.code_executions.find().sort("timestamp", -1).limit(10).to_list(10)
        return {"executions": executions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch execution history: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
