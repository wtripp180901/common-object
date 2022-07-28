module.exports= {NewObject,AssignKey,Validate};

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/common_object');

const crypto = require('./signaturehandler.js')

const db = mongoose.connection;

const objectSchema = new mongoose.Schema({
	author: String,
	signature: String,
	data: Object
});
/*const pubKeySchema = new mongoose.Schema({
	key: String,
	priority: Number
})*/
const userSchema = new mongoose.Schema({
	username: String,
	keys: [Object]
});

const CommonObject = mongoose.model('Objects',objectSchema);
const User = mongoose.model('users',userSchema);

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
						let result = crypto.VerifyString(objectData.data,objectData.signature,currentKey.key);
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
	let newObject = new CommonObject({
		signature: crypto.SignString(JSON.stringify(objectData),privkey),
		author: author,
		data: objectData
	});
	newObject.save().then(function(){
		console.log(newObject.signature);
	});
}