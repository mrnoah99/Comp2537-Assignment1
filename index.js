require("dotenv").config();
require("./utils.js");

const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bcrypt = require("bcrypt");
const Joi = require("joi");

const app = express();

const port = process.env.PORT || 3000;

const expireTime = 24 * 60 * 60 * 1000;

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;

var {database} = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

app.use(session({
    secret: node_session_secret,
        store: MongoStore,
        saveUninitialized: false,
        resave: true
}));

app.get('/nosql-injection', async (req,res) => {
        var username = req.query.user;

        if (!username) {
            res.send(`<h2>No username provided - try \"/nosql-injection?user=name\"</h2> <h3>or \"/nosql-injection?user[$ne]=name</h3>`);
            return;
        }
        console.log("User: " + username);

        const schema = Joi.string().max(20).required();
        const validationResult = schema.validate(username);

        if (validationResult.error != null) {
            console.log(validationResult.error);
            res.send("<h1 style='color:darkred;'>A NoSQL injection attack was detected!<h1>");
            return;
        }

        const result = await userCollection.find({username: username}).project({username: 1, password: 1, _id: 1}).toArray();

        console.log(result);

    res.send(`<h1>Hello ${username}</h1>`);
});



app.use(session({
    secret: node_session_secret,
    saveUninitialized: false,
    resave: true
}))

app.get("/", (req, res) => {
    res.send("<a href='/login'>Login</a><br><a href='/signup'>Sign Up</a>");
});

app.get("/login", (req, res) => {
    var html = `
    log in
    <form action='/loggingin' method='post'>
    <input name='username' type='text' placeholder='username'>
    <input name='password' type='password' placeholder='password'>
    <button>Submit</button>
    </form>`
    res.send(html);
});

app.get("/signup", (req, res) => {
    var html = `
    create user
    <form action='/submitUser' method='post'>
    <input name='username' type='text' placeholder='username'>
    <input name='password' type='password' placeholder='password'>
    <button>Submit</button>
    </form>`;
    res.send(html);
});

app.post("/submitUser", async (req, res) => {
    var username = req.body.username;
    var password = req.body.password;

        const schema = Joi.object(
            {
                username: Joi.string().alphanum().max(24).required(),
                password: Joi.string().min(4).max(20).required()
            });

        const validationResult = schema.validate({username, password});
        if (validationResult.error != null) {
            console.log(validationResult.error);
            res.redirect("/createUser");
            return;
        }

        var hashedPassword = await bcrypt.hash(password, saltRounds);

            await userCollection.insertOne({username: username, password: hashedPassword});
            console.log("Inserted user");
        
        var html = "Successfully created new user";
        res.send(html);
});

app.post("/loggingin", async (req, res) => {
    var username = req.body.username;
    var password = req.body.password;

        const schema = Joi.string().max(24).required();
        const validationResult = schema.validate(username);
        if (validationResult.error != null) {
            console.log(validationResult.error);
            res.redirect("/login");
            return;
        }

        const result = await userCollection.find({username: username}).project({username: 1, password: 1, _id: 1}).toArray();

        console.log(result);
        if (result.length != 1) {
            console.log("user not found");
            res.redirect("/login");
            return;
        }
        if (await bcrypt.compare(password, result[0].password)) {
            console.log("correct password");
            req.session.authenticated = true;
            req.session.username = username;
            req.session.cookie.maxAge = expireTime;

            res.redirect("/loggedin");
            return;
        }
        else {
            console.log("incorrect password");
            res.redirect("/login");
            return;
        }
});

app.get("/loggedin", (req, res) => {
    if (!req.session.authenticated) {
        res.redirect("/login");
    }
    var html = `
    You are logged in!
    <br><a href='/members'>Members</a>
    <br><a href='/logout'>Log Out</a>`;
    res.send(html);
});

app.get("/logout", (req, res) => {
        req.session.destroy();
    var html = `
    You are logged out.`;
    res.send(html);
});

app.get("/members", (req, res) => {
    if (!req.session.authenticated) {
        res.redirect("/login");
    }
    res.send("Members page");
});

app.get("*", (req, res) => {
    res.statusCode = 404;
    res.send("<h1>Error 404 page not found</h1>");

});

app.listen(port, () => {
    console.log("Node application running on port " + port);
});