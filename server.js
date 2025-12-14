// server.js — версія під твою схему БД (users/full_name, roles, user_roles, orders.total_amount)

const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./db'); // mysql2/promise пул

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// статика з public/
app.use(express.static(path.join(__dirname, 'public')));

// ======================
//        USERS
// ======================

// POST /api/register – створення користувача + роль customer
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Заповніть всі поля' });
  }

  try {
    // чи існує такий email
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Користувач з таким email вже існує' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // вставляємо в users (full_name!)
    const [result] = await db.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES (?, ?, ?)`,
      [email, passwordHash, name]
    );

    const userId = result.insertId;

    // знаходимо id ролі "customer" і додаємо в user_roles
    try {
      const [roleRows] = await db.query(
        'SELECT id FROM roles WHERE name = ?',
        ['customer']
      );
      if (roleRows.length > 0) {
        const roleId = roleRows[0].id;
        await db.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
          [userId, roleId]
        );
      }
    } catch (e) {
      console.warn('Не вдалося призначити роль customer, але юзера створено:', e.message);
    }

    const user = {
      id: userId,
      name,
      email,
      role: 'customer'
    };

    res.status(201).json({ user });
  } catch (err) {
    console.error('POST /api/register error:', err);
    res.status(500).json({ error: 'Помилка сервера при реєстрації' });
  }
});

// POST /api/login – логін з урахуванням user_roles/roles
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Введіть email та пароль' });
  }

  try {
    const [rows] = await db.query(
      `SELECT 
         u.id,
         u.email,
         u.password_hash,
         u.full_name,
         u.status,
         u.registration_date,
         GROUP_CONCAT(r.name) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.email = ?
       GROUP BY u.id
       LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }

    const dbUser = rows[0];

    if (dbUser.status === 'blocked') {
      return res.status(403).json({ error: 'Акаунт заблокований' });
    }

    const isMatch = await bcrypt.compare(password, dbUser.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }

    // витягаємо ролі з GROUP_CONCAT, наприклад "customer,admin"
    const roles = (dbUser.roles || '')
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    let role = 'customer';
    if (roles.includes('admin')) {
      role = 'admin';
    } else if (roles.includes('customer')) {
      role = 'customer';
    } else if (roles.length > 0) {
      role = roles[0];
    }

    const user = {
      id: dbUser.id,
      name: dbUser.full_name,
      email: dbUser.email,
      role
    };

    res.json({ user });
  } catch (err) {
    console.error('POST /api/login error:', err);
    res.status(500).json({ error: 'Помилка сервера при вході' });
  }
});

// GET /api/users – для адмінки (листинг)
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         u.id,
         u.full_name AS name,
         u.email,
         u.status,
         u.registration_date AS created_at,
         COALESCE(r.name, 'guest') AS role
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON ur.role_id = r.id
       ORDER BY u.id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ error: 'Помилка сервера при отриманні користувачів' });
  }
});

// ======================
//       PRODUCTS
// ======================

// GET /api/products – список товарів
app.get('/api/products', async (req, res) => {
  try {
    // products: id, title, description, price, image, created_at, updated_at
    const [rows] = await db.query(
      'SELECT id, title, description, price, image FROM products ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/products error:', err);
    res.status(500).json({ error: 'Помилка сервера при отриманні товарів' });
  }
});

// GET /api/products/:id – один товар
app.get('/api/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Невірний id товару' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, title, description, price, image FROM products WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Товар не знайдено' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/products/:id error:', err);
    res.status(500).json({ error: 'Помилка сервера при отриманні товару' });
  }
});

// POST /api/products – створити товар
app.post('/api/products', async (req, res) => {
  const { title, description, price, image } = req.body || {};

  if (!title || !description || price == null) {
    return res.status(400).json({ error: 'Заповніть всі поля товару' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO products (title, description, price, image)
       VALUES (?, ?, ?, ?)`,
      [title, description, price, image || null]
    );

    res.status(201).json({
      id: result.insertId,
      title,
      description,
      price,
      image: image || null
    });
  } catch (err) {
    console.error('POST /api/products error:', err);
    res.status(500).json({ error: 'Помилка сервера при створенні товару' });
  }
});

// PUT /api/products/:id – оновити товар
app.put('/api/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Невірний id товару' });
  }

  const { title, description, price, image } = req.body || {};
  if (!title || !description || price == null) {
    return res.status(400).json({ error: 'Заповніть всі поля товару' });
  }

  try {
    const [result] = await db.query(
      `UPDATE products
       SET title = ?, description = ?, price = ?, image = ?
       WHERE id = ?`,
      [title, description, price, image || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Товар не знайдено' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/products/:id error:', err);
    res.status(500).json({ error: 'Помилка сервера при оновленні товару' });
  }
});

// DELETE /api/products/:id – видалити товар
app.delete('/api/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Невірний id товару' });
  }

  try {
    const [result] = await db.query(
      'DELETE FROM products WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Товар не знайдено' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/products/:id error:', err);
    res.status(500).json({ error: 'Помилка сервера при видаленні товару' });
  }
});

// ======================
//        ORDERS
// ======================

// POST /api/orders – створити замовлення
app.post('/api/orders', async (req, res) => {
  const { name, phone, email, address, items, userId } = req.body || {};

  if (!name || !phone || !email || !address || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Некоректні дані замовлення' });
  }

  try {
    const total = items.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      return sum + price;
    }, 0);

    // orders: customer_name, total_amount, status, created_at
    const [result] = await db.query(
      `INSERT INTO orders
       (user_id, customer_name, phone, email, address, items_json, total_amount, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'new', NOW())`,
      [
        userId || null,
        name,
        phone,
        email,
        address,
        JSON.stringify(items),
        total
      ]
    );

    res.status(201).json({
      id: result.insertId,
      success: true
    });
  } catch (err) {
    console.error('POST /api/orders error:', err);
    res.status(500).json({ error: 'Помилка сервера при створенні замовлення' });
  }
});

// GET /api/orders – список замовлень для адмінки
// GET /api/orders – список замовлень для адмінки
app.get('/api/orders', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
         id,
         user_id,
         customer_name AS name,
         phone,
         email,
         address,
         items_json,
         total_amount AS total_price,
         status,
         created_at
       FROM orders
       ORDER BY id DESC`
    );

    const orders = rows.map((row) => {
      let items = [];
      if (row.items_json) {
        try {
          items = JSON.parse(row.items_json);
        } catch (e) {
          console.warn(
            'Bad JSON in items_json for order',
            row.id,
            e.message
          );
        }
      }
      return { ...row, items };
    });

    res.json(orders);
  } catch (err) {
    console.error('GET /api/orders error:', err);
    res.status(500).json({ error: 'Помилка сервера при отриманні замовлень' });
  }
});
// ======================
//   START SERVER
// ======================
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});