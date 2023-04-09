require("dotenv").config();
const mysql = require("mysql");
const util = require('util');
const express = require("express");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIP_TEST_KEY);

const YOUR_DOMAIN = process.env.MY_URL;
// const encoder = bodyParser.urlencoded();
const nm = require('nodemailer');
// var cors = require('cors');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname+'/'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', __dirname);

app.use(express.json());

//////////////database connetion ///////////////////////////////////////

const connection = mysql.createPool({
  host: "db4free.net", port:3306 ,
  user: process.env.MYSQL_USERID,
  password: process.env.MYSQL_PASSWORD , 
  database:"rrrsdune" ,connectionLimit:100,
  multipleStatements:true
});

// connect to the database conformation ////////////////////////

// connection.connect(function(error){
//     if (error) throw error
//     else console.log("connection connected")
// });


const query = util.promisify(connection.query).bind(connection);

//////////////////// landing page ///////////////////////////////////////




app.get("/",function(req,res){
  
  res.sendFile(__dirname+"/opening.html");
})



/////////////////// paymemt ///////////////////////////////////////////////////

app.post("/payment", async (req, res) => {
  const { product } = req.body;
  const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
          {
              price_data: {
                  currency: "inr",
                  product_data: {
                      name: product.name,
                      images: [product.image],
                  },
                  unit_amount: product.amount * 100,
              },
              quantity: product.quantity,
          },
      ],
      mode: "payment",
      success_url: `${YOUR_DOMAIN}/paysucess?userId=${product.userId}&days=${product.days}&units=${product.units}`,
      cancel_url: `${YOUR_DOMAIN}/checl.html`,
  });
  
  res.json({ id: session.id });
});

app.get("/paysucess",(req,res)=>{
  const product = req.query;
  connection.query(`delete from sub_list2 where user_id = '${product.userId}'`);
  connection.query(`insert into sub_list2(user_id,start_date,end_date) values (? , localtimestamp(), adddate(localtimestamp() , interval ${product.days} ${product.units}))`,[product.userId],function(error,results,fields){});
  console.log(product.userId);
  res.render(__dirname+"/paysucess");
});

// app.get("/",function(req,res){
//   res.sendFile(__dirname + "/openingstyle.css");  
// })

// app.get("/",function(req,res){
//   res.sendFile(__dirname + "/images");
// })
/////////////////////////////////////////////////////////////

app.get("/login.html",function(req,res){
  
  res.render("/login.html",{is_invalid:false});
})

///////////////////////////////////// PROFILE //////////////////////////////////////////////////

app.post('/profile',  async (req,res)=>{
  var user_id  = req.body.User_id;
  
  const results1 = await (query(`select * from user_info where phonenumber = ${user_id}`)); 
  const results2 = await query(`select * from sub_list2 where user_id = ${user_id}`);
  res.render(__dirname+"/profile",{user_name:results1[0].user_name,email:results1[0].email,phonenumber:results1[0].phonenumber,start:results2[0]?.start_date?.toLocaleString(),end:results2[0]?.end_date?.toLocaleString()});
})

//////////////////////////////////////////////////////////////////////////////////////


////////////////////////  SIGN UP //////////////////////////////////////

app.post("/signup",function(req,res){
  var user_id = req.body.User_id;
  var user_password = req.body.pswd;
  var user_email = req.body.email;
  var user_phone = req.body.phonenumber;
  connection.query("insert into user_info(user_name,password,phonenumber,email) values (? , ?, ?, ?)",[user_id,user_password,user_phone,user_email],function(error,results,fields){
  
    if(error) console.log(error);
    else if(results.affectedRows>0){
      res.render(__dirname+"/subscription",{user_id:user_phone});
    } else{
      res.end("/");
    }
  })
})

//////////////////////////// frsa //////////////////////////////////

app.get("/subscription",(req,res)=>{
  var user_id = req.query.uid;
  console.log(user_id);
  res.render(__dirname+"/subscription",{user_id:user_id});
})




//////////////////////////////  LOGIN /////////////////////////////////////////


app.post("/login",function(req,res){
  var user_id = req.body.User_id;
  var user_password = req.body.pswd;
  connection.query("select * from user_info where phonenumber = ? and password = ?",[user_id,user_password],function(error,results,fields){
    if(error) console.log(error);
    else if(results.length > 0 ){
      connection.query(`select *from sub_list2 where user_id = '${user_id}'`,(error,results,fields)=>{
        if(error) console.log(error);
        else if(results.length>0&&results[0].end_date>=(new Date())){
          res.redirect("/movies?uid="+user_id);
        }else{ 
          res.render(__dirname+"/subscription",{user_id:user_id});
        }
      });

    } else{
      res.sendFile(__dirname+"/login.html");
    }
  })
})

app.get("/movies",function(req,res){
  res.render(__dirname+"/movies",{user_id:req.query.uid});
})

app.post("/short-movies",function(req,res){
  var user_id = req.body.User_id;
  console.log(user_id);
  res.render(__dirname+"/shortmovies",{user_id:user_id});

  // res.sendFile(__dirname+"/shortmovies.html");
})

// app.get("/subscription",function(req,res){
//   res.render(__dirname+"/subscription",{user_id:user_phone});
// })

///////////////////////////////////////////////////////////
app.get("/pora",function(req,res){
  res.sendFile(__dirname + "/checl.html")
})

///////////////    OTP SECTION //////////////////////////////////////     

let savedOTPS = {

};
var transporter = nm.createTransport(
    {
        host: "smtp.gmail.com",
        port: 587,
        // secure: false,
        auth: {
            user: process.env.GMAIL_USERID,
            pass: process.env.GMAIL_APPKEY
        },
        tls: {rejectUnauthorized: false}
    }
);

app.post('/sendotp', (req, res) => {
    let email = req.body.Email;
    let digits = '0123456789';
    let limit = 4;
    let otp = ''
    for (i = 0; i < limit; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    var options = {
        from: 'rprreetam@gmail.com',
        to: `${email}`,
        subject: "Dune verification code",
        html: `<p>Enter the otp: ${otp} to verify your email address</p>`

    };
    savedOTPS[email] = otp;
    console.log(savedOTPS);
    transporter.sendMail(
        options, function (error, info) {
            if (error) {
                console.log(error);
                res.status(500).send("couldn't send");
            }
            else {
                setTimeout(
                    () => {
                        delete savedOTPS.email
                        console.log("time out");
                    }, 60000
                )
                res.render(__dirname+"/otp.html",{Email:email});
            }
        }
    )
})

app.post('/verifyotp', (req, res) => {
    let otprecived = req.body.otp;
    let email = req.body.email;
    console.log(savedOTPS);
    if (savedOTPS[email] == otprecived) {
        res.render(__dirname+"/sign_up.html",{Email:email});
    }
    else {
        res.status(500).send("Invalid OTP")
    }
})




/////////////////////////////////////////////////////

app.listen(3050);


// console.log('1');
// var sleep = require('system-sleep');
// sleep(5*1000);

