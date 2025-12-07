// Головний клас CRUD системи з JSON користувачами
class CoffeeShopCRUD {
  constructor() {
    this.users = [];
    this.products = JSON.parse(localStorage.getItem('ucoffee_products')) || this.getDefaultProducts();
    this.orders = JSON.parse(localStorage.getItem('ucoffee_orders')) || [];
    this.currentUser = JSON.parse(localStorage.getItem('ucoffee_currentUser')) || null;
    
    this.init();
  }
  
  async init() {
    await this.loadUsersFromJSON();
    this.setupEventListeners();
    this.updateUI();
    this.renderAdminProducts();
    this.initSliders();
    this.initCart();
  }
  
  // Завантаження користувачів з JSON файлу
  async loadUsersFromJSON() {
    try {
      const response = await fetch('users.json');
      if (!response.ok) {
        throw new Error('Не вдалося завантажити users.json');
      }
      const data = await response.json();
      this.users = data.users;
      
      // Додаємо користувачів до localStorage для сумісності
      localStorage.setItem('ucoffee_users', JSON.stringify(this.users));
      
    } catch (error) {
      console.error('Помилка завантаження users.json:', error);
      
      // Резервний варіант - використовуємо localStorage
      const storedUsers = JSON.parse(localStorage.getItem('ucoffee_users'));
      if (storedUsers && storedUsers.length > 0) {
        this.users = storedUsers;
      } else {
        // Створюємо тестових користувачів
        this.createDefaultUsers();
      }
    }
  }
  
  createDefaultUsers() {
    this.users = [
      {
        id: 1,
        name: 'Адміністратор',
        email: 'admin@ucoffee.com',
        password: 'admin123',
        role: 'admin',
        registrationDate: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Тестовий Користувач',
        email: 'user@ucoffee.com',
        password: 'user123',
        role: 'user',
        registrationDate: new Date().toISOString()
      }
    ];
    
    localStorage.setItem('ucoffee_users', JSON.stringify(this.users));
  }
  
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
    
    // Адмін панель - кнопки робимо неактивними
    document.querySelector('.add-product-btn')?.addEventListener('click', () => {
      this.showNotification('Функціонал додавання товару тимчасово недоступний', 'info');
    });
    
