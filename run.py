import os
import sys
import subprocess
import time
import webbrowser
import signal

def run_servers():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("\n" + "="*60)
    print("      BHUKYA SAI - PORTFOLIO DEVELOPMENT CENTER")
    print("="*60)
    print("Initializing servers...")

    # Start Flask API Backend
    print("[Backend] Launching Flask server on http://localhost:5000...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-u", "-m", "backend.app"],
        cwd=root_dir,
        stdout=sys.stdout,
        stderr=sys.stderr
    )

    # Start Python Static Web Server for Frontend
    print("[Frontend] Launching static web server on http://localhost:8000...")
    frontend_proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", "8000", "--directory", "frontend"],
        cwd=root_dir,
        stdout=subprocess.DEVNULL, # Suppress standard log flooding
        stderr=subprocess.DEVNULL
    )

    # Wait a brief moment for servers to spin up
    time.sleep(1.5)

    # Open local address in browser
    local_url = "http://localhost:8000"
    print(f"\n[System] Startup successful! Opening browser to: {local_url}")
    webbrowser.open(local_url)
    
    print("\n" + "-"*60)
    print("Press Ctrl+C to terminate both servers and release ports.")
    print("-"*60 + "\n")

    try:
        # Keep main thread alive monitoring subprocesses
        while True:
            # Check if any process died unexpectedly
            if backend_proc.poll() is not None:
                print("[Backend] Warning: Flask server stopped unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("[Frontend] Warning: Web server stopped unexpectedly.")
                break
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n[System] Shutdown signal received. Cleaning up active processes...")
    finally:
        # Graceful cleanup
        backend_proc.terminate()
        frontend_proc.terminate()
        
        # Double check process closure
        try:
            backend_proc.wait(timeout=2)
            frontend_proc.wait(timeout=2)
        except subprocess.TimeoutExpired:
            backend_proc.kill()
            frontend_proc.kill()
            
        print("[System] Both servers terminated successfully. Ports released.")

if __name__ == "__main__":
    # Ensure dependencies can be imported (adds workspace root to python path)
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    run_servers()
