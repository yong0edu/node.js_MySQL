var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var template = require('./lib/template.js');
var path = require('path');
var sanitizeHtml = require('sanitize-html');
var mysql = require('mysql');
var db = mysql.createConnection({
  host:'localhost',
  user:'root',
  password:'gold1004',
  database:'opentutorials'
});
db.connect();

var app = http.createServer(function(request,response){
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var pathname = url.parse(_url, true).pathname;
    if(pathname === '/'){
      if(queryData.id === undefined){
        db.query('SELECT * FROM topic', function(err, topics){
          if(err) throw err;
          var title = 'Welcome';
          var description = 'Hello, Node.js';
          var list = template.list(topics);
          var html = template.HTML(title, list,
            `<h2>${title}</h2>${description}`,
            `<a href="/create">create</a>`
          );
          response.writeHead(200);
          response.end(html);
        });
      } else {
        db.query('SELECT * FROM topic', function(err, topics){
          if (err) throw err;
          db.query(`SELECT * FROM topic LEFT JOIN author ON topic.author_id=author.id WHERE topic.id=?`,[queryData.id], function(err2, topic){
            if(err2) throw err2;
            console.log(topic);
            var title = topic[0].title;
            var description = topic[0].description;
            var author = topic[0].name;
            var list = template.list(topics);
            var html = template.HTML(title, list,
              `<h2>${title}</h2>
              <p>${description}</p>
              author:${author}`,
              ` <a href="/create">create</a>
                <a href="/update?id=${queryData.id}">update</a>
                <form action="delete_process" method="post">
                  <input type="hidden" name="id" value="${queryData.id}">
                  <input type="submit" value="delete">
                </form>`
            );
            response.writeHead(200);
            response.end(html);
          });
        });
      }
    } else if(pathname === '/create'){
      db.query('SELECT * FROM topic', function(err, topics){
        if (err) throw err;
        db.query('SELECT * FROM author', function(err2, authors){
          if (err2) throw err2;
          var title = 'WEB - create';
          var list = template.list(topics);
          var html = template.HTML(title, list,
            `
            <form action="/create_process" method="post">
              <p><input type="text" name="title" placeholder="title"></p>
              <p>
                <textarea name="description" placeholder="description"></textarea>
              </p>
              ${template.authorSelect(authors)}
              <p>
                <input type="submit">
              </p>
            </form>
          `, ''
          );
          response.writeHead(200);
          response.end(html);
        });
      });
    } else if(pathname === '/create_process'){
      var body = '';
      request.on('data', function(data){
          body = body + data;
      });
      request.on('end', function(){
          var post = qs.parse(body);
          console.log('post=',  post)
          db.query('INSERT INTO topic(title, description, created, author_id) VALUES (?, ?, NOW(), ?);', 
                  [post.title, post.description, post.author], function(err, result){
                    if(err){
                      throw err
                    }
                    response.writeHead(302, {Location: `/?id=${result.insertId}`});
                    response.end();
                  });
      });
    } else if(pathname === '/update'){
      db.query('SELECT * FROM topic', function(err, topics){
        if (err) throw err;
        db.query(`SELECT * FROM topic WHERE id=?`,[queryData.id], function(err2, topic){
          if(err2) throw err2;
          db.query(`SELECT * FROM author`, function(err3, authors){
            if(err3) throw err3;
            var list = template.list(topics);
            var html = template.HTML(topic[0].title, list,
              `
              <form action="/update_process" method="post">
                <input type="hidden" name="id" value="${topic[0].id}">
                <p><input type="text" name="title" placeholder="title" value="${topic[0].title}"></p>
                <p>
                  <textarea name="description" placeholder="description">${topic[0].description}</textarea>
                </p>
                ${template.authorSelect(authors)}
                <p>
                  <input type="submit">
                </p>
              </form>
              `,
              `<a href="/create">create</a> <a href="/update?id=${topic[0].id}">update</a>`
            );
          response.writeHead(200);
          response.end(html);
          });
        });
      });
    } else if(pathname === '/update_process'){
      var body = '';
      request.on('data', function(data){
          body = body + data;
      });
      request.on('end', function(){
          var post = qs.parse(body);
          db.query('UPDATE topic SET title=?, description=?, author_id=? WHERE id=?', 
          [post.title, post.description, post.author, post.id],
          function(err, result){
            if(err) throw err;
            response.writeHead(302, {Location: `/?id=${post.id}`});
            response.end();
          });
      });
    } else if(pathname === '/delete_process'){
      var body = '';
      request.on('data', function(data){
          body = body + data;
      });
      request.on('end', function(){
          var post = qs.parse(body);
          var id = post.id;
          var filteredId = path.parse(id).base;
          fs.unlink(`data/${filteredId}`, function(error){
            response.writeHead(302, {Location: `/`});
            response.end();
          })
          db.query('DELETE FROM topic WHERE id=?', [post.id], 
          function(err, result){
            if(err) throw err;
            response.writeHead(302, {Location: `/`});
            response.end();
          })
      });
    } else {
      response.writeHead(404);
      response.end('Not found');
    }
});
app.listen(3000);
