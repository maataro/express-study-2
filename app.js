'use strict';

const debug = require('debug');
const debugInfo = debug('module:info');
setInterval(() => {
  debugInfo('some information.');
}, 1000);
const debugError = debug('module:error');
setInterval(() => {
  debugError('some error.');
}, 1000);

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
var session = require('express-session');
var passport = require('passport');
var GitHubStrategy = require('passport-github2').Strategy;

var GITHUB_CLIENT_ID = '35df2b0ee88e4d1b208b';
var GITHUB_CLIENT_SECRET = 'ce96d7bb8962eb08c94e32b620348a88f3866b89';

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

passport.use(new GitHubStrategy({
  clientID: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
  callbackURL: 'http://localhost:8000/auth/github/callback'
},
  function (accessToken, refreshToken, profile, done) {
    process.nextTick(function () {
      return done(null, profile);
    });
  }
));

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var photosRouter = require('./routes/photos');
var serverStatus = require('./routes/server-status');

var app = express();
app.use(helmet());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({ secret: '73b2b0ae3e059c77', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
// 第一引数にはパス、第二引数に ensureAuthenticated 関数、第三引数に Router オブジェクト
// を渡して呼び出すことで、そのパスへのアクセスに認証が必要となるような動作をする
app.use('/users', ensureAuthenticated, usersRouter);
app.use('/photos', photosRouter);
app.use('/server-status', serverStatus);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}

// GitHub への認証を行うための処理を、 GET で /auth/github にアクセスした際に行う
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] }),
  function (req, res) {
    console.info('GitHubへの認証実行中...');
});

// GitHub が利用者の許可に対する問い合わせの結果を送るパス へのハンドラを登録
app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function (req, res){
    res.redirect('/');
});

app.get('/login', function (req, res) {
  res.render('login');
});

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
