import os
import psycopg2
from dotenv import load_dotenv
load_dotenv('backend/.env')

conn = psycopg2.connect(os.getenv('SUPABASE_DB_URL'))
cur = conn.cursor()
cur.execute("SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';")
for row in cur.fetchall():
    print(row)
