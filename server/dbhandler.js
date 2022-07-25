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
	User.findOneAndUpdate({username: user},{$push: {keys: key}},function (err,doc){
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
				console.log('New key added')
			}
		}
	});
}

function Validate(objectData){
	User.findOne({username: objectData.author},'keys',function (err,doc){
		if(err){
			return err;
		}else{
			if(doc){
				return crypto.VerifyString(objectData.data,objectData.signature,doc.keys[0].key);
			}else{
				console.log("No doc found")
			}
		}
	})
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