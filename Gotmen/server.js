const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const session = require('express-session');
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));

// Configure session
app.use(session({
  secret: '1597532486',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60000 }
}));

// MongoDB connection
const dbUri = 'mongodb+srv://panupol:0394641234@panupol.ighygyc.mongodb.net/?retryWrites=true&w=majority&appName=panupol';

mongoose.connect(dbUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Define a schema
const productSchema = new mongoose.Schema({
  name: String,
  detail: String,
  price: Number,
  amount: Number,
  photo: String
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String
});

const Product = mongoose.model('Product', productSchema);
const User = mongoose.model('User', userSchema);

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// Routes 
app.get('/', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    req.session.user = user;
    res.redirect('/');
  } else {
    res.status(401).send('Invalid credentials');
  }
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const newUser = new User({ username, password });

  try {
    await newUser.save();
    res.send('User registered successfully');
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post('/insert', upload.single('photo'), async (req, res) => {
  const { name, detail, price, amount } = req.body;
  const photo = req.file ? `/uploads/${req.file.filename}` : null;
  const newProduct = new Product({ name, detail, price, amount, photo });

  try {
    await newProduct.save();
    res.send('Product inserted successfully');
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/products', isAuthenticated, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.put('/update/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, detail, price, amount } = req.body;
    const updatedProduct = await Product.findByIdAndUpdate(id, { name, detail, price, amount }, { new: true });
    res.json(updatedProduct);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.delete('/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    res.send('Product deleted successfully');
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
