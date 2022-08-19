module.exports = {NewToken};

const TIMEOUT = 10;
let tokens = {};

function intervalFunc(){
    for(var key in tokens){
        tokens[key].time -= 1;
        if(tokens[key].time <= 0){
            delete tokens[key];
        }
    }
    console.log(tokens);
}

function NewToken(user,token){
    tokens[user] = {token: token,time: TIMEOUT}
}

setInterval(intervalFunc,1000);