    // Профіль
    document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());
    document.getElementById('admin-btn').addEventListener('click', () => this.openModal('admin-modal'));
    
    // Закриття модальних вікон
    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
          modal.classList.remove('active');
        }
      });
    });
    
    // Клік по затемненій області
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
    
    // Перевірка паролів при реєстрації в реальному часі
    const confirmPasswordInput = document.getElementById('register-confirm-password');
    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', (e) => {
        const password = document.getElementById('register-password').value;
        const confirmPassword = e.target.value;
        
        if (confirmPassword && password !== confirmPassword) {
          e.target.style.borderColor = '#ff2f2f';
        } else {
          e.target.style.borderColor = '#51443E';
        }
      });
    }
  }
  
  // Авторизація
  handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    const user = this.users.find(u => u.email === email && u.password === password);
    
    if (user) {
      this.currentUser = user;
      localStorage.setItem('ucoffee_currentUser', JSON.stringify(user));
      this.closeModal('login-modal');
      this.updateUI();
      this.showNotification('Успішний вхід!', 'success');
      e.target.reset();
    } else {
      this.showNotification('Невірний email або пароль', 'error');
    }
  }
  
  handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userData = Object.fromEntries(formData);
    
    if (userData.password !== userData['confirm-password']) {
      this.showNotification('Паролі не співпадають', 'error');
      return;
    }
    
    if (this.users.find(u => u.email === userData.email)) {
      this.showNotification('Користувач з таким email вже існує', 'error');
      return;
    }
    
    const newUser = {
      id: Date.now(),
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: 'user',
      registrationDate: new Date().toISOString()
    };
    
    // Додаємо нового користувача до масиву
    this.users.push(newUser);
    
    // Оновлюємо localStorage
    localStorage.setItem('ucoffee_users', JSON.stringify(this.users));
    
    this.currentUser = newUser;
    localStorage.setItem('ucoffee_currentUser', JSON.stringify(newUser));
    
    this.closeModal('register-modal');
    this.updateUI();
    this.showNotification('Реєстрація успішна!', 'success');
    e.target.reset();
  }
  
  handleLogout() {
    this.currentUser = null;
    localStorage.removeItem('ucoffee_currentUser');
    this.closeModal('profile-modal');
    this.updateUI();
    this.showNotification('Ви вийшли з акаунту', 'info');
  }
  
  // CRUD для товарів - робимо кнопки неактивними
  openProductForm(product = null) {
    this.showNotification('Функціонал редагування товару тимчасово недоступний', 'info');
  }
  
  handleProductSave(e) {
    e.preventDefault();
    this.showNotification('Функціонал збереження товару тимчасово недоступний', 'info');
  }
  
  editProduct(productId) {
    this.showNotification('Функціонал редагування товару тимчасово недоступний', 'info');
  }
  
  deleteProduct(productId) {
    this.showNotification('Функціонал видалення товару тимчасово недоступний', 'info');
  }
  
  // Рендер адмін панелі з неактивними кнопками
  renderAdminProducts() {
    const container = document.getElementById('admin-products-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    this.products.forEach(product => {
      const productElement = document.createElement('div');
      productElement.className = 'admin-item';
      productElement.innerHTML = `
        <div class="admin-item-info">
          <h4>${product.title}</h4>
          <p><strong>Ціна:</strong> ${product.price} грн</p>
          <p>${product.description.substring(0, 100)}...</p>
        </div>
        <div class="admin-item-actions">
          <button class="crud-btn edit-btn disabled" onclick="crud.editProduct(${product.id})" disabled>Редагувати</button>
          <button class="crud-btn delete-btn disabled" onclick="crud.deleteProduct(${product.id})" disabled>Видалити</button>
        </div>
      `;
      container.appendChild(productElement);
    });
  }
  
  // UI оновлення
  updateUI() {
    this.updateHeader();
    this.updatePanels();
  }
  
  updateHeader() {
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    
    // Створюємо меню користувача, якщо його немає
    if (!userMenu) {
      const newUserMenu = document.createElement('div');
      newUserMenu.className = 'user-menu';
      newUserMenu.style.display = 'none';
      authButtons.parentNode.insertBefore(newUserMenu, authButtons);
    }
    
    if (this.currentUser) {
      // Десктоп
      authButtons.style.display = 'none';
      document.querySelector('.user-menu').style.display = 'flex';
      document.querySelector('.user-menu').innerHTML = `
        <div class="user-avatar" onclick="crud.openModal('profile-modal')">
          ${this.currentUser.name.charAt(0).toUpperCase()}
        </div>
      `;
      
      // Мобільне меню
      const mobileAuth = document.querySelector('.mobile-auth-buttons');
      if (mobileAuth) {
        mobileAuth.style.display = 'none';
      }
      
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
      // Десктоп
      authButtons.style.display = 'flex';
      if (document.querySelector('.user-menu')) {
        document.querySelector('.user-menu').style.display = 'none';
      }
      
      // Мобільне меню
      const mobileAuth = document.querySelector('.mobile-auth-buttons');
      if (mobileAuth) {
        mobileAuth.style.display = 'flex';
      }
      
      const mobileUserMenu = document.querySelector('.mobile-user-menu');
      if (mobileUserMenu) {
        mobileUserMenu.remove();
      }
    }
    
    // Оновлюємо профіль
    if (this.currentUser) {
      document.getElementById('profile-name').textContent = this.currentUser.name;
      document.getElementById('profile-email').textContent = this.currentUser.email;
      
      // Показуємо кнопку адміна для адміністраторів
      const adminBtn = document.getElementById('admin-btn');
      if (adminBtn) {
        adminBtn.style.display = this.currentUser.role === 'admin' ? 'block' : 'none';
      }
    }
  }
  
  updatePanels() {
    const userPanel = document.querySelector('.user-panel');
    const adminPanel = document.querySelector('.admin-panel');
    
    // Видаляємо старі панелі
    if (userPanel) userPanel.remove();
    if (adminPanel) adminPanel.remove();
    
    // Створюємо нові панелі відповідно до ролі
    if (this.currentUser) {
      if (this.currentUser.role === 'admin') {
        this.createAdminPanel();
      } else {
        this.createUserPanel();
      }
    }
  }
  
  createUserPanel() {
    const panel = document.createElement('section');
    panel.className = 'user-panel';
    panel.innerHTML = `
      <h3>Особистий кабінет</h3>
      <div class="user-info">
        <p><strong>Ім'я:</strong> ${this.currentUser.name}</p>
        <p><strong>Email:</strong> ${this.currentUser.email}</p>
        <p><strong>Роль:</strong> <span class="user-role-indicator role-user">Користувач</span></p>
        <p><strong>Дата реєстрації:</strong> ${new Date(this.currentUser.registrationDate).toLocaleDateString('uk-UA')}</p>
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
        <p style="color: #ffb366; font-style: italic;">Функціонал CRUD тимчасово недоступний</p>
      </div>
      
      <div class="admin-sections">
        <div class="admin-section">
          <div class="admin-header">
            <h4 style="color: #ffb366; margin: 0;">Управління товарами</h4>
            <button class="add-btn disabled" disabled>Додати товар</button>
          </div>
          <div class="products-list" id="admin-products-list">
          </div>
        </div>
      </div>
    `;
    
    const catalogSection = document.querySelector('#catalog');
    document.querySelector('main').insertBefore(panel, catalogSection);
    
    this.renderAdminProducts();
  }
  
  // Допоміжні методи
  openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
  }
  
  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  }
  
  showNotification(message, type = 'info') {
    // Видаляємо старі сповіщення
    const oldNotification = document.querySelector('.notification');
    if (oldNotification) {
      oldNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Автоматичне видалення через 3 секунди
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
  
  // Ініціалізація слайдерів
  initSliders() {
    // Банер-слайдер
    const images = document.querySelectorAll('.banner-slider img');
    let currentSlide = 0;
    
    if (images.length > 0) {
      setInterval(() => {
        images[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % images.length;
        images[currentSlide].classList.add('active');
      }, 4000);
    }
    
    // Плавна навігація
    document.querySelectorAll('nav a').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href.startsWith('#')) {
          e.preventDefault();
          const targetSection = document.querySelector(href);
          if (targetSection) {
            targetSection.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        }
      });
    });
    
    // Кнопка CTA
    document.querySelector('.cta-button')?.addEventListener('click', function() {
      document.querySelector('#catalog').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }
  
  // Кошик
  initCart() {
    let cart = [];
    let currentCard = null;
    
    // Деталі товару
    document.querySelectorAll('.details-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const card = this.closest('.card');
        currentCard = card;
        document.getElementById('modal-title').textContent = card.dataset.title;
        document.getElementById('modal-desc').innerHTML = card.dataset.desc.replace(/\n/g, '<br>');
        document.getElementById('modal-price').textContent = card.dataset.price;
        document.getElementById('modal').classList.add('active');
      });
    });
    
    // Додавання в кошик
    document.getElementById('add-to-cart-btn').addEventListener('click', function() {
      if (currentCard) {
        const title = currentCard.dataset.title;
        const price = currentCard.dataset.price;
        cart.push({ title, price });
        crud.showNotification('Товар додано у кошик!', 'success');
        document.getElementById('modal').classList.remove('active');
      }
    });
    
    // Відкриття кошика
    document.querySelector('.cart-icon').addEventListener('click', function() {
      const cartModal = document.getElementById('cart-modal');
      const cartItems = document.getElementById('cart-items');
      cartItems.innerHTML = cart.length
        ? cart.map(item => `<li>${item.title} — ${item.price}</li>`).join('')
        : '<li>Кошик порожній</li>';
      cartModal.classList.add('active');
    });
    
    // Оформлення замовлення
    document.querySelector('.order-btn').addEventListener('click', function() {
      document.getElementById('cart-modal').classList.remove('active');
      document.getElementById('order-modal').classList.add('active');
    });
    
    // Відправка замовлення
    document.getElementById('order-form').addEventListener('submit', function(e) {
      e.preventDefault();
      crud.showNotification('Замовлення успішно оформлено!', 'success');
      cart = [];
      document.getElementById('order-modal').classList.remove('active');
      this.reset();
    });
  }
}

// Бургер-меню (залишається без змін)
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
      if (e.target === this.mobileMenu) {
        this.closeMenu();
      }
    });
    
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024 && this.isOpen) {
        this.closeMenu();
      }
    });
  }
  
  toggleMenu() {
    if (this.isOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
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

// Ініціалізація
const burgerMenu = new BurgerMenu();
const crud = new CoffeeShopCRUD();

// Додаємо функції в глобальну область видимості
window.crud = crud;
window.burgerMenu = burgerMenu;