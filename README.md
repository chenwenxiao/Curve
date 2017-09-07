# Curve Label-Tool

![Curve](https://git.peidan.me/cwx17/Curve/raw/master/LabelServer/public/ico/Curve.ico)

Curve is a fully new label-tool for data labeling which include server and frontend. It is from the opprentice tool https://git.peidan.me/cwx17/opprentice.

Now Curve support for mysql, mongodb or even you have no sql.

# Release

Release is for the offline and simple work, it will store data in memory, but its advantage is you don't need any knowledge about nodejs or sql.
The release is in [release link](https://github.com/chenwenxiao/Curve/releases), you could download the applicatoin of your OS.

Another easy way is download Curve.zip in the root directory and unzip it. You will get a fully unrequired project and then run `npm start` in LabelServer directory.

# Develop

Download mongodb from https://www.mongodb.com/download-center or download mysql from https://dev.mysql.com/downloads/mysql/ (You need one of them)

Download nodejs from https://nodejs.org/en/

After install mongodb (or mysql) and nodejs

```
# clone the repository or download Curve.zip with all required libraries.
git clone ...

# mkdir the data directory for database
mkdir data
mongod --dbpath=./data

# install requirements lib of nodejs
cd LabelServer
npm install

# start server
npm start

# if you want to set the port of Curve, * is the port you perfer to
PORT=* npm start

# if you want to start server back
PORT=* nohup npm start &
```



The config.js can set the database you perfer to

```javascript
module.exports = {
  server: {
    host: "localhost",
    port: 3000
  },
  mg_path: "mongodb://localhost:27017/opprentice",
  multiple: 1,
  babel: true
};
```

If you want to use mongo, set mg_path to like this

```javascript
module.exports = {
  server: {
    host: "localhost",
    port: 3000
  },
  mysql_option: {
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: 'Your password',
    database: 'Your database\'s name'
  },
  multiple: 1,
  babel: true
};
```

If you want to use mysql, you could set it like this.

```javascript
module.exports = {
  server: {
    host: "localhost",
    port: 3000
  },
  multiple: 1,
  babel: true
};
```

If you want to use jsdb which run simply in memory, you could set config.js without mysql_option and mg_path. Our release version is also by defaultly using this.

Curve may be slow when the anomaly interval is too much because we use zones of hightcharts to color these interval, in future, we try to achieve a new workflow using the colorline of blacklabel's plugin(Maybe update with Curve).
