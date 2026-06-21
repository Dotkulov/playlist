import sqlite3

DB_PATH = 'songs.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            url TEXT NOT NULL,
            cover TEXT,
            filename TEXT
        )
    ''')
    conn.commit()
    conn.close()

def get_all_songs():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, artist, url, cover FROM songs ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [{'id': row[0], 'title': row[1], 'artist': row[2], 'url': row[3], 'cover': row[4] or ''} for row in rows]

def add_song(title, artist, url, cover='', filename=''):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO songs (title, artist, url, cover, filename) VALUES (?, ?, ?, ?, ?)", 
                   (title, artist, url, cover, filename))
    conn.commit()
    conn.close()
    return cursor.lastrowid

def update_song(song_id, title, artist, url, cover):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE songs 
        SET title = ?, artist = ?, url = ?, cover = ? 
        WHERE id = ?
    """, (title, artist, url, cover, song_id))
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0

def delete_song(song_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT filename FROM songs WHERE id = ?", (song_id,))
    result = cursor.fetchone()
    cursor.execute("DELETE FROM songs WHERE id = ?", (song_id,))
    conn.commit()
    conn.close()
    return result[0] if result else None