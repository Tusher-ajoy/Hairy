const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs-extra');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const nodemailer = require('nodemailer');
const creds = require('./config');

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('services'));
app.use(fileUpload());

const transport = {
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
        user: creds.USER,
        pass: creds.PASS
    }
}
const transporter = nodemailer.createTransport(transport);
transporter.verify((error, success)=>{
    if(error){
        console.log(error)
    }
    else{
        console.log('Server is ready to take message')
    }
})
app.post('/send', (req, res, next)=>{
    const name = req.body.name;
    const email = req.body.email;
    const subject = req.body.subject;
    const phone = req.body.phone;
    const message = req.body.message;
    const content = `Name: ${name} \n Email: ${email} \n Subject: ${subject} \n Phone: ${phone} \n Message: ${message}`

    const mail = {
        form: email,
        to: 'tusherd3@gmail.com',
        subject: 'New message form Hairy!!',
        text: content
    }

    transporter.sendMail(mail, (error, data)=>{
        if(error){
            res.json({
                status:'Fail'
            })
        }
        else{
            res.json({
                status:'Success'
            })
        }
    })
})

const port = 5000;

app.get('/',(req,res)=>{
    res.send('Hello from db its working');
})

//DB connection
const { MongoClient, ServerApiVersion, ObjectId, ObjectID } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aqab4.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(err => {
  const adminCollection = client.db(process.env.DB_NAME).collection("admins");
  const serviceCollection = client.db(process.env.DB_NAME).collection("services");
  const orderCollection = client.db(process.env.DB_NAME).collection("orders");
  const reviewCollection = client.db(process.env.DB_NAME).collection("review");
  
  app.post('/addAdmin',(req, res)=>{
    const email = req.body;
    adminCollection.insertOne(email)
    .then(result=>{
        res.send(result.acknowledged);
    })
  })
  app.post('/isAdmin',(req, res)=>{
    const email = req.body.email;
    adminCollection.find({email:email})
    .toArray((err, documents)=>{
        res.send(documents.length > 0);
    })
  })

  app.post('/addServices',(req,res)=>{
    const img = req.files.img;
    const category = req.body.category;
    const price = req.body.price;
    const title = req.body.title;
    // console.log(category, price, title, img);
    const filePath = `${__dirname}/services/${img.name}`;
    img.mv(filePath,err=>{
        if(err){
            console.log(err);
            res.status(500).send({msg:"Failed to upload image"})
        }
        const newImg = fs.readFileSync(filePath);
        const encImg = newImg.toString('base64');
        var image = {
            contentType: req.files.img.mimetype,
            size: req.files.img.size,
            img: Buffer.from(encImg, 'base64')
        };

        serviceCollection.insertOne({category,price,title,image})
        .then(result => {
            fs.remove(filePath, err=>{
                if(err){
                    res.status(500).send({msg:"Failed to upload image"})
                }
                res.send(result.acknowledged);
            })
        })
    })
  })

  app.post('/findService', (req, res)=>{
    const service = req.body.service;
    serviceCollection.find({category:service})
    .toArray((err,documents)=>{
        res.send(documents);
    })
  })

  app.delete('/deleteService/:id',(req,res)=>{
    serviceCollection.deleteOne({_id: ObjectID(req.params.id)})
    .then(result => {
        res.send(result.deletedCount > 0);
    })
  })
  app.patch('/updateService/:id',(req,res)=>{
    // console.log(req.params.id);
    // console.log(req.body);
    serviceCollection.updateOne({_id: ObjectId(req.params.id)},{
        $set:{price:req.body.price, title:req.body.title}
    })
    .then(result => res.send(result))
  })

  app.get('/allServices',(req,res)=>{
    serviceCollection.find({})
    .toArray((err,documents)=>{
        res.send(documents);
    })
  })

  app.post('/addOrder',(req, res)=>{
    const order = req.body;
    // console.log(order)
    orderCollection.insertOne(order)
    .then(result =>{
        res.send(result.acknowledged);
    })
  })
  app.post('/getBooking',(req,res)=>{
    const user = req.body.userEmail;
    console.log(user);
    orderCollection.find({email:user})
    .toArray((err,documents)=>{
        res.send(documents);
    })
  })

  app.get('/allOrders',(req,res)=>{
    orderCollection.find({})
    .toArray((err,documents)=>{
        res.send(documents);
    })
  })

  app.patch('/update/:id',(req,res)=>{
    // console.log(req.params.id);
    // console.log(req.body.status);
    orderCollection.updateOne({_id:ObjectId(req.params.id)},{
        $set:{status:req.body.status}
    })
    .then(result => res.send(result))
  })

  app.post('/addReview', (req, res)=>{
    const review = req.body;
    reviewCollection.insertOne(review)
    .then(result => {
        res.send(result.acknowledged);
    })
  })

  app.get('/allReviews', (req, res)=>{
    reviewCollection.find({})
    .toArray((err,documents)=>{
        res.send(documents)
    })
  })
});


app.listen(process.env.PORT || port);