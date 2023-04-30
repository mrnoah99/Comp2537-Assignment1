const express = require("express");

const session = require("express-session");

const app = express();

const port = process.env.PORT || 3020;

// var numPageHits = 0;

const node_session_secret = 'cfb5nbtf-fd56-jm21-gfb7-5ybgu67vchjm';

app.use(session({
    secret: node_session_secret,
    saveUninitialized: false,
    resave: true
}))

app.get("/", (req, res) => {
    if (req.session.numPageHits == null) {
        req.session.numPageHits = 0;
    } else {
        req.session.numPageHits++;
    }
    res.send("You have visited this page " + req.session.numPageHits + " times!");
});

app.listen(port, () => {
    console.log("Node application running on port " + port);
});