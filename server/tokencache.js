module.exports = {NewToken,CheckToken};

const TIMEOUT = 1200;
let tokens = {};

function intervalFunc(){
    for(var key in tokens){
        tokens[key].time -= 1;
        if(tokens[key].time <= 0){
            delete tokens[key];
        }
    }
}

function NewToken(user,token){
    tokens[user] = {token: token,time: TIMEOUT}
}

function CheckToken(user,token){
    return new Promise(function (resolve,reject){
        if(tokens[user].token === token){
            resolve()
        }else{
            reject()
        }
    })
}

setInterval(intervalFunc,1000);