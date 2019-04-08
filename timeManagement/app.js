var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
// To catch whatever is typed in the form
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
//var flash = require('express-flash');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var app = express();


// Load Timesheet and User Model into variables
require('./models/Timesheet');
var Timesheet = mongoose.model('Timesheet');
require('./models/User');
var User = mongoose.model('User');
require('./models/Project');
var Project = mongoose.model('Project');
var request = require('./models/User');

passport.use(new LocalStrategy(function (username, password, done) {
  // Check for the user and match username with name that is passed in
  User.findOne({ username: username }, function (err, user) {
    if (err) return done(err);
    // Null as the error, false is no user, and message
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    // Match password
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Incorrect password.' });
      }
    });
  });
}));

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

request.userSchema.pre('save', function (next) {
  var user = this;
  var SALT_FACTOR = 5;
  if (!user.isModified('password')) return next();

  bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
    if (err) return next(err);
    bcrypt.hash(user.password, salt, null, function (err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

request.userSchema.methods.comparePassword = function (candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

// Connect to mongoose. Pass the database (local, MLAB, etc)
// mongoose.connect('mongodb://localhost:27017/db');
mongoose.connect('mongodb://localhost/ObenDB', {
  useMongoClient: true  // if not, error msg
})
  .then(() => console.log('\n\nMongoDB Connected!!!...'))  // catch
  .catch(err => console.log(err));  // if can't connect, display error

// Middleware
app.set('views', path.join(__dirname, 'views'));

// EJS Middleware
app.set('view engine', 'ejs');

app.use(favicon());
app.use(logger('dev'));

// Body parser middleware -> 3rd party module
// So we can access whatever is submitted and get the form values
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());

app.use(session({ secret: 'session secret key' }));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Static folder. Set public folder
// Joins 2 paths together: Current directory (_dirname) and folder name --> Sets public folder to be the Express static folder 
app.use(express.static(path.join(__dirname, 'public')));

// Connect Flash
app.use(flash());

// Global variables
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  next();
});

// Express session midleware
app.use(session({
  secret: 'stuff',  // Can be anything we want
  resave: false,
  // resave: true,
  // store: new MongoStore({url:"mongodb://localhost:27017/db"}),
  store: new MongoStore({ url: "mongodb://localhost/ObenDB" }),
  saveUninitialized: true,
  cookie: {
    expires: 600000
  }
}));

// Express Messages Middleware
app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

// ROUTES
// Index Route. Get request, the home URL.
app.get('/', (req, res) => {
  const title = 'Test Tile';
  // res.send('INDEX');
  res.render('index', {
    user: req.user
  });
});
app.post('/', function (req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    //let errors = [];
    if (err) return next(err)
    if (!user) {
      req.flash('error_msg', 'Please enter a valid user');
      //return res.redirect('/error')
      return res.redirect('/')
    } else if (user.verifyUserToken !== undefined) {
      return res.redirect('/')
      // return res.redirect('/error')
    }
    req.logIn(user, function (err) {
      if (err) return next(err);
      req.session.username = user.employeeID;
      return res.redirect('/dashboard/' + user.employeeID);
    });
  })(req, res, next);
});
// *******************************************************************

//app.use('/logout', loginOutRT); // if it goes to /jobs, call jobs from LOAD ROUTES
app.get('/logout', function (req, res) {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/');
});

// *******************************************************************
app.get('/error', function (req, res) {
  res.render('error');
});






app.get('/newpassword/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }
    res.render('passwordchange', {
      user: req.user
    });
  });
});



    

// *******************************************************************
// TEAM LEADER APPROVES TIMESHEETS
app.get('/approval/:employeeID', function(req, res){

 
  User.findOne({ employeeID: req.params.employeeID}, function(err, user) {
    if (!user) {
      
      return res.redirect('/error');
    } else if(user.level != 2) {
      return res.redirect('/error');
    }

   
   
    Timesheet.find({teamLead: req.params.employeeID, status: "Pending"}, function(err,  allTimesheets){
      if(allTimesheets != null) {
       
  
        res.render('approval', {
          user: req.user,
          allTimesheets
        });
       
      }
      
    });
    

  });

});

app.post('/approval/:employeeID', function(req, res){
 

  Timesheet.findOne({timesheetID: req.body.timesheetID }, function (err, timesheet) {

    timesheet.status = "Approved";

    timesheet.save(function (err) {
      req.flash('success_msg', 'You have approved a Timesheet');
      res.redirect('/approval/' + req.params.employeeID);
    });
 
   

  });
    


});

// *******************************************************************



// *******************************************************************
// ASSIGN PROJECTS TO TEAM MEMBERS
app.get('/project/:employeeID', function(req, res){


 
  User.findOne({ employeeID: req.params.employeeID}, function(err, user) {
    if (!user) {
      
      return res.redirect('/error');
    } else if(user.level != 2) {
      return res.redirect('/error');
    }

   
   
    User.find({department: user.department, level: "3"}, function(err, allUser){
      if(allUser != null) {
        Project.find({}, function(err, projects) {
          res.render('project', {
            user: req.user,
            allUser,
            projects
        });
       
          
        });
      }
    });
    

  });

});

app.post('/project/:employeeID', function(req, res){
  
    function makeProjectID(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
    for (var i = 0; i < length; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  
    return text;
  }

  var project = new Project({
    projectID: makeProjectID(10),
    employeeID: req.body.team_members,
    status: req.body.status,
    projectName: req.body.project_name,
    teamLead: req.params.employeeID,
    team: req.body.team
  
    });
  
  project.save(function(err) {
    res.redirect('/project/'+ req.params.employeeID);
  })

});

// *******************************************************************


// *******************************************************************
// PASSWORD CHANGE
app.get('/passwordchange/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }
    res.render('passwordchange', {
      user: req.user
    });
  });
});

app.post('/passwordchange/:employeeID', function (req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    if (err) return next(err)
    if (!user) {
      return res.redirect('/login');
    }
  });

  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }
    user.password = req.body.newPassword;
    user.save(function (err) {
      return res.redirect('/profile/' + user.employeeID);
    });
  });
});

// *******************************************************************
app.get('/employee/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {

      return res.redirect('/error');
    } else if (user.level == 3) {
      return res.redirect('/error');
    }

    User.find({}, function (err, allUser) {
      if (allUser != null) {
        res.render('employee', {
          user: req.user,
          allUser
        });
      }
    });
  });
});

// *******************************************************************
app.get('/profile/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }
    res.render('profile', {
      user: req.user
    });
  });
});

app.post('/profile/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }
    user.phone = req.body.phone;
    user.save(function (err) {
      req.flash('success_msg', 'Profile updated');
      return res.redirect('/profile/' + user.employeeID);
    });
  });
});

// *******************************************************************
// ADD NEW USER
app.get('/user/:employeeID', function (req, res) {
  res.render('user', {
    user: req.user
  });
});

app.post('/user/:employeeID', function (req, res, next) {
  var user = new User({
    username: req.body.username,
    password: "1233",
    employeeID: req.body.employeeID,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    department: req.body.department,
    jobTitle: req.body.jobTitle,
    level: req.body.level,
    workingStatus: req.body.workingStatus,
    startDate: req.body.startDate,
    team: req.body.team,
    fullTimePartTime: req.body.fullTimePartTime
  });

  user.save(function (err) {
    async.waterfall([
      function (done) {
        crypto.randomBytes(20, function (err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function (token, done) {

        user.verifyUserToken = token;
        user.verifyUserExpires = Date.now() + 3600000; // 1 hour

        user.save(function (err) {
          done(err, token, user);
        });

      },
      function (token, user, done) {
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
        smtpTransport.sendMail(mailOptions, function (err) {
          req.flash('info', 'An e-mail has been sent to ' + user.username + ' with further instructions.');
          done(err, 'done');
        });
      }
    ], function (err) {
      if (err) return next(err);
      res.redirect('/employee/' + req.params.employeeID);
    });
    req.flash('success_msg', 'An e-mail has been sent to ' + user.username + ' with further instructions.');
    res.redirect('/employee/' + req.params.employeeID);
  });

});


// *******************************************************************
// ADD NEW TIMESHEET
app.get('/timesheet/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }
  var allmyproject = [];
  var allmyprojectID = [];
  var teamLead;

  Project.find({team: user.team, status: 'Open'}, function (err, allOpenedProject) {
    if (allOpenedProject != null) {

          for (var i = 0; i < allOpenedProject.length; i++) {
              var myProject = allOpenedProject[i].employeeID;
             //
              var projectArray = myProject.split(","); 
             for (j =0; j < projectArray.length; j++){
              

               if(projectArray[j] == user.employeeID) {
                
                 allmyproject.push(allOpenedProject[i].projectName);
                
                 allmyprojectID.push(allOpenedProject[i].projectID);
                 teamLead = allOpenedProject[i].teamLead;
               }
             }

          }

          res.render('timesheet', {
            user: req.user,
            allmyproject,
            allmyprojectID,
            teamLead
          });
        
  

    } else {
      allmyproject.push("No Assigned Project(s)");
      res.render('timesheet', {
        user: req.user,
        allmyproject
      });
    
     
    }
  });

});

});

function makeProjectID(length) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}


 


app.post('/timesheet/:employeeID', function (req, res, next) {
  var timesheet = new Timesheet({
    timesheetID: makeProjectID(11),
    employeeID: req.body.employeeID,
    date: req.body.date,
    percentage: req.body.percentage,
    project: req.body.project,
    allocation: req.body.allocation,
    status: "Pending",
    teamLead: req.body.teamLead
  });

  



  timesheet.save(function (err) {
    req.flash('success_msg', 'A new Timesheet has been entered');
    res.redirect('/timesheet/' + req.params.employeeID);
  });
});


// *******************************************************************
// TIMESHEET SUMARY
app.get('/timesheetsummary/:employeeID', function (req, res) {
  Timesheet.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      // req.flash('error_msg', 'No Timesheet found');
      return res.redirect('/dashboard/' + req.params.employeeID);
    }
    Timesheet.find({}, function (err, allUser) {
      if (allUser != null) {
        User.find({employeeID: req.params.employeeID}, function (err, userInfo) {
          if(userInfo[0].level != '0'){
            filter_row = allUser.filter( x => x.employeeID == req.params.employeeID);
          }else{
            filter_row = allUser;
          }
          
          res.render('timesheetsummary', {
            user: req.user,
            allUser,
            userInfo,
            filter_row
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


app.get('/dashboard/:employeeID', function (req, res) {
  User.findOne({ employeeID: req.params.employeeID }, function (err, user) {
    if (!user) {
      return res.redirect('/error');
    } else if (user.employeeID != req.user.employeeID) {
      return res.redirect('/error');
    }

    var allmyproject = [];
    var allmyprojectID = [];

    Project.find({team: user.team, status: 'Open'}, function (err, allOpenedProject) {
      if (allOpenedProject != null) {

            console.log(allOpenedProject);
            for (i = 0; i < allOpenedProject.length; i++) {
                var myProject = allOpenedProject[i].employeeID;
               //
                var projectArray = myProject.split(","); 
               for (j =0; j < projectArray.length; j++){
                

                 if(projectArray[j] == user.employeeID) {
                  
                   allmyproject.push(allOpenedProject[i].projectName);
                   allmyprojectID.push(allOpenedProject[i].projectID);
                   console.log(allmyproject[0]);
                 }
               }

            }

            res.render('dashboard', {
              user: req.user,
              allmyproject,
              allmyprojectID
            });
    

      }
    });

   


  });
});

// *******************************************************************


// *******************************************************************
app.get('/forgot', function (req, res) {
  res.render('forgot', {
    user: req.user
  });
});

app.post('/forgot', function (req, res, next) {
  async.waterfall([
    function (done) {
      crypto.randomBytes(20, function (err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function (token, done) {
      User.findOne({ username: req.body.email }, function (err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function (err) {
          done(err, token, user);
        });
      });
    },
    function (token, user, done) {
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
      smtpTransport.sendMail(mailOptions, function (err) {
        req.flash('info', 'An e-mail has been sent to ' + user.username + ' with further instructions.');
        done(err, 'done');
      });

      res.redirect('/');
    }
  ], function (err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});
// *******************************************************************


// *******************************************************************
app.get('/reset/:token', function (req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {
      user: req.user
    });
  });
});


app.post('/reset/:token', function (req, res) {
  async.waterfall([
    function (done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function (err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save(function (err) {
          req.logIn(user, function (err) {
            res.redirect('/dashboard/' + user.employeeID);
            done(err, user);
          });
        });
      });
    },
    function (user, done) {
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
      smtpTransport.sendMail(mailOptions, function (err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ]);
});

// *******************************************************************
app.get('/validate/:token', function (req, res) {
  User.findOne({ verifyUserToken: req.params.token, verifyUserExpires: { $gt: Date.now() } }, function (err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('validate', {
      user: req.user
    });
  });
});


app.post('/validate/:token', function (req, res) {
  async.waterfall([
    function (done) {
      User.findOne({ verifyUserToken: req.params.token, verifyUserExpires: { $gt: Date.now() } }, function (err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.password = req.body.password;
        user.verifyUserToken = undefined;
        user.verifyUserExpires = undefined;

        user.save(function (err) {
          req.logIn(user, function (err) {
            res.redirect('/dashboard/' + user.employeeID);
            done(err, user);
          });
        });
      });
    },
    function (user, done) {
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
      smtpTransport.sendMail(mailOptions, function (err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ]);
});
// *******************************************************************

module.exports = app;