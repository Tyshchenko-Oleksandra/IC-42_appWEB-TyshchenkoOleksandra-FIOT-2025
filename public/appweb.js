// Ucoffee frontend: робота з Node.js API + MySQL, чистий варіант

class CoffeeApp {
  constructor() {
    // Поточний користувач зберігається в localStorage (тіло юзера приходить з БД)
    this.currentUser =
      JSON.parse(localStorage.getItem("ucoffee_currentUser")) || null;

    this.products = [];
    this.cart = [];
    this.currentProduct = null;

    this.init();
  }

  async init() {
    this.setupAuthButtons();
    this.setupForms();
    this.setupModals();
    this.setupCart();
    this.setupAdminPanel();
    this.initSliders();
    this.initSmoothScroll();
    this.updateAuthUI();

    // Після ініціалізації завантажуємо товари з БД і малюємо каталог
    await this.loadProductsFromAPI();
  }

  saveCurrentUser() {
    localStorage.setItem(
      "ucoffee_currentUser",
      JSON.stringify(this.currentUser)
    );
  }

  // ======================
  //    ПРОДУКТИ: API + UI
  // ======================

  async loadProductsFromAPI() {
    const catalogContainer = document.querySelector("#catalog .container");

    if (catalogContainer) {
      catalogContainer.innerHTML = "<p>Завантаження товарів...</p>";
    }

    try {
      const res = await fetch("/api/products");
      const data = await res.json();

      if (!res.ok) {
        console.error("loadProductsFromAPI error:", data);
        if (catalogContainer) {
          catalogContainer.innerHTML = "<p>Помилка завантаження товарів</p>";
        }
        return;
      }

      this.products = data;
      this.renderCatalog();
      this.renderAdminProducts();
    } catch (err) {
      console.error("loadProductsFromAPI error:", err);
      if (catalogContainer) {
        catalogContainer.innerHTML =
          "<p>Помилка підключення до сервера</p>";
      }
    }
  }

