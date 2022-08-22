module.exports= {NewObject,AssignKey,Validate,NewUser,AuthenticateUser,NewSignedObject,GetObjectById};

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/common_object');

const sigHandler = require('./signaturehandler.js')
const crypto = require('crypto')

const db = mongoose.connection;

const objectSchema = new mongoose.Schema({
	author: String,
	signature: String,
	owner: String,
	createdAt: {type: Date, default: Date.now},
	lastModified: {type: Date, default: Date.now},
	data: Object
});
/*const pubKeySchema = new mongoose.Schema({
	key: String,
	priority: Number
})*/
const userSchema = new mongoose.Schema({
	username: String,
	password: Object,
	keys: [Object]
});

const CommonObject = mongoose.model('Objects',objectSchema);
const User = mongoose.model('users',userSchema);

function NewUser(user,password){
	const salt = crypto.randomBytes(16).toString('hex');
	const iterations = 100000;
	let saltedPassword = crypto.pbkdf2Sync(password,salt,iterations,64,'sha512').toString('hex');
	let newUser = new User({
		username: user,
		password: {
			salt: salt,
			iterations: iterations,
			password: saltedPassword
		},
		keys: []
	});
	newUser.save();
}

function AuthenticateUser(user,password){
	return new Promise((resolve,reject) => 
	{
		User.findOne({username: user},function (err,doc){
			if(err){
				reject(err);
			}else{
				if(!doc){
					reject('User not found')
				}else{
					const userAttempt = crypto.pbkdf2Sync(password,doc.password.salt,doc.password.iterations,64,'sha512').toString('hex');
					if(userAttempt === doc.password.password){
						resolve();
					}else{
						reject('Password rejected');
					}
				}
			}
		});
	})
}

function AssignKey(user,key,name){
	User.findOne({username: user},function (err,doc){
		if(err){
			console.log(err);
		}else{
			if(!doc){
				let newUser = new User({
					username: user,
					keys: [{name: name,key: key,priority: 1}]
				});
				newUser.save()
				console.log('New user created')
			}else{
				let highest = 0;
				doc.keys.forEach(value => {
					if(value.priority > highest) highest = value.priority;
				})
				doc.keys.push({key: key, name: name, priority: highest+1});
				doc.save();
				console.log('New key added')
			}
		}
	});
}

function Validate(objectData){
	return new Promise((resolve,reject) =>{
		User.findOne({username: objectData.author},'keys',function (err,doc){
			if(err){
				console.log(err);
				reject(err);
			}else{
				if(doc){
					let found = false;
					let keyObjects = doc.keys;
					keyObjects.sort((a,b) => {return b.priority - a.priority;})
					keyObjects.every((currentKey) => {
						let result = sigHandler.VerifyString(objectData.data,objectData.signature,currentKey.key);
						if(result){ 
							console.log("Matching key found")
							resolve(result);
							found = true;
							return false;
						} else {
							console.log("Key rejected");
							return true;
						}
					});
					if(!found){
						console.log("No matching public key for user");
						reject("No matching public key for user");
					}
					
				}else{
					console.log("No doc found")
					reject("No doc found");
				}
			}
		})
	});
}

function NewObject(objectData,author,privkey){
	makeNewObject(
		sigHandler.SignString(JSON.stringify(objectData),privkey),
		author,
		objectData);
}

function NewSignedObject(signature,data,author){
	let result = Validate({
		author: author,
		signature: signature,
		data: data
	})
	if(result){
		makeNewObject(signature,author,data);
	}else{
		console.log('Invalid signature');
	}
}

function GetObjectById(id){
	CommonObject.findById(id,function(err,doc){
		if(err){
			console.log(err);
		}else{
			console.log(objectParser(doc));
		}
	})
}

function objectParser(rawObject){
	return {
		id: rawObject._id.toString(),
		author: rawObject.author,
		signature: rawObject.signature,
		data: rawObject.data
	}
}

function makeNewObject(signature,author,data){
	let newObject = new CommonObject({
		signature: signature,
		author: author,
		owner: author,
		data: data
	});
	newObject.save().then(function(){
		console.log('New object created');
	});
}