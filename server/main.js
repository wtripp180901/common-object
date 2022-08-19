const express = require('express');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const db = require('./dbhandler.js');
const tokens = require('./tokencache.js')

app.post('/NewUserRequest',function(req,res)
{
	db.NewUser(req.body.username,req.body.password);
	res.status(200).end()
}
);

app.put('/LoginRequest',function(req,res){
	const token = crypto.randomBytes(16).toString('hex');
	tokens.NewToken(req.body.username,token);
	db.AuthenticateUser(req.body.username,req.body.password).then(
		function fulfil(){res.status(200).json({token: token});},
		function reject(){res.status(403).end();}
	);
});

app.post('/ValidateRequest',async function(req,res){
	let result = await db.Validate(req.body);
	if(result){
		res.status(200).end('true');
	}else{
		res.status(200).end('false');
	}
}
);

app.post('/NewObjectRequest',function(req,res){
	db.NewObject(req.body.data,req.body.author,req.body.key);
	res.status(200).json({message:'Test'});
}
);

app.post('/RegisterPublicKey/:user',function(req,res){
	db.AssignKey(req.params.user,req.body.key,req.body.keyName);
	res.status(200).end();
});

app.get('/GetObjectByIdRequest/:id',function(req,res){
	res.status(200).json({message:'Test '+req.params.id});
}
);

app.listen(8080);