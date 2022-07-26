const express = require('express');
const fs = require('fs');

const app = express();
app.use(express.json());

const db = require('./dbhandler.js');

app.post('/ValidateRequest',async function(req,res){
	let result = await db.Validate(req.body);
	if(result){
		res.status(200).end('true');
	}else{
		res.status(200).end('false')
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