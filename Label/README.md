# Label

> A front-end web-ui for users.

## Start

- Clone or download this repository
- Enter your local directory, and install dependencies:

``` bash
npm install
```

## Develop

``` bash
# serve with hot reload at localhost:8080
npm run dev
```

## Build

``` bash
# build for production with minification
npm run build
```

## Start Developing

You need some knowledge about vue.hs and es6, then, you could try to understant App.vue and modify it.

## The Ajax Protocol

| Url    | Query Parameter                        | Return                 | Type |
| ------ | -------------------------------------- | ---------------------- | ---- |
| upload |                                        | The result of upload.. | post |
| name   |                                        | The list of dataset.   | get  |
| label  | name, shift, start, end, num, download | DataInfo.              | get  |
| mark   | name, start, end, op                   | The result of mark.    | post |

### Upload

When you don't need upload csv or zip file, you don't need to solve with this url. Or you should put the file into your database and send the message of result, maybe success or fail. 

### Name

You should send the list of dataset to the client. It should be a JSON.

### Label

You should send the data of the dataset `name`, and you need to shift the timestamp of data with `shift`. Sometimes when `start` and `end` is null, you need to send the all of data in the dataset. Otherwise, you need to send the data whose timestamp is in a closed interval [`start`, `end`]. 

If you only support when `download` is false, the abobe is all you need do. If you would like to support with `download`is true, you should sample your data, and send the sample to the client instead all of them. When `download` is true, the num will notice you the total number of serise, so you need the change your sample strategy. 

### Mark

You need to mark your dataset where `timestamp` is from `start` to `end` with `op`. It means you need to dye the label of them to `op`. 