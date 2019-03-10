var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session')
var mongoose = require('mongoose');
var nodemailer = require('nodemailer');
var MongoStore = require('connect-mongo')(session);
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt-nodejs');
var async = require('async');
var crypto = require('crypto');
var flash = require('express-flash');


passport.use(new LocalStrategy(function(username, password, done) {
  User.findOne({ username: username }, function(err, user) {
    if (err) return done(err);
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    user.comparePassword(password, function(err, isMatch) {
      if (isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Incorrect password.' });
      }
    });
  });
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

var userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  employeeID: { type: String, required: true, unique: true},
  firstName: { type: String, required: true},
  lastName: { type: String, required: true},
  phone: String,
  department: { type: String, required: true },
  jobTitle: { type: String, required: true },
  level: { type: String, required: true },
  duration: { type: String, required: true },
  picture: String,
  verifyUserToken: String,
  verifyUserExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

var timesheetSchema = new mongoose.Schema({
  employeeID: { type: String, required: true },
  date: { type: String, required: true },
  percentage: { type: String, required: true },
  project: { type: String, required: true },
  allocation: { type: String, required: true }
});




userSchema.pre('save', function(next) {
  var user = this;
  var SALT_FACTOR = 5;

  if (!user.isModified('password')) return next();

  bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
    if (err) return next(err);

    bcrypt.hash(user.password, salt, null, function(err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});



userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

var User = mongoose.model('User', userSchema);
var Timesheet = mongoose.model('Timesheet', timesheetSchema);
mongoose.connect('mongodb://localhost:27017/db');



var app = express();

// Middleware
app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'ejs');
app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(session({ secret: 'session secret key' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());

app.use(session({
  secret: 'stuff',
  resave: false,
  store: new MongoStore({url:"mongodb://localhost:27017/db"}),
  saveUninitialized: true,
    cookie: {
        expires: 600000
    }
}));


// Routes

app.get('/error', function(req, res){
  res.render('error');
});

app.get('/newpassword/:employeeID', function(req, res){
  User.findOne({ employeeID: req.params.employeeID}, function(err, user) {
    if (!user) {
      
      return res.redirect('/error');
    } else if(user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }

    res.render('passwordchange', {
      user: req.user
    });
  });
  
});

app.get('/employee/:employeeID', function(req, res){
  User.findOne({ employeeID: req.params.employeeID}, function(err, user) {
    if (!user) {
      
      return res.redirect('/error');
    } else if(user.level == 3) {
      return res.redirect('/error');
    }

    User.find({}, function(err, allUser){
      if(allUser != null) {
        res.render('employee', {
          user: req.user,
          allUser
          
        });
      }
    });
    

  });
  
});





app.get('/passwordchange/:employeeID', function(req, res){
  User.findOne({ employeeID: req.params.employeeID}, function(err, user) {
    if (!user) {
      
      return res.redirect('/error');
    } else if(user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }

    res.render('passwordchange', {
      user: req.user
    });
  });
  
});


app.post('/passwordchange/:employeeID', function(req, res, next) {

  passport.authenticate('local', function(err, user, info) {
    if (err) return next(err)
    if (!user) {
      return res.redirect('/login');
    } 



    

    


    
  });


  User.findOne({ employeeID: req.params.employeeID}, function(err, user) {
    if (!user) {
      
      return res.redirect('/error');
    } else if(user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }

    user.password = req.body.newPassword;


    

   
    user.save(function(err) {
     
      return res.redirect('/profile/' + user.employeeID);
    });

   
  });







});




app.get('/profile/:employeeID', function(req, res){


  User.findOne({ employeeID: req.params.employeeID}, function(err, user) {
    if (!user) {
      
      return res.redirect('/login');
    } else if(user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }

    res.render('profile', {
      user: req.user
    });


   
  });



});


app.post('/profile/:employeeID', function(req, res){


  User.findOne({ employeeID: req.params.employeeID}, function(err, user) {
    if (!user) {
      
      return res.redirect('/error');
    } else if(user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }

    user.phone = req.body.phone;


    

   
    user.save(function(err) {
     
      return res.redirect('/profile/' + user.employeeID);
    });

   
  });



});



app.get('/user/:employeeID', function(req, res){
  res.render('user', {
    user: req.user
  });

});

app.post('/user/:employeeID', function(req, res, next) {
  var user = new User({
    username: req.body.username,
    password: "1233",
    employeeID:req.body.employeeID,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    department: req.body.department,
    jobTitle: req.body.jobTitle,
    level: req.body.level,
    duration: req.body.duration

    });

  user.save(function(err) {
    
  
      async.waterfall([
        function(done) {
          crypto.randomBytes(20, function(err, buf) {
            var token = buf.toString('hex');
            done(err, token);
          });
        },
        function(token, done) {

          user.verifyUserToken = token;
            user.verifyUserExpires = Date.now() + 3600000; // 1 hour
    
            user.save(function(err) {
              done(err, token, user);
            });

        },
        function(token, user, done) {
          var smtpTransport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: '5bitsoftwareteam@gmail.com',
              pass: 'cppcispn1!!'
            }
          });
          var mailOptions = {
            to: user.username,
            from: '5bitsoftwareteam@gmail.com',
            subject: 'Login Instrusction for your Time Managment Account',
            text: 'You are receiving this because your account has been created.\n\n' +
              'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
              'http://' + req.headers.host + '/validate/' + token + '\n\n' +
              'If you did not request this, please ignore this email.\n'
          };
          smtpTransport.sendMail(mailOptions, function(err) {
            req.flash('info', 'An e-mail has been sent to ' + user.username + ' with further instructions.');
            done(err, 'done');
          });
    
      
        }
      ], function(err) {
        if (err) return next(err);
        res.redirect('/employee/'+ req.params.employeeID);
      });








      
        res.redirect('/employee/'+ req.params.employeeID);
    });

});

app.get('/timesheet/:employeeID', function(req, res){


 
  res.render('timesheet', {
    user: req.user
  });

});


app.post('/timesheet/:employeeID', function(req, res, next) {
  var timesheet = new Timesheet({
    employeeID: req.body.employeeID,
    date: req.body.date,
    percentage: req.body.percentage,
    project: req.body.project,
    allocation: req.body.allocation
  

    });

    timesheet.save(function(err) {
    



      
        res.redirect('/timesheet/'+ req.params.employeeID);
    });

});

app.get('/timesheetsummary/:employeeID', function(req, res){
  Timesheet.findOne({ employeeID: req.params.employeeID}, function(err, user) {
    if (!user) {
      
      return res.redirect('/error');
    } 
    Timesheet.find({}, function(err, allUser){
      if(allUser != null) {
        User.find({}, function(err, userInfo) {
          
          res.render('timesheetsummary', {
            user: req.user,
            allUser,
            userInfo
            
          });
        });
       
      }
    });
    

  });
  
});


/*

app.get('/timesheetsummary/:employeeID', async function(req, res){
  
  Promise.all()    
  .then(result =>{
    if (result == 1){
      res.render('timesheetsummary', {
        user: req.user,
        allUser: allUser
        
      });
    }
  })
  .catch((err) => {
    console.log(err.message)
  });

  
 


  return new Promise(function(resolve, reject){
    var allUser = [];
    User.findOne({ employeeID: req.params.employeeID}, function(err, user) {
      if (!user) {
        
        return res.redirect('/error');
      } else if (user.level == 0 || user.level == 1){
        User.find({}, function(err, Users) {
         
          for(var i = 0; i < Users.length; i++){
            Timesheet.find({employeeID: Users[i].employeeID}, function(err, allUserTimesheet) {
        
  
              allUser.push(allUserTimesheet);
              console.log(allUserTimesheet +'dsfffff'+ i);
              
            
               
            
              
            });
            
          }
  
         resolve(1);
          
        
        });
        
  
      } else if (user.level == 2) {
        
      } else {
  
      }
  
      
  
    });
  })
 


  
});


*/


app.get('/', function(req, res){
  res.render('index', {
    user: req.user
  });
});

app.get('/dashboard/:employeeID', function(req, res) {


  User.findOne({ employeeID: req.params.employeeID}, function(err, user) {
    if (!user) {
      
      return res.redirect('/error');
    } else if(user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }

    res.render('dashboard', {
      user: req.user
    });


   
  });


});




app.post('/', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) return next(err)
    if (!user) {
      return res.redirect('/error')
    } else if(user.verifyUserToken !== undefined) {
      return res.redirect('/error')
    }


    req.logIn(user, function(err) {
      if (err) return next(err);
      req.session.username = user.employeeID;
      return res.redirect('/dashboard/'+ user.employeeID);
    });

    
  })(req, res, next);
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/forgot', function(req, res) {
  res.render('forgot', {
    user: req.user
  });
});

app.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ username: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: '5bitsoftwareteam@gmail.com',
          pass: 'cppcispn1!!'
        }
      });
      var mailOptions = {
        to: user.username,
        from: '5bitsoftwareteam@gmail.com',
        subject: 'Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('info', 'An e-mail has been sent to ' + user.username + ' with further instructions.');
        done(err, 'done');
      });

      res.redirect('/');
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

app.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {
      user: req.user
    });
  });
});


app.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save(function(err) {
          req.logIn(user, function(err) {
            res.redirect('/dashboard/'+ user.employeeID);
            done(err, user);
          });
        });
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: '5bitsoftwareteam@gmail.com',
          pass: 'cppcispn1!!'
        }
      });
      var mailOptions = {
        to: user.email,
        from: '5bitsoftwareteam@gmail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ]);
});


app.get('/validate/:token', function(req, res) {
  User.findOne({ verifyUserToken: req.params.token, verifyUserExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('validate', {
      user: req.user
    });
  });
});


app.post('/validate/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ verifyUserToken: req.params.token, verifyUserExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.password = req.body.password;
        user.verifyUserToken = undefined;
        user.verifyUserExpires = undefined;

        user.save(function(err) {
          req.logIn(user, function(err) {
            res.redirect('/dashboard/'+ user.employeeID);
            done(err, user);
          });
        });
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: '5bitsoftwareteam@gmail.com',
          pass: 'cppcispn1!!'
        }
      });
      var mailOptions = {
        to: user.username,
        from: '5bitsoftwareteam@gmail.com',
        subject: 'Your account has been verified',
        text: 'Hello,' + user.firstName + user.lastName + '\n\n' +
          'This is a confirmation that your account ' + user.username + ' has just been verifiied.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ]);
});




module.exports = app;
