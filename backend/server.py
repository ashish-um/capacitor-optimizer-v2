from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, conlist
import subprocess
import json
import sys
from typing import List, Optional

CPP_EXECUTABLE_PATH = "./capacitor_optimizer"


class CapacitorConfigRequest(BaseModel):
    target: float = Field(75.0, description="Target equivalent capacitance in Farads")
    branches: int = Field(3, gt=0, description="Number of series branches (must be positive)")
    fixed: float = Field(2.5, gt=0, description="Fixed capacitor value in each branch (must be positive)")
    max_parallel: int = Field(20, ge=0, description="Maximum total number of parallel caps per branch (must be non-negative)")
    available: Optional[conlist(float, min_length=1)] = Field( # type: ignore
        [5.0, 10.0, 50.0],
        description="Comma-separated list of available parallel capacitor values (must be positive)",
        example=[5.0, 10.0, 50.0]
    )

app = FastAPI(
    title="Capacitor Config Finder API",
    description="API to find optimal capacitor configurations for a series circuit.",
    version="1.0.0",
)

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Set the allowed origins
    allow_credentials=True, # Allow cookies to be included in requests
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], # Allowed HTTP methods
    allow_headers=["*"], # Allow all headers
)

@app.post("/find_config")
async def find_capacitor_config(request_data: CapacitorConfigRequest):
    """
    Finds the optimal capacitor configuration based on input parameters.
    """

    command = [
        CPP_EXECUTABLE_PATH,
        "--target", str(request_data.target),
        "--branches", str(request_data.branches),
        "--fixed", str(request_data.fixed),
        "--max-parallel", str(request_data.max_parallel)
    ]

    if request_data.available is not None:
         available_str = ",".join(map(str, request_data.available))
         command.extend(["--available", available_str])

   
    print(f"Running command: {' '.join(command)}", file=sys.stderr)

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True,
            timeout=120
        )

        cpp_output = result.stdout.strip()
        print(f"C++ stdout:\n{cpp_output}", file=sys.stderr)
        print(f"C++ stderr:\n{result.stderr.strip()}", file=sys.stderr)

        response_json = json.loads(cpp_output)

        return JSONResponse(content=response_json)

    except FileNotFoundError:
         print(f"Error: C++ executable not found at {CPP_EXECUTABLE_PATH}", file=sys.stderr)
         raise HTTPException(status_code=500, detail=f"C++ executable not found on the server.")
    except subprocess.CalledProcessError as e:
        print(f"Error running C++ program (exit code {e.returncode}): {e}", file=sys.stderr)
        print(f"C++ stderr: {e.stderr}", file=sys.stderr)
        # Assuming C++ stderr contains a relevant error message
        error_detail = e.stderr.strip() if e.stderr else f"C++ program exited with code {e.returncode}"
        raise HTTPException(status_code=500, detail=f"Error during calculation: {error_detail}")
    except json.JSONDecodeError:
        print(f"Error decoding JSON from C++ output: {cpp_output}", file=sys.stderr)
        raise HTTPException(status_code=500, detail="Server error: Could not parse calculation result.")
    except subprocess.TimeoutExpired:
         print("C++ program timed out", file=sys.stderr)
         raise HTTPException(status_code=504, detail="Calculation timed out.") # 504 Gateway Timeout
    except Exception as e:
        print(f"An unexpected error occurred: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"An unexpected server error occurred.")

# To run this API locally for testing:
# uvicorn server:app --reload --host 0.0.0.0 --port 8000

# For production, use a production ASGI server like Uvicorn directly or with Gunicorn:
# uvicorn server:app --workers 4 --host 0.0.0.0 --port 8000
# or
# gunicorn -w 4 -k uvicorn.workers.UvicornWorker api:app -b 0.0.0.0:8000

# example req body:
# {
#   "target": 75,
#   "branches": 3,
#   "fixed": 2.5,
#   "max_parallel": 20,
#   "available": [5, 10, 50]
# }