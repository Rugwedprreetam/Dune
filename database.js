var mysql = require("mysql");




var connection = mysql.createPool({
    host: "db4free.net", port:3306 ,
    user: "rugwed",
    password: "Dune@2020" , 
    database:"samplelogin" ,connectionLimit:100,
    multipleStatements:true
    
});

module.exports = connection ;