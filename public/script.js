document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // УТИЛИТЫ
    // ==========================================
    async function sendRequest(url, data = null, method = 'POST') {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (data) options.body = JSON.stringify(data);
        try {
            const response = await fetch(url, options);
            const result = await response.json();
            return { ok: response.ok, data: result };
        } catch (error) {
            console.error(`Ошибка запроса:`, error);
            return { ok: false, data: { message: 'Ошибка связи с сервером' } };
        }
    }

    const getFormData = (form) => Object.fromEntries(new FormData(form).entries());

    const showMessage = (elementId, message, isSuccess) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.textContent = message;
        el.style.color = isSuccess ? 'green' : 'red';
    };

    // ==========================================
    // 1. НАВИГАЦИЯ И АНИМАЦИИ ПОЯВЛЕНИЯ
    // ==========================================
    const initUI = () => {
        // Плавный скролл
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const target = document.querySelector(this.getAttribute('href'));
                if (!target) return;
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            });
        });

        // Кнопка наверх
        const scrollTopBtn = document.getElementById('scrollTopBtn');
        if (scrollTopBtn) {
            window.addEventListener('scroll', () => {
                scrollTopBtn.classList.toggle('show', window.scrollY > 300);
            });
        }

        // ВОЗВРАЩЕНО: Анимация при скролле (делает карточки видимыми)
        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry, i) => {
                if (entry.isIntersecting) {
                    setTimeout(() => entry.target.classList.add('show'), i * 100);
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.card, .gallery-img').forEach(el => observer.observe(el));
    };

    // ==========================================
    // 2. ГЕНЕРАЦИЯ КОМАНДЫ И ГАЛЕРЕЯ
    // ==========================================
    const initContent = () => {
        // ВОЗВРАЩЕНО: Лайтбокс (увеличение картинок)
        const openModal = (id) => document.getElementById(id)?.classList.add('active');
        document.querySelectorAll('.gallery-img').forEach(img => {
            img.addEventListener('click', () => {
                const lightboxImg = document.getElementById('lightboxImg');
                if (lightboxImg) {
                    lightboxImg.src = img.src;
                    openModal('lightboxModal');
                    document.body.style.overflow = 'hidden';
                }
            });
        });

        // ВОЗВРАЩЕНО: Генерация слайдера команды
        const track = document.getElementById('teamTrack');
        const pag = document.getElementById('teamPagination');
        
        if (track && pag) {
            const teamBase = [
                {n: 'Анна', r: 'Шеф-бариста', y: 2018, i: '1534528741775-53994a69daeb'},
                {n: 'Максим', r: 'Ростермейстер', y: 2019, i: '1506794778202-cad84cf45f1d'},
                {n: 'Мария', r: 'Кондитер', y: 2021, i: '1544005313-94ddf0286df2'},
                {n: 'Алексей', r: 'Управляющий', y: 2020, i: '1507003211169-0a1dd7228f2d'},
                {n: 'Катя', r: 'Бариста', y: 2022, i: '1517841905240-472988babdf9'},
                {n: 'Дмитрий', r: 'Бариста', y: 2023, i: '1539571696357-5a69c17a67c6'},
                {n: 'Сергей', r: 'Бариста', y: 2023, i: '1519085360753-af0119f7cbe7'},
                {n: 'Ольга', r: 'Пом. кондитера', y: 2021, i: '1531746020798-e6953c6e8e04'},
                {n: 'Иван', r: 'Бариста', y: 2022, i: '1527980965255-d3b416303d12'},
                {n: 'Света', r: 'Кассир', y: 2021, i: '1438761681033-6461ffad8d80'}
            ];
            const teamFull = [...teamBase, ...teamBase]; 

            teamFull.forEach((mbr, i) => {
                track.insertAdjacentHTML('beforeend', `
                    <div class="card team-card">
                        <img src="https://images.unsplash.com/photo-${mbr.i}?q=80&w=400&auto=format&fit=crop" alt="${mbr.n}">
                        <div class="card-content"><h3>${mbr.n}</h3><p>${mbr.r}</p><div class="accent-text">С ${mbr.y} г.</div></div>
                    </div>
                `);
                const dot = document.createElement('div');
                dot.className = `dot ${i===0 ? 'active':''}`;
                dot.onclick = () => document.getElementById('teamViewport').scrollTo({ left: i * (track.children[0].offsetWidth + 20), behavior: 'smooth' });
                pag.appendChild(dot);
            });

            // Наблюдатель для новых карточек команды
            const observer = new IntersectionObserver((entries, obs) => {
                entries.forEach((entry, i) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => entry.target.classList.add('show'), i * 100);
                        obs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            track.querySelectorAll('.card').forEach(el => observer.observe(el));

            // Логика стрелок слайдера
            const view = document.getElementById('teamViewport');
            const getStep = () => track.children[0].offsetWidth + 20;
            document.getElementById('teamPrev').onclick = () => view.scrollBy({ left: -getStep(), behavior: 'smooth' });
            document.getElementById('teamNext').onclick = () => view.scrollBy({ left: getStep(), behavior: 'smooth' });
            view.addEventListener('scroll', () => {
                const idx = Math.round(view.scrollLeft / getStep());
                document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx));
            });
        }
    };

    // ==========================================
    // 3. МОДАЛЬНЫЕ ОКНА И ФОРМЫ
    // ==========================================
    const initModalsAndForms = () => {
        const openModal = (id) => document.getElementById(id)?.classList.add('active');
        const closeModal = (modal) => { modal.classList.remove('active'); document.body.style.overflow = ''; };

        document.querySelectorAll('[data-modal]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                openModal(el.dataset.modal);
            });
        });

        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.classList.contains('modal-close-x')) closeModal(modal);
            });
        });

        document.getElementById('btnYes')?.addEventListener('click', () => {
            closeModal(document.getElementById('coffeeModal'));
            openModal('resModal');
        });

        document.querySelectorAll('.js-booking-form').forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const res = await sendRequest('/api/reserve', getFormData(form));
                if (res.ok) {
                    form.reset();
                    alert(res.data.message || 'Столик забронирован!');
                    if (form.id === 'resModalForm') closeModal(document.getElementById('resModal'));
                } else {
                    alert('Ошибка: ' + res.data.message);
                }
            });
        });

        // ВОЗВРАЩЕНО: Логика формы "Обратная связь"
        const fbForm = document.getElementById('fbForm');
        if (fbForm) {
            const fbName = document.getElementById('fbName');
            const fbPhone = document.getElementById('fbPhone');
            const fbQuestion = document.getElementById('fbQuestion');
            const fbBtn = document.getElementById('fbBtn');

            fbForm.addEventListener('input', () => {
                fbName.value = fbName.value.replace(/[^a-zA-Zа-яА-ЯёЁ\s]/g, '');
                fbPhone.value = fbPhone.value.replace(/[^\d]/g, '');
                fbBtn.disabled = !(fbName.value.trim() && fbPhone.value.trim() && fbQuestion.value.trim());
            });
            
            fbForm.addEventListener('submit', (e) => {
                e.preventDefault();
                document.getElementById('fbContainer').style.display = 'none';
                document.getElementById('fbResult').style.display = 'block';
            });
        }
    };

    // ==========================================
    // 4. АВТОРИЗАЦИЯ И ЛИЧНЫЙ КАБИНЕТ (about.html)
    // ==========================================
    const initAuth = () => {
        const [loginSec, regSec, cabSec] = ['loginSection', 'registerSection', 'cabinetSection'].map(id => document.getElementById(id));
        const [loginForm, regForm] = [document.getElementById('loginForm'), document.getElementById('registerForm')];
        
        if (!loginForm || !regForm) return;

        const switchScreen = (showSec, hideSec) => {
            hideSec.style.display = 'none';
            showSec.style.display = 'block';
        };

        document.getElementById('showRegisterBtn').onclick = (e) => { e.preventDefault(); switchScreen(regSec, loginSec); };
        document.getElementById('showLoginBtn').onclick = (e) => { e.preventDefault(); switchScreen(loginSec, regSec); };

        const checkAuth = async () => {
            const res = await sendRequest('/api/check-auth', null, 'GET');
            if (res.ok && res.data.loggedIn) {
                switchScreen(cabSec, loginSec);
                regSec.style.display = 'none';
                document.getElementById('cabUsername').textContent = res.data.user.login;
                document.getElementById('cabPoints').textContent = res.data.user.bonus_points;
            }
        };
        checkAuth();

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const res = await sendRequest('/api/login', getFormData(loginForm));
            
            if (res.ok) {
                switchScreen(cabSec, loginSec);
                document.getElementById('cabUsername').textContent = res.data.user.login;
                document.getElementById('cabPoints').textContent = res.data.user.bonus_points;
            } else {
                showMessage('loginResult', res.data.message, false);
                document.getElementById('showRegisterBtn').style.display = 'inline-block';
            }
        });

        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const res = await sendRequest('/api/register', getFormData(regForm));
            
            if (res.ok) {
                showMessage('registerResult', res.data.message, true);
                regForm.reset();
            } else {
                showMessage('registerResult', res.data.message, false);
            }
        });

        document.getElementById('logoutBtn')?.addEventListener('click', async () => {
            await sendRequest('/api/logout');
            switchScreen(loginSec, cabSec);
            loginForm.reset();
            document.getElementById('loginResult').textContent = '';
        });
    };

    // Запускаем все модули
    initUI();
    initContent();
    initModalsAndForms();
    initAuth();
});