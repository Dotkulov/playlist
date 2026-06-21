const { createApp, ref, reactive, onMounted } = Vue;

const app = createApp({
    setup() {
        // Состояние
        const songs = ref([]);
        const currentSong = ref(null);
        const isPlaying = ref(false);
        const currentTime = ref(0);
        const duration = ref(0);
        const audio = ref(null);
        const isExpanded = ref(false);
        
        // Админ
        const isLoggedIn = ref(false);
        const showLoginModal = ref(false);
        const loginForm = reactive({ username: '', password: '' });
        const loginError = ref('');
        
        // Новая песня
        const newSong = reactive({ title: '', artist: '', cover: '', url: '' });
        const uploadedFile = ref(null);
        const coverFile = ref(null);
        const coverPreview = ref(null);
        const uploadProgress = ref(0);

        // Редактирование
        const showEditModal = ref(false);
        const editSong = reactive({ id: null, title: '', artist: '', url: '', cover: '' });

        // Методы
        const loadSongs = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/songs');
                songs.value = await response.json();
            } catch (error) {
                console.error('Ошибка загрузки песен:', error);
            }
        };

        const login = () => {
            if (loginForm.username === 'dotkulov' && loginForm.password === 'redmi30a') {
                isLoggedIn.value = true;
                showLoginModal.value = false;
                loginError.value = '';
                loginForm.password = '';
                loginForm.username = '';
                showNotification('Добро пожаловать в админ-панель!', 'success');
            } else {
                loginError.value = 'Неверный логин или пароль';
            }
        };

        const logout = () => {
            isLoggedIn.value = false;
            showNotification('Вы вышли из админ-панели', 'info');
        };

        const togglePlay = (song) => {
            if (currentSong.value && currentSong.value.id === song.id) {
                if (isPlaying.value) {
                    audio.value.pause();
                    isPlaying.value = false;
                } else {
                    audio.value.play();
                    isPlaying.value = true;
                }
            } else {
                currentSong.value = song;
                audio.value.src = song.url;
                audio.value.play();
                isPlaying.value = true;
            }
        };

        const prevSong = () => {
            if (!currentSong.value || songs.value.length === 0) return;
            const currentIndex = songs.value.findIndex(s => s.id === currentSong.value.id);
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : songs.value.length - 1;
            currentSong.value = songs.value[prevIndex];
            audio.value.src = currentSong.value.url;
            audio.value.play();
            isPlaying.value = true;
        };

        const nextSong = () => {
            if (!currentSong.value || songs.value.length === 0) return;
            const currentIndex = songs.value.findIndex(s => s.id === currentSong.value.id);
            const nextIndex = currentIndex < songs.value.length - 1 ? currentIndex + 1 : 0;
            currentSong.value = songs.value[nextIndex];
            audio.value.src = currentSong.value.url;
            audio.value.play();
            isPlaying.value = true;
        };

        const updateTime = () => {
            if (audio.value) {
                currentTime.value = audio.value.currentTime;
            }
        };

        const updateDuration = () => {
            if (audio.value) {
                duration.value = audio.value.duration;
            }
        };

        const seek = () => {
            if (audio.value) {
                audio.value.currentTime = currentTime.value;
            }
        };

        const formatTime = (seconds) => {
            if (!seconds || isNaN(seconds)) return '0:00';
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        const toggleExpand = () => {
            isExpanded.value = !isExpanded.value;
        };

        // Добавление песни
        const addSong = async () => {
            if (!newSong.title || !newSong.artist || !newSong.url) {
                showNotification('Заполните все обязательные поля!', 'error');
                return;
            }

            try {
                const response = await fetch('http://localhost:5000/api/songs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newSong)
                });
                
                if (response.ok) {
                    await loadSongs();
                    newSong.title = '';
                    newSong.artist = '';
                    newSong.cover = '';
                    newSong.url = '';
                    uploadedFile.value = null;
                    coverFile.value = null;
                    coverPreview.value = null;
                    showNotification('Песня успешно добавлена!', 'success');
                }
            } catch (error) {
                console.error('Ошибка добавления песни:', error);
                showNotification('Ошибка при добавлении песни', 'error');
            }
        };

        // Редактирование песни
        const openEditModal = (song) => {
            editSong.id = song.id;
            editSong.title = song.title;
            editSong.artist = song.artist;
            editSong.url = song.url;
            editSong.cover = song.cover || '';
            showEditModal.value = true;
        };

        const closeEditModal = () => {
            showEditModal.value = false;
            editSong.id = null;
            editSong.title = '';
            editSong.artist = '';
            editSong.url = '';
            editSong.cover = '';
        };

        const updateSong = async () => {
            if (!editSong.title || !editSong.artist || !editSong.url) {
                showNotification('Заполните все поля!', 'error');
                return;
            }

            try {
                const response = await fetch(`http://localhost:5000/api/songs/${editSong.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: editSong.title,
                        artist: editSong.artist,
                        url: editSong.url,
                        cover: editSong.cover
                    })
                });
                
                if (response.ok) {
                    await loadSongs();
                    closeEditModal();
                    showNotification('Песня успешно обновлена!', 'success');
                }
            } catch (error) {
                console.error('Ошибка обновления песни:', error);
                showNotification('Ошибка при обновлении песни', 'error');
            }
        };

        // Удаление песни
        const deleteSong = async (id) => {
            if (!confirm('Удалить этот трек?')) return;
            
            try {
                const response = await fetch(`http://localhost:5000/api/songs/${id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    await loadSongs();
                    if (currentSong.value && currentSong.value.id === id) {
                        currentSong.value = null;
                        isPlaying.value = false;
                    }
                    showNotification('Песня удалена', 'info');
                }
            } catch (error) {
                console.error('Ошибка удаления песни:', error);
                showNotification('Ошибка при удалении песни', 'error');
            }
        };

        // Загрузка обложки
        const handleCoverUpload = (event) => {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                coverFile.value = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    coverPreview.value = e.target.result;
                    newSong.cover = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        };

        const handleCoverDrop = (event) => {
            const file = event.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                coverFile.value = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    coverPreview.value = e.target.result;
                    newSong.cover = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        };

        const removeCover = () => {
            coverFile.value = null;
            coverPreview.value = null;
            newSong.cover = '';
        };

        // Загрузка аудио
        const handleAudioUpload = (event) => {
            const file = event.target.files[0];
            if (file && file.type.startsWith('audio/')) {
                uploadedFile.value = file;
                uploadFile();
            }
        };

        const handleAudioDrop = (event) => {
            const file = event.dataTransfer.files[0];
            if (file && file.type.startsWith('audio/')) {
                uploadedFile.value = file;
                uploadFile();
            }
        };

        const uploadFile = async () => {
            if (!uploadedFile.value) return;
            
            const formData = new FormData();
            formData.append('file', uploadedFile.value);
            
            try {
                const response = await fetch('http://localhost:5000/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const data = await response.json();
                    newSong.url = data.url;
                    uploadProgress.value = 100;
                    setTimeout(() => uploadProgress.value = 0, 2000);
                    showNotification('Файл успешно загружен!', 'success');
                }
            } catch (error) {
                console.error('Ошибка загрузки файла:', error);
                showNotification('Ошибка загрузки файла', 'error');
            }
        };

        // Уведомления
        const showNotification = (message, type = 'info') => {
            alert(message);
        };

        // Создание частиц
        const createParticles = () => {
            const container = document.getElementById('particles');
            if (!container) return;
            
            for (let i = 0; i < 50; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.width = (Math.random() * 4 + 1) + 'px';
                particle.style.height = particle.style.width;
                particle.style.animationDuration = (Math.random() * 20 + 10) + 's';
                particle.style.animationDelay = (Math.random() * 10) + 's';
                particle.style.background = `rgba(${102 + Math.random() * 100}, ${126 + Math.random() * 100}, ${234 + Math.random() * 100}, ${0.1 + Math.random() * 0.3})`;
                container.appendChild(particle);
            }
        };

        // Lifecycle
        onMounted(() => {
            audio.value = document.querySelector('audio');
            loadSongs();
            createParticles();
            
            if (audio.value) {
                audio.value.addEventListener('ended', nextSong);
            }
        });

        return {
            songs,
            currentSong,
            isPlaying,
            currentTime,
            duration,
            audio,
            isExpanded,
            isLoggedIn,
            showLoginModal,
            loginForm,
            loginError,
            newSong,
            uploadedFile,
            coverFile,
            coverPreview,
            uploadProgress,
            showEditModal,
            editSong,
            loadSongs,
            login,
            logout,
            togglePlay,
            prevSong,
            nextSong,
            updateTime,
            updateDuration,
            seek,
            formatTime,
            toggleExpand,
            addSong,
            openEditModal,
            closeEditModal,
            updateSong,
            deleteSong,
            handleCoverUpload,
            handleCoverDrop,
            removeCover,
            handleAudioUpload,
            handleAudioDrop,
            uploadFile
        };
    }
});

app.mount('#app');