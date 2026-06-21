import os
import uuid
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import database
import cloudinary
import cloudinary.uploader

app = Flask(__name__)
CORS(app)

# Настройка Cloudinary
cloudinary.config(
    cloud_name = "dmeezmrja",
    api_key = "725118181393239",
    api_secret = "9y9PoiRmU-qk_2IEbwh6_PjANw8"
)

# Настройки загрузки (для локального использования)
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'ogg'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

database.init_db()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/songs', methods=['GET'])
def get_songs():
    songs = database.get_all_songs()
    return jsonify(songs)

@app.route('/api/songs', methods=['POST'])
def add_song():
    data = request.get_json()
    if not data or not data.get('title') or not data.get('artist') or not data.get('url'):
        return jsonify({'error': 'Missing required fields'}), 400
    
    new_id = database.add_song(
        data['title'],
        data['artist'],
        data['url'],
        data.get('cover', ''),
        data.get('filename', '')
    )
    return jsonify({'id': new_id, 'message': 'Song added successfully'}), 201

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Only MP3, WAV, OGG allowed'}), 400
    
    try:
        # Загрузка в Cloudinary
        result = cloudinary.uploader.upload(
            file,
            resource_type = "auto",
            folder = "playlist",
            public_id = f"{uuid.uuid4().hex}"
        )
        file_url = result['secure_url']
        
        return jsonify({
            'url': file_url, 
            'filename': file.filename
        }), 201
    except Exception as e:
        print(f"Cloudinary error: {str(e)}")
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/songs/<int:song_id>', methods=['DELETE'])
def delete_song(song_id):
    filename = database.delete_song(song_id)
    if filename:
        try:
            os.remove(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        except:
            pass
        return jsonify({'message': 'Song deleted successfully'}), 200
    else:
        return jsonify({'error': 'Song not found'}), 404

@app.route('/api/songs/<int:song_id>', methods=['PUT'])
def update_song(song_id):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    success = database.update_song(
        song_id,
        data.get('title'),
        data.get('artist'),
        data.get('url'),
        data.get('cover', '')
    )
    
    if success:
        return jsonify({'message': 'Song updated successfully'}), 200
    else:
        return jsonify({'error': 'Song not found'}), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)