//Initialize the TP dependencies
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');
var xlstojson = require('xls-to-json-lc');
var xlsxtojson = require('xlsx-to-json-lc');
let logger = require('morgan');
const portNumber = process.env.PORT || 8080;
const camelcaseKeys = require('camelcase-keys');
const ShippingInfo = require('./models/shipping');
const mongoose = require('mongoose');

//Initialized the File System Dependencies
require('dotenv').config();
let path = require('path');
let fs = require('fs-extra');

//File Uploads

let UPLOAD_LOCATION = path.join(__dirname, 'uploads');
fs.mkdirsSync(UPLOAD_LOCATION);

//Use Log error
app.use(logger('dev'));

//MongoDb Connection Establishment
const uri = (process.env.MONGODB_URI || `mongodb+srv://chibi:chibi12345@shipping-info-07aap.mongodb.net/test?retryWrites=true&w=majority`)
mongoose.connect(uri, { useUnifiedTopology: true, useNewUrlParser: true });
const connection = mongoose.connection;
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
})

//Bodyparser for the env variables.
//Limit to receive many documents from uploaded excel
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
app.use(bodyParser.json({limit: '100mb', extended: true}));

//To overcome CORS issue
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
      return res.status(200).json({});
  }
  next();
});


//multers disk storage settings
var filesToStore = multer.diskStorage({ 
    destination: function (req, file, callback) {
        callback(null, UPLOAD_LOCATION);
    },
    filename: function (req, file, callback) {
        console.log(file.originalname);
        callback(null, file.originalname);
    }
});

var upload = multer({ //multer settings
    storage: filesToStore,
    fileFilter: function (req, file, callback) { //file filter
        if (['xls', 'xlsx'].indexOf(file.originalname.split('.')[file.originalname.split('.').length - 1]) === -1) {
            return callback(new Error('Wrong extension type'));
        }
        callback(null, true);
    }
}).single('file');

/** API path that will upload the files */
app.post('/movements', function (req, res) {
    var exceltojson; //Initialization
    console.log(req);
    console.log('Hi. Received the request')
    upload(req, res, function (err) {
        console.log('Inside Upload')
        if (err) {
            res.json({ error_code: 1, err_desc: err });
            return;
        }

        /** Multer gives us file info in req.file object */
        if (!req.file) {
            res.json({ error_code: 1, err_desc: "No file passed" });
            return;
        }

        //start convert process
        /** Check the extension of the incoming file and
         *  use the appropriate module
         */
        if (req.file.originalname.split('.')[req.file.originalname.split('.').length - 1] === 'xlsx') {
            console.log('Inside Verification')
            exceltojson = xlsxtojson;
        } else {
            exceltojson = xlstojson;
        }

        exceltojson({
            input: req.file.path, //the same path where we uploaded our file
            output: null, //since we don't need output.json
            lowerCaseHeaders: true
        }, function (err, result) {
            if (err) {
                return res.json({ payload: null });
            }
            console.log(req.file)
            result = camelcaseKeys(result);
            ShippingInfo.collection.insertMany(result).then((info) => {
                ShippingInfo.collection.updateMany({}, {$unset: {zip: 1, pin: 1, address: 1, city: 1  }});
            }).then((info) => {
                res.status(201).send(info)
            })
            console.log('Saved in Db successfully')
        })
    });
});

app.get('/api/getList', function (req, res) {
    ShippingInfo.find({}, function (err, shippingJson) {
        res.send(shippingJson)
    });
    
});

app.listen(portNumber, function () {
    console.log(`Now running on Port ${portNumber}...`);
});