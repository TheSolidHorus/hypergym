import os
import psycopg2
from dotenv import load_dotenv
load_dotenv('backend/.env')

try:
    conn = psycopg2.connect(os.getenv('SUPABASE_DB_URL'))
    cur = conn.cursor()
    cur.execute("SELECT id, email, confirmed_at FROM auth.users WHERE email = 'admin@pump.it'")
    auth_user = cur.fetchone()
    print("Auth User:", auth_user)

    if auth_user:
        cur.execute(f"SELECT id, email, role FROM public.profiles WHERE id = '{auth_user[0]}'")
        profile = cur.fetchone()
        print("Profile:", profile)
except Exception as e:
    print("Error:", e)
