const express = require('express');
const multer = require('multer');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

dotenv.config();

const app = express();
const port = 3000;

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

db.connect();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir));

// เพิ่มข้อมูลบ้าน
app.post('/api/home/insert', upload.single('Home_Image'), async (req, res) => {
  const { Home_Size, Home_Bedroom, Home_Bathroom, Home_Price, Home_Condition, Home_Type,
    Home_YearBuilt, Home_ParkingSpace, Home_Address } = req.body;

  if (!req.file) {
    return res.json({ "message": "ต้องมีภาพประกอบ", "status": false });
  }

  // Validate input
  if (!Home_Size || !Home_Bedroom || !Home_Bathroom || !Home_Price || !Home_Condition 
    || !Home_Type || !Home_YearBuilt || !Home_ParkingSpace || !Home_Address) {
    return res.json({ "message": "ข้อมูลที่ส่งมาไม่ครบถ้วน", "status": false });
  }

  const uniqueName = uuidv4();
  const ext = path.extname(req.file.originalname);
  const resizedImagePath = path.join(uploadDir, `${uniqueName}${ext}`);

  try {
    await sharp(req.file.buffer)
      .resize(1000, 1000) //1000x1000 pixels
      .toFile(resizedImagePath);

    const Home_ImageURL = `/uploads/${uniqueName}${ext}`;

    const sql = "INSERT INTO Home (Home_Size, Home_Bedroom, Home_Bathroom, Home_Price, Home_Condition, Home_Type, " +
      "Home_YearBuilt, Home_ParkingSpace, Home_Address, Home_ImageURL) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [Home_Size, Home_Bedroom, Home_Bathroom, Home_Price, Home_Condition, Home_Type,
      Home_YearBuilt, Home_ParkingSpace, Home_Address, Home_ImageURL], (err) => {
      if (err) {
        console.error(err);
        return res.json({ "message": "เกิดข้อผิดพลาดในการบันทึกข้อมูล", "status": false });
      }
      res.json({ 'message': 'บันทึกข้อมูลสำเร็จ', 'status': true });
    });
  } catch (error) {
    console.error(error);
    return res.json({ "message": "เกิดข้อผิดพลาดในการประมวลผลภาพ", "status": false });
  }
});

// ดึงข้อมูลบ้านตาม ID
app.get('/api/home/get/:id', (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM Home WHERE Home_ID = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error(err);
      return res.send({ "message": "เกิดข้อผิดพลาดในการดึงข้อมูล", "status": false });
    }
    if (results.length === 0) {
      return res.send({ "message": "ไม่พบข้อมูลผลิตภัณฑ์", "status": false });
    }
    const home = results[0];

    home['message'] = "ทำรายการสำเร็จ"
    home['status'] = true
    res.send(home);
  });
});

app.listen(port, function () {
  console.log(`Server listening on port ${port}`);
});
