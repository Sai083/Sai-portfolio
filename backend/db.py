import os
import sqlite3
import datetime
from dotenv import load_dotenv

# Load env variables
load_dotenv()

# DB Configuration
DB_TYPE = "sqlite"  # Default
MYSQL_HOST = os.getenv("MYSQL_HOST")
MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
DATABASE_URL = os.getenv("DATABASE_URL")  # Railway connection URL

# Decide which DB to use
if DATABASE_URL or (MYSQL_HOST and MYSQL_USER and MYSQL_DATABASE):
    DB_TYPE = "mysql"
    print("[DB] Configured for MySQL production database.")
else:
    DB_TYPE = "sqlite"
    print("[DB] Configured for local SQLite database.")

def get_connection():
    """Establishes database connection based on DB_TYPE configuration."""
    if DB_TYPE == "mysql":
        import mysql.connector
        if DATABASE_URL:
            # Parse connection URL if provided
            # e.g., mysql://user:pass@host:port/db
            try:
                # Basic parsing or passing direct url
                # mysql.connector supports dictionary configurations
                # For safety, let's try direct parsing of DATABASE_URL or fallback to env vars
                if DATABASE_URL.startswith("mysql://"):
                    clean_url = DATABASE_URL.replace("mysql://", "")
                    user_pass, host_port_db = clean_url.split("@")
                    user, password = user_pass.split(":")
                    host_port, db = host_port_db.split("/")
                    # remove query params if any
                    db = db.split("?")[0]
                    host = host_port.split(":")[0]
                    port = host_port.split(":")[1] if ":" in host_port else "3306"
                    
                    # Enable SSL mode if cloud database (Aiven) or specified in connection parameters
                    ssl_args = {}
                    if "ssl-mode" in DATABASE_URL or "aivencloud" in host:
                        ssl_args["ssl_mode"] = "REQUIRED"

                    return mysql.connector.connect(
                        host=host,
                        user=user,
                        password=password,
                        database=db,
                        port=port,
                        connect_timeout=10,
                        **ssl_args
                    )
            except Exception as e:
                print(f"[DB] Error parsing DATABASE_URL: {e}. Falling back to explicit envs.")
        
        return mysql.connector.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            port=int(MYSQL_PORT),
            connect_timeout=10
        )
    else:
        # Local SQLite DB
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "portfolio.db")
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row  # Access columns by name
        return conn

def execute_query(query, params=None, is_select=False):
    """
    Executes an SQL query, automatically translating parameters based on DB type
    (%s for MySQL, ? for SQLite).
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # Translate placeholder syntax from %s to ? if SQLite
    if DB_TYPE == "sqlite" and params:
        query = query.replace("%s", "?")
    
    try:
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
            
        if is_select:
            # For select queries, return records
            if DB_TYPE == "mysql":
                # Convert list of tuples to list of dicts to match SQLite Row factory
                columns = [col[0] for col in cursor.description]
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            else:
                results = [dict(row) for row in cursor.fetchall()]
            return results
        else:
            conn.commit()
            return cursor.lastrowid
    except Exception as e:
        print(f"[DB] Database execution error on query '{query}': {e}")
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def init_db():
    """Initializes the required database schema."""
    print(f"[DB] Initializing {DB_TYPE} database schema...")
    
    # SQLite structure uses AUTOINCREMENT, MySQL uses AUTO_INCREMENT
    id_type = "INTEGER PRIMARY KEY AUTOINCREMENT" if DB_TYPE == "sqlite" else "INT AUTO_INCREMENT PRIMARY KEY"
    text_type = "TEXT" if DB_TYPE == "sqlite" else "VARCHAR(1000)"
    
    query = f"""
    CREATE TABLE IF NOT EXISTS recruiters (
        id {id_type},
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        position VARCHAR(255) NOT NULL,
        message {text_type} NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending Review',
        interview_date VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """
    execute_query(query)
    print("[DB] Schema verification complete.")

def save_recruiter_message(name, company, email, position, message):
    """Saves a message from a recruiter."""
    query = """
    INSERT INTO recruiters (name, company, email, position, message)
    VALUES (%s, %s, %s, %s, %s)
    """
    return execute_query(query, (name, company, email, position, message))

def get_recruiter_messages(search_query=None):
    """Retrieves recruiter messages, with optional search filtering."""
    if search_query:
        # SQL search
        query = """
        SELECT id, name, company, email, position, message, status, interview_date, created_at
        FROM recruiters
        WHERE name LIKE %s OR company LIKE %s OR position LIKE %s
        ORDER BY created_at DESC
        """
        like_pattern = f"%{search_query}%"
        return execute_query(query, (like_pattern, like_pattern, like_pattern), is_select=True)
    else:
        query = """
        SELECT id, name, company, email, position, message, status, interview_date, created_at
        FROM recruiters
        ORDER BY created_at DESC
        """
        return execute_query(query, is_select=True)

def update_recruiter_status(message_id, new_status, interview_date=None):
    """Updates the status and optional interview scheduling date for a message."""
    query = """
    UPDATE recruiters
    SET status = %s, interview_date = %s
    WHERE id = %s
    """
    execute_query(query, (new_status, interview_date, message_id))

def delete_recruiter_message(message_id):
    """Deletes a recruiter message entry."""
    query = """
    DELETE FROM recruiters
    WHERE id = %s
    """
    execute_query(query, (message_id,))
