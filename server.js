const http = require('http');
const bp = require('body-parser');
const express = require('express');

const app = express();
app.use(bp.urlencoded({ extended: true}));
app.use(bp.json());
const hostname = '127.0.0.1';
const port = 3000;

app.get("/api/users",(req, res)=>{
    var response ={
        isError: true,
        data: "You are unauthorized for this data"
    };
    res.send(JSON.stringify(response));
});

app.listen(port, hostname,()=>{
    console.log(`Server run is http://${hostname}:${port}/`);
});