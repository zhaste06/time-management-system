# time-management-system
Time Management System Project for CIS 4290

# Required Downloads:
- MongoDB & Robo3T
- Compiler/IDE (Ex. Visual Studio Code)
- Node.js

# To run the project locally:

In compiler:
- Download and install node modules "npm install"
- Start the application using "npm start"

In web browser:
- localhost:3000

# Creating accounts:
- To create an admin account: localhost:3000/admincreate

- To create a team leader/member account:
  + Log into admin account
  + Navigate to "All Users"
  + Create new user using "Add User" button
  + Create password through email verification
  
## Use AWS SES service:
To have access to AWS Simple Email Service (AWS SES) service from js code use AWS shared credentials.  
To use AWS shared credentials complete next steps:
  - Create `.aws` directory in user home folder, for example `/home/ubuntu/.aws`
  - Create file `credentials` in folder from above step, for example `/home/ubuntu/.aws/credentials`
  - Structure for credentials file:
    ```
    [ses]
    aws_access_key_id = ***
    aws_secret_access_key = ***    
    ```
  Instead `***` need specify AWS security key pair with access to AWS Simple Email Service.  


### UI Design and Style

|Built Using|Links|License|
|-------------|:-------------:|:-----:|
|![alt text](https://designrevision.com/favicons/favicon-32x32.png "Shards Dashboard Lite") Shards Dashboard Lite|[Website](https://designrevision.com/docs/shards-dashboard-lite/)|MIT|

### Front End

|Built Using|Links|License|
|-------------|:-------------:|:-----:|
|![alt text](https://getbootstrap.com/docs/4.3/assets/img/favicons/favicon-32x32.png "Bootstrap") Bootstrap|[Website](https://getbootstrap.com/)|MIT|
|![alt text](https://www.iconfinder.com/icons/252091/download/png/32 "jQuery") jQuery|[Website](https://jquery.com/)|MIT|
|![alt text](https://popper.js.org/favicon-32x32.png "Popper") Popper|[Website](https://popper.js.org/)|MIT|
|![alt text](https://material.io/favicon.ico "Material icons") Material icons|[Website](https://material.io/tools/icons/?style=baseline)|Apache License 2.0|
|![alt text](https://fontawesome.com/images/favicons/favicon-32x32.png "Font Awesome") Font Awesome|[Website](https://fontawesome.com/)||

### Back End

|Built Using|Links|License|
|-------------|:-------------:|:-----:|
|![alt text](https://nodejs.org/static/favicon.png "Node.js") Node.js|[Website](https://nodejs.org/en/)||
|![alt text](https://expressjs.com/images/favicon.png "Express") Express|[Website](https://expressjs.com/)|Creative Commons Attribution-ShareAlike 3.0|
|![alt text](https://www.mongodb.com/assets/images/global/favicon.ico "MongoDB") MongoDB|[Website](https://www.mongodb.com/)|Server Side Public License (SSPL)|
