var exec = require('child_process').exec;
var fs = require('fs');
module.exports = {
    usersList: "./users/users.json",
    init: function(config, events) {
        var userExists = this.checkIfUserExists(config.user);
        if(!userExists) {
            if(this.makeUser(config.user, config.password)) {
                this.init(config, events);
            }else {
                events.emit("operationsFinished", {
                    "message": "Error while Creating a new user"
                });
            }
        }else {
        //user Exists
           var passwordIsValid = this.checkUserPassword(config.user, config.password);
           if(passwordIsValid) {
                console.log("user password is valid accessing his folder for git clone");
                this.cloneProcess(config.gitClonePath, config.user, events);
           }else {
                events.emit("operationsFinished", {
                    "message": "The user name you used already exists but your password is unvalid, please choose another user name or use correct password"
                });
           }
        }
    },
    cloneProcess: function(gitClonePath, userName, events) {
        exec("git clone " + gitClonePath, {cwd: "users/" + userName}, function (error, stdout, stderr) {
            if (error === null) {
                events.emit("operationsFinished", {
                    "message": "git clone is done at users/" + userName + " folder"
                });
            }else {
                events.emit("operationsFinished", {
                    "message": "Git clone error: " + error
                });
            }
        });
    },
    compile: function(config, events) {
        var userExists = this.checkIfUserExists(config.user);
        if(!userExists) {
            events.emit("operationsFinished", {
                "message": "User with name you have in config file does not exist, run 'init' command to create one"
            });
        }else {
        //user Exists
           var passwordIsValid = this.checkUserPassword(config.user, config.password);
           if(passwordIsValid) {
                console.log("user password is valid accessing his folder for compilation");
                this.compileProcess(config, events);
           }else {
                events.emit("operationsFinished", {
                    "message": "The user name you used already exists but your password is unvalid, please choose another user name or use correct password"
                });
           }
        }
    },
    compileProcess: function(config, events) {
        var gitRepoNameStartIndex = config.gitClonePath.lastIndexOf("/"),
            gitRepoNameEndIndex = config.gitClonePath.lastIndexOf(".git"),
            gitRepoName = config.gitClonePath.substring(gitRepoNameStartIndex + 1, gitRepoNameEndIndex - 1),
            repoPathOnServer = "users/" + config.userName + "/" + gitRepoName,
            that = this;
        console.log("repo name:" + gitRepoName);
        
        exec("git pull " + config.gitPushRemote + " " + config.gitPushBranch, {cwd: repoPathOnServer}, function (error, stdout, stderr) {
            if (error === null) {
                console.log("git pull is done");
                that.execCustomCliCommmands(config, events, function() {

                });
            }else {
                events.emit("operationsFinished", {
                    "message": "the following error has occured: " + error
                });
            }
        });
    },
    execCustomCliCommmands: function(config, events, callback) {
        var gitCommands = config.cloudCommands.split(","),
            currentCommand;
        console.log(gitCommands);
        if(gitCommands.length) {
            function execCustomCommands() {
                currentCommand = gitCommands.shift().trim();
                console.log("current command: " + currentCommand)
                /*if(gitCommands.length) {
                    execCustomCommands();
                }*/
            }
            execCustomCommands();
        }else {
            events.emit("operationsFinished", {
                "message": "config.cloudCommands are empty please fill it with CLI commands separated by ','"
            });
        }
        /*exec("git pull " + config.gitPushRemote + " " + config.gitPushBranch, {cwd: repoPathOnServer}, function (error, stdout, stderr) {
            if (error === null) {
                console.log("git pull is done");
                
            }else {
                events.emit("operationsFinished", {
                    "message": error
                });
            }
        });*/
    },
    checkIfUserExists: function(userName) {
        var users = JSON.parse(fs.readFileSync("./users/users.json"));
        if(users[userName]) {console.log("Exists")
            return true;
        }else {console.log("Not Exists")
            return false;
        }
    },
    makeUser: function(userName, password) {
        var users = JSON.parse(fs.readFileSync(this.usersList));
        users[userName] = password;
        fs.writeFileSync(this.usersList, JSON.stringify(users, null, 4));
        fs.mkdirSync('users/' + userName);
        console.log("Directory is created for " + userName);
        console.log("user " + userName + ' is created');
        return true;
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