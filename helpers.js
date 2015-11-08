var exec = require('child_process').exec;
var fs = require('fs');
module.exports = {
    usersList: "./users/users.json",
    init: function(config, events) {
        var userExists = this.checkIfUserExists(config.user);
        if(!userExists) {
            if(this.makeUser(config.user, config.password)) {
                this.init();
            }else {
                return "Error while Creating a new user";
            }
        }else {
        //user Exists
           var passwordIsValid = this.checkUserPassword(config.user, config.password);
           if(passwordIsValid) {
                console.log("user password is valid accessing his folder for git clone");
                this.cloneProcess(config.gitClonePath, config.user, events);
           }else {
                return "The user name you used already exists but your password is unvalid, please choose another user name or use correct password";
           }
        }
    },
    cloneProcess: function(gitClonePath, userName, events) {
        exec("git clone " + gitClonePath, {cwd: "users/" + userName}, function (error, stdout, stderr) {
            if (error === null) {
                console.log("git clone is done at users/" + userName + " folder");
                events.emit("operationsFinished", {
                    "message": "Git clone was done successfully"
                });
            }else {
                console.log('error: ' + error);
            }
        });
    },
    checkIfUserExists: function(userName) {
        var users = JSON.parse(fs.readFileSync("./users/users.json"));
        if(users[userName]) {
            return true;
        }else {
            return false;
        }
    },
    makeUser: function(userName, password) {
        var users = JSON.parse(fs.readFileSync(this.usersList));
        users[userName] = password;
        fs.writeFile(this.usersList, JSON.stringify(users, null, 4), function (err) {
            if (err) return false;
            fs.mkdirSync('users/' + userName);
            console.log("Directory is created for " + userName);
            console.log("user " + userName + ' is created');
            return true;
        });
    },
    checkUserPassword: function(userName, password) {
        var users = JSON.parse(fs.readFileSync(this.usersList));
        if(users[userName] === password) {
            return true;
        }else {
            return false;
        }
    }
}