var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));

var session = require ('express-session');

app.use(session ({
  secret: 'anything',
  resave: false,
  saveUninitialized: true
})); 

app.use(express.static(__dirname + '/public'));

var checkUser = function (req, res, next) {
  if (req.session && req.session.username) {
    next();
  } else {
    res.redirect('/login');
  }
};

app.get('/login', function (req, res) {
  res.render('login');
});

app.get('/', checkUser,
function(req, res) {
  res.render('index');
});

app.post('/login', function (req, res) {

  var username = req.body.username;
  var password = req.body.password;

  db.knex.select('*').from('users')
  .where({username: username}).then(function(found) {
    if (found.length < 1) {
      res.redirect('/login');
    } else {
      req.session.username = username;
      res.redirect('/');
    }
  })
  .catch(function (error) {
    res.redirect('/login');
  });
});


app.get('/create', checkUser, 
function(req, res) {
  res.render('index');
});

app.get('/links', checkUser, 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/signup', function(req, res) {
  console.log('&&&&&&&&&&&&: ', req.body);
  db.knex.insert({username: req.body.username, password: req.body.password})
  .into('users').then(function () {
    res.redirect('/');
  });
  
});

app.post('/links',  
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
