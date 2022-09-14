module.exports= {NewObject,AssignKey,Validate,NewUser,AuthenticateUser,GetObjectById,UpdateOwner,GetObjects};

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/common_object');

const sigHandler = require('./signaturehandler.js')
const crypto = require('crypto')

const db = mongoose.connection;

const objectSchema = new mongoose.Schema({
	author: String,
	signature: String,
	owner: String,
	createdAt: String,
	lastModified: String,
	trustedDate: Boolean,
	public: Boolean,
	data: Object
});

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

function GetObjects(user,count,mode){
	
	return new Promise(function(resolve,reject){
		let criteria;
		switch(mode){
			case "all":
				criteria = {$or: [{owner: user},{author: user}]};
				break;
			case "created":
				criteria = {author: user};
				break;
			case "owned":
				criteria = {owner:user};
				break;
		}
		CommonObject.find(criteria,function(err,doc){
			if(err){
				console.log(err);
				reject(err.toString());
			}else{
				if(doc){
					let parsedList = doc.map(x => objectParser(x));
					if(count != null){
						parsedList.sort(sortStringDates)
						parsedList = parsedList.slice(0,count);
					}
					resolve(parsedList);
				}else{
					reject('Object not found')
				}
			}
		})
	})
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
						let result = sigHandler.VerifyString(toPlainText(objectData),objectData.signature,currentKey.key);
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

function NewObject(data,author,privkey){
	let newObject = unsignedDefaultObject(author,data);
	newObject.signature = sigHandler.SignString(toPlainText(newObject),privkey);
	newObject.save().then(function(){
		console.log('New object created');
	});
}

function UpdateOwner(currentOwner,newOwner,id){
	return new Promise((resolve,reject) => {
		User.findOne({username: newOwner}, function(err,doc){
			if(err){
				reject(err);
			}else{
				if(doc){
					CommonObject.findOneAndUpdate(
						{_id: id,owner: currentOwner},
						{ $set: {owner: newOwner,lastModified: new Date().toUTCString()}},
						function(err,doc){
							if(err){
								reject(err)
							}else{
								if(doc){
									resolve();
								}else{
									reject('Object not found');
								}
							}
						}
						)
				}else{
					reject('New owner not found');
				}
			}
		})
	}
	)
}

/*
function NewSignedObject(signature,data,author){
	let newObject = unsignedDefaultObject(author,data);
	newObject.signature = signature;
	let result = Validate(newObject);
	if(result){
		newObject.save().then(function(){
			console.log('New object created');
		});
	}else{
		console.log('Invalid signature');
	}
}
*/

function GetObjectById(id){
	return new Promise(function(resolve,reject){
		CommonObject.findById(id,function(err,doc){
			if(err){
				reject(err.toString());
			}else{
				if(doc){
					resolve(objectParser(doc));
				}else{
					reject('Object not found')
				}
			}
		})
	})
	
}

function objectParser(rawObject){
	return {
		id: rawObject._id.toString(),
		author: rawObject.author,
		owner: rawObject.owner,
		signature: rawObject.signature,
		createdAt: rawObject.createdAt,
		lastModified: rawObject.lastModified,
		data: rawObject.data,
		trustedDate: rawObject.trustedDate,
		public: rawObject.public
	}
}

function unsignedDefaultObject(author,data){
	let currentDate = new Date().toUTCString();
	return new CommonObject({
		author: author,
		owner: author,
		data: data,
		createdAt: currentDate,
		lastModified: currentDate
	})
}

function toPlainText(objectData){
	return JSON.stringify(objectData.data)+objectData.owner+objectData.createdAt+objectData.lastModified;
}

function sortStringDates(a,b){
	return -1;
}