// ===== Головний клас CRUD системи =====
class CoffeeShopCRUD {
  constructor() {
    this.users = [];
    this.products = JSON.parse(localStorage.getItem('ucoffee_products')) || this.getDefaultProducts();
    this.orders = JSON.parse(localStorage.getItem('ucoffee_orders')) || [];

    // завжди стартуємо без логіну
    this.currentUser = null;

    this.adminUsers = [];
    this.adminOrders = [];

    this.init();
  }

  // ===== Стартова ініціалізація =====
  async init() {
    this.setupEventListeners();
    await this.loadProductsFromAPI();
    this.updateUI();
    this.renderCatalogProducts();
    this.renderAdminProducts();
    this.initAdminTabs();
    this.initSliders();
    this.initCart();
  }

  // ===== Дефолтні товари (fallback) =====
  getDefaultProducts() {
    return [
      {
        id: 1,
        title: "Gemini Crema Ніжна",
        price: 699,
        description: "М'яка та ніжна кава для приємних ранків. Склад: 100% арабіка. Смак: делікатний, вершковий, з легкою солодкістю. Обсмажування: середнє. Рекомендації: ідеально для еспресо та капучино.",
        image: "photos/image_processing20240731-1-uhjjww-removebg-preview.png"
      },
      {
        id: 2,
        title: "Gemini Ethiopia Sidamo",
        price: 949,
        description: "Яскравий смак із фруктовими нотками. Склад: 100% арабіка, Ефіопія Сідамо. Смак: цитрусові, ягідні та квіткові відтінки. Обсмажування: середнє. Рекомендації: для альтернативних способів заварювання.",
        image: "photos/image_processing20240801-40-c8pt9c-removebg-preview.png"
      },
      {
        id: 3,
        title: "Espaco Колумбія Ексельсо",
        price: 1222,
        description: "Аромат какао та приємний мигдальний відтінок смаку з легкою цитрусовою кислинкою. Склад: 100% арабіка, Колумбія. Смак: какао, мигдаль, цитруси. Обсмажування: середнє. Рекомендації: для фільтр-кави та еспресо.",
        image: "photos/image_processing20240731-1-mes99d-removebg-preview.png"
      }
    ];
  }

  // ===== Завантаження товарів з API =====
  async loadProductsFromAPI() {
    try {
      const response = await fetch('api/products.php');
      if (!response.ok) throw new Error('Не вдалося завантажити товари');
      const data = await response.json();
      this.products = data;
    } catch (error) {
      console.error('Помилка завантаження товарів:', error);
      if (!this.products || this.products.length === 0) {
        this.products = this.getDefaultProducts();
      }
    }
  }

  // ===== Рендер каталогу на головній =====
  renderCatalogProducts() {
    const container = document.querySelector('#catalog .container');
    if (!container) return;

    container.innerHTML = '';

    if (!this.products || !this.products.length) {
      container.innerHTML = '<p>Поки немає товарів</p>';
      return;
    }

    this.products.forEach(product => {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.title = product.title;
      card.dataset.price = product.price + ' грн';
      card.dataset.desc = product.description || '';

      const imageSrc =
        product.image && product.image.trim()
          ? product.image
          : 'photos/nathan-dumlao-XOhI_kW_TaM-unsplash.jpg';

      card.innerHTML = `
        <img src="${imageSrc}" alt="${product.title}">
        <h3>${product.title}</h3>
        <p>${product.price}грн</p>
        <div class="card-overlay">
          <button class="details-btn overlay-text">Детальніше</button>
        </div>
      `;

      container.appendChild(card);
    });
  }

  // ===== Таби в адмінці (товари / замовлення / користувачі) =====
  initAdminTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    if (!tabButtons.length) return;

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab; // 'products', 'orders', 'users'

        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        tabContents.forEach(c => c.classList.remove('active'));
        const currentTab = document.getElementById(`${tab}-tab`);
        if (currentTab) currentTab.classList.add('active');

