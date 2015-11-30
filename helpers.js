var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var maxBuffer = 500 * 1024;
//var process = process || require('process');
var rimraf = require('rimraf');
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
                this.cloneProcess(config, events);
           }else {
                events.emit("operationsFinished", {
                    "message": "The user name you used already exists but your password is unvalid, please choose another user name or use correct password"
                });
           }
        }
    },
    cloneProcess: function(config, events) {
        var clonePath = path.normalize("users/" + config.user),
            gitClonePathSplit = config.gitClonePath.split("@"),
            gitClonePath = gitClonePathSplit[0] + ":" + config.gitPassword + "@" + gitClonePathSplit[1]; 
        console.log("new Clone to: ", gitClonePath)
        exec("git clone " + gitClonePath, {cwd: clonePath, maxBuffer : maxBuffer}, function (error, stdout, stderr) {
            if (error === null) {
                events.emit("operationsFinished", {
                    "message": "git clone is done at users/" + config.user + " folder"
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
            gitRepoName = config.gitClonePath.substring(gitRepoNameStartIndex + 1, gitRepoNameEndIndex),
            repoPathOnServer = path.resolve(__dirname + "/users/" + config.user + "/" + gitRepoName),
            that = this;
        exec("git pull " + config.gitPushRemote + " " + config.gitPushBranch, {cwd: repoPathOnServer, maxBuffer : maxBuffer}, function (error, stdout, stderr) {
            if (error === null) {
                console.log("git pull is done");
                that.execCustomCliCommmands(config, events, repoPathOnServer, function(stdout) {
                    console.log(stdout);
                    that.pushResultsBack(config, repoPathOnServer, events);
                });
            }else {
                events.emit("operationsFinished", {
                    "message": "the following error has occured: " + stdout + error
                });
            }
        });
    },
    pushResultsBack: function(config, repoPathOnServer, events) {
        var that = this;
        exec("git add -A", {cwd: repoPathOnServer, maxBuffer : maxBuffer}, function (error, stdout, stderr) {
            if (error === null) {
                exec("git commit -m \"cloud compiler server process\"", {cwd: repoPathOnServer, maxBuffer : maxBuffer}, function (error, stdout, stderr) {
                    if (error === null) {
                        console.log('commit success: ' + stdout);
                        exec("git push " + config.gitPushRemote + " " + config.gitPushBranch, {cwd: repoPathOnServer, maxBuffer : maxBuffer}, function (error, stdout, stderr) {
                            if (error === null) {
                                console.log(stdout);
                                events.emit("operationsFinished", {
                                    "message": "compiled data is pushed back successfully"
                                });
                            }else {
                                events.emit("operationsFinished", {
                                    "message": "the following error has occured: " + stdout + error
                                });
                            }
                        });
                    }else {
                        events.emit("operationsFinished", {
                            "message": "there is nothing new to push back error: " + stdout + error
                        });
                    }
                });
            }else {
                events.emit("operationsFinished", {
                    "message": "there is nothing new to push back error: " + stdout + error
                });
            }
        });
    },
    execCustomCliCommmands: function(config, events, repoPathOnServer, callback) {
        var gitCommands = config.cloudCommands.split(","),
            currentCommand;
        if(gitCommands.length) {
            function execCustomCommands() {
                currentCommand = gitCommands.shift().trim();
                console.log("current command: " + currentCommand)
                exec(currentCommand, {cwd: repoPathOnServer, maxBuffer : maxBuffer}, function (error, stdout, stderr) {
                    if (error === null) {
                        if(gitCommands.length) {
                            execCustomCommands();
                        }else {
                            callback(stdout);
                        }
                    }else {
                        events.emit("operationsFinished", {
                            "message": "the following error has occured: " + error
                        });
                    }
                });
            }
            execCustomCommands();
        }else {
            events.emit("operationsFinished", {
                "message": "config.cloudCommands are empty please fill it with CLI commands separated by ','"
            });
        }
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
        fs.writeFileSync(this.usersList, JSON.stringify(users, null, 4));
        fs.mkdirSync('users/' + userName);
        console.log("Directory is created for " + userName);
        console.log("user " + userName + ' is created');
        return true;
    },

    destroyUser: function(config, events) {
        var userExists = this.checkIfUserExists(config.user);
        if(!userExists) {
            events.emit("operationsFinished", {
                "message": "User with name you have in config file does not exist, run 'init' command to create one"
            });
        }else {
        //user Exists
           var passwordIsValid = this.checkUserPassword(config.user, config.password);
           if(passwordIsValid) {
                console.log("user password is valid removing his folder and records");
                var users = JSON.parse(fs.readFileSync(this.usersList));
                delete users[config.user];
                fs.writeFileSync(this.usersList, JSON.stringify(users, null, 4));
                rimraf('users/' + config.user, function(error) {
                    if(error !== null) {
                        events.emit("operationsFinished", {
                            "message": "error on folder deletion: " + error 
                        });
                    }else {
                        events.emit("operationsFinished", {
                            "message": "your folder and records on server is removed"
                        });
                    }
                });
           }else {
                events.emit("operationsFinished", {
                    "message": "The user name you used already exists but your password is unvalid, please choose another user name or use correct password"
                });
           }
        }
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