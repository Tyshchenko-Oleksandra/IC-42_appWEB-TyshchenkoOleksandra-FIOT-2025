const cards = document.querySelectorAll('.card');
const modal = document.getElementById('coffeeModal');
const modalTitle = document.getElementById('modalTitle');
const modalPrice = document.getElementById('modalPrice');
const modalDesc = document.getElementById('modalDesc');

cards.forEach(card => {
  card.addEventListener('click', () => {
    modalTitle.textContent = card.dataset.title;
    modalPrice.textContent = card.dataset.price;
    modalDesc.textContent = card.dataset.desc;
    modal.style.display = "flex";
  });
});

function closeModal() {
  modal.style.display = "none";
}

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    closeModal();
  }
});
