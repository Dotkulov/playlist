const { createApp, ref, reactive, onMounted } = Vue;

// Определяем URL бэкенда в зависимости от окружения
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'  // Локальная разработка
    : 'https://playlist-backend-uwst.onrender.com'; // Продакшн на Render

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
                const response = await fetch(`${API_BASE_URL}/api/songs`);
                songs.value = await response.json();
            } catch (error) {
                console.error('Ошибка загрузки песен:', error);
                showNotification('Ошибка загрузки плейлиста', 'error');
            }
        };

        const login = () => {
            if (loginForm.username === 'dotkulov' && loginForm.password === 'redmi30a') {
                isLoggedIn.value = true;
                showLoginModal.value = false;
                loginError.value = '';
                loginForm.password = '';
                loginForm.username = '';
                showNotification('Добро пожаловать в админ-панель! 🎉', 'success');
            } else {
                loginError.value = 'Неверный логин или пароль';
                setTimeout(() => { loginError.value = ''; }, 3000);
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
                const response = await fetch(`${API_BASE_URL}/api/songs`, {
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
                    showNotification('Песня успешно добавлена! 🎵', 'success');
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
                const response = await fetch(`${API_BASE_URL}/api/songs/${editSong.id}`, {
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
                    showNotification('Песня успешно обновлена! ✨', 'success');
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
                const response = await fetch(`${API_BASE_URL}/api/songs/${id}`, {
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
            
            let progress = 0;
            const interval = setInterval(() => {
                progress += 5;
                if (progress <= 90) {
                    uploadProgress.value = progress;
                }
            }, 100);
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                clearInterval(interval);
                
                if (response.ok) {
                    const data = await response.json();
                    newSong.url = data.url;
                    uploadProgress.value = 100;
                    setTimeout(() => uploadProgress.value = 0, 2000);
                    showNotification('Файл успешно загружен! 📁', 'success');
                }
            } catch (error) {
                console.error('Ошибка загрузки файла:', error);
                clearInterval(interval);
                uploadProgress.value = 0;
                showNotification('Ошибка загрузки файла', 'error');
            }
        };

        // Уведомления
        const showNotification = (message, type = 'info') => {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            
            const icons = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                info: 'fas fa-info-circle'
            };
            
            notification.innerHTML = `
                <i class="${icons[type] || icons.info}"></i>
                <span>${message}</span>
            `;
            
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 16px 24px;
                background: rgba(26, 26, 46, 0.95);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 16px;
                color: white;
                font-family: 'Inter', sans-serif;
                font-size: 14px;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                animation: slideInRight 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                max-width: 400px;
                pointer-events: none;
            `;
            
            const colors = {
                success: '#4CAF50',
                error: '#ff6b6b',
                info: '#667eea'
            };
            
            notification.querySelector('i').style.color = colors[type] || colors.info;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.5s ease forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 500);
            }, 3000);
        };

        // Карточки
        const handleCardHover = (index) => {
            // Эффект при наведении на карточку
        };

        const handleCardLeave = () => {
            // Эффект при уходе с карточки
        };

        // Создание частиц
        const createParticles = () => {
            const container = document.getElementById('particles');
            if (!container) return;
            
            for (let i = 0; i < 60; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                const size = Math.random() * 4 + 1;
                particle.style.width = size + 'px';
                particle.style.height = size + 'px';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.animationDuration = (Math.random() * 25 + 15) + 's';
                particle.style.animationDelay = (Math.random() * 10) + 's';
                const colors = [
                    `rgba(102, 126, 234, ${0.1 + Math.random() * 0.3})`,
                    `rgba(118, 75, 162, ${0.1 + Math.random() * 0.3})`,
                    `rgba(240, 147, 251, ${0.1 + Math.random() * 0.3})`,
                    `rgba(79, 172, 254, ${0.1 + Math.random() * 0.3})`
                ];
                particle.style.background = colors[Math.floor(Math.random() * colors.length)];
                container.appendChild(particle);
            }
        };

        // Создание звезд
        const createStars = () => {
            const container = document.getElementById('stars');
            if (!container) return;
            
            for (let i = 0; i < 150; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                const size = Math.random() * 3 + 1;
                star.style.width = size + 'px';
                star.style.height = size + 'px';
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 100 + '%';
                star.style.setProperty('--duration', (Math.random() * 4 + 2) + 's');
                star.style.animationDelay = (Math.random() * 5) + 's';
                star.style.background = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.7})`;
                container.appendChild(star);
            }
        };

        // Добавление стилей для уведомлений
        const addNotificationStyles = () => {
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes slideOutRight {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                }
            `;
            document.head.appendChild(style);
        };

        // Lifecycle
        onMounted(() => {
            audio.value = document.querySelector('audio');
            loadSongs();
            createParticles();
            createStars();
            addNotificationStyles();
            
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
            API_BASE_URL,
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
            uploadFile,
            handleCardHover,
            handleCardLeave,
            showNotification
        };
    }
});

app.mount('#app');