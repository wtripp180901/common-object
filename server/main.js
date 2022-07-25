const express = require('express');
const fs = require('fs');

const app = express();
app.use(express.json());

const db = require('./dbhandler.js');

const pukey = fs.readFileSync('C:\\Users\\willt\\Desktop\\test keys\\public.pem','utf-8')

app.post('/ValidateRequest',function(req,res){
	res.status(200).end(db.Validate(req.body).toString());
}
);

const prkey = fs.readFileSync('C:\\Users\\willt\\Desktop\\test keys\\private.pem','utf-8')

app.post('/NewObjectRequest',function(req,res){
	db.NewObject(req.body.data,req.body.author,prkey);
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