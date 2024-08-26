const rateLimit = require('express-rate-limit');
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = 3000;

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect()
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Limit login
const loginRateLimiter = rateLimit({
    windowMs: 30 * 60 * 1000, // 30 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: { message: "โปรดลองอีกครั้งหลังจากผ่านไป 30 นาที", status: false }
});

// Insert product
app.post('/product', (req, res) => {
  const { productName, productDetail, price, cost, quantity } = req.body;

  // Validate input
  if (!productName || !productDetail || !price || !cost || !quantity) {
    return res.send({ "message": "ข้อมูลที่ส่งมาไม่ครบถ้วน", "status": false });
  }

  const sql = "INSERT INTO product (productName, productDetail, price, cost, quantity) VALUES (?, ?, ?, ?, ?)";
  db.query(sql, [productName, productDetail, price, cost, quantity], (err) => {
    if (err) {
      console.error(err);
      return res.send({ "message": "เกิดข้อผิดพลาดในการบันทึกข้อมูล", "status": false });
    }
    res.send({ 'message': 'บันทึกข้อมูลสำเร็จ', 'status': true });
  });
});

// Get product by ID
app.get('/product/:id', (req, res) => {
  const productID = req.params.id;

  if (isNaN(productID)) {
    return res.send({ "message": "ID ของสินค้าต้องเป็นตัวเลข", "status": false });
  }

  const sql = "SELECT * FROM product WHERE productID = ?";
  db.query(sql, [productID], (err, result) => {
    if (err) {
      console.error(err);
      return res.send({ "message": "เกิดข้อผิดพลาดในการดึงข้อมูล", "status": false });
    }
    if (result.length > 0) {
      res.send(result[0]);
    } else {
      res.send({ "message": "ไม่พบสินค้านี้", "status": false });
    }
  });
});

// User login
app.post('/login', loginRateLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.send({ "message": "กรุณาระบุชื่อผู้ใช้และรหัสผ่าน", "status": false });
  }

  const sql = "SELECT * FROM customer WHERE username = ? AND isActive = 1";
  db.query(sql, [username], (err, result) => {
    if (err) {
      console.error(err);
      return res.send({ "message": "เกิดข้อผิดพลาดในการเข้าสู่ระบบ", "status": false });
    }
    if (result.length > 0) {
      const customer = result[0];
      bcrypt.compare(password, customer.password, (err, isMatch) => {
        if (err) {
          console.error(err);
          return res.send({ "message": "เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน", "status": false });
        }
        if (isMatch) {
          customer['message'] = "เข้าสู่ระบบสำเร็จ";
          customer['status'] = true;
          res.send(customer);
        } else {
          res.send({ "message": "รหัสผ่านไม่ถูกต้อง", "status": false });
        }
      });
    } else {
      res.send({ "message": "ไม่พบผู้ใช้ที่ระบุ", "status": false });
    }
  });
});

app.listen(port, function() {
  console.log(`Server listening on port ${port}`);
});