  renderCatalog() {
    const catalogContainer = document.querySelector("#catalog .container");
    if (!catalogContainer) return;

    catalogContainer.innerHTML = "";

    if (!this.products || this.products.length === 0) {
      catalogContainer.innerHTML = "<p>Товари відсутні</p>";
      return;
    }

    this.products.forEach((product) => {
      const card = document.createElement("div");
      card.className = "card";

      const priceText =
        (typeof product.priceText === "string" && product.priceText) ||
        (product.price != null ? product.price + " грн" : "");

      card.dataset.id = product.id;
      card.dataset.title = product.title || "";
      card.dataset.price = String(priceText);
      card.dataset.desc = product.description || "";

      card.innerHTML = `
        <img src="${product.image || "/photos/placeholder.png"}" alt="${
        product.title || "coffee"
      }">
        <h3>${product.title || ""}</h3>
        <p>${priceText}</p>
        <div class="card-overlay">
          <button class="details-btn overlay-text">Детальніше</button>
        </div>
      `;

      const detailsBtn = card.querySelector(".details-btn");
      if (detailsBtn) {
        detailsBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.openProductModal(product);
        });
      }

      catalogContainer.appendChild(card);
    });
  }

  openProductModal(product) {
    const modalElement = document.getElementById("modal");
    const modalTitle = document.getElementById("modal-title");
    const modalDesc = document.getElementById("modal-desc");
    const modalPrice = document.getElementById("modal-price");

    if (!modalElement) return;

    const priceText =
      (typeof product.priceText === "string" && product.priceText) ||
      (product.price != null ? product.price + " грн" : "");

    if (modalTitle) modalTitle.textContent = product.title || "";
    if (modalDesc)
      modalDesc.innerHTML = (product.description || "").replace(
        /\n/g,
        "<br>"
      );
    if (modalPrice) modalPrice.textContent = priceText;

    this.currentProduct = product;
    modalElement.classList.add("active");
  }

  // ======================
  //    АВТОРИЗАЦІЯ / РЕГІСТРАЦІЯ
  // ======================

  setupAuthButtons() {
    const loginBtn = document.querySelector(".login-btn");
    const registerBtn = document.querySelector(".register-btn");
    const mobileLoginBtn = document.querySelector(".mobile-login-btn");
    const mobileRegisterBtn = document.querySelector(".mobile-register-btn");

    if (loginBtn) {
      loginBtn.addEventListener("click", () =>
        this.openModal("login-modal")
      );
    }
    if (registerBtn) {
      registerBtn.addEventListener("click", () =>
        this.openModal("register-modal")
      );
    }

    if (mobileLoginBtn) {
      mobileLoginBtn.addEventListener("click", () => {
        if (window.burgerMenu) window.burgerMenu.closeMenu();
        this.openModal("login-modal");
      });
    }

    if (mobileRegisterBtn) {
      mobileRegisterBtn.addEventListener("click", () => {
        if (window.burgerMenu) window.burgerMenu.closeMenu();
        this.openModal("register-modal");
      });
    }

    const logoutBtn = document.getElementById("logout-btn");
    const adminBtn = document.getElementById("admin-btn");

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.handleLogout());
    }
    if (adminBtn) {
      adminBtn.addEventListener("click", () =>
        this.openModal("admin-modal")
      );
    }
  }

  setupForms() {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const orderForm = document.getElementById("order-form");

    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    }

    if (registerForm) {
      registerForm.addEventListener("submit", (e) =>
        this.handleRegister(e)
      );
    }

    if (orderForm) {
      orderForm.addEventListener("submit", (e) =>
        this.handleOrderSubmit(e)
      );
    }

    const switchToRegister = document.querySelector(".switch-to-register");
    const switchToLogin = document.querySelector(".switch-to-login");

    if (switchToRegister) {
      switchToRegister.addEventListener("click", (e) => {
        e.preventDefault();
        this.closeModal("login-modal");
        this.openModal("register-modal");
      });
    }

    if (switchToLogin) {
      switchToLogin.addEventListener("click", (e) => {
        e.preventDefault();
        this.closeModal("register-modal");
        this.openModal("login-modal");
      });
    }

    const passwordInput = document.getElementById("register-password");
    const confirmInput = document.getElementById(
      "register-confirm-password"
    );

    if (passwordInput && confirmInput) {
      confirmInput.addEventListener("input", (e) => {
        const confirmPassword = e.target.value;
        const password = passwordInput.value;

        if (confirmPassword && password !== confirmPassword) {
          e.target.style.borderColor = "#ff2f2f";
        } else {
          e.target.style.borderColor = "#51443E";
        }
      });
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        this.showNotification(
          data.error || "Невірний email або пароль",
          "error"
        );
        return;
      }

      this.currentUser = data.user;
      this.saveCurrentUser();
      this.updateAuthUI();
      this.updateProfileModal();

      this.closeModal("login-modal");
      this.showNotification(
        `Вітаємо, ${this.currentUser.name}!`,
        "success"
      );
      e.target.reset();
    } catch (err) {
      console.error("handleLogin error:", err);
      this.showNotification("Помилка підключення до сервера", "error");
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirm-password");

    if (password !== confirmPassword) {
      this.showNotification("Паролі не співпадають", "error");
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        this.showNotification(
          data.error || "Помилка реєстрації",
          "error"
        );
        return;
      }

      this.currentUser = data.user;
      this.saveCurrentUser();
      this.updateAuthUI();
      this.updateProfileModal();

      this.closeModal("register-modal");
      this.showNotification(
        "Реєстрація успішна! Ви увійшли в акаунт.",
        "success"
      );
      e.target.reset();
    } catch (err) {
      console.error("handleRegister error:", err);
      this.showNotification("Помилка підключення до сервера", "error");
    }
  }

  handleLogout() {
    this.currentUser = null;
    this.saveCurrentUser();
    this.updateAuthUI();
    this.closeModal("profile-modal");
    this.showNotification("Ви вийшли з акаунту", "info");
  }

  updateAuthUI() {
    const loginBtn = document.querySelector(".login-btn");
    const registerBtn = document.querySelector(".register-btn");
    const authButtons = document.querySelector(".auth-buttons");
    const adminBtn = document.getElementById("admin-btn");
    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");

    let profileHeaderBtn =
      (authButtons &&
        authButtons.querySelector(".profile-btn")) ||
      null;

    if (this.currentUser) {
      if (loginBtn) loginBtn.style.display = "none";
      if (registerBtn) registerBtn.style.display = "none";

      if (!profileHeaderBtn && authButtons) {
        profileHeaderBtn = document.createElement("button");
        profileHeaderBtn.className = "profile-btn";
        authButtons.appendChild(profileHeaderBtn);
      }

      if (profileHeaderBtn) {
        profileHeaderBtn.textContent =
          this.currentUser.name || "Профіль";
        profileHeaderBtn.style.display = "inline-block";
        profileHeaderBtn.onclick = () =>
          this.openModal("profile-modal");
      }

      if (profileName) profileName.textContent = this.currentUser.name;
      if (profileEmail)
        profileEmail.textContent = this.currentUser.email;

      if (adminBtn) {
        adminBtn.style.display =
          this.currentUser.role === "admin"
            ? "inline-block"
            : "none";
      }
    } else {
      if (loginBtn) loginBtn.style.display = "inline-block";
      if (registerBtn) registerBtn.style.display = "inline-block";

      if (profileHeaderBtn) {
        profileHeaderBtn.style.display = "none";
      }

      if (adminBtn) adminBtn.style.display = "none";
      if (profileName) profileName.textContent = "";
      if (profileEmail) profileEmail.textContent = "";
    }
  }

  updateProfileModal() {
    if (!this.currentUser) return;
    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");

    if (profileName) profileName.textContent = this.currentUser.name;
    if (profileEmail) profileEmail.textContent = this.currentUser.email;
  }

  // ======================
  //         МОДАЛКИ
  // ======================

  setupModals() {
    const closeButtons = document.querySelectorAll(".close-btn");
    closeButtons.forEach((btn) => {
      const modalId = btn.getAttribute("data-modal");
      if (!modalId) return;
      btn.addEventListener("click", () => this.closeModal(modalId));
    });

    const modals = document.querySelectorAll(".modal");
    modals.forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.classList.remove("active");
        }
      });
    });

    const modalCloseBtn = document.querySelector(".modal-close-btn");
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener("click", () => {
        const modal = document.getElementById("modal");
        if (modal) modal.classList.remove("active");
      });
    }

    const ctaButton = document.querySelector(".cta-button");
    if (ctaButton) {
      ctaButton.addEventListener("click", () => {
        const catalogSection = document.getElementById("catalog");
        if (catalogSection) {
          catalogSection.scrollIntoView({ behavior: "smooth" });
        }
      });
    }
  }

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add("active");
  }

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("active");
  }

  showNotification(message, type = "info") {
    const old = document.querySelector(".notification");
    if (old) old.remove();

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // ======================
  //      КОШИК + ЗАМОВЛЕННЯ
  // ======================

  setupCart() {
    const modalElement = document.getElementById("modal");
    const addToCartBtn = document.getElementById("add-to-cart-btn");
    const cartIcon = document.querySelector(".cart-icon");
    const cartModal = document.getElementById("cart-modal");
    const cartItems = document.getElementById("cart-items");
    const cartCloseBtn = document.querySelector(".cart-close-btn");
    const orderBtn = document.querySelector(".order-btn");
    const orderModal = document.getElementById("order-modal");
    const orderCloseBtn = document.querySelector(".order-close-btn");

    if (addToCartBtn) {
      addToCartBtn.addEventListener("click", () => {
        if (!this.currentProduct) return;

        const priceText =
          (typeof this.currentProduct.priceText === "string" &&
            this.currentProduct.priceText) ||
          (this.currentProduct.price != null
            ? this.currentProduct.price + " грн"
            : "");

        this.cart.push({
          id: this.currentProduct.id,
          title: this.currentProduct.title,
          price: this.currentProduct.price,
          priceText: priceText,
        });

        this.showNotification("Товар додано у кошик!", "success");
        if (modalElement) modalElement.classList.remove("active");
      });
    }

    if (cartIcon) {
      cartIcon.addEventListener("click", () => {
        if (!cartModal || !cartItems) return;

        if (this.cart.length === 0) {
          cartItems.innerHTML = "<li>Кошик порожній</li>";
        } else {
          cartItems.innerHTML = this.cart
            .map(
              (item) =>
                `<li>${item.title} — ${
                  item.priceText ||
                  (item.price != null ? item.price + " грн" : "")
                }</li>`
            )
            .join("");
        }

        cartModal.classList.add("active");
      });
    }

    if (cartCloseBtn) {
      cartCloseBtn.addEventListener("click", () => {
        if (cartModal) cartModal.classList.remove("active");
      });
    }

    if (orderBtn) {
      orderBtn.addEventListener("click", () => {
        if (this.cart.length === 0) {
          this.showNotification("Кошик порожній", "info");
          return;
        }
        if (cartModal) cartModal.classList.remove("active");
        if (orderModal) orderModal.classList.add("active");
      });
    }

    if (orderCloseBtn) {
      orderCloseBtn.addEventListener("click", () => {
        if (orderModal) orderModal.classList.remove("active");
      });
    }
  }

  async handleOrderSubmit(e) {
    e.preventDefault();
    if (this.cart.length === 0) {
      this.showNotification("Кошик порожній", "info");
      return;
    }

    const formData = new FormData(e.target);
    const name = formData.get("name");
    const phone = formData.get("phone");
    const email = formData.get("email");
    const address = formData.get("address");

    const payload = {
      name,
      phone,
      email,
      address,
      items: this.cart,
      userId: this.currentUser ? this.currentUser.id : null,
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        this.showNotification(
          data.error || "Помилка оформлення замовлення",
          "error"
        );
        return;
      }

      this.cart = [];
      const orderModal = document.getElementById("order-modal");
      if (orderModal) orderModal.classList.remove("active");
      this.showNotification("Замовлення успішно оформлено!", "success");
      e.target.reset();

      this.renderAdminOrders();
    } catch (err) {
      console.error("handleOrderSubmit error:", err);
      this.showNotification("Помилка підключення до сервера", "error");
    }
  }

  // ======================
  //        АДМІН ПАНЕЛЬ
  // ======================

  setupAdminPanel() {
    const adminBtn = document.getElementById("admin-btn");
    const tabButtons = document.querySelectorAll(".tab-btn");

    this.productFormModal = document.getElementById("product-form-modal");
    this.productFormTitle = document.getElementById("product-form-title");
    this.productIdInput = document.getElementById("product-id");
    this.productTitleInput = document.getElementById("product-title");
    this.productDescInput = document.getElementById("product-desc");
    this.productPriceInput = document.getElementById("product-price");
    this.productImageInput = document.getElementById("product-image");
    const productForm = document.getElementById("product-form");
    const addProductBtn = document.querySelector(".add-product-btn");

    if (adminBtn) {
      adminBtn.addEventListener("click", async () => {
        this.openModal("admin-modal");
        await this.loadProductsFromAPI();
        this.renderAdminOrders();
        this.renderAdminUsers();
      });
    }

    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        if (!tab) return;

        tabButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const contents = document.querySelectorAll(".tab-content");
        contents.forEach((c) => c.classList.remove("active"));
        const active = document.getElementById(tab + "-tab");
        if (active) active.classList.add("active");
      });
    });

    if (addProductBtn) {
      addProductBtn.addEventListener("click", () =>
        this.openCreateProductForm()
      );
    }

    if (productForm) {
      productForm.addEventListener("submit", (e) =>
        this.handleProductFormSubmit(e)
      );
    }
  }

  renderAdminProducts() {
    const container = document.getElementById("admin-products-list");
    if (!container) return;

    container.innerHTML = "";

    if (!this.products || this.products.length === 0) {
      container.textContent = "Немає товарів для відображення";
      return;
    }

    this.products.forEach((product) => {
      const item = document.createElement("div");
      item.className = "admin-item";

      const priceText =
        (typeof product.priceText === "string" && product.priceText) ||
        (product.price != null ? product.price + " грн" : "");

      item.innerHTML = `
        <div class="admin-item-main">
          <div>
            <strong>${product.title || ""}</strong><br>
            <small>${product.description || ""}</small>
          </div>
          <div class="admin-item-right">
            <span>${priceText}</span>
            <div class="admin-item-actions">
              <button class="admin-btn edit">Редагувати</button>
              <button class="admin-btn delete">Видалити</button>
            </div>
          </div>
        </div>
      `;

            const editBtn = item.querySelector(".admin-btn.edit");
      const deleteBtn = item.querySelector(".admin-btn.delete");

      if (editBtn) {
        editBtn.addEventListener("click", () =>
          this.openEditProductForm(product)
        );
      }

      if (deleteBtn) {
        deleteBtn.addEventListener("click", () =>
          this.deleteProduct(product.id)
        );
      }

      container.appendChild(item);
    });
  }

  openCreateProductForm() {
    if (!this.productFormModal) return;

    if (this.productFormTitle)
      this.productFormTitle.textContent = "Додати товар";
    if (this.productIdInput) this.productIdInput.value = "";
    if (this.productTitleInput) this.productTitleInput.value = "";
    if (this.productDescInput) this.productDescInput.value = "";
    if (this.productPriceInput) this.productPriceInput.value = "";
    if (this.productImageInput) this.productImageInput.value = "";

    this.productFormModal.classList.add("active");
  }

  openEditProductForm(product) {
    if (!this.productFormModal) return;

    if (this.productFormTitle)
      this.productFormTitle.textContent = "Редагувати товар";
    if (this.productIdInput) this.productIdInput.value = product.id || "";
    if (this.productTitleInput)
      this.productTitleInput.value = product.title || "";
    if (this.productDescInput)
      this.productDescInput.value = product.description || "";
    if (this.productPriceInput)
      this.productPriceInput.value =
        product.price != null ? String(product.price) : "";
    if (this.productImageInput)
      this.productImageInput.value = product.image || "";

    this.productFormModal.classList.add("active");
  }

  async handleProductFormSubmit(e) {
    e.preventDefault();

    const id = this.productIdInput ? this.productIdInput.value : "";
    const title = this.productTitleInput
      ? this.productTitleInput.value.trim()
      : "";
    const description = this.productDescInput
      ? this.productDescInput.value.trim()
      : "";
    const priceValue = this.productPriceInput
      ? this.productPriceInput.value
      : "";
    const image = this.productImageInput
      ? this.productImageInput.value.trim()
      : "";

    const price = Number(priceValue);

    if (!title || !description || !priceValue || isNaN(price)) {
      this.showNotification("Заповніть всі поля коректно", "error");
      return;
    }

    const payload = { title, description, price, image: image || null };

    try {
      let res;
      if (id) {
        res = await fetch(`/api/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        this.showNotification(
          data.error || "Помилка збереження товару",
          "error"
        );
        return;
      }

      this.closeModal("product-form-modal");
      this.showNotification(
        id ? "Товар оновлено" : "Товар додано",
        "success"
      );

      await this.loadProductsFromAPI();
    } catch (err) {
      console.error("handleProductFormSubmit error:", err);
      this.showNotification("Помилка підключення до сервера", "error");
    }
  }

  async deleteProduct(id) {
    if (!id) return;
    const ok = window.confirm(
      "Ви впевнені, що хочете видалити цей товар?"
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        this.showNotification(
          data.error || "Помилка видалення товару",
          "error"
        );
        return;
      }

      this.showNotification("Товар видалено", "success");
      await this.loadProductsFromAPI();
    } catch (err) {
      console.error("deleteProduct error:", err);
      this.showNotification("Помилка підключення до сервера", "error");
    }
  }

  async renderAdminOrders() {
    const container = document.getElementById("admin-orders-list");
    if (!container) return;

    container.innerHTML = "Завантаження...";

    try {
      const res = await fetch("/api/orders");
      const data = await res.json();

      if (!res.ok) {
        container.textContent =
          data.error || "Помилка завантаження замовлень";
        return;
      }

      if (!data || data.length === 0) {
        container.textContent = "Поки що немає замовлень";
        return;
      }

      container.innerHTML = "";

      data.forEach((order) => {
        const item = document.createElement("div");
        item.className = "admin-item";
        const date = new Date(
          order.created_at || order.date
        ).toLocaleString("uk-UA");

        const itemsArray = order.items || [];
        const itemsText = itemsArray
          .map((i) => {
            const pt =
              i.priceText ||
              (i.price != null ? i.price + " грн" : "");
            return `${i.title} (${pt})`;
          })
          .join("<br>");

        item.innerHTML = `
          <div class="admin-item-main">
            <div>
              <strong>${order.name}</strong> (${order.phone})<br>
              ${order.email || ""}<br>
              <small>${date}</small>
            </div>
            <div>
              ${itemsText}
            </div>
          </div>
        `;

        container.appendChild(item);
      });
    } catch (err) {
      console.error("renderAdminOrders error:", err);
      container.textContent = "Помилка підключення до сервера";
    }
  }

  async renderAdminUsers() {
    const container = document.getElementById("admin-users-list");
    if (!container) return;

    container.innerHTML = "Завантаження...";

    try {
      const res = await fetch("/api/users");
      const data = await res.json();

      if (!res.ok) {
        container.textContent =
          data.error || "Помилка завантаження користувачів";
        return;
      }

      if (!data || data.length === 0) {
        container.textContent = "Немає зареєстрованих користувачів";
        return;
      }

      container.innerHTML = "";

      data.forEach((user) => {
        const item = document.createElement("div");
        item.className = "admin-item";

        let dateText = "";
        if (user.created_at) {
          dateText = new Date(user.created_at).toLocaleDateString(
            "uk-UA"
          );
        }

        item.innerHTML = `
          <div class="admin-item-main">
            <strong>${user.name}</strong> (${user.email})<br>
            <small>Роль: ${user.role || "user"}${
          dateText ? " | Дата: " + dateText : ""
        }</small>
          </div>
        `;

        container.appendChild(item);
      });
    } catch (err) {
      console.error("renderAdminUsers error:", err);
      container.textContent = "Помилка підключення до сервера";
    }
  }

  // ======================
  //   СЛАЙДЕР + СКРОЛ
  // ======================

  initSliders() {
    const images = document.querySelectorAll(".banner-slider img");
    let currentSlide = 0;

    if (images.length > 0) {
      images[0].classList.add("active");
      setInterval(() => {
        images[currentSlide].classList.remove("active");
        currentSlide = (currentSlide + 1) % images.length;
        images[currentSlide].classList.add("active");
      }, 5000);
    }
  }

  initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach((link) => {
      link.addEventListener("click", (e) => {
        const targetId = link.getAttribute("href").slice(1);
        const target = document.getElementById(targetId);
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });

        if (window.innerWidth <= 1024 && window.burgerMenu) {
          window.burgerMenu.closeMenu();
        }
      });
    });
  }
}

// Бургер-меню
class BurgerMenu {
  constructor() {
    this.burger = document.getElementById("burger-menu");
    this.mobileMenu = document.getElementById("mobile-menu");
    this.isOpen = false;

    this.init();
  }

  init() {
    if (!this.burger || !this.mobileMenu) return;

    this.burger.addEventListener("click", () => this.toggleMenu());

    this.mobileMenu.addEventListener("click", (e) => {
      if (e.target.classList.contains("mobile-nav-link")) {
        this.closeMenu();
      }
      if (e.target === this.mobileMenu) {
        this.closeMenu();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1024 && this.isOpen) {
        this.closeMenu();
      }
    });
  }

  toggleMenu() {
    this.isOpen = !this.isOpen;
    this.mobileMenu.classList.toggle("active", this.isOpen);
    this.burger.classList.toggle("active", this.isOpen);
  }

  closeMenu() {
    this.isOpen = false;
    this.mobileMenu.classList.remove("active");
    this.burger.classList.remove("active");
  }
}

// Ініціалізація
const app = new CoffeeApp();
window.burgerMenu = new BurgerMenu();