const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session'); // Session manage කරන්න

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Form data කියවන්න (Login form එකට)

// EJS Setup
app.set('view engine', 'ejs'); // View engine එක EJS ලෙස set කිරීම
app.set('views', path.join(__dirname, 'views')); // Views folder එකේ path එක හරියටම දෙනවා

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'my-secret-key', // කැමති රහස් වචනයක් දෙන්න
    resave: false,
    saveUninitialized: true
}));

// Static Files
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MySQL Database Connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'aurudu_event',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// --- AUTOMATIC TABLE CREATION (අලුතෙන් එකතු කළ කොටස) ---
const initDB = async () => {
    try {
        // Ticket Table එක තිබේදැයි බලා, නැත්නම් සාදයි
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ticket_registrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                ticket_type VARCHAR(100),
                quantity INT,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Contest Table එක තිබේදැයි බලා, නැත්නම් සාදයි
        await pool.query(`
            CREATE TABLE IF NOT EXISTS contest_registrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                contestant_name VARCHAR(255) NOT NULL,
                age INT NOT NULL,
                category VARCHAR(50) NOT NULL,
                whatsapp_number VARCHAR(20) NOT NULL,
                photo_path VARCHAR(255),
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ Database Tables Checked/Created Successfully!");
    } catch (error) {
        console.error("❌ Error initializing database:", error);
    }
};

// Server එක පටන් ගන්නකොටම Tables ටික හදන්න
initDB();

// Multer Setup (File Uploads)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// --- PUBLIC API ROUTES (Frontend එක සඳහා) ---

app.post('/api/tickets', async (req, res) => {
    const { fullName, email, phone, ticketType, quantity } = req.body;
    if (!fullName || !email || !ticketType || !quantity) return res.status(400).json({ message: 'Required fields missing.' });

    try {
        await pool.query('INSERT INTO ticket_registrations (full_name, email, phone, ticket_type, quantity) VALUES (?, ?, ?, ?, ?)', 
            [fullName, email, phone, ticketType, quantity]);
        res.status(201).json({ message: 'Ticket Registration Successful!' });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/api/contest', upload.single('photo'), async (req, res) => {
    const { contestantName, age, category, whatsappNumber } = req.body;
    const photoPath = req.file ? req.file.filename : null;
    if (!contestantName || !age || !category || !whatsappNumber) return res.status(400).json({ message: 'Required fields missing.' });

    try {
        await pool.query('INSERT INTO contest_registrations (contestant_name, age, category, whatsapp_number, photo_path) VALUES (?, ?, ?, ?, ?)', 
            [contestantName, age, category, whatsappNumber, photoPath]);
        res.status(201).json({ message: `Successfully registered for ${category}!` });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
});

// --- ADMIN SYSTEM (Server Side Rendering) ---

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // Password එක මෙතන වෙනස් කරන්න

// Login Page එක පෙන්වන්න
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// Login Check කිරීම
app.post('/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        req.session.isLoggedIn = true; // Session එකේ save කරගන්නවා
        res.redirect('/admin');
    } else {
        res.render('login', { error: 'Invalid Password!' });
    }
});

// Logout කිරීම
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Admin Dashboard (ආරක්ෂිත පිටුව)
app.get('/admin', async (req, res) => {
    // Log වෙලා නැත්නම් Login page එකට යවන්න
    if (!req.session.isLoggedIn) {
        return res.redirect('/login');
    }

    try {
        // Data database එකෙන් ගන්නවා
        const [tickets] = await pool.query('SELECT * FROM ticket_registrations ORDER BY registration_date DESC');
        const [contestants] = await pool.query('SELECT * FROM contest_registrations ORDER BY registration_date DESC');
        
        // 'admin.ejs' එකට data යවනවා
        res.render('admin', { tickets, contestants });
    } catch (error) {
        res.status(500).send("Database Error");
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
