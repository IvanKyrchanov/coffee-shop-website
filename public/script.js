document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // УТИЛИТЫ И API
    // ==========================================
    async function apiFetch(url, method = 'GET', data = null) {
        const options = { method, headers: { 'Content-Type': 'application/json' } };
        if (data) options.body = JSON.stringify(data);
        try {
            const response = await fetch(url, options);
            return { ok: response.ok, data: await response.json() };
        } catch (error) {
            console.error(`Ошибка сети:`, error);
            return { ok: false, data: { message: 'Ошибка соединения с сервером' } };
        }
    }

    const getFormData = (form) => Object.fromEntries(new FormData(form).entries());
    const showMessage = (id, msg, isSuccess) => {
        const el = document.getElementById(id);
        if (el) { el.textContent = msg; el.style.color = isSuccess ? 'green' : 'red'; }
    };

    // Общий наблюдатель за скроллом (анимации)
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('show'), i * 100);
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    // ==========================================
    // 1. ИНТЕРФЕЙС И ГАЛЕРЕЯ
    // ==========================================
    const initUI = () => {
        // Скролл по якорям
        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', function(e) {
                const target = document.querySelector(this.getAttribute('href'));
                if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
            });
        });

        const scrollTopBtn = document.getElementById('scrollTopBtn');
        if (scrollTopBtn) window.addEventListener('scroll', () => scrollTopBtn.classList.toggle('show', window.scrollY > 300));

        window.openModal = (id) => document.getElementById(id)?.classList.add('active');
        window.closeModal = (m) => { m.classList.remove('active'); document.body.style.overflow = ''; };

        // Галерея
        document.querySelectorAll('.gallery-img').forEach(img => {
            observer.observe(img);
            img.addEventListener('click', () => {
                const lImg = document.getElementById('lightboxImg');
                if (lImg) { lImg.src = img.src; window.openModal('lightboxModal'); document.body.style.overflow = 'hidden';}
            });
        });
    };

    // ==========================================
    // 2. ДИНАМИЧЕСКИЙ КОНТЕНТ (CMS Главной)
    // ==========================================
    const initContent = async () => {
        const heroTitle = document.getElementById('heroTitle');
        if (!heroTitle) return; // Выход, если мы не на index.html

        const res = await apiFetch('/api/content');
        if (!res.ok || !res.data) return;
        const data = res.data;

        if (data.hero_title) heroTitle.textContent = data.hero_title;
        const heroDesc = document.getElementById('heroDesc');
        if (heroDesc && data.hero_desc) heroDesc.textContent = data.hero_desc;

        const menuGrid = document.getElementById('menuGrid');
        if (menuGrid && data.menu_data) {
            menuGrid.innerHTML = ''; 
            JSON.parse(data.menu_data).forEach(item => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `<img src="${item.img}" alt="${item.title}"><div class="card-content"><h3>${item.title}</h3><p>${item.desc}</p><div class="accent-text">${item.price}</div></div>`;
                
                // Сразу открываем форму бронирования при клике на карточку
                card.addEventListener('click', () => window.openModal('resModal')); 
                
                menuGrid.appendChild(card);
                observer.observe(card);
            });
        }

        const track = document.getElementById('teamTrack');
        const pag = document.getElementById('teamPagination');
        if (track && pag && data.team_data) {
            track.innerHTML = ''; pag.innerHTML = '';
            const teamFull = [...JSON.parse(data.team_data), ...JSON.parse(data.team_data)];

            teamFull.forEach((mbr, i) => {
                const card = document.createElement('div');
                card.className = 'card team-card';
                card.innerHTML = `<img src="${mbr.img}" alt="${mbr.name}"><div class="card-content"><h3>${mbr.name}</h3><p>${mbr.role}</p><div class="accent-text">С ${mbr.year} г.</div></div>`;
                track.appendChild(card);
                observer.observe(card);

                const dot = document.createElement('div');
                dot.className = `dot ${i === 0 ? 'active' : ''}`;
                dot.onclick = () => document.getElementById('teamViewport').scrollTo({ left: i * (track.children[0].offsetWidth + 20), behavior: 'smooth' });
                pag.appendChild(dot);
            });

            const view = document.getElementById('teamViewport');
            const step = () => track.children[0]?.offsetWidth + 20;
            document.getElementById('teamPrev').onclick = () => view.scrollBy({ left: -step(), behavior: 'smooth' });
            document.getElementById('teamNext').onclick = () => view.scrollBy({ left: step(), behavior: 'smooth' });
            view.addEventListener('scroll', () => {
                const idx = Math.round(view.scrollLeft / step());
                document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx));
            });
        }
    };

    // ==========================================
    // 3. ФОРМЫ (Бронь и Обратная связь)
    // ==========================================
    const initModalsAndForms = () => {
        // Открытие модальных окон и сброс состояния форм
        document.querySelectorAll('[data-modal]').forEach(el => {
            el.addEventListener('click', (e) => { 
                e.preventDefault(); 
                const modalId = el.dataset.modal;

                // Возвращаем форму обратной связи в исходное состояние при открытии
                if (modalId === 'feedbackModal') {
                    const fbContainer = document.getElementById('fbContainer');
                    const fbResult = document.getElementById('fbResult');
                    if (fbContainer && fbResult) {
                        fbContainer.style.display = 'block';
                        fbResult.style.display = 'none';
                    }
                }

                // Возвращаем форму бронирования в исходное состояние при открытии
                if (modalId === 'resModal') {
                    const resContainer = document.getElementById('resFormContainer');
                    const resResult = document.getElementById('resModalResult');
                    if (resContainer && resResult) {
                        resContainer.style.display = 'block';
                        resResult.style.display = 'none';
                    }
                }

                window.openModal(modalId); 
            });
        });

        // Закрытие модальных окон
        document.querySelectorAll('.modal-overlay').forEach(m => {
            m.addEventListener('click', (e) => { 
                if (e.target === m || e.target.classList.contains('modal-close-x')) window.closeModal(m); 
            });
        });

        // Бронирование (с маской телефона)
        document.querySelectorAll('.js-booking-form').forEach(form => {
            
            // 1. Находим поле телефона внутри текущей формы
            const phoneInput = form.querySelector('input[name="phone"]');
            
            if (phoneInput) {
                // Вешаем красивую маску +7 на каждое поле
                phoneInput.addEventListener('input', (e) => {
                    let val = e.target.value.replace(/\D/g, ''); 
                    if (val) {
                        if (val[0] === '7' || val[0] === '8') val = val.substring(1);
                        let f = '+7';
                        if (val.length > 0) f += ' (' + val.substring(0, 3);
                        if (val.length >= 4) f += ') ' + val.substring(3, 6);
                        if (val.length >= 7) f += '-' + val.substring(6, 8);
                        if (val.length >= 9) f += '-' + val.substring(8, 10);
                        e.target.value = f;
                    } else e.target.value = '';
                });
            }

            // 2. Отправка формы бронирования
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Проверяем, чтобы номер был введен до самого конца (18 символов)
                if (phoneInput && phoneInput.value.length > 0 && phoneInput.value.length < 18) {
                    alert('Пожалуйста, введите номер телефона полностью.');
                    return;
                }

                const res = await apiFetch('/api/reserve', 'POST', getFormData(form));
                
                if (res.ok) {
                    form.reset(); 
                    
                    // Если отправляли из модалки — форма внутри модалки прячется, текст появляется
                    if (form.id === 'resModalForm') {
                        document.getElementById('resFormContainer').style.display = 'none';
                        document.getElementById('resModalResult').style.display = 'block';
                    } 
                    // Если отправляли со страницы — открываем модалку и показываем текст успеха в ней!
                    else if (form.id === 'pageBookingForm') {
                        window.openModal('resModal');
                        document.getElementById('resFormContainer').style.display = 'none';
                        document.getElementById('resModalResult').style.display = 'block';
                    }
                } else {
                    alert('Ошибка: ' + res.data.message);
                }
            });
        });

        // Обратная связь
        const fbForm = document.getElementById('fbForm');
        if (fbForm) {
            const [fbName, fbPhone, fbQuestion, fbBtn, fbPolicy] = ['fbName', 'fbPhone', 'fbQuestion', 'fbBtn', 'fbPolicy'].map(id => document.getElementById(id));
            
            fbPhone.addEventListener('input', (e) => {
                let val = e.target.value.replace(/\D/g, ''); 
                if (val) {
                    if (val[0] === '7' || val[0] === '8') val = val.substring(1);
                    let f = '+7';
                    if (val.length > 0) f += ' (' + val.substring(0, 3);
                    if (val.length >= 4) f += ') ' + val.substring(3, 6);
                    if (val.length >= 7) f += '-' + val.substring(6, 8);
                    if (val.length >= 9) f += '-' + val.substring(8, 10);
                    e.target.value = f;
                } else e.target.value = '';
            });

            const validate = () => {
                fbName.value = fbName.value.replace(/[^a-zA-Zа-яА-ЯёЁ\s]/g, '');
                fbBtn.disabled = !(fbName.value.trim() && fbPhone.value.length === 18 && fbQuestion.value.trim() && fbPolicy.checked);
            };
            fbForm.addEventListener('input', validate);
            fbForm.addEventListener('change', validate);
            
            fbForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const payload = { name: fbName.value.trim(), phone: fbPhone.value.trim(), question: fbQuestion.value.trim() };
                const res = await apiFetch('/api/feedback', 'POST', payload);
                if (res.ok) {
                    document.getElementById('fbContainer').style.display = 'none';
                    document.getElementById('fbResult').style.display = 'block';
                    fbForm.reset(); fbBtn.disabled = true; 
                } else alert('Ошибка: ' + res.data.message);
            });
        }
    };

    // ==========================================
    // 4. АВТОРИЗАЦИЯ И ЛИЧНЫЙ КАБИНЕТ
    // ==========================================
    const initAuth = () => {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;

        const [loginSec, regSec, cabSec] = ['loginSection', 'registerSection', 'cabinetSection'].map(id => document.getElementById(id));
        const switchScreen = (showSec, hideSec) => { hideSec.style.display = 'none'; showSec.style.display = 'block'; };

        document.getElementById('showRegisterBtn').onclick = (e) => { e.preventDefault(); switchScreen(regSec, loginSec); };
        document.getElementById('showLoginBtn').onclick = (e) => { e.preventDefault(); switchScreen(loginSec, regSec); };

        const checkSession = async () => {
            const res = await apiFetch('/api/check-auth');
            if (res.ok && res.data.loggedIn) {
                switchScreen(cabSec, loginSec); regSec.style.display = 'none';
                document.getElementById('cabUsername').textContent = res.data.user.login;
                document.getElementById('cabPoints').textContent = res.data.user.bonus_points;
            }
        };
        checkSession();

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const res = await apiFetch('/api/login', 'POST', getFormData(loginForm));
            if (res.ok) {
                switchScreen(cabSec, loginSec);
                document.getElementById('cabUsername').textContent = res.data.user.login;
                document.getElementById('cabPoints').textContent = res.data.user.bonus_points;
            } else {
                showMessage('loginResult', res.data.message, false);
                document.getElementById('showRegisterBtn').style.display = 'inline-block';
            }
        });

        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const res = await apiFetch('/api/register', 'POST', getFormData(e.target));
            showMessage('registerResult', res.data.message, res.ok);
            if(res.ok) e.target.reset();
        });

        document.getElementById('logoutBtn')?.addEventListener('click', async () => {
            await apiFetch('/api/logout', 'POST');
            switchScreen(loginSec, cabSec);
            loginForm.reset(); document.getElementById('loginResult').textContent = '';
        });
    };

    // ==========================================
    // 5. COOKIES ПЛАШКА
    // ==========================================
    const initCookies = () => {
        const banner = document.getElementById('cookieBanner');
        const btn = document.getElementById('acceptCookiesBtn');
        if (!banner || !btn) return;
        if (!localStorage.getItem('cookiesAccepted')) setTimeout(() => banner.classList.add('show'), 500);
        btn.addEventListener('click', () => { banner.classList.remove('show'); localStorage.setItem('cookiesAccepted', 'true'); });
    };

    // ==========================================
    // 6. АДМИН-ПАНЕЛЬ
    // ==========================================
    const initAdmin = async () => {
        const adminPanel = document.getElementById('adminPanel');
        if (!adminPanel) return;

        const resAuth = await apiFetch('/api/check-auth');
        if (resAuth.ok && resAuth.data.loggedIn && resAuth.data.user.login === 'admin') {
            document.getElementById('accessDenied').style.display = 'none';
            adminPanel.style.display = 'block';
        } else return;

        window.addMenuItem = (d = {title: '', price: '', img: '', desc: ''}) => {
            document.getElementById('menuContainer').insertAdjacentHTML('beforeend', `
                <div class="dynamic-item menu-item-node">
                    <button class="btn-remove" onclick="this.parentElement.remove()">Удалить</button>
                    <input type="text" placeholder="Название" class="m-title" value="${d.title}">
                    <input type="text" placeholder="Цена" class="m-price" value="${d.price}">
                    <input type="text" placeholder="Ссылка на картинку" class="m-img" value="${d.img}" style="grid-column: span 2;">
                    <textarea placeholder="Описание" class="m-desc">${d.desc}</textarea>
                </div>
            `);
        };

        window.addTeamItem = (d = {name: '', role: '', year: '', img: ''}) => {
            document.getElementById('teamContainer').insertAdjacentHTML('beforeend', `
                <div class="dynamic-item team-item-node">
                    <button class="btn-remove" onclick="this.parentElement.remove()">Удалить</button>
                    <input type="text" placeholder="Имя" class="t-name" value="${d.name}">
                    <input type="text" placeholder="Должность" class="t-role" value="${d.role}">
                    <input type="text" placeholder="Год" class="t-year" value="${d.year}">
                    <input type="text" placeholder="Ссылка на фото" class="t-img" value="${d.img}">
                </div>
            `);
        };

        const resContent = await apiFetch('/api/content');
        if (resContent.ok) {
            document.getElementById('heroTitleInput').value = resContent.data.hero_title;
            document.getElementById('heroDescInput').value = resContent.data.hero_desc;
            document.getElementById('menuContainer').innerHTML = ''; document.getElementById('teamContainer').innerHTML = '';
            JSON.parse(resContent.data.menu_data).forEach(i => window.addMenuItem(i));
            JSON.parse(resContent.data.team_data).forEach(i => window.addTeamItem(i));
        }

        window.saveContent = async () => {
            const btn = document.querySelector('button[onclick="saveContent()"]');
            btn.textContent = 'Сохранение...';
            const payload = {
                hero_title: document.getElementById('heroTitleInput').value,
                hero_desc: document.getElementById('heroDescInput').value,
                menu_data: Array.from(document.querySelectorAll('.menu-item-node')).map(n => ({ title: n.querySelector('.m-title').value, price: n.querySelector('.m-price').value, img: n.querySelector('.m-img').value, desc: n.querySelector('.m-desc').value })),
                team_data: Array.from(document.querySelectorAll('.team-item-node')).map(n => ({ name: n.querySelector('.t-name').value, role: n.querySelector('.t-role').value, year: n.querySelector('.t-year').value, img: n.querySelector('.t-img').value }))
            };
            const res = await apiFetch('/api/content', 'POST', payload);
            showMessage('saveResult', res.ok ? 'Изменения сохранены! Перейдите на главную.' : 'Ошибка при сохранении.', res.ok);
            btn.textContent = '💾 Сохранить все изменения';
        };
    };

    // Запускаем всё
    initUI(); initContent(); initModalsAndForms(); initAuth(); initCookies(); initAdmin();
});