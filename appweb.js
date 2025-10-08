let currentCard = null;

document.querySelectorAll('.details-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    const card = btn.closest('.card');
    currentCard = card;
    document.getElementById('modal-title').textContent = card.dataset.title;
    document.getElementById('modal-desc').innerHTML = card.dataset.desc.replace(/\n/g, '<br>');
    document.getElementById('modal-price').textContent = card.dataset.price;
    document.getElementById('modal').classList.add('active');
  });
});

document.querySelector('.close-btn').onclick = function() {
  document.getElementById('modal').classList.remove('active');
};

document.querySelector('.burger').onclick = function() {
  document.querySelector('.main-nav ul').classList.toggle('active');
};

let cart = [];

// Додаємо товар у корзину при кліку на кнопку "Детальніше" (або створіть окрему кнопку "В кошик")
document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('dblclick', function() {
    const title = card.dataset.title;
    const price = card.dataset.price;
    cart.push({ title, price });
    alert('Товар додано у корзину!');
  });
});

// Відкриття корзини
document.querySelector('.cart-icon').onclick = function() {
  const cartModal = document.getElementById('cart-modal');
  const cartItems = document.getElementById('cart-items');
  cartItems.innerHTML = cart.length
    ? cart.map(item => `<li>${item.title} — ${item.price}</li>`).join('')
    : '<li>Корзина порожня</li>';
  cartModal.classList.add('active');
};

// Закриття корзини
document.querySelector('.cart-close-btn').onclick = function() {
  document.getElementById('cart-modal').classList.remove('active');
};

// Відкриття форми
document.querySelector('.order-btn').onclick = function() {
  document.getElementById('cart-modal').classList.remove('active');
  document.getElementById('order-modal').classList.add('active');
};

// Закриття форми
document.querySelector('.order-close-btn').onclick = function() {
  document.getElementById('order-modal').classList.remove('active');
};

// Відправка форми
document.getElementById('order-form').onsubmit = function(e) {
  e.preventDefault();
  alert('Замовлення відправлено!');
  cart = [];
  document.getElementById('order-modal').classList.remove('active');
};

document.getElementById('add-to-cart-btn').onclick = function() {
  if (currentCard) {
    const title = currentCard.dataset.title;
    const price = currentCard.dataset.price;
    cart.push({ title, price });
    alert('Товар додано у корзину!');
    document.getElementById('modal').classList.remove('active');
  }
};