        if (tab === 'products') {
          this.renderAdminProducts();
        } else if (tab === 'orders') {
          this.loadAdminOrders();
        } else if (tab === 'users') {
          this.loadAdminUsers();
        }
      });
    });
  }

  // ===== Адмін: користувачі =====
  async loadAdminUsers() {
    try {
      const response = await fetch('api/users.php'); // GET
      const data = await response.json();

      if (!response.ok) {
        this.showNotification(data.error || 'Помилка завантаження користувачів', 'error');
        return;
      }

      this.adminUsers = data;
      this.renderAdminUsers();
    } catch (error) {
      console.error(error);
      this.showNotification('Сервер недоступний при завантаженні користувачів', 'error');
    }
  }

  renderAdminUsers() {
    const container = document.getElementById('admin-users-list');
    if (!container) return;

    container.innerHTML = '';

    const users = this.adminUsers || [];
    if (!users.length) {
      container.innerHTML = '<p>Користувачів поки немає</p>';
      return;
    }

    users.forEach(user => {
      const name  = user.full_name || user.name || '—';
      const email = user.email || '—';
      const role  = (user.role || 'user').toLowerCase();
      const reg   = user.registration_date || user.registrationDate || null;
      const regStr = reg ? new Date(reg).toLocaleDateString('uk-UA') : '—';

      const item = document.createElement('div');
      item.className = 'admin-user-item';
      item.innerHTML = `
        <div class="admin-user-main">
          <p><strong>${name}</strong> (${email})</p>
          <p>Роль: <span class="user-role-indicator role-${role}">${role}</span></p>
        </div>
        <div class="admin-user-extra">
          <p>Дата реєстрації: ${regStr}</p>
        </div>
      `;
      container.appendChild(item);
    });
  }

  // ===== Адмін: замовлення =====
  async loadAdminOrders() {
    try {
      const response = await fetch('api/orders.php'); // GET
      const data = await response.json();

      if (!response.ok) {
        this.showNotification(data.error || 'Помилка завантаження замовлень', 'error');
        return;
      }

      this.adminOrders = data;
      this.renderAdminOrders();
    } catch (error) {
      console.error(error);
      this.showNotification('Сервер недоступний при завантаженні замовлень', 'error');
    }
  }

  renderAdminOrders() {
    const container = document.getElementById('admin-orders-list');
    if (!container) return;

    container.innerHTML = '';

    const orders = this.adminOrders || [];
    if (!orders.length) {
      container.innerHTML = '<p>Замовлень поки немає</p>';
      return;
    }

    orders.forEach(order => {
      const id       = order.id || '—';
      const name     = order.customer_name || order.name || '—';
      const email    = order.email || '—';
      const phone    = order.phone || '—';
      const address  = order.address || '—';
      const status   = order.status || 'new';
      const created  = order.created_at || order.createdAt || null;
      const createdStr = created ? new Date(created).toLocaleString('uk-UA') : '—';
      const total    = order.total_amount || order.total || null;

      const item = document.createElement('div');
      item.className = 'admin-order-item';
      item.innerHTML = `
        <div class="admin-order-header">
          <p><strong>Замовлення #${id}</strong></p>
          <p>Статус: <span class="order-status status-${status}">${status}</span></p>
        </div>
        <div class="admin-order-body">
          <p>Клієнт: <strong>${name}</strong></p>
          <p>Email: ${email}</p>
          <p>Телефон: ${phone}</p>
          <p>Адреса: ${address}</p>
          <p>Створено: ${createdStr}</p>
          ${total ? `<p>Сума: <strong>${total} грн</strong></p>` : ''}
        </div>
      `;
      container.appendChild(item);
    });
  }

  // ===== Слухачі подій =====
  setupEventListeners() {
    // Авторизація
    document.querySelector('.login-btn').addEventListener('click', () => this.openModal('login-modal'));
    document.querySelector('.register-btn').addEventListener('click', () => this.openModal('register-modal'));

    // Мобільна авторизація
    document.querySelector('.mobile-login-btn').addEventListener('click', () => {
      burgerMenu.closeMenu();
      this.openModal('login-modal');
    });

    document.querySelector('.mobile-register-btn').addEventListener('click', () => {
      burgerMenu.closeMenu();
      this.openModal('register-modal');
    });

    // Форми
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('register-form').addEventListener('submit', (e) => this.handleRegister(e));
    document.getElementById('product-form').addEventListener('submit', (e) => this.handleProductSave(e));

    // Перемикачі між формами
    document.querySelector('.switch-to-register').addEventListener('click', (e) => {
      e.preventDefault();
      this.closeModal('login-modal');
      this.openModal('register-modal');
    });

    document.querySelector('.switch-to-login').addEventListener('click', (e) => {
      e.preventDefault();
      this.closeModal('register-modal');
      this.openModal('login-modal');
    });

    // Кнопка додавання товару в адмінці
    document.querySelector('.add-product-btn')?.addEventListener('click', () => {
      this.openProductForm();
    });

    // Профіль
    document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
    document.getElementById('admin-btn').addEventListener('click', () => this.openModal('admin-modal'));

    // Закриття модалок (хрестик)
    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) modal.classList.remove('active');
      });
    });

    // Закриття модалок по кліку на фон
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    });

    // live-перевірка пароля при реєстрації
    const confirmPasswordInput = document.getElementById('register-confirm-password');
    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', (e) => {
        const password = document.getElementById('register-password').value;
        const confirmPassword = e.target.value;
        e.target.style.borderColor = (confirmPassword && password !== confirmPassword) ? '#ff2f2f' : '#51443E';
      });
    }
  }

  // ===== Авторизація =====
  async handleLogin(e) {
    e.preventDefault();
    const form = new FormData(e.target);

    const payload = {
      email: form.get('email'),
      password: form.get('password')
    };

    try {
      const response = await fetch('api/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log('login result:', result);

      if (!response.ok) {
        this.showNotification(result.error || 'Невірний email або пароль', 'error');
        return;
      }

      this.currentUser = result;
      this.closeModal('login-modal');
      this.updateUI();
      this.showNotification('Логін успішний!', 'success');
    } catch (err) {
      console.error(err);
      this.showNotification('Сервер недоступний', 'error');
    }
  }

  async handleRegister(e) {
    e.preventDefault();

    const form = e.target;

    const nameInput    = form.querySelector('[name="name"]');
    const emailInput   = form.querySelector('[name="email"]');
    const passInput    = form.querySelector('[name="password"]');
    const confirmInput = form.querySelector('[name="confirm-password"]');

    const name     = nameInput ? nameInput.value.trim() : '';
    const email    = emailInput ? emailInput.value.trim() : '';
    const password = passInput ? passInput.value : '';
    const confirm  = confirmInput ? confirmInput.value : '';

    if (!name || !email || !password || !confirm) {
      this.showNotification('Заповніть всі поля', 'error');
      return;
    }

    if (password !== confirm) {
      this.showNotification('Паролі не співпадають', 'error');
      return;
    }

    const payload = { name, email, password };

    try {
      const response = await fetch('api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        this.showNotification(result.error || 'Помилка при реєстрації', 'error');
        return;
      }

      this.currentUser = result;
      this.updateUI();
      this.closeModal('register-modal');
      this.showNotification('Реєстрація успішна!', 'success');
      form.reset();
    } catch (error) {
      console.error(error);
      this.showNotification('Помилка з’єднання з сервером', 'error');
    }
  }

  handleLogout() {
    this.currentUser = null;
    this.closeModal('profile-modal');
    this.updateUI();
    this.showNotification('Ви вийшли з акаунту', 'info');
  }

  // ===== CRUD ТОВАРІВ =====
  openProductForm(product = null) {
    const modal = document.getElementById('product-form-modal');

    const idInput    = document.getElementById('product-id');
    const titleInput = document.getElementById('product-title');
    const descInput  = document.getElementById('product-desc');
    const priceInput = document.getElementById('product-price');
    const imageInput = document.getElementById('product-image');
    const formTitle  = document.getElementById('product-form-title');

    if (product) {
      formTitle.textContent = 'Редагувати товар';
      idInput.value = product.id;
      titleInput.value = product.title;
      descInput.value = product.description;
      priceInput.value = product.price;
      imageInput.value = product.image || '';
    } else {
      formTitle.textContent = 'Додати товар';
      idInput.value = '';
      titleInput.value = '';
      descInput.value = '';
      priceInput.value = '';
      imageInput.value = '';
    }

    modal.classList.add('active');
  }

  async handleProductSave(e) {
    e.preventDefault();

    const form  = e.target;
    const id    = document.getElementById('product-id').value;
    const title = document.getElementById('product-title').value.trim();
    const desc  = document.getElementById('product-desc').value.trim();
    const price = parseFloat(document.getElementById('product-price').value);
    const image = document.getElementById('product-image').value.trim();

    if (!title || !desc || !price || price <= 0) {
      this.showNotification('Заповніть назву, опис та коректну ціну', 'error');
      return;
    }

    const payload = { title, description: desc, price, image };

    try {
      let response;
      if (id) {
        response = await fetch(`api/products.php?id=${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch('api/products.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const result = await response.json();

      if (!response.ok) {
        this.showNotification(result.error || 'Помилка збереження товару', 'error');
        return;
      }

      if (id) {
        const index = this.products.findIndex(p => p.id == id);
        if (index !== -1) this.products[index] = result;
      } else {
        this.products.unshift(result);
      }

      this.renderAdminProducts();
      this.renderCatalogProducts();

      document.getElementById('product-form-modal').classList.remove('active');
      form.reset();
      this.showNotification('Товар успішно збережено', 'success');
    } catch (error) {
      console.error(error);
      this.showNotification('Помилка з’єднання з сервером при збереженні товару', 'error');
    }
  }

  editProduct(productId) {
    const product = this.products.find(p => p.id == productId);
    if (!product) {
      this.showNotification('Товар не знайдено', 'error');
      return;
    }
    this.openProductForm(product);
  }

  async deleteProduct(productId) {
    if (!confirm('Ви впевнені, що хочете видалити цей товар?')) return;

    try {
      const response = await fetch(`api/products.php?id=${productId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok || result.success !== true) {
        this.showNotification(result.error || 'Помилка видалення товару', 'error');
        return;
      }

      this.products = this.products.filter(p => p.id != productId);
      this.renderAdminProducts();
      this.renderCatalogProducts();
      this.showNotification('Товар успішно видалено', 'success');
    } catch (error) {
      console.error(error);
      this.showNotification('Помилка з’єднання з сервером при видаленні', 'error');
    }
  }

  // ===== Рендер товарів в адмінці =====
  renderAdminProducts() {
    const container = document.getElementById('admin-products-list');
    if (!container) return;

    container.innerHTML = '';

    if (!this.products || !this.products.length) {
      container.innerHTML = '<p>Товарів поки немає</p>';
      return;
    }

    this.products.forEach(product => {
      const productElement = document.createElement('div');
      productElement.className = 'admin-item';
      productElement.innerHTML = `
        <div class="admin-item-info">
          <h4>${product.title}</h4>
          <p><strong>Ціна:</strong> ${product.price} грн</p>
          <p>${(product.description || '').substring(0, 100)}...</p>
        </div>
        <div class="admin-item-actions">
          <button class="crud-btn edit-btn" onclick="crud.editProduct(${product.id})">Редагувати</button>
          <button class="crud-btn delete-btn" onclick="crud.deleteProduct(${product.id})">Видалити</button>
        </div>
      `;
      container.appendChild(productElement);
    });
  }

  // ===== Оновлення UI =====
  updateUI() {
    this.updateHeader();
    this.updatePanels();
  }

  updateHeader() {
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu    = document.querySelector('.user-menu');

    if (!userMenu) {
      const newUserMenu = document.createElement('div');
      newUserMenu.className = 'user-menu';
      newUserMenu.style.display = 'none';
      authButtons.parentNode.insertBefore(newUserMenu, authButtons);
    }

    if (this.currentUser) {
      authButtons.style.display = 'none';
      document.querySelector('.user-menu').style.display = 'flex';
      document.querySelector('.user-menu').innerHTML = `
        <div class="user-avatar" onclick="crud.openModal('profile-modal')">
          ${this.currentUser.name.charAt(0).toUpperCase()}
        </div>
      `;

      const mobileAuth = document.querySelector('.mobile-auth-buttons');
      if (mobileAuth) mobileAuth.style.display = 'none';

      let mobileUserMenu = document.querySelector('.mobile-user-menu');
      if (!mobileUserMenu) {
        mobileUserMenu = document.createElement('div');
        mobileUserMenu.className = 'mobile-user-menu';
        document.querySelector('.mobile-nav').appendChild(mobileUserMenu);
      }
      mobileUserMenu.innerHTML = `
        <div class="user-avatar mobile-user-avatar" onclick="crud.openModal('profile-modal'); burgerMenu.closeMenu();">
          ${this.currentUser.name.charAt(0).toUpperCase()}
        </div>
        <p style="color: #fff; margin-top: 10px;">${this.currentUser.name}</p>
      `;
    } else {
      authButtons.style.display = 'flex';
      const um = document.querySelector('.user-menu');
      if (um) um.style.display = 'none';

      const mobileAuth = document.querySelector('.mobile-auth-buttons');
      if (mobileAuth) mobileAuth.style.display = 'flex';

      const mobileUserMenu = document.querySelector('.mobile-user-menu');
      if (mobileUserMenu) mobileUserMenu.remove();
    }

    if (this.currentUser) {
      document.getElementById('profile-name').textContent = this.currentUser.name;
      document.getElementById('profile-email').textContent = this.currentUser.email;

      const adminBtn = document.getElementById('admin-btn');
      if (adminBtn) {
        const role   = (this.currentUser.role || '').toLowerCase().trim();
        const isAdmin = role === 'admin' || this.currentUser.email === 'admin@ucoffee.com';
        adminBtn.style.display = isAdmin ? 'block' : 'none';
      }
    }
  }

  updatePanels() {
    const userPanel  = document.querySelector('.user-panel');
    const adminPanel = document.querySelector('.admin-panel');

    if (userPanel) userPanel.remove();
    if (adminPanel) adminPanel.remove();

    if (!this.currentUser) return;

    const role    = (this.currentUser.role || '').toLowerCase().trim();
    const isAdmin = role === 'admin' || this.currentUser.email === 'admin@ucoffee.com';

    if (isAdmin) this.createAdminPanel();
    else this.createUserPanel();
  }

  createUserPanel() {
    const regDate =
      this.currentUser.registrationDate || this.currentUser.registration_date;

    const panel = document.createElement('section');
    panel.className = 'user-panel';
    panel.innerHTML = `
      <h3>Особистий кабінет</h3>
      <div class="user-info">
        <p><strong>Ім'я:</strong> ${this.currentUser.name}</p>
        <p><strong>Email:</strong> ${this.currentUser.email}</p>
        <p><strong>Роль:</strong> 
          <span class="user-role-indicator role-user">Користувач</span>
        </p>
        <p><strong>Дата реєстрації:</strong> ${
          regDate ? new Date(regDate).toLocaleDateString('uk-UA') : '—'
        }</p>
      </div>
      <div class="user-actions">
        <h4 style="color: #ffb366; margin-bottom: 20px;">Мої замовлення</h4>
        <div id="user-orders">
          <p>У вас ще немає замовлень</p>
        </div>
      </div>
    `;

    const catalogSection = document.querySelector('#catalog');
    document.querySelector('main').insertBefore(panel, catalogSection);
  }

  createAdminPanel() {
    const panel = document.createElement('section');
    panel.className = 'admin-panel';
    panel.innerHTML = `
      <h3>Адміністративна панель</h3>
      <div class="admin-info">
        <p><strong>Адміністратор:</strong> ${this.currentUser.name}</p>
        <p><strong>Роль:</strong> <span class="user-role-indicator role-admin">Адміністратор</span></p>
        <p style="color: #ffb366; font-style: italic;">Управляйте товарами через адмін-панель</p>
      </div>
      <div class="admin-sections">
        <div class="admin-section">
          <div class="admin-header">
            <h4 style="color: #ffb366; margin: 0;">Управління товарами</h4>
            <button class="add-btn" onclick="crud.openProductForm()">Додати товар</button>
          </div>
          <div class="products-list" id="admin-products-list"></div>
        </div>
      </div>
    `;

    const catalogSection = document.querySelector('#catalog');
    document.querySelector('main').insertBefore(panel, catalogSection);

    this.renderAdminProducts();
  }

  // ===== Допоміжні =====
  openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
  }

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
  }

  showNotification(message, type = 'info') {
    const old = document.querySelector('.notification');
    if (old) old.remove();

    const n = document.createElement('div');
    n.className = `notification ${type}`;
    n.textContent = message;
    document.body.appendChild(n);

    setTimeout(() => n.remove(), 3000);
  }

  // ===== Слайдери, навігація =====
  initSliders() {
    const images = document.querySelectorAll('.banner-slider img');
    let currentSlide = 0;

    if (images.length > 0) {
      setInterval(() => {
        images[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % images.length;
        images[currentSlide].classList.add('active');
      }, 4000);
    }

    document.querySelectorAll('nav a').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const targetSection = document.querySelector(href);
          if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });

    document.querySelector('.cta-button')?.addEventListener('click', function () {
      document.querySelector('#catalog').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }

  // ===== Кошик та замовлення =====
  initCart() {
    let cart = [];
    let currentCard = null;

    // Делегування для кнопок "Детальніше" (щоб працювали і для динамічних карток)
    document.addEventListener('click', function (e) {
      const detailsBtn = e.target.closest('.details-btn');
      if (!detailsBtn) return;

      e.stopPropagation();
      const card = detailsBtn.closest('.card');
      if (!card) return;

      currentCard = card;
      document.getElementById('modal-title').textContent = card.dataset.title;
      document.getElementById('modal-desc').innerHTML =
        (card.dataset.desc || '').replace(/\n/g, '<br>');
      document.getElementById('modal-price').textContent = card.dataset.price;
      document.getElementById('modal').classList.add('active');
    });

    // Додавання в кошик
    document.getElementById('add-to-cart-btn').addEventListener('click', function () {
      if (currentCard) {
        const title = currentCard.dataset.title;
        const price = currentCard.dataset.price;
        cart.push({ title, price });
        crud.showNotification('Товар додано у кошик!', 'success');
        document.getElementById('modal').classList.remove('active');
      }
    });

    // Відкриття кошика
    document.querySelector('.cart-icon').addEventListener('click', function () {
      const cartModal = document.getElementById('cart-modal');
      const cartItems = document.getElementById('cart-items');
      cartItems.innerHTML = cart.length
        ? cart.map(item => `<li>${item.title} — ${item.price}</li>`).join('')
        : '<li>Кошик порожній</li>';
      cartModal.classList.add('active');
    });

    // Оформлення замовлення
    document.querySelector('.order-btn').addEventListener('click', function () {
      document.getElementById('cart-modal').classList.remove('active');
      document.getElementById('order-modal').classList.add('active');
    });

    // Відправка замовлення
    document.getElementById('order-form').addEventListener('submit', async function (e) {
      e.preventDefault();

      if (!cart.length) {
        crud.showNotification('Кошик порожній', 'error');
        return;
      }

      const formData = new FormData(this);

      const payload = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        address: formData.get('address'),
        items: cart.map(item => ({
          title: item.title,
          price: parseFloat(item.price),
          quantity: 1
        })),
        userId: crud.currentUser ? crud.currentUser.id : null
      };

      try {
        const response = await fetch('api/orders.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
          crud.showNotification(result.error || 'Помилка оформлення', 'error');
          return;
        }

        crud.showNotification('Замовлення успішно оформлено!', 'success');
        cart = [];
        this.reset();
        document.getElementById('order-modal').classList.remove('active');
      } catch (error) {
        crud.showNotification('Сервер не відповідає', 'error');
      }
    });
  }
}

// ===== Бургер-меню =====
class BurgerMenu {
  constructor() {
    this.burger = document.getElementById('burger-menu');
    this.mobileMenu = document.getElementById('mobile-menu');
    this.isOpen = false;

    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.burger.addEventListener('click', () => this.toggleMenu());

    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => this.closeMenu());
    });

    this.mobileMenu.addEventListener('click', (e) => {
      if (e.target === this.mobileMenu) this.closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024 && this.isOpen) this.closeMenu();
    });
  }

  toggleMenu() {
    this.isOpen ? this.closeMenu() : this.openMenu();
  }

  openMenu() {
    this.burger.classList.add('active');
    this.mobileMenu.classList.add('active');
    document.body.classList.add('menu-open');
    this.isOpen = true;
  }

  closeMenu() {
    this.burger.classList.remove('active');
    this.mobileMenu.classList.remove('active');
    document.body.classList.remove('menu-open');
    this.isOpen = false;
  }
}

// ===== Ініціалізація =====
const burgerMenu = new BurgerMenu();
const crud = new CoffeeShopCRUD();

window.crud = crud;
window.burgerMenu = burgerMenu